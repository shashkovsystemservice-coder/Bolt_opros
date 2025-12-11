import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface AdminRouteProps {
  children: React.ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { session } = useAuth();
  const [isPasswordAuthenticated, setIsPasswordAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuthentication = () => {
      try {
        const authenticated = sessionStorage.getItem('admin_authenticated') === 'true';
        setIsPasswordAuthenticated(authenticated);
      } catch (e) {
        setIsPasswordAuthenticated(false);
      }
    };

    checkAuthentication();

    // Listen for changes in other tabs
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'admin_authenticated') {
        checkAuthentication();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  if (isPasswordAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border border-[#1A73E8] border-t-transparent mx-auto mb-4"></div>
          <p className="text-[#5F6368]">Проверка доступа...</p>
        </div>
      </div>
    );
  }
  
  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  if (!isPasswordAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
