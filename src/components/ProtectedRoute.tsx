import { type ReactNode, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks';
import { useAuthStore } from '@/lib/auth-store';
import { useEnumConfigStore } from '@/lib/enum-config-store';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps): ReactNode {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const tenantId = useAuthStore((s) => s.profile?.tenant_id);
  const enumLoaded = useEnumConfigStore((s) => s.loaded);
  const loadConfigs = useEnumConfigStore((s) => s.loadConfigs);

  // Load enum configs once tenant_id is available
  useEffect(() => {
    if (tenantId && !enumLoaded) {
      loadConfigs(tenantId);
    }
  }, [tenantId, enumLoaded, loadConfigs]);

  if (isLoading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
