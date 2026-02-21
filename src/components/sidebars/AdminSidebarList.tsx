import { type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '@/lib/auth-store';

interface NavItem {
  key: string;
  label: string;
  icon: string;
  adminOnly: boolean;
}

const navItems: NavItem[] = [
  { key: 'organization', label: 'Organization', icon: 'dx-icon-home', adminOnly: true },
  { key: 'users', label: 'User Management', icon: 'dx-icon-group', adminOnly: true },
  { key: 'security', label: 'Security', icon: 'dx-icon-lock', adminOnly: true },
  { key: 'enums', label: 'Enum Settings', icon: 'dx-icon-variable', adminOnly: true },
  { key: 'views', label: 'View Columns', icon: 'dx-icon-columnproperties', adminOnly: true },
];

export function AdminSidebarList(): ReactNode {
  const navigate = useNavigate();
  const { section } = useParams<{ section?: string }>();
  const role = useAuthStore((s) => s.profile?.role);
  const isAdmin = role === 'admin';

  const activeSection = section || 'organization';
  const visibleItems = navItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <div className="sidebar-list">
      {visibleItems.map((item) => (
        <div
          key={item.key}
          className={`sidebar-list-item ${activeSection === item.key ? 'active' : ''}`}
          onClick={() => navigate(`/admin/${item.key}`)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && navigate(`/admin/${item.key}`)}
        >
          <i className={item.icon} />
          <span className="sidebar-item-name">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
