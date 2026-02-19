import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/auth-store';

interface UserEntry {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  role: string;
  is_active: boolean;
}


export function UserSidebarList(): ReactNode {
  const profile = useAuthStore((s) => s.profile);
  const navigate = useNavigate();
  const { userId: selectedUserId } = useParams<{ userId?: string }>();
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    if (!profile?.tenant_id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, email, avatar_url, role, is_active')
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

  // Auto-select first user if none selected
  useEffect(() => {
    if (!selectedUserId && users.length > 0) {
      navigate(`/users/${users[0].user_id}`, { replace: true });
    }
  }, [selectedUserId, users, navigate]);

  if (loading) {
    return <div className="sidebar-loading">Loading...</div>;
  }

  if (users.length === 0) {
    return <div className="sidebar-empty">No users</div>;
  }

  return (
    <div className="sidebar-list">
      {users.map((u) => (
        <div
          key={u.id}
          className={`sidebar-list-item user-item ${u.user_id === selectedUserId ? 'active' : ''}`}
          onClick={() => navigate(`/users/${u.user_id}`)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && navigate(`/users/${u.user_id}`)}
        >
          <div className="sidebar-user-avatar">
            {u.avatar_url ? (
              <img src={u.avatar_url} alt="" className="sidebar-avatar-img" />
            ) : (
              u.full_name?.charAt(0).toUpperCase() || 'U'
            )}
          </div>
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">{u.full_name || u.email}</span>
            <span
              className={`sidebar-user-role role-color-${u.role}`}
            >
              {u.role}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
