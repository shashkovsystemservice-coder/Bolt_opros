import { useState } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Users, BarChart3, Settings, LogOut, Menu, X, Shield, LayoutDashboard } from 'lucide-react';

export function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    { path: '/admin/companies', label: 'Все компании', icon: Users },
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
    <div className="flex h-screen bg-[#F8F9FA]">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'w-64' : 'w-0'
        } bg-white border-r border-[#E8EAED] transition-all duration-300 overflow-hidden flex flex-col`}
      >
        <div className="p-6 border-b border-[#E8EAED]">
          <h2 className="text-lg font-semibold text-[#1F1F1F]">Суперадмин</h2>
          <p className="text-sm text-[#5F6368] mt-1">Survey Pro</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-[#E8F0FE] text-[#1A73E8]'
                    : 'text-[#5F6368] hover:bg-[#F8F9FA]'
                }`}
              >
                <Icon className="w-5 h-5" strokeWidth={2} />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#E8EAED] space-y-2">
          <button
            onClick={handleSuperAdminLogout}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-[#1A73E8] hover:bg-[#E8F0FE] transition-colors"
          >
            <LayoutDashboard className="w-5 h-5" strokeWidth={2} />
            <span className="font-medium">Вернуться в компанию</span>
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-5 h-5" strokeWidth={2} />
            <span className="font-medium">Выйти</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-[#E8EAED] px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-[#F8F9FA] rounded-lg transition-colors"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <h1 className="text-xl font-semibold text-[#1F1F1F]">
            {menuItems.find((m) => m.path === location.pathname)?.label || 'Администратор'}
          </h1>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="p-6"><Outlet /></div>
        </div>
      </div>
    </div>
  );
}
