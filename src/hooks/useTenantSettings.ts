import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/auth-store';
import type { Tenant, TenantSettings } from '@/types';

export function useTenantSettings() {
  const tenantId = useAuthStore((s) => s.profile?.tenant_id);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTenant = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .single();
      if (error) throw error;
      setTenant(data as Tenant);
    } catch (err) {
      console.error('Failed to load tenant:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchTenant();
  }, [fetchTenant]);

  const updateTenant = useCallback(
    async (updates: { name?: string; domain?: string | null }) => {
      if (!tenantId) throw new Error('No tenant');
      const { error } = await supabase
        .from('tenants')
        .update(updates)
        .eq('id', tenantId);
      if (error) throw error;
      setTenant((prev) => (prev ? { ...prev, ...updates } : prev));
    },
    [tenantId],
  );

  const updateTenantSettings = useCallback(
    async (partial: Partial<TenantSettings>) => {
      if (!tenantId) throw new Error('No tenant');
      const current = tenant?.settings || {};
      const merged = {
        ...current,
        ...partial,
      } as Record<string, unknown>;
      // Deep-merge nested keys
      if (partial.branding) {
        merged.branding = { ...current.branding, ...partial.branding };
      }
      if (partial.features) {
        merged.features = { ...current.features, ...partial.features };
      }
      if (partial.security) {
        merged.security = { ...current.security, ...partial.security };
      }
      const { error } = await supabase
        .from('tenants')
        .update({ settings: merged })
        .eq('id', tenantId);
      if (error) throw error;
      setTenant((prev) => (prev ? { ...prev, settings: merged as TenantSettings } : prev));
    },
    [tenantId, tenant?.settings],
  );

  return { tenant, loading, fetchTenant, updateTenant, updateTenantSettings };
}
