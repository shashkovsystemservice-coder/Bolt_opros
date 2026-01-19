
import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // While the authentication state is being determined, we render nothing.
  // This is the key fix. Previously, it rendered a loading indicator, but
  // rendering *anything* different from the final component can cause flickers
  // and trigger re-renders that lead to the navigation loop.
  // By rendering null, we wait until the auth state is definitive.
  if (loading) {
    return null;
  }

  // Once loading is complete, we make a decision.
  if (!user) {
    // If there is no user, redirect to the authentication page.
    // We also pass the current location in state, so after login,
    // the user can be redirected back to the page they were trying to access.
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // If a user exists, render the requested child component.
  return <>{children}</>;
}
