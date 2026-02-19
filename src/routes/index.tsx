import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { IDELayout } from '@/components/IDELayout';
import HomePage from '@/pages/HomePage';
import LoginPage from '@/pages/LoginPage';
import SignUpPage from '@/pages/SignUpPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import DashboardPage from '@/pages/DashboardPage';
import UsersPage from '@/pages/UsersPage';
import AuditLogPage from '@/pages/AuditLogPage';
import ProjectListPage from '@/pages/ProjectListPage';
import ProjectDetailPage from '@/pages/ProjectDetailPage';

const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/signup',
    element: <SignUpPage />,
  },
  {
    path: '/reset-password',
    element: <ResetPasswordPage />,
  },
  {
    element: (
      <ProtectedRoute>
        <IDELayout>
          <Outlet />
        </IDELayout>
      </ProtectedRoute>
    ),
    children: [
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/projects', element: <ProjectListPage /> },
      { path: '/users', element: <UsersPage /> },
      { path: '/audit', element: <AuditLogPage /> },
      { path: '/settings', element: <DashboardPage /> },
      { path: '/projects/:projectId', element: <ProjectDetailPage /> },
      { path: '/projects/:projectId/:tab', element: <ProjectDetailPage /> },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
