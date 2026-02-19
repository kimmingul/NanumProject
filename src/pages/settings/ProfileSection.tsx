import { type ReactNode, useRef, useState } from 'react';
import { TextBox } from 'devextreme-react/text-box';
import { Button } from 'devextreme-react/button';
import { useAuthStore } from '@/lib/auth-store';
import { useAuth } from '@/hooks/useAuth';
import { useUserManagement } from '@/hooks/useUserManagement';

export default function ProfileSection(): ReactNode {
  const profile = useAuthStore((s) => s.profile);
  const setProfile = useAuthStore((s) => s.setProfile);
  const { updatePassword } = useAuth();
  const { updateProfile, uploadAvatar, removeAvatar } = useUserManagement();

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getInitials = (): string => {
    if (profile?.full_name) return profile.full_name.charAt(0).toUpperCase();
    if (profile?.email) return profile.email.charAt(0).toUpperCase();
    return '?';
  };

  const handleSaveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      if (fullName !== (profile.full_name || '')) {
        await updateProfile(profile.user_id, { full_name: fullName });
        setProfile({ ...profile, full_name: fullName, avatar_url: avatarUrl });
      }
      setSuccess('Profile updated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be under 2MB');
      return;
    }
    if (!file.type.startsWith('image/')) {
      setError('Only image files are allowed');
      return;
    }

    setError('');
    try {
      const url = await uploadAvatar(profile.user_id, file);
      setAvatarUrl(url);
      setProfile({ ...profile, avatar_url: url });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAvatarRemove = async () => {
    if (!profile) return;
    setError('');
    try {
      await removeAvatar(profile.user_id);
      setAvatarUrl(null);
      setProfile({ ...profile, avatar_url: null });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Remove failed');
    }
  };

  const handlePasswordChange = async () => {
    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setError('');
    setSuccess('');
    try {
      await updatePassword(newPassword);
      setNewPassword('');
      setConfirmPassword('');
      setSuccess('Password changed successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password change failed');
    }
  };

  return (
    <div className="settings-section">
      <h2 className="section-title">My Profile</h2>
      <p className="section-desc">Manage your personal information and password</p>

      {/* Avatar */}
      <div className="avatar-section">
        <div className="avatar-preview-wrap">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="avatar-preview" />
          ) : (
            <span className="avatar-placeholder">{getInitials()}</span>
          )}
        </div>
        <div className="avatar-actions">
          <Button
            text="Upload Photo"
            icon="image"
            stylingMode="outlined"
            onClick={() => fileInputRef.current?.click()}
          />
          {avatarUrl && (
            <Button
              text="Remove"
              icon="trash"
              stylingMode="text"
              onClick={handleAvatarRemove}
            />
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleAvatarUpload}
          />
        </div>
      </div>

      <div className="form-divider" />

      {/* Email (read-only) */}
      <div className="form-field">
        <label>Email</label>
        <TextBox
          value={profile?.email || ''}
          readOnly={true}
          stylingMode="outlined"
        />
      </div>

      {/* Full Name */}
      <div className="form-field">
        <label>Full Name</label>
        <TextBox
          value={fullName}
          onValueChanged={(e) => setFullName(e.value)}
          placeholder="Enter your name"
          stylingMode="outlined"
        />
      </div>

      <div className="section-actions">
        <Button
          text={saving ? 'Saving...' : 'Save Profile'}
          type="default"
          stylingMode="contained"
          onClick={handleSaveProfile}
          disabled={saving}
        />
      </div>

      <div className="form-divider" />

      {/* Password Change */}
      <div className="form-field">
        <label>New Password</label>
        <TextBox
          value={newPassword}
          onValueChanged={(e) => setNewPassword(e.value)}
          placeholder="New password (min 6 chars)"
          mode="password"
          stylingMode="outlined"
        />
      </div>

      <div className="form-field">
        <label>Confirm Password</label>
        <TextBox
          value={confirmPassword}
          onValueChanged={(e) => setConfirmPassword(e.value)}
          placeholder="Confirm new password"
          mode="password"
          stylingMode="outlined"
        />
      </div>

      {error && <div className="form-error">{error}</div>}
      {success && <div className="form-success">{success}</div>}

      <div className="section-actions">
        <Button
          text="Change Password"
          stylingMode="outlined"
          onClick={handlePasswordChange}
          disabled={!newPassword || !confirmPassword}
        />
      </div>
    </div>
  );
}
