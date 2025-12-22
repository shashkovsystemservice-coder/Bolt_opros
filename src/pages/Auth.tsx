
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { ClipboardList, Mail, Lock, Building2, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Reusable & Styled Components --- //

const AuthInput = ({ id, label, type = 'text', value, onChange, placeholder, autoComplete, children }) => (
    <div className="relative">
        <input 
            type={type} 
            id={id}
            value={value}
            onChange={onChange}
            autoComplete={autoComplete}
            placeholder={placeholder} // Placeholder acts as a visual guide, but we have a floating label
            className="peer block w-full h-12 rounded-lg border border-border-subtle bg-background px-4 text-sm text-text-primary transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none placeholder-transparent"
        />
        <label 
            htmlFor={id} 
            className="absolute left-4 top-3.5 text-text-secondary text-sm transition-all duration-200 ease-in-out pointer-events-none peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-primary peer-[:not(:placeholder-shown)]:-top-2.5 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-primary bg-surface px-1"
        >
            {label}
        </label>
        {children}
    </div>
);

// --- Main Component --- //

export function Auth() {
  const [isSignIn, setIsSignIn] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if ((!isSignIn && !companyName) || !email || !password) {
        setError('Все поля обязательны для заполнения.');
        return;
    }

    setLoading(true);
    try {
      if (isSignIn) {
        await signIn(email, password);
        navigate('/dashboard');
        toast.success('Добро пожаловать!');
      } else {
        await signUp(email, password, companyName);
        setIsSignIn(true);
        setEmail('');
        setPassword('');
        setCompanyName('');
        toast.success('Регистрация успешна!', { description: 'Теперь вы можете войти в свой аккаунт.' });
      }
    } catch (err) {
      setError(err.message || 'Произошла непредвиденная ошибка.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
      toast.info('Функция восстановления пароля находится в разработке.')
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-grid-slate-100/[0.05] p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
            <Link to="/" className="inline-flex items-center gap-3 mb-3">
                <ClipboardList className="h-8 w-8 text-primary" strokeWidth={2} />
                <span className="text-2xl font-semibold tracking-tight text-text-primary">Survey Pro</span>
            </Link>
            <p className="text-md text-text-secondary">Профессиональные опросы для вашего бизнеса</p>
        </div>

        <motion.div 
            layout
            className="rounded-2xl border border-border-subtle bg-surface p-6 sm:p-8 shadow-ambient"
        >
          <h2 className="text-center text-2xl font-semibold text-text-primary mb-1">{isSignIn ? 'Вход в аккаунт' : 'Создание аккаунта'}</h2>
          <p className="text-center text-text-secondary text-sm mb-8">
              {isSignIn ? 'Нет аккаунта?' : 'Уже есть аккаунт?'} 
              <button onClick={() => { setIsSignIn(!isSignIn); setError(''); }} className="font-semibold text-primary hover:underline ml-1.5">{isSignIn ? 'Зарегистрируйтесь' : 'Войдите'}</button>
          </p>
          
          <AnimatePresence mode="wait">
            <motion.form 
                key={isSignIn ? 'signin' : 'signup'}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                onSubmit={handleSubmit} 
                className="space-y-6"
            >
                {!isSignIn && (
                    <AuthInput 
                        id="companyName"
                        label="Название компании"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Ваша компания"
                        autoComplete="organization"
                    />
                )}
                
                <AuthInput 
                    id="email"
                    label="Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    autoComplete="email"
                />

                <AuthInput 
                    id="password"
                    label="Пароль"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete={isSignIn ? 'current-password' : 'new-password'}
                >
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center pr-4 text-text-secondary hover:text-text-primary">
                        {showPassword ? <EyeOff size={20}/> : <Eye size={20}/>}
                    </button>
                </AuthInput>

                {error && (
                    <div className="rounded-lg bg-red-500/10 p-3 text-center text-sm font-medium text-red-600 flex items-center justify-center gap-2">
                        <AlertCircle size={18}/><span>{error}</span>
                    </div>
                )}

                <button 
                    type="submit" 
                    disabled={loading}
                    className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {loading ? <Loader2 size={22} className="animate-spin"/> : (isSignIn ? 'Войти' : 'Создать аккаунт')}
                </button>
            </motion.form>
          </AnimatePresence>
          
          {isSignIn && 
            <div className="text-center mt-6">
                <button onClick={handleForgotPassword} className="text-sm font-medium text-text-secondary hover:text-primary hover:underline">
                    Забыли пароль?
                </button>
            </div>
          }
        </motion.div>
      </div>
    </div>
  );
}
