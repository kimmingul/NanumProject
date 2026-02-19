import { type ReactNode, useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import {
  ProfileSection,
  OrganizationSection,
  SecuritySection,
  AppearanceSection,
} from './settings';
import './SettingsPage.css';

interface NavItem {
  key: string;
  label: string;
  icon: string;
  adminOnly: boolean;
}

const navItems: NavItem[] = [
  { key: 'profile', label: 'My Profile', icon: 'dx-icon-user', adminOnly: false },
  { key: 'organization', label: 'Organization', icon: 'dx-icon-home', adminOnly: true },
  { key: 'security', label: 'Security', icon: 'dx-icon-lock', adminOnly: true },
  { key: 'appearance', label: 'Appearance', icon: 'dx-icon-palette', adminOnly: true },
];

export default function SettingsPage(): ReactNode {
  const role = useAuthStore((s) => s.profile?.role);
  const isAdmin = role === 'admin';
  const [activeSection, setActiveSection] = useState('profile');

  const visibleNavItems = navItems.filter((item) => !item.adminOnly || isAdmin);

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

      <div className="settings-layout">
        <div className="settings-sidebar">
          <nav className="sidebar-nav">
            {visibleNavItems.map((item) => (
              <button
                key={item.key}
                className={`nav-item ${activeSection === item.key ? 'active' : ''}`}
                onClick={() => setActiveSection(item.key)}
              >
                <i className={item.icon} />
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="settings-content">
          {renderSection()}
        </div>
      </div>
    </div>
  );
}
