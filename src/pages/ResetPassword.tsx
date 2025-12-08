import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ClipboardList, Lock, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Неверная ссылка для восстановления пароля');
    }
  }, [token]);

  const getPasswordStrength = (pwd: string) => {
    if (pwd.length < 6) return { level: 'weak', label: 'Слабый', color: 'text-red-500' };
    if (pwd.length < 10 || !/[0-9]/.test(pwd) || !/[!@#$%^&*]/.test(pwd))
      return { level: 'medium', label: 'Средний', color: 'text-yellow-500' };
    return { level: 'strong', label: 'Сильный', color: 'text-green-500' };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!token) {
      setError('Неверная ссылка для восстановления пароля');
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError('Пароль должен содержать минимум 6 символов');
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Пароли не совпадают');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/confirm-password-reset`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token: token,
            newPassword: newPassword,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при сбросе пароля');
      }

      setSuccess(true);
      setTimeout(() => {
        navigate('/auth');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Произошла ошибка при сбросе пароля');
    } finally {
      setLoading(false);
    }
  };

  const strength = getPasswordStrength(newPassword);

  if (success) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-[#E8EAED] p-8 w-full max-w-md text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" strokeWidth={2} />
          <h2 className="text-2xl font-semibold text-[#1F1F1F] mb-2">Пароль изменен!</h2>
          <p className="text-[#5F6368] mb-4">
            Ваш пароль успешно изменен. Перенаправление на страницу входа...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <ClipboardList className="w-8 h-8 text-[#1A73E8]" strokeWidth={2} />
            <span className="text-2xl font-medium text-[#1F1F1F] tracking-tight">Survey Pro</span>
          </div>
          <p className="text-[#5F6368]">Восстановление пароля</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E8EAED] p-8">
          <h2 className="text-xl font-semibold text-[#1F1F1F] mb-6">Создайте новый пароль</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1F1F1F] mb-2">
                Новый пароль
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5F6368]" strokeWidth={2} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={`w-full h-12 pl-12 pr-12 border rounded-lg focus:outline-none focus:border-[#1A73E8] transition-colors ${
                    newPassword && newPassword.length < 6
                      ? 'border-red-300 bg-red-50'
                      : 'border-[#E8EAED]'
                  }`}
                  placeholder="••••••••"
                  disabled={!token}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#5F6368] hover:text-[#1F1F1F]"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {newPassword && newPassword.length < 6 && (
                <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" /> Минимум 6 символов
                </p>
              )}
              {newPassword && (
                <div className="mt-2 flex items-center gap-2">
                  <div className={`h-1 w-16 rounded-full ${strength.color.replace('text', 'bg')}`}></div>
                  <span className={`text-sm font-medium ${strength.color}`}>{strength.label}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1F1F1F] mb-2">
                Подтвердите пароль
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5F6368]" strokeWidth={2} />
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full h-12 pl-12 pr-12 border rounded-lg focus:outline-none focus:border-[#1A73E8] transition-colors ${
                    confirmPassword && newPassword !== confirmPassword
                      ? 'border-red-300 bg-red-50'
                      : 'border-[#E8EAED]'
                  }`}
                  placeholder="••••••••"
                  disabled={!token}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#5F6368] hover:text-[#1F1F1F]"
                >
                  {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" /> Пароли не совпадают
                </p>
              )}
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={
                !token ||
                !newPassword ||
                !confirmPassword ||
                newPassword.length < 6 ||
                newPassword !== confirmPassword ||
                loading
              }
              className="w-full h-12 bg-[#1A73E8] text-white rounded-full font-medium hover:bg-[#1557B0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Обновление пароля...' : 'Обновить пароль'}
            </button>

            <button
              type="button"
              onClick={() => navigate('/auth')}
              className="w-full text-center text-sm text-[#1A73E8] hover:text-[#1557B0] transition-colors py-2"
            >
              Вернуться к входу
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
