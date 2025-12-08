import { useState } from 'react';
import { X, Shield, AlertCircle } from 'lucide-react';

interface AdminPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ADMIN_PASSWORD = import.meta.env.VITE_SUPER_ADMIN_PASSWORD || 'admin2024';

export function AdminPasswordModal({ isOpen, onClose, onSuccess }: AdminPasswordModalProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    await new Promise(resolve => setTimeout(resolve, 300));

    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem('admin_authenticated', 'true');
      onSuccess();
      setPassword('');
    } else {
      setError('Неверный пароль');
    }

    setIsLoading(false);
  };

  const handleClose = () => {
    setPassword('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-white" strokeWidth={2} />
            <h2 className="text-xl font-semibold text-white">Доступ в админ-панель</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" strokeWidth={2} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-sm text-[#5F6368]">
            Для доступа к панели супер-администратора введите пароль
          </p>

          <div>
            <label htmlFor="admin-password" className="block text-sm font-medium text-[#1F1F1F] mb-2">
              Пароль администратора
            </label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              placeholder="Введите пароль"
              className="w-full px-4 py-3 border border-[#E8EAED] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A73E8] focus:border-transparent transition-all"
              disabled={isLoading}
              autoFocus
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-3 bg-[#F8F9FA] text-[#5F6368] rounded-lg hover:bg-[#E8EAED] transition-colors font-medium"
              disabled={isLoading}
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={!password.trim() || isLoading}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
            >
              {isLoading ? 'Проверка...' : 'Войти'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
