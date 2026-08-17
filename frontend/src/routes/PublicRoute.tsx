import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../features/authentication/hooks/useAuth.tsx';

interface PublicRouteProps {
  redirectTo?: string;
}

export const PublicRoute = ({ redirectTo = '/' }: PublicRouteProps) => {
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

  if (isAuthenticated) {
    // Check for stored redirect path from sessionStorage or localStorage
    const storedRedirect =
      sessionStorage.getItem('redirectAfterLogin') || localStorage.getItem('redirectAfterLogin');

    // Also check URL parameter as backup
    const urlParams = new URLSearchParams(location.search);
    const redirectParam = urlParams.get('redirect');

    console.log('🔄 PublicRoute: Checking for redirect...');
    console.log('📝 storedRedirect (session/local):', storedRedirect);
    console.log('📝 redirectParam (URL):', redirectParam);
    console.log('📍 current path:', location.pathname);

    // ✅ REMOVE the isLoginPage check - check for ANY valid redirect
    if (storedRedirect && 
        storedRedirect !== '/b2b' && 
        storedRedirect !== '/login' &&
        storedRedirect !== '/' &&
        storedRedirect !== '/dashboard') {
      console.log('🔄 PublicRoute: Redirecting to stored path:', storedRedirect);
      // Clear both storages
      sessionStorage.removeItem('redirectAfterLogin');
      localStorage.removeItem('redirectAfterLogin');
      return <Navigate to={storedRedirect} replace />;
    }

    // Also check URL parameter as backup
    if (redirectParam && 
        redirectParam !== '/b2b' && 
        redirectParam !== '/login') {
      console.log('🔄 PublicRoute: Redirecting to URL param:', redirectParam);
      sessionStorage.removeItem('redirectAfterLogin');
      localStorage.removeItem('redirectAfterLogin');
      return <Navigate to={redirectParam} replace />;
    }

    // Also check for pending traveller data (means user was on traveller info page)
    const pendingTravellerData = sessionStorage.getItem('pendingTravellerData');
    if (pendingTravellerData) {
      console.log('🔄 PublicRoute: Found pending traveller data, redirecting to /traveller-info');
      return <Navigate to="/traveller-info" replace />;
    }

    console.log('🔄 PublicRoute: No stored redirect, going to default:', redirectTo);
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
};
