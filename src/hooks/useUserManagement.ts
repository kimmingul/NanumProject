import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/auth-store';
import { resizeAvatar } from '@/utils/imageResize';
import type { EmploymentStatus } from '@/types';

/** Call an RPC function (void return). Supabase generated types have Functions: Record<string, never> so we cast. */
async function rpc(fn: string, params: Record<string, unknown>): Promise<void> {
  const { error } = await (supabase.rpc as unknown as (fn: string, params: Record<string, unknown>) => Promise<{ error: { message: string } | null }>)(fn, params);
  if (error) throw error;
}

/** Call an RPC function that returns data. */
async function rpcWithReturn<T>(fn: string, params: Record<string, unknown>): Promise<T> {
  const { data, error } = await (supabase.rpc as unknown as (fn: string, params: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>)(fn, params);
  if (error) throw error;
  return data as T;
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
          p_user_id: userId,
          p_new_role: data.role,
        });
      }
    },
    [],
  );

  const uploadAvatar = useCallback(
    async (userId: string, file: File): Promise<string> => {
      if (!profile?.tenant_id) throw new Error('No tenant');

      // Resize image to 128x128 WebP for optimal storage and loading
      const resizedFile = await resizeAvatar(file);

      // Always use .webp extension for resized avatars
      const filePath = `${profile.tenant_id}/${userId}.webp`;

      // Upload (upsert)
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, resizedFile, {
          upsert: true,
          contentType: 'image/webp',
        });
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

      // Try to delete the .webp avatar file (best-effort, ignore errors)
      const filePath = `${profile.tenant_id}/${userId}.webp`;
      await supabase.storage.from('avatars').remove([filePath]);

      // Also clean up any legacy files with other extensions
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
    await rpc('deactivate_user', { p_user_id: userId });
  }, []);

  const reactivateUser = useCallback(async (userId: string) => {
    await rpc('reactivate_user', { p_user_id: userId });
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  }, []);

  const createUser = useCallback(
    async (email: string, fullName: string, role: string): Promise<string> => {
      const userId = await rpcWithReturn<string>('create_tenant_user', {
        p_email: email,
        p_full_name: fullName,
        p_role: role,
      });

      // Send password reset email so the new user can set their password
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      return userId;
    },
    [],
  );

  const updateEmploymentStatus = useCallback(
    async (userId: string, status: EmploymentStatus) => {
      await rpc('update_employment_status', {
        p_user_id: userId,
        p_status: status,
      });
    },
    [],
  );

  const updateUserManager = useCallback(
    async (userId: string, managerId: string | null) => {
      await rpc('update_user_manager', {
        p_user_id: userId,
        p_manager_id: managerId,
      });
    },
    [],
  );

  const updateUserDepartment = useCallback(
    async (userId: string, departmentId: string | null) => {
      await rpc('update_user_department', {
        p_user_id: userId,
        p_department_id: departmentId,
      });
    },
    [],
  );

  return {
    updateProfile,
    uploadAvatar,
    removeAvatar,
    deactivateUser,
    reactivateUser,
    sendPasswordReset,
    createUser,
    updateEmploymentStatus,
    updateUserManager,
    updateUserDepartment,
  };
}
