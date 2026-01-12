
import { ReactNode, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  Shield, 
  BarChart2, 
  Folder, 
  FileText, 
  CheckSquare, 
  Award, 
  Inbox, 
  PlusSquare, 
  Home
} from 'lucide-react';
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

  const menuGroups = [
    {
      title: 'DESIGN LAB (КОНСТРУКТОР)',
      items: [
        { icon: PlusSquare, label: 'Новый опрос', path: '/instruments/create', disabled: false, isPrimary: true },
        { icon: Folder, label: 'Blueprints', path: '/blueprints', disabled: true },
      ]
    },
    {
      title: 'REGISTRY (БИБЛИОТЕКА)',
      items: [
        { icon: FileText, label: 'Surveys', path: '/dashboard', disabled: false },
        { icon: CheckSquare, label: 'Checklists', path: '/checklists', disabled: true },
        { icon: Award, label: 'Standards', path: '/standards', disabled: true },
      ]
    },
    {
      title: 'DATA HUB (ДАННЫЕ)',
      items: [
        { icon: Inbox, label: 'Responses', path: '/dashboard/responses', disabled: false },
        { icon: BarChart2, label: 'Reports', path: '/reports', disabled: true },
      ]
    },
    {
        title: 'УПРАВЛЕНИЕ',
        items: [
          { icon: Settings, label: 'Настройки', path: '/dashboard/settings', disabled: false },
        ]
      }
  ];

  const adminMenuItem = {
    icon: Shield,
    label: 'Админ-панель',
    path: '/admin/companies',
    disabled: false,
  };

  const isActive = (path: string) => {
    const { pathname } = location;
    if (path === '/dashboard') {
      return pathname === '/dashboard' || pathname === '/';
    }
    return pathname.startsWith(path);
  };
  
  const isAdminActive = () => location.pathname.startsWith('/admin');

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 h-16">
        <div className="h-full px-4 md:px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5 text-gray-600" strokeWidth={2.5} />
              ) : (
                <Menu className="w-5 h-5 text-gray-600" strokeWidth={2.5} />
              )}
            </button>
            <div className="flex items-center gap-3">
              <FileText className="w-7 h-7 text-blue-600" strokeWidth={2} />
              <span className="text-xl font-semibold text-gray-800 tracking-tight">Survey Pro</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium text-gray-800">{companyName}</div>
              <div className="text-xs text-gray-500">{user?.email}</div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside
          className={`fixed lg:sticky top-16 left-0 h-[calc(100vh-4rem)] w-64 bg-white border-r border-gray-200 z-30 ${mobileMenuOpen ? 'block' : 'hidden'} lg:block`}>
          <nav className="p-4 flex flex-col h-full">
            <div className="flex-grow">
                <button
                    disabled={true}
                    className={`w-full flex items-center gap-3.5 px-4 py-2.5 rounded-lg font-medium text-sm mb-4 text-gray-400 cursor-not-allowed`}
                >
                    <Home className="w-5 h-5" strokeWidth={2}/>
                    <span>Dashboard</span>
                </button>

              {menuGroups.map((group, idx) => (
                <div key={idx}>
                  <div className="text-xs font-semibold text-gray-500 uppercase px-4 pt-4 pb-2">
                    {group.title}
                  </div>
                  {group.items.map(item => (
                    <button
                      key={item.path}
                      onClick={() => handleNavigation(item.path)}
                      disabled={item.disabled}
                      className={`w-full flex items-center gap-3.5 px-4 py-2.5 rounded-lg transition-all font-medium text-sm mb-2 ${
                        item.isPrimary
                        ? 'bg-blue-500 text-white hover:bg-blue-600'
                        : isActive(item.path)
                          ? 'bg-blue-100 text-blue-600' 
                          : item.disabled 
                          ? 'text-gray-400 cursor-not-allowed' 
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <item.icon className="w-5 h-5" strokeWidth={2}/>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              ))}
              {isSuperAdmin && (
                <div>
                  <div className="border-t border-gray-200 my-2" />
                  <button
                    onClick={() => handleNavigation(adminMenuItem.path)}
                    disabled={adminMenuItem.disabled}
                    className={`w-full flex items-center gap-3.5 px-4 py-2.5 rounded-lg transition-all font-medium text-sm ${
                      isAdminActive()
                        ? 'bg-blue-100 text-blue-600' 
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <adminMenuItem.icon className="w-5 h-5" strokeWidth={2}/>
                    <span>{adminMenuItem.label}</span>
                  </button>
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 mt-4 pt-4">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3.5 px-4 py-2.5 rounded-lg text-gray-600 hover:bg-red-500/10 hover:text-red-600 transition-all font-medium text-sm"
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
