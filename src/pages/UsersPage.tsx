import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/auth-store';
import './UsersPage.css';

interface UserProfile {
  user_id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  phone: string | null;
  department: string | null;
  position: string | null;
  bio: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  zip_code: string | null;
}

const roleBadgeClass: Record<string, string> = {
  admin: 'role-admin',
  manager: 'role-manager',
  member: 'role-member',
  viewer: 'role-viewer',
};

export default function UsersPage(): ReactNode {
  const { userId } = useParams<{ userId?: string }>();
  const tenantId = useAuthStore((s) => s.profile?.tenant_id);

  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchUser = useCallback(async () => {
    if (!tenantId || !userId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, email, full_name, avatar_url, role, is_active, last_login_at, created_at, phone, department, position, bio, address, city, state, country, zip_code')
        .eq('tenant_id', tenantId)
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      setUser(data as unknown as UserProfile);
    } catch (err) {
      console.error('Failed to load user:', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [tenantId, userId]);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      const parts = name.split(' ');
      return parts.length > 1
        ? (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
        : name.charAt(0).toUpperCase();
    }
    return email.charAt(0).toUpperCase();
  };

  if (!userId) {
    return (
      <div className="users-page">
        <div className="users-empty-state">
          <i className="dx-icon-group" />
          <h3>Select a user</h3>
          <p>Choose a team member from the sidebar to view their profile</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="users-page">
        <div className="users-loading">
          <div className="loading-spinner" />
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="users-page">
        <div className="users-empty-state">
          <i className="dx-icon-warning" />
          <h3>User not found</h3>
          <p>The selected user could not be found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="users-page">
      {/* Toolbar */}
      <div className="profile-toolbar">
        <h1 className="profile-toolbar-title">User Profile</h1>
      </div>

      <div className="profile-cards-container">
        {/* Basic Info Card */}
        <div className="profile-card basic-info-card">
          <div className="profile-card-panel">
            <div className="profile-card-header">Basic Info</div>
            <div className="profile-card-body">
              {/* Avatar + Name Header */}
              <div className="basic-info-top">
                <div className="profile-avatar-large">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt="" className="profile-avatar-img" />
                  ) : (
                    <span className="profile-avatar-initials">
                      {getInitials(user.full_name, user.email)}
                    </span>
                  )}
                </div>
                <div className="basic-info-summary">
                  <div className="profile-name">{user.full_name || user.email}</div>
                  <div className="profile-id">ID: {user.user_id.slice(0, 8)}</div>
                  <span className={`profile-role-badge ${roleBadgeClass[user.role] || ''}`}>
                    {user.role}
                  </span>
                </div>
              </div>

              {/* Read-only Fields */}
              <div className="profile-form profile-form-4col">
                <div className="profile-field col-span-2">
                  <label>Full Name</label>
                  <div className="field-value">{user.full_name || '-'}</div>
                </div>

                <div className="profile-field">
                  <label>Department</label>
                  <div className="field-value">{user.department || '-'}</div>
                </div>

                <div className="profile-field">
                  <label>Position</label>
                  <div className="field-value">{user.position || '-'}</div>
                </div>

                <div className="profile-field col-span-4">
                  <label>Bio</label>
                  <div className="field-value">{user.bio || '-'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contacts Card */}
        <div className="profile-card contacts-card">
          <div className="profile-card-panel">
            <div className="profile-card-header">Contacts</div>
            <div className="profile-card-body">
              <div className="card-top-item">
                <div className="card-icon-circle contacts-icon">
                  <i className="dx-icon-tel" />
                </div>
                <div className="card-top-text">
                  <span className="card-top-primary">{user.phone || 'No phone'}</span>
                  <span className="card-top-secondary">{user.email}</span>
                </div>
              </div>

              <div className="profile-form profile-form-2col">
                <div className="profile-field">
                  <label>Phone</label>
                  <div className="field-value">{user.phone || '-'}</div>
                </div>

                <div className="profile-field">
                  <label>Email</label>
                  <div className="field-value">{user.email}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Address Card */}
        <div className="profile-card address-card">
          <div className="profile-card-panel">
            <div className="profile-card-header">Address</div>
            <div className="profile-card-body">
              <div className="card-top-item">
                <div className="card-icon-circle address-icon">
                  <i className="dx-icon-map" />
                </div>
                <div className="card-top-text">
                  <span className="card-top-primary">
                    {[user.city, user.state, user.country].filter(Boolean).join(', ') || 'No address'}
                  </span>
                  <span className="card-top-secondary">{user.address || ''}</span>
                </div>
              </div>

              <div className="profile-form profile-form-2col">
                <div className="profile-field">
                  <label>Country</label>
                  <div className="field-value">{user.country || '-'}</div>
                </div>

                <div className="profile-field">
                  <label>City</label>
                  <div className="field-value">{user.city || '-'}</div>
                </div>

                <div className="profile-field col-span-2">
                  <label>State / Province</label>
                  <div className="field-value">{user.state || '-'}</div>
                </div>

                <div className="profile-field col-span-2">
                  <label>Address</label>
                  <div className="field-value">{user.address || '-'}</div>
                </div>

                <div className="profile-field col-span-2">
                  <label>Zip Code</label>
                  <div className="field-value">{user.zip_code || '-'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
