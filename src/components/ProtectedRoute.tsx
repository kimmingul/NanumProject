import { type ReactNode, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks';
import { useAuthStore } from '@/lib/auth-store';
import { useEnumConfigStore } from '@/lib/enum-config-store';
import { useViewConfigStore } from '@/lib/view-config-store';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps): ReactNode {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const tenantId = useAuthStore((s) => s.profile?.tenant_id);
  const enumLoaded = useEnumConfigStore((s) => s.loaded);
  const loadEnumConfigs = useEnumConfigStore((s) => s.loadConfigs);
  const viewConfigsLoaded = useViewConfigStore((s) => s.tenantConfigsLoaded);
  const loadViewConfigs = useViewConfigStore((s) => s.loadTenantConfigs);
  const loadUserStates = useViewConfigStore((s) => s.loadUserStates);

  // Load enum configs once tenant_id is available
  useEffect(() => {
    if (tenantId && !enumLoaded) {
      loadEnumConfigs(tenantId);
    }
  }, [tenantId, enumLoaded, loadEnumConfigs]);

  // Load view configs once tenant_id is available
  useEffect(() => {
    if (tenantId && !viewConfigsLoaded) {
      loadViewConfigs(tenantId);
      loadUserStates();
    }
  }, [tenantId, viewConfigsLoaded, loadViewConfigs, loadUserStates]);

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
