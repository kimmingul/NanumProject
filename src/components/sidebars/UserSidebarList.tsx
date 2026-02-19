import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/auth-store';

interface UserEntry {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string;
  role: string;
  is_active: boolean;
}

const roleBadgeColors: Record<string, string> = {
  admin: '#dc2626',
  manager: '#2563eb',
  member: '#16a34a',
  viewer: '#94a3b8',
};

export function UserSidebarList(): ReactNode {
  const profile = useAuthStore((s) => s.profile);
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    if (!profile?.tenant_id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, email, role, is_active')
        .eq('tenant_id', profile.tenant_id)
        .eq('is_active', true)
        .order('full_name');
      if (error) throw error;
      setUsers((data as UserEntry[]) || []);
    } finally {
      setLoading(false);
    }
  }, [profile?.tenant_id]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  if (loading) {
    return <div className="sidebar-loading">Loading...</div>;
  }

  if (users.length === 0) {
    return <div className="sidebar-empty">No users</div>;
  }

  return (
    <div className="sidebar-list">
      {users.map((u) => (
        <div key={u.id} className="sidebar-list-item user-item">
          <div className="sidebar-user-avatar">
            {u.full_name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">{u.full_name || u.email}</span>
            <span
              className="sidebar-user-role"
              style={{ color: roleBadgeColors[u.role] || '#94a3b8' }}
            >
              {u.role}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
