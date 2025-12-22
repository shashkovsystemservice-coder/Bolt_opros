
import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Users, BarChart3, Settings, LogOut, Menu, X, Shield, LayoutDashboard } from 'lucide-react';

function SidebarContent() {
  const { logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    { path: '/admin/companies', label: 'Компании', icon: Users },
    { path: '/admin/stats', label: 'Статистика', icon: BarChart3 },
    { path: '/admin/security', label: 'Безопасность', icon: Shield },
    { path: '/admin/settings', label: 'Настройки', icon: Settings },
  ];

  const handleSuperAdminLogout = () => {
    sessionStorage.removeItem('admin_authenticated');
    navigate('/dashboard');
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="flex flex-col h-full bg-surface">
      <div className="p-6 border-b border-border-subtle">
        <h2 className="text-lg font-semibold text-text-primary">Суперадмин</h2>
        <p className="text-sm text-text-secondary mt-1">Survey Pro</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200 ${
                isActive
                  ? 'bg-primary/10 font-semibold text-primary'
                  : 'text-text-secondary hover:bg-background'
              }`}
            >
              <Icon className="w-5 h-5" strokeWidth={1.5} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border-subtle space-y-2">
        <button
          onClick={handleSuperAdminLogout}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-primary hover:bg-primary/10 transition-colors duration-200"
        >
          <LayoutDashboard className="w-5 h-5" strokeWidth={1.5} />
          <span className="font-medium">В компанию</span>
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors duration-200"
        >
          <LogOut className="w-5 h-5" strokeWidth={1.5} />
          <span className="font-medium">Выйти</span>
        </button>
      </div>
    </div>
  );
}

export function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const menuItems = [
    { path: '/admin/companies', label: 'Компании', icon: Users },
    { path: '/admin/stats', label: 'Статистика', icon: BarChart3 },
    { path: '/admin/security', label: 'Безопасность', icon: Shield },
    { path: '/admin/settings', label: 'Настройки', icon: Settings },
  ];
  
  useEffect(() => {
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }, [location.pathname]);


  return (
    <div className="min-h-screen bg-background text-text-primary">
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:border-r lg:border-border-subtle">
        <SidebarContent />
      </aside>

      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 flex z-40" onClick={() => setSidebarOpen(false)}>
          <aside className="w-64 bg-surface border-r border-border-subtle transition-transform duration-300 ease-in-out transform" onClick={(e) => e.stopPropagation()}>
             <SidebarContent />
          </aside>
          <div className="flex-1 bg-black/20 backdrop-blur-sm"></div>
        </div>
      )}

      <div className="lg:pl-64 flex-1 flex flex-col transition-all duration-300">
        <header className="bg-surface/80 backdrop-blur-sm border-b border-border-subtle px-4 sm:px-6 py-4 flex items-center gap-4 sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 text-text-secondary hover:bg-background rounded-full transition-colors duration-200"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-semibold text-text-primary">
            {menuItems.find((m) => location.pathname.startsWith(m.path))?.label || 'Администратор'}
          </h1>
        </header>

        <main className="flex-1">
          <div className="p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8"><Outlet /></div>
        </main>
      </div>

      <footer className="lg:hidden fixed bottom-0 left-0 right-0 bg-surface/90 backdrop-blur-sm border-t border-border-subtle z-30">
          <nav className="flex justify-around items-center h-16">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  aria-label={item.label}
                  className={`flex items-center justify-center transition-colors duration-200 w-full h-full ${
                    isActive ? 'text-primary bg-primary/10' : 'text-text-secondary'
                  }`}>
                  <Icon className="w-6 h-6" strokeWidth={1.5} />
                </Link>
              );
            })}
          </nav>
        </footer>
    </div>
  );
}
