import { type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

interface NavItem {
  key: string;
  label: string;
  icon: string;
}

const navItems: NavItem[] = [
  { key: 'appearance', label: 'Appearance', icon: 'dx-icon-palette' },
  { key: 'regional', label: 'Regional', icon: 'dx-icon-globe' },
  { key: 'workspace', label: 'Workspace', icon: 'dx-icon-contentlayout' },
];

export function SettingsSidebarList(): ReactNode {
  const navigate = useNavigate();
  const { section } = useParams<{ section?: string }>();
  const activeSection = section || 'appearance';

  return (
    <div className="sidebar-list">
      {navItems.map((item) => (
        <div
          key={item.key}
          className={`sidebar-list-item ${activeSection === item.key ? 'active' : ''}`}
          onClick={() => navigate(`/settings/${item.key}`)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && navigate(`/settings/${item.key}`)}
        >
          <i className={item.icon} />
          <span className="sidebar-item-name">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
