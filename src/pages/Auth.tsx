import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ClipboardList, Mail, Lock, Building2 } from 'lucide-react';

export function Auth() {
  const [isSignIn, setIsSignIn] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignIn) {
        await signIn(email, password);
      } else {
        if (!companyName.trim()) {
          setError('Введите название компании');
          setLoading(false);
          return;
        }
        await signUp(email, password, companyName);
      }
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Произошла ошибка');
    } finally {
      setLoading(false);
    }
  };

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
              onClick={() => setIsSignIn(true)}
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
              onClick={() => setIsSignIn(false)}
              className={`flex-1 py-2.5 rounded-full font-medium transition-all ${
                !isSignIn
                  ? 'bg-white text-[#1F1F1F] shadow-sm'
                  : 'text-[#5F6368] hover:text-[#1F1F1F]'
              }`}
            >
              Регистрация
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isSignIn && (
              <div>
                <label className="block text-sm font-medium text-[#1F1F1F] mb-2">
                  Название компании
                </label>
                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5F6368]" strokeWidth={2} />
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full h-12 pl-12 pr-4 border border-[#E8EAED] rounded-lg focus:outline-none focus:border-[#1A73E8] transition-colors"
                    placeholder="ООО Компания"
                    required={!isSignIn}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-[#1F1F1F] mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5F6368]" strokeWidth={2} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-12 pl-12 pr-4 border border-[#E8EAED] rounded-lg focus:outline-none focus:border-[#1A73E8] transition-colors"
                  placeholder="your@email.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1F1F1F] mb-2">
                Пароль
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5F6368]" strokeWidth={2} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-12 pl-12 pr-4 border border-[#E8EAED] rounded-lg focus:outline-none focus:border-[#1A73E8] transition-colors"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-[#1A73E8] text-white rounded-full font-medium hover:bg-[#1557B0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Загрузка...' : isSignIn ? 'Войти' : 'Зарегистрироваться'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
