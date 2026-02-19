import { type ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from 'devextreme-react/button';
import { useAuthStore } from '@/lib/auth-store';
import { supabase } from '@/lib/supabase';
import { usePMStore } from '@/lib/pm-store';

const navItems = [
  { path: '/dashboard', icon: 'dx-icon-home', label: 'Dashboard' },
  { path: '/projects', icon: 'dx-icon-folder', label: 'Projects' },
  { path: '/users', icon: 'dx-icon-group', label: 'Users' },
  { path: '/audit', icon: 'dx-icon-fieldchooser', label: 'Audit' },
];

export function IDEHeader(): ReactNode {
  const navigate = useNavigate();
  const location = useLocation();
  const profile = useAuthStore((s) => s.profile);
  const reset = useAuthStore((s) => s.reset);
  const toggleLeftPanel = usePMStore((s) => s.toggleLeftPanel);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    reset();
    navigate('/login');
  };

  const isActive = (path: string) => {
    if (path === '/projects') return location.pathname.startsWith('/projects');
    return location.pathname === path;
  };

  return (
    <header className="ide-header">
      <div className="ide-header-left">
        <Button
          icon="menu"
          stylingMode="text"
          hint="Toggle sidebar"
          className="ide-header-btn ide-hamburger"
          onClick={toggleLeftPanel}
        />
        <span className="ide-app-title" onClick={() => navigate('/dashboard')} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && navigate('/dashboard')}>
          NanumProject
        </span>
        <nav className="ide-header-nav">
          {navItems.map((item) => (
            <Button
              key={item.path}
              icon={item.icon.replace('dx-icon-', '')}
              stylingMode="text"
              hint={item.label}
              className={`ide-header-btn ide-nav-btn ${isActive(item.path) ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
            />
          ))}
        </nav>
      </div>

      <div className="ide-header-center">
        <button className="ide-search-trigger" disabled>
          <i className="dx-icon-search" />
          <span>Search...</span>
          <kbd>&#8984;K</kbd>
        </button>
      </div>

      <div className="ide-header-right">
        <div className="ide-user-info">
          <div className="ide-user-avatar">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="ide-user-avatar-img" />
            ) : (
              profile?.full_name?.charAt(0).toUpperCase() || 'U'
            )}
          </div>
          <span className="ide-user-name">{profile?.full_name || 'User'}</span>
        </div>
        <Button
          icon="runner"
          stylingMode="text"
          hint="Sign Out"
          className="ide-header-btn ide-signout-btn"
          onClick={handleSignOut}
        />
      </div>
    </header>
  );
}
