import { ReactNode, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ClipboardList, LayoutDashboard, Settings, LogOut, Menu, X, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';

const SUPER_ADMIN_EMAIL = 'shashkov75@inbox.ru';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    if (user) {
      // Check if super admin
      if (user.email === SUPER_ADMIN_EMAIL) {
        setIsSuperAdmin(true);
      }

      supabase
        .from('companies')
        .select('name, is_super_admin')
        .eq('id', user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setCompanyName(data.name);
            if (data.is_super_admin) {
              setIsSuperAdmin(true);
            }
          }
        });
    }
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const menuItems = [
    { icon: LayoutDashboard, label: 'Опросы', path: '/dashboard' },
    { icon: Settings, label: 'Настройки', path: '/settings' },
  ];

  if (isSuperAdmin) {
    menuItems.push({
      icon: Shield,
      label: 'Админ-панель',
      path: '/admin/companies',
    });
  }

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <header className="bg-white border-b border-[#E8EAED] sticky top-0 z-40 h-16">
        <div className="h-full px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 hover:bg-[#F8F9FA] rounded-lg transition-colors"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5 text-[#5F6368]" strokeWidth={2} />
              ) : (
                <Menu className="w-5 h-5 text-[#5F6368]" strokeWidth={2} />
              )}
            </button>
            <div className="flex items-center gap-2">
              <ClipboardList className="w-6 h-6 text-[#1A73E8]" strokeWidth={2} />
              <span className="text-xl font-medium text-[#1F1F1F] tracking-tight">Survey Pro</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium text-[#1F1F1F]">{companyName}</div>
              <div className="text-xs text-[#5F6368]">{user?.email}</div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside
          className={`
            fixed lg:sticky top-16 left-0 h-[calc(100vh-4rem)] w-72 bg-[#F8F9FA] border-r border-[#E8EAED] transition-transform z-30
            ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
        >
          <nav className="p-4 space-y-1">
            {menuItems.map((item) => {
              const isAdminPanel = item.path === '/admin/companies';
              return (
                <button
                  key={item.path}
                  onClick={() => {
                    navigate(item.path);
                    setMobileMenuOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all
                    ${
                      isAdminPanel
                        ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md hover:shadow-lg'
                        : isActive(item.path)
                        ? 'bg-white text-[#1A73E8] shadow-sm'
                        : 'text-[#5F6368] hover:bg-white hover:text-[#1F1F1F]'
                    }
                  `}
                >
                  <item.icon className="w-5 h-5" strokeWidth={2} />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}

            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[#5F6368] hover:bg-white hover:text-red-600 transition-all"
            >
              <LogOut className="w-5 h-5" strokeWidth={2} />
              <span className="font-medium">Выход</span>
            </button>
          </nav>
        </aside>

        <main className="flex-1 min-h-[calc(100vh-4rem)]">
          {children}
        </main>
      </div>

      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/20 z-20 lg:hidden"
        />
      )}
    </div>
  );
}
