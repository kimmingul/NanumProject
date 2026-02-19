import { type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthStore } from '@/lib/auth-store';
import {
  OrganizationSection,
  SecuritySection,
  AppearanceSection,
  UsersSection,
} from './settings';
import './SettingsPage.css';

export default function SettingsPage(): ReactNode {
  const { section } = useParams<{ section?: string }>();
  const role = useAuthStore((s) => s.profile?.role);
  const isAdmin = role === 'admin';

  const activeSection = section || 'organization';

  const renderSection = (): ReactNode => {
    if (!isAdmin) return null;
    switch (activeSection) {
      case 'organization':
        return <OrganizationSection />;
      case 'users':
        return <UsersSection />;
      case 'security':
        return <SecuritySection />;
      case 'appearance':
        return <AppearanceSection />;
      default:
        return <OrganizationSection />;
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
