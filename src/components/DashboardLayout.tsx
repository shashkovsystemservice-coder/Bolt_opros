
import { ReactNode, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ClipboardList, LayoutDashboard, Settings, LogOut, Menu, X, Shield, Users, ListChecks, BarChart2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AdminPasswordModal } from './AdminPasswordModal';
import { MobileBottomNav } from './MobileBottomNav';

const SUPER_ADMIN_EMAIL = 'shashkov.systemservice@gmail.com';

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
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingAdminPath, setPendingAdminPath] = useState('');

  useEffect(() => {
    if (user) {
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
    sessionStorage.removeItem('admin_authenticated');
    navigate('/auth');
  };

  const handleNavigation = (path: string) => {
    const isAdminPath = path.startsWith('/admin');

    if (isAdminPath && isSuperAdmin && !sessionStorage.getItem('admin_authenticated')) {
      setPendingAdminPath(path);
      setShowPasswordModal(true);
      return;
    }

    navigate(path);
    setMobileMenuOpen(false);
  };

  const handlePasswordSuccess = () => {
    setShowPasswordModal(false);
    if (pendingAdminPath) {
      navigate(pendingAdminPath);
      setPendingAdminPath('');
      setMobileMenuOpen(false);
    }
  };

  const menuItems = [
    { icon: LayoutDashboard, label: 'Опросы', path: '/dashboard', disabled: false },
    { icon: ListChecks, label: 'Чек-листы', path: '/checklists', disabled: true },
    { icon: BarChart2, label: 'Отчеты', path: '/reports', disabled: true },
    { icon: Users, label: 'Контакты', path: '/dashboard/contacts', disabled: false },
    { icon: Settings, label: 'Настройки', path: '/dashboard/settings', disabled: false },
  ];

  if (isSuperAdmin) {
    menuItems.push({
      icon: Shield,
      label: 'Админ-панель',
      path: '/admin/companies',
      disabled: false,
    });
  }

  const isActive = (path: string) => {
    const { pathname } = location;
    if (path === '/dashboard') {
      return pathname.startsWith('/dashboard') && !pathname.startsWith('/dashboard/contacts') && !pathname.startsWith('/dashboard/settings');
    }
    return pathname === path;
  };
  
  const isAdminActive = () => location.pathname.startsWith('/admin');

  return (
    <div className="min-h-screen bg-background text-text-primary">
      <header className="bg-surface border-b border-border-subtle sticky top-0 z-40 h-16">
        <div className="h-full px-4 md:px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 hover:bg-background rounded-full transition-colors"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5 text-text-secondary" strokeWidth={2.5} />
              ) : (
                <Menu className="w-5 h-5 text-text-secondary" strokeWidth={2.5} />
              )}
            </button>
            <div className="flex items-center gap-3">
              <ClipboardList className="w-7 h-7 text-primary" strokeWidth={2} />
              <span className="text-xl font-semibold text-text-primary tracking-tight">Survey Pro</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium text-text-primary">{companyName}</div>
              <div className="text-xs text-text-secondary">{user?.email}</div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside
          className={`fixed lg:sticky top-16 left-0 h-[calc(100vh-4rem)] w-64 bg-surface border-r border-border-subtle z-30 ${mobileMenuOpen ? 'block' : 'hidden'} lg:block`}>
          <nav className="p-4 space-y-2">
            {menuItems.map((item) => {
              const isAdminPanel = item.label === 'Админ-панель';
              const itemIsActive = isAdminPanel ? isAdminActive() : isActive(item.path);

              return (
                <button
                  key={item.path}
                  onClick={() => !item.disabled && handleNavigation(item.path)}
                  disabled={item.disabled}
                  className={`w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl transition-all font-medium text-sm ${
                    itemIsActive 
                      ? 'bg-primary/10 text-primary' 
                      : item.disabled 
                      ? 'text-text-secondary/50 cursor-not-allowed' 
                      : 'text-text-secondary hover:bg-background'
                  }`}
                >
                  <item.icon className="w-5 h-5" strokeWidth={2} />
                  <span>{item.label}</span>
                </button>
              );
            })}

            <div className="pt-4">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-text-secondary hover:bg-red-500/10 hover:text-red-600 transition-all font-medium text-sm"
              >
                <LogOut className="w-5 h-5" strokeWidth={2} />
                <span>Выход</span>
              </button>
            </div>
          </nav>
        </aside>

        <main className="flex-1 min-h-[calc(100vh-4rem)]">
          <div className="max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-6">
            {children}
           </div>
        </main>
      </div>

      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-20 lg:hidden"
        />
      )}

      <AdminPasswordModal
        isOpen={showPasswordModal}
        onClose={() => {
          setShowPasswordModal(false);
          setPendingAdminPath('');
        }}
        onSuccess={handlePasswordSuccess}
      />
      
      <MobileBottomNav />
    </div>
  );
}
