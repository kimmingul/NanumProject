import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/auth-store';

/** Call an RPC function. Supabase generated types have Functions: Record<string, never> so we cast. */
async function rpc(fn: string, params: Record<string, unknown>): Promise<void> {
  const { error } = await (supabase.rpc as unknown as (fn: string, params: Record<string, unknown>) => Promise<{ error: { message: string } | null }>)(fn, params);
  if (error) throw error;
}

interface UpdateProfileData {
  full_name?: string;
  role?: string;
}

export function useUserManagement() {
  const profile = useAuthStore((s) => s.profile);

  const updateProfile = useCallback(
    async (userId: string, data: UpdateProfileData) => {
      // Update full_name directly on profiles table
      if (data.full_name !== undefined) {
        const { error } = await supabase
          .from('profiles')
          .update({ full_name: data.full_name })
          .eq('user_id', userId);
        if (error) throw error;
      }

      // Role change via RPC (admin-only, enforced server-side)
      if (data.role !== undefined) {
        await rpc('update_user_role', {
          target_user_id: userId,
          new_role: data.role,
        });
      }
    },
    [],
  );

  const uploadAvatar = useCallback(
    async (userId: string, file: File): Promise<string> => {
      if (!profile?.tenant_id) throw new Error('No tenant');

      const ext = file.name.split('.').pop() || 'png';
      const filePath = `${profile.tenant_id}/${userId}.${ext}`;

      // Upload (upsert)
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      // Update avatar_url in profiles
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', userId);
      if (updateError) throw updateError;

      return publicUrl;
    },
    [profile?.tenant_id],
  );

  const removeAvatar = useCallback(
    async (userId: string) => {
      if (!profile?.tenant_id) throw new Error('No tenant');

      // Clear avatar_url in profiles
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('user_id', userId);
      if (updateError) throw updateError;

      // Try to delete storage files (best-effort, ignore errors)
      const { data: files } = await supabase.storage
        .from('avatars')
        .list(profile.tenant_id, { search: userId });

      if (files && files.length > 0) {
        const paths = files.map((f) => `${profile.tenant_id}/${f.name}`);
        await supabase.storage.from('avatars').remove(paths);
      }
    },
    [profile?.tenant_id],
  );

  const deactivateUser = useCallback(async (userId: string) => {
    await rpc('deactivate_user', { target_user_id: userId });
  }, []);

  const reactivateUser = useCallback(async (userId: string) => {
    await rpc('reactivate_user', { target_user_id: userId });
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  }, []);

  return {
    updateProfile,
    uploadAvatar,
    removeAvatar,
    deactivateUser,
    reactivateUser,
    sendPasswordReset,
  };
}
