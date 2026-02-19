import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { TextBox } from 'devextreme-react/text-box';
import { SelectBox } from 'devextreme-react/select-box';
import { Button } from 'devextreme-react/button';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/auth-store';
import { useAuth } from '@/hooks/useAuth';
import { useUserManagement } from '@/hooks/useUserManagement';
import './MyProfilePage.css';

interface ProfileData {
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

const departmentOptions = [
  'Clinical Operations',
  'Data Management',
  'Biostatistics',
  'Regulatory Affairs',
  'Medical Writing',
  'Quality Assurance',
  'Pharmacovigilance',
  'Project Management',
];

const roleBadgeClass: Record<string, string> = {
  admin: 'role-admin',
  manager: 'role-manager',
  member: 'role-member',
  viewer: 'role-viewer',
};

export default function MyProfilePage(): ReactNode {
  const tenantId = useAuthStore((s) => s.profile?.tenant_id);
  const currentUserId = useAuthStore((s) => s.profile?.user_id);
  const setProfile = useAuthStore((s) => s.setProfile);
  const authProfile = useAuthStore((s) => s.profile);
  const { updatePassword } = useAuth();
  const { uploadAvatar, removeAvatar } = useUserManagement();

  const [user, setUser] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<Partial<ProfileData>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formMessage, setFormMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // Password
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwMessage, setPwMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // Avatar
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchProfile = useCallback(async () => {
    if (!tenantId || !currentUserId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, email, full_name, avatar_url, role, is_active, last_login_at, created_at, phone, department, position, bio, address, city, state, country, zip_code')
        .eq('tenant_id', tenantId)
        .eq('user_id', currentUserId)
        .single();

      if (error) throw error;
      const profile = data as unknown as ProfileData;
      setUser(profile);
      setFormData(profile);
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId, currentUserId]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const handleEdit = () => {
    setIsEditing(true);
    setFormMessage(null);
  };

  const handleCancel = () => {
    setFormData(user ? { ...user } : {});
    setIsEditing(false);
    setFormMessage(null);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setFormMessage(null);
    try {
      const updates: Record<string, unknown> = {};
      const fields: (keyof ProfileData)[] = ['full_name', 'phone', 'department', 'position', 'bio', 'address', 'city', 'state', 'country', 'zip_code'];
      for (const f of fields) {
        if (formData[f] !== user[f]) {
          updates[f] = formData[f] || null;
        }
      }

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase
          .from('profiles')
          .update(updates)
          .eq('user_id', user.user_id)
          .eq('tenant_id', tenantId!);
        if (error) throw error;
      }

      // Sync auth-store
      if (authProfile) {
        setProfile({
          ...authProfile,
          full_name: (formData.full_name as string) || authProfile.full_name,
        });
      }

      await fetchProfile();
      setFormMessage({ type: 'success', text: 'Profile saved successfully' });
      setIsEditing(false);
    } catch (err) {
      setFormMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save' });
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof ProfileData, value: string | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 2 * 1024 * 1024) {
      setFormMessage({ type: 'error', text: 'Image must be under 2MB' });
      return;
    }
    if (!file.type.startsWith('image/')) {
      setFormMessage({ type: 'error', text: 'Only image files are allowed' });
      return;
    }

    try {
      const url = await uploadAvatar(user.user_id, file);
      setUser((prev) => prev ? { ...prev, avatar_url: url } : prev);
      if (authProfile) setProfile({ ...authProfile, avatar_url: url });
    } catch (err) {
      setFormMessage({ type: 'error', text: err instanceof Error ? err.message : 'Upload failed' });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAvatarRemove = async () => {
    if (!user) return;
    try {
      await removeAvatar(user.user_id);
      setUser((prev) => prev ? { ...prev, avatar_url: null } : prev);
      if (authProfile) setProfile({ ...authProfile, avatar_url: null });
    } catch (err) {
      setFormMessage({ type: 'error', text: err instanceof Error ? err.message : 'Remove failed' });
    }
  };

  const handlePasswordChange = async () => {
    if (!newPassword || newPassword.length < 6) {
      setPwMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }
    setPwMessage(null);
    try {
      await updatePassword(newPassword);
      setNewPassword('');
      setConfirmPassword('');
      setPwMessage({ type: 'success', text: 'Password changed successfully' });
    } catch (err) {
      setPwMessage({ type: 'error', text: err instanceof Error ? err.message : 'Password change failed' });
    }
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      const parts = name.split(' ');
      return parts.length > 1
        ? (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
        : name.charAt(0).toUpperCase();
    }
    return email.charAt(0).toUpperCase();
  };

  if (loading) {
    return (
      <div className="my-profile-page">
        <div className="my-profile-loading">
          <div className="loading-spinner" />
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="my-profile-page">
        <div className="my-profile-empty">
          <i className="dx-icon-warning" />
          <h3>Profile not found</h3>
        </div>
      </div>
    );
  }

  const displayData = isEditing ? formData : user;

  return (
    <div className="my-profile-page">
      {/* Toolbar */}
      <div className="my-profile-toolbar">
        <h1 className="my-profile-toolbar-title">My Profile</h1>
        <div className="my-profile-toolbar-actions">
          {!isEditing && (
            <Button text="Edit" icon="edit" stylingMode="outlined" onClick={handleEdit} />
          )}
          {isEditing && (
            <>
              <Button text="Cancel" stylingMode="outlined" onClick={handleCancel} />
              <Button text={saving ? 'Saving...' : 'Save'} icon="save" type="default" stylingMode="contained" onClick={handleSave} disabled={saving} />
            </>
          )}
        </div>
      </div>

      {formMessage && (
        <div className={`my-profile-message my-profile-message-${formMessage.type}`}>
          {formMessage.text}
        </div>
      )}

      <div className="my-profile-cards">
        {/* Basic Info Card */}
        <div className="my-profile-card basic-info-card">
          <div className="my-profile-card-panel">
            <div className="my-profile-card-header">Basic Info</div>
            <div className="my-profile-card-body">
              {/* Avatar + Name Header */}
              <div className="basic-info-top">
                <div className="my-profile-avatar-wrap">
                  <div className="my-profile-avatar-large">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt="" className="my-profile-avatar-img" />
                    ) : (
                      <span className="my-profile-avatar-initials">
                        {getInitials(user.full_name, user.email)}
                      </span>
                    )}
                  </div>
                  <div className="my-profile-avatar-actions">
                    <Button icon="image" stylingMode="text" hint="Upload Photo" onClick={() => fileInputRef.current?.click()} />
                    {user.avatar_url && (
                      <Button icon="trash" stylingMode="text" hint="Remove Photo" onClick={handleAvatarRemove} />
                    )}
                    <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />
                  </div>
                </div>
                <div className="basic-info-summary">
                  <div className="my-profile-name">{user.full_name || user.email}</div>
                  <div className="my-profile-email">{user.email}</div>
                  <span className={`my-profile-role-badge ${roleBadgeClass[user.role] || ''}`}>
                    {user.role}
                  </span>
                </div>
              </div>

              {/* Form Fields */}
              <div className="my-profile-form my-profile-form-4col">
                <div className="my-profile-field col-span-2">
                  <label>Full Name</label>
                  {isEditing ? (
                    <TextBox value={displayData.full_name || ''} onValueChanged={(e) => updateField('full_name', e.value)} stylingMode="filled" />
                  ) : (
                    <div className="field-value">{user.full_name || '-'}</div>
                  )}
                </div>

                <div className="my-profile-field">
                  <label>Department</label>
                  {isEditing ? (
                    <SelectBox items={departmentOptions} value={displayData.department || ''} onValueChanged={(e) => updateField('department', e.value)} stylingMode="filled" acceptCustomValue={true} />
                  ) : (
                    <div className="field-value">{user.department || '-'}</div>
                  )}
                </div>

                <div className="my-profile-field">
                  <label>Position</label>
                  {isEditing ? (
                    <TextBox value={displayData.position || ''} onValueChanged={(e) => updateField('position', e.value)} stylingMode="filled" placeholder="e.g. Project Manager" />
                  ) : (
                    <div className="field-value">{user.position || '-'}</div>
                  )}
                </div>

                <div className="my-profile-field col-span-4">
                  <label>Bio</label>
                  {isEditing ? (
                    <TextBox value={displayData.bio || ''} onValueChanged={(e) => updateField('bio', e.value)} stylingMode="filled" placeholder="Short introduction..." />
                  ) : (
                    <div className="field-value">{user.bio || '-'}</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contacts Card */}
        <div className="my-profile-card contacts-card">
          <div className="my-profile-card-panel">
            <div className="my-profile-card-header">Contacts</div>
            <div className="my-profile-card-body">
              <div className="card-top-item">
                <div className="card-icon-circle contacts-icon">
                  <i className="dx-icon-tel" />
                </div>
                <div className="card-top-text">
                  <span className="card-top-primary">{user.phone || 'No phone'}</span>
                  <span className="card-top-secondary">{user.email}</span>
                </div>
              </div>

              <div className="my-profile-form my-profile-form-2col">
                <div className="my-profile-field">
                  <label>Phone</label>
                  {isEditing ? (
                    <TextBox value={displayData.phone || ''} onValueChanged={(e) => updateField('phone', e.value)} stylingMode="filled" placeholder="010-1234-5678" />
                  ) : (
                    <div className="field-value">{user.phone || '-'}</div>
                  )}
                </div>

                <div className="my-profile-field">
                  <label>Email</label>
                  <div className="field-value">{user.email}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Address Card */}
        <div className="my-profile-card address-card">
          <div className="my-profile-card-panel">
            <div className="my-profile-card-header">Address</div>
            <div className="my-profile-card-body">
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

              <div className="my-profile-form my-profile-form-2col">
                <div className="my-profile-field">
                  <label>Country</label>
                  {isEditing ? (
                    <TextBox value={displayData.country || ''} onValueChanged={(e) => updateField('country', e.value)} stylingMode="filled" />
                  ) : (
                    <div className="field-value">{user.country || '-'}</div>
                  )}
                </div>

                <div className="my-profile-field">
                  <label>City</label>
                  {isEditing ? (
                    <TextBox value={displayData.city || ''} onValueChanged={(e) => updateField('city', e.value)} stylingMode="filled" />
                  ) : (
                    <div className="field-value">{user.city || '-'}</div>
                  )}
                </div>

                <div className="my-profile-field col-span-2">
                  <label>State / Province</label>
                  {isEditing ? (
                    <TextBox value={displayData.state || ''} onValueChanged={(e) => updateField('state', e.value)} stylingMode="filled" />
                  ) : (
                    <div className="field-value">{user.state || '-'}</div>
                  )}
                </div>

                <div className="my-profile-field col-span-2">
                  <label>Address</label>
                  {isEditing ? (
                    <TextBox value={displayData.address || ''} onValueChanged={(e) => updateField('address', e.value)} stylingMode="filled" />
                  ) : (
                    <div className="field-value">{user.address || '-'}</div>
                  )}
                </div>

                <div className="my-profile-field col-span-2">
                  <label>Zip Code</label>
                  {isEditing ? (
                    <TextBox value={displayData.zip_code || ''} onValueChanged={(e) => updateField('zip_code', e.value)} stylingMode="filled" />
                  ) : (
                    <div className="field-value">{user.zip_code || '-'}</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Password Card */}
        <div className="my-profile-card password-card">
          <div className="my-profile-card-panel">
            <div className="my-profile-card-header">Change Password</div>
            <div className="my-profile-card-body">
              <div className="my-profile-form my-profile-form-2col">
                <div className="my-profile-field">
                  <label>New Password</label>
                  <TextBox value={newPassword} onValueChanged={(e) => setNewPassword(e.value)} placeholder="Min 6 characters" mode="password" stylingMode="filled" />
                </div>
                <div className="my-profile-field">
                  <label>Confirm Password</label>
                  <TextBox value={confirmPassword} onValueChanged={(e) => setConfirmPassword(e.value)} placeholder="Re-enter password" mode="password" stylingMode="filled" />
                </div>
              </div>

              {pwMessage && (
                <div className={`my-profile-message my-profile-message-${pwMessage.type}`} style={{ marginTop: '0.75rem' }}>
                  {pwMessage.text}
                </div>
              )}

              <div className="password-card-actions">
                <Button text="Change Password" stylingMode="outlined" onClick={handlePasswordChange} disabled={!newPassword || !confirmPassword} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
