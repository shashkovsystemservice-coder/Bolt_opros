
import { useState } from 'react';
import { X, Shield, AlertCircle, Loader2 } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
        <header className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-slate-500" strokeWidth={2} />
                <h2 className="text-base font-semibold text-slate-800">Доступ в админ-панель</h2>
            </div>
            <button onClick={handleClose} className="p-1 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-4 h-4 text-slate-500" strokeWidth={2.5} />
            </button>
        </header>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label htmlFor="admin-password" className="block text-sm font-medium text-slate-700 mb-1.5">
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
              className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400 transition-all"
              disabled={isLoading}
              autoFocus
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 h-9 px-4 bg-transparent text-slate-600 rounded-md hover:bg-slate-100 transition-colors font-medium text-sm"
              disabled={isLoading}
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={!password.trim() || isLoading}
              className="flex-1 h-9 px-4 inline-flex items-center justify-center bg-slate-800 text-white rounded-md hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
            >
              {isLoading ? <Loader2 className="animate-spin w-4 h-4" /> : 'Войти'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
