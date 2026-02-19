import { type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthStore } from '@/lib/auth-store';
import {
  ProfileSection,
  OrganizationSection,
  SecuritySection,
  AppearanceSection,
} from './settings';
import './SettingsPage.css';

export default function SettingsPage(): ReactNode {
  const { section } = useParams<{ section?: string }>();
  const role = useAuthStore((s) => s.profile?.role);
  const isAdmin = role === 'admin';

  const activeSection = section || 'profile';

  const renderSection = (): ReactNode => {
    switch (activeSection) {
      case 'profile':
        return <ProfileSection />;
      case 'organization':
        return isAdmin ? <OrganizationSection /> : null;
      case 'security':
        return isAdmin ? <SecuritySection /> : null;
      case 'appearance':
        return isAdmin ? <AppearanceSection /> : null;
      default:
        return <ProfileSection />;
    }
  };

  return (
    <div className="settings-page">
      <div className="page-header">
        <h1>Settings</h1>
        <p>Manage your account and organization preferences</p>
      </div>

      <div className="settings-content">
        {renderSection()}
      </div>
    </div>
  );
}
