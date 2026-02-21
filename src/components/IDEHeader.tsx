import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/lib/auth-store';
import { useThemeStore } from '@/lib/theme-store';
import { supabase } from '@/lib/supabase';
import type { TenantSettings } from '@/types';
import { GlobalSearch } from './GlobalSearch';
import { NotificationBell } from './NotificationBell';

export function IDEHeader(): ReactNode {
  const navigate = useNavigate();
  const profile = useAuthStore((s) => s.profile);
  const reset = useAuthStore((s) => s.reset);
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Branding from tenant settings
  const [branding, setBranding] = useState<TenantSettings['branding']>(undefined);

  useEffect(() => {
    if (!profile?.tenant_id) return;
    supabase
      .from('tenants')
      .select('settings')
      .eq('id', profile.tenant_id)
      .single()
      .then(({ data }) => {
        const settings = data?.settings as TenantSettings | null;
        if (settings?.branding) {
          setBranding(settings.branding);
        }
      });
  }, [profile?.tenant_id]);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

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

  // Cmd+K / Ctrl+K global shortcut
  const openSearch = useCallback(() => setSearchOpen(true), []);
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header className="ide-header">
      <div className="ide-header-left">
        <div
          className="ide-app-branding"
          onClick={() => navigate('/dashboard')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && navigate('/dashboard')}
        >
          {branding?.logo_url && (
            <img src={branding.logo_url} alt="" className="ide-app-logo" />
          )}
          <span className="ide-app-title">
            {branding?.app_name || 'Nanum Project'}
          </span>
        </div>
      </div>

      <div className="ide-header-center">
        <button className="ide-search-trigger" onClick={openSearch}>
          <i className="dx-icon-search" />
          <span>Search...</span>
          <kbd>&#8984;K</kbd>
        </button>
      </div>

      <div className="ide-header-right" ref={profileMenuRef}>
        <button
          className="ide-theme-toggle"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          <i className={theme === 'dark' ? 'dx-icon-sun' : 'dx-icon-moon'} />
        </button>
        <NotificationBell />
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
              onClick={() => { setProfileMenuOpen(false); navigate('/profile'); }}
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
            {profile?.role === 'admin' && (
            <button
              className="ide-profile-menu-item"
              onClick={() => { setProfileMenuOpen(false); navigate('/admin'); }}
            >
              <i className="dx-icon-lock" />
              Admin
            </button>
            )}
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
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );
}
