import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const SUPER_ADMIN_EMAIL = 'shashkov75@inbox.ru';

interface AdminRouteProps {
  children: React.ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { session } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);
  const [isPasswordAuthenticated, setIsPasswordAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuthentication = () => {
      const authenticated = sessionStorage.getItem('admin_authenticated') === 'true';
      setIsPasswordAuthenticated(authenticated);
    };

    checkAuthentication();

    const handleStorageChange = () => {
      checkAuthentication();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    const checkSuperAdmin = async () => {
      if (!session?.user) {
        setIsSuperAdmin(false);
        return;
      }

      if (session.user.email === SUPER_ADMIN_EMAIL) {
        setIsSuperAdmin(true);
        return;
      }

      try {
        const { data } = await supabase
          .from('companies')
          .select('is_super_admin')
          .eq('id', session.user.id)
          .maybeSingle();

        setIsSuperAdmin(data?.is_super_admin || false);
      } catch (err) {
        setIsSuperAdmin(false);
      }
    };

    checkSuperAdmin();
  }, [session]);

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  if (isSuperAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border border-[#1A73E8] border-t-transparent mx-auto mb-4"></div>
          <p className="text-[#5F6368]">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!isPasswordAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
