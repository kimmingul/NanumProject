import { type ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from 'devextreme-react/button';
import { useAuthStore } from '@/lib/auth-store';
import './NavRail.css';

interface NavItem {
  path: string;
  icon: string;
  label: string;
  adminOnly?: boolean;
  bottom?: boolean;
}

const navItems: NavItem[] = [
  { path: '/dashboard', icon: 'home', label: 'Dashboard' },
  { path: '/projects', icon: 'folder', label: 'Projects' },
  { path: '/users', icon: 'group', label: 'Users', adminOnly: true },
  { path: '/audit', icon: 'fieldchooser', label: 'Audit', adminOnly: true },
  { path: '/settings', icon: 'preferences', label: 'Settings', bottom: true },
];

export function NavRail(): ReactNode {
  const navigate = useNavigate();
  const location = useLocation();
  const role = useAuthStore((s) => s.profile?.role);
  const isAdmin = role === 'admin';

  const isActive = (path: string): boolean => {
    if (path === '/projects') return location.pathname.startsWith('/projects');
    if (path === '/settings') return location.pathname.startsWith('/settings');
    return location.pathname === path;
  };

  const topItems = navItems.filter((item) => !item.bottom && (!item.adminOnly || isAdmin));
  const bottomItems = navItems.filter((item) => item.bottom && (!item.adminOnly || isAdmin));

  return (
    <nav className="nav-rail">
      <div className="nav-rail-top">
        {topItems.map((item) => (
          <Button
            key={item.path}
            icon={item.icon}
            stylingMode="text"
            hint={item.label}
            className={`nav-rail-btn ${isActive(item.path) ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
          />
        ))}
      </div>
      <div className="nav-rail-bottom">
        {bottomItems.map((item) => (
          <Button
            key={item.path}
            icon={item.icon}
            stylingMode="text"
            hint={item.label}
            className={`nav-rail-btn ${isActive(item.path) ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
          />
        ))}
      </div>
    </nav>
  );
}
