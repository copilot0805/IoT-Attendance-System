import { Navigate } from 'react-router-dom';
import { useAuth } from '../features/auth/useAuth';

type ProtectedRouteProps = {
  children: JSX.Element;
  allowedRoles?: Array<'ADMIN' | 'EMPLOYEE' | string>;
};

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
