import { type ReactNode, useEffect, useRef, useState } from 'react';
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
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    reset();
    navigate('/login');
  };

  // Close dropdown on outside click
  useEffect(() => {
    if (!profileMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [profileMenuOpen]);

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

      <div className="ide-header-right" ref={profileMenuRef}>
        <div
          className="ide-user-info"
          role="button"
          tabIndex={0}
          onClick={() => setProfileMenuOpen((v) => !v)}
          onKeyDown={(e) => e.key === 'Enter' && setProfileMenuOpen((v) => !v)}
        >
          <div className="ide-user-avatar">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="ide-user-avatar-img" />
            ) : (
              profile?.full_name?.charAt(0).toUpperCase() || 'U'
            )}
          </div>
          <span className="ide-user-name">{profile?.full_name || 'User'}</span>
          <i className={`dx-icon-spindown ide-user-caret ${profileMenuOpen ? 'open' : ''}`} />
        </div>

        {profileMenuOpen && (
          <div className="ide-profile-menu">
            <div className="ide-profile-menu-header">
              <div className="ide-profile-menu-email">{profile?.email}</div>
              <div className="ide-profile-menu-role">{profile?.role}</div>
            </div>
            <div className="ide-profile-menu-divider" />
            <button
              className="ide-profile-menu-item"
              onClick={() => { setProfileMenuOpen(false); navigate('/settings'); }}
            >
              <i className="dx-icon-user" />
              My Profile
            </button>
            <button
              className="ide-profile-menu-item"
              onClick={() => { setProfileMenuOpen(false); navigate('/settings'); }}
            >
              <i className="dx-icon-preferences" />
              Settings
            </button>
            <div className="ide-profile-menu-divider" />
            <button
              className="ide-profile-menu-item ide-profile-menu-danger"
              onClick={() => { setProfileMenuOpen(false); handleSignOut(); }}
            >
              <i className="dx-icon-runner" />
              Sign Out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
