import { type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthStore } from '@/lib/auth-store';
import {
  OrganizationSection,
  SecuritySection,
  UsersSection,
  EnumConfigSection,
  ViewSettingsSection,
} from './admin';
import './AdminPage.css';

const SECTION_LABELS: Record<string, string> = {
  organization: 'Organization',
  users: 'Users',
  security: 'Security',
  enums: 'Enum Config',
  views: 'View Settings',
};

export default function AdminPage(): ReactNode {
  const { section } = useParams<{ section?: string }>();
  const role = useAuthStore((s) => s.profile?.role);
  const isAdmin = role === 'admin';

  const activeSection = section || 'organization';
  const sectionLabel = SECTION_LABELS[activeSection] || 'Organization';

  const renderSection = (): ReactNode => {
    if (!isAdmin) return null;
    switch (activeSection) {
      case 'organization':
        return <OrganizationSection />;
      case 'users':
        return <UsersSection />;
      case 'security':
        return <SecuritySection />;
      case 'enums':
        return <EnumConfigSection />;
      case 'views':
        return <ViewSettingsSection />;
      default:
        return <OrganizationSection />;
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-breadcrumb">
        <span className="breadcrumb-root">Admin</span>
        <i className="dx-icon-chevronright breadcrumb-sep" />
        <span className="breadcrumb-current">{sectionLabel}</span>
      </div>

      <div className="admin-content">
        {renderSection()}
      </div>
    </div>
  );
}
