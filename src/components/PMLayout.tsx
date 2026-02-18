import { type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks';
import './PMLayout.css';

interface Breadcrumb {
  label: string;
  path?: string;
}

interface PMLayoutProps {
  children: ReactNode;
  breadcrumbs?: Breadcrumb[];
}

export function PMLayout({ children, breadcrumbs }: PMLayoutProps): ReactNode {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="pm-layout">
      <header className="pm-header">
        <div className="pm-header-content">
          <div className="pm-header-left">
            <h1
              className="pm-app-title"
              onClick={() => navigate('/dashboard')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && navigate('/dashboard')}
            >
              NanumProject
            </h1>
            {breadcrumbs && breadcrumbs.length > 0 && (
              <nav className="pm-breadcrumb">
                {breadcrumbs.map((crumb, i) => (
                  <span key={i} className="pm-breadcrumb-item">
                    {i > 0 && <span className="pm-breadcrumb-sep">/</span>}
                    {crumb.path ? (
                      <a
                        className="pm-breadcrumb-link"
                        onClick={() => navigate(crumb.path!)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && navigate(crumb.path!)}
                      >
                        {crumb.label}
                      </a>
                    ) : (
                      <span className="pm-breadcrumb-current">{crumb.label}</span>
                    )}
                  </span>
                ))}
              </nav>
            )}
          </div>
          <div className="pm-header-right">
            <div className="pm-user-info">
              <div className="pm-user-avatar">
                {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="pm-user-details">
                <div className="pm-user-name">{profile?.full_name || 'User'}</div>
                <div className="pm-user-role">{profile?.role || 'user'}</div>
              </div>
            </div>
            <button onClick={handleSignOut} className="pm-sign-out-btn">
              Sign Out
            </button>
          </div>
        </div>
      </header>
      <main className="pm-main">{children}</main>
    </div>
  );
}
