import { type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthStore } from '@/lib/auth-store';
import {
  OrganizationSection,
  SecuritySection,
  AppearanceSection,
  UsersSection,
} from './admin';
import './AdminPage.css';

export default function AdminPage(): ReactNode {
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
    <div className="admin-page">
      <div className="page-header">
        <h1>Admin</h1>
        <p>Organization and system administration</p>
      </div>

      <div className="admin-content">
        {renderSection()}
      </div>
    </div>
  );
}
