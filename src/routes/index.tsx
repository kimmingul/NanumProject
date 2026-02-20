import { createBrowserRouter, RouterProvider, Outlet, Navigate, useParams } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { IDELayout } from '@/components/IDELayout';
import HomePage from '@/pages/HomePage';
import LoginPage from '@/pages/LoginPage';
import SignUpPage from '@/pages/SignUpPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import DashboardPage from '@/pages/DashboardPage';
import AdminPage from '@/pages/AdminPage';
import UsersPage from '@/pages/UsersPage';
import AuditLogPage from '@/pages/AuditLogPage';
import ProjectListPage from '@/pages/ProjectListPage';
import TasksWorkspacePage from '@/pages/TasksWorkspacePage';
import MyProfilePage from '@/pages/MyProfilePage';
import UserSettingsPage from '@/pages/UserSettingsPage';

/** Redirect /projects/:projectId(/:tab) → /tasks/:projectId(/:tab) */
function ProjectRedirect() {
  const { projectId, tab } = useParams();
  return <Navigate to={`/tasks/${projectId}${tab ? `/${tab}` : ''}`} replace />;
}

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
      { path: '/tasks', element: <TasksWorkspacePage /> },
      { path: '/tasks/:projectId', element: <TasksWorkspacePage /> },
      { path: '/tasks/:projectId/:tab', element: <TasksWorkspacePage /> },
      { path: '/profile', element: <MyProfilePage /> },
      { path: '/users', element: <UsersPage /> },
      { path: '/users/:userId', element: <UsersPage /> },
      { path: '/audit', element: <AuditLogPage /> },
      { path: '/settings', element: <UserSettingsPage /> },
      { path: '/settings/:section', element: <UserSettingsPage /> },
      { path: '/admin', element: <AdminPage /> },
      { path: '/admin/:section', element: <AdminPage /> },
      // Legacy: /projects/:projectId → /tasks/:projectId
      { path: '/projects/:projectId', element: <ProjectRedirect /> },
      { path: '/projects/:projectId/:tab', element: <ProjectRedirect /> },
      // Legacy redirects
      { path: '/dashboard/users', element: <Navigate to="/users" replace /> },
      { path: '/dashboard/audit', element: <Navigate to="/audit" replace /> },
      { path: '/dashboard/settings', element: <Navigate to="/admin" replace /> },
      { path: '/dashboard/overview', element: <Navigate to="/dashboard" replace /> },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
