import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ClipboardList, Mail, Lock, Building2, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';

function PasswordResetModal({ onClose }: { onClose: () => void }) {
  const [resetEmail, setResetEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleResetPassword = async () => {
    if (!validateEmail(resetEmail)) {
      setError('Введите корректный email');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: resetEmail }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при отправке письма');
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Произошла ошибка');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center px-4 z-50">
        <div className="bg-white rounded-2xl p-6 w-full max-w-sm text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" strokeWidth={2} />
          <h3 className="text-lg font-semibold text-[#1F1F1F] mb-2">Письмо отправлено!</h3>
          <p className="text-sm text-[#5F6368] mb-4">
            Проверьте почту <span className="font-medium text-[#1F1F1F]">{resetEmail}</span>.
            Мы отправили вам ссылку для восстановления пароля.
          </p>
          <p className="text-xs text-[#5F6368] mb-4">
            Письмо действительно в течение 1 часа.
          </p>
          <button
            onClick={onClose}
            className="w-full h-11 bg-[#1A73E8] text-white rounded-full font-medium hover:bg-[#1557B0] transition-colors"
          >
            Понятно
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center px-4 z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
        <h3 className="text-lg font-semibold text-[#1F1F1F] mb-4">Восстановление пароля</h3>
        <p className="text-sm text-[#5F6368] mb-4">
          Введите email, привязанный к вашему аккаунту. Мы отправим вам ссылку для восстановления пароля.
        </p>
        <div className="mb-4">
          <label className="block text-sm font-medium text-[#1F1F1F] mb-2">Email</label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5F6368]" strokeWidth={2} />
            <input
              type="email"
              name="email"
              value={resetEmail}
              onChange={(e) => {
                setResetEmail(e.target.value);
                setError('');
              }}
              autoComplete="email"
              className={`w-full h-12 pl-12 pr-4 border rounded-lg focus:outline-none focus:border-[#1A73E8] transition-colors ${
                resetEmail && !validateEmail(resetEmail)
                  ? 'border-red-300 bg-red-50'
                  : 'border-[#E8EAED]'
              }`}
              placeholder="your@email.com"
            />
          </div>
          {resetEmail && !validateEmail(resetEmail) && (
            <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" /> Введите корректный email
            </p>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 h-11 border border-[#E8EAED] rounded-full font-medium text-[#1F1F1F] hover:bg-[#F8F9FA] transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleResetPassword}
            disabled={!validateEmail(resetEmail) || loading}
            className="flex-1 h-11 bg-[#1A73E8] text-white rounded-full font-medium hover:bg-[#1557B0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Отправка...' : 'Отправить'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Auth() {
  const [isSignIn, setIsSignIn] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successEmail, setSuccessEmail] = useState('');

  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const getPasswordStrength = (pwd: string) => {
    if (pwd.length < 6) return { level: 'weak', label: 'Слабый', color: 'text-red-500' };
    if (pwd.length < 10 || !/[0-9]/.test(pwd) || !/[!@#$%^&*]/.test(pwd)) return { level: 'medium', label: 'Средний', color: 'text-yellow-500' };
    return { level: 'strong', label: 'Сильный', color: 'text-green-500' };
  };

  const isFormValid = () => {
    if (!validateEmail(email)) return false;
    if (password.length < 6) return false;
    if (!isSignIn) {
      if (companyName.trim().length < 2) return false;
      if (password !== confirmPassword) return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignIn) {
        await signIn(email, password);
        navigate('/dashboard');
      } else {
        if (!companyName.trim()) {
          setError('Введите название компании');
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setError('Пароли не совпадают');
          setLoading(false);
          return;
        }
        await signUp(email, password, companyName);
        setSuccessEmail(email);
        setShowSuccessModal(true);
      }
    } catch (err: any) {
      setError(err.message || 'Произошла ошибка');
    } finally {
      setLoading(false);
    }
  };

  const strength = getPasswordStrength(password);

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <ClipboardList className="w-8 h-8 text-[#1A73E8]" strokeWidth={2} />
            <span className="text-2xl font-medium text-[#1F1F1F] tracking-tight">Survey Pro</span>
          </div>
          <p className="text-[#5F6368]">Профессиональные опросы для вашего бизнеса</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E8EAED] p-8">
          <div className="flex gap-2 mb-8 bg-[#F8F9FA] rounded-full p-1">
            <button
              type="button"
              onClick={() => {
                setIsSignIn(true);
                setError('');
              }}
              className={`flex-1 py-2.5 rounded-full font-medium transition-all ${
                isSignIn
                  ? 'bg-white text-[#1F1F1F] shadow-sm'
                  : 'text-[#5F6368] hover:text-[#1F1F1F]'
              }`}
            >
              Вход
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSignIn(false);
                setError('');
              }}
              className={`flex-1 py-2.5 rounded-full font-medium transition-all ${
                !isSignIn
                  ? 'bg-white text-[#1F1F1F] shadow-sm'
                  : 'text-[#5F6368] hover:text-[#1F1F1F]'
              }`}
            >
              Регистрация
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isSignIn && (
              <div>
                <label className="block text-sm font-medium text-[#1F1F1F] mb-2">
                  Название компании
                </label>
                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5F6368]" strokeWidth={2} />
                  <input
                    type="text"
                    name="company"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    autoComplete="organization"
                    className={`w-full h-12 pl-12 pr-4 border rounded-lg focus:outline-none focus:border-[#1A73E8] transition-colors ${
                      !isSignIn && companyName && companyName.length < 2
                        ? 'border-red-300 bg-red-50'
                        : 'border-[#E8EAED]'
                    }`}
                    placeholder="ООО Компания"
                  />
                </div>
                {!isSignIn && companyName && companyName.length < 2 && (
                  <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> Минимум 2 символа
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-[#1F1F1F] mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5F6368]" strokeWidth={2} />
                <input
                  type="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className={`w-full h-12 pl-12 pr-4 border rounded-lg focus:outline-none focus:border-[#1A73E8] transition-colors ${
                    email && !validateEmail(email)
                      ? 'border-red-300 bg-red-50'
                      : 'border-[#E8EAED]'
                  }`}
                  placeholder="your@email.com"
                />
              </div>
              {email && !validateEmail(email) && (
                <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" /> Введите корректный email
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1F1F1F] mb-2">Пароль</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5F6368]" strokeWidth={2} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={isSignIn ? 'current-password' : 'new-password'}
                  className={`w-full h-12 pl-12 pr-12 border rounded-lg focus:outline-none focus:border-[#1A73E8] transition-colors ${
                    password && password.length < 6
                      ? 'border-red-300 bg-red-50'
                      : 'border-[#E8EAED]'
                  }`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#5F6368] hover:text-[#1F1F1F]"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {password && password.length < 6 && (
                <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" /> Минимум 6 символов
                </p>
              )}
              {!isSignIn && password && (
                <div className="mt-2 flex items-center gap-2">
                  <div className={`h-1 w-16 rounded-full ${strength.color.replace('text', 'bg')}`}></div>
                  <span className={`text-sm font-medium ${strength.color}`}>{strength.label}</span>
                </div>
              )}
            </div>

            {!isSignIn && (
              <div>
                <label className="block text-sm font-medium text-[#1F1F1F] mb-2">
                  Подтвердите пароль
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5F6368]" strokeWidth={2} />
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    name="confirm-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    className={`w-full h-12 pl-12 pr-12 border rounded-lg focus:outline-none focus:border-[#1A73E8] transition-colors ${
                      confirmPassword && password !== confirmPassword
                        ? 'border-red-300 bg-red-50'
                        : 'border-[#E8EAED]'
                    }`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#5F6368] hover:text-[#1F1F1F]"
                  >
                    {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> Пароли не совпадают
                  </p>
                )}
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!isFormValid() || loading}
              className="w-full h-12 bg-[#1A73E8] text-white rounded-full font-medium hover:bg-[#1557B0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Загрузка...' : isSignIn ? 'Войти' : 'Зарегистрироваться'}
            </button>

            {isSignIn && (
              <button
                type="button"
                onClick={() => setShowResetModal(true)}
                className="w-full text-center text-sm text-[#1A73E8] hover:text-[#1557B0] transition-colors py-2"
              >
                Забыли пароль?
              </button>
            )}
          </form>
        </div>
      </div>

      {showResetModal && (
        <PasswordResetModal
          onClose={() => setShowResetModal(false)}
        />
      )}

      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" strokeWidth={2} />
            <h3 className="text-xl font-semibold text-[#1F1F1F] mb-2">Регистрация успешна!</h3>
            <p className="text-[#5F6368] mb-2">Письмо с подтверждением отправлено на</p>
            <p className="font-medium text-[#1F1F1F] mb-4">{successEmail}</p>
            <p className="text-sm text-[#5F6368] bg-blue-50 p-3 rounded-lg border border-blue-200 mb-4">
              Функция email подтверждения в разработке. Сейчас вы можете войти без подтверждения.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  setIsSignIn(true);
                  setEmail('');
                  setPassword('');
                  setConfirmPassword('');
                  setCompanyName('');
                }}
                className="flex-1 h-11 border border-[#E8EAED] rounded-full font-medium text-[#1F1F1F] hover:bg-[#F8F9FA] transition-colors"
              >
                Понятно
              </button>
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  setIsSignIn(true);
                  setEmail(successEmail);
                  setPassword('');
                }}
                className="flex-1 h-11 bg-[#1A73E8] text-white rounded-full font-medium hover:bg-[#1557B0] transition-colors"
              >
                Войти
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
