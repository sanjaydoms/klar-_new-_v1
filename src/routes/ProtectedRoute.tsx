import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../features/authentication/hooks/useAuth.tsx';

interface ProtectedRouteProps {
  redirectTo?: string;
}

/**
 * ProtectedRoute - Wraps routes that require authentication
 * Redirects to login if user is not authenticated
 */
export const ProtectedRoute = ({ redirectTo = '/b2b' }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Save the current location to redirect back after login
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  return <Outlet />;
};
