import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { AppLayout } from '../layouts/AppLayout';
import { AttendanceTestPage } from '../pages/AttendanceTestPage';
import { DashboardPage } from '../pages/DashboardPage';
import { LoginPage } from '../pages/LoginPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { UserManagementPage } from '../pages/UserManagementPage';
import { AttendanceLivePage } from '../pages/AttendanceLivePage';
import { AttendanceLogsPage } from '../pages/AttendanceLogsPage';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: 'users',
        element: (
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <UserManagementPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'attendance-test',
        element: <AttendanceTestPage />,
      },
      {
        path: 'attendance-live',
        element: <AttendanceLivePage />,
      },
      {
        path: 'attendance-logs',
        element: <AttendanceLogsPage />,
      },
      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);
