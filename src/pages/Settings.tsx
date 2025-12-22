
import { useState, useEffect, useCallback } from 'react';
import { Building2, Shield, Key, Save, Loader2, Eye, EyeOff, Download, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

// --- Reusable & Styled Components ---

const ActionButton = ({ onClick, children, variant = 'primary', size = 'md', disabled = false, loading = false }) => {
    const baseClasses = "inline-flex items-center justify-center font-semibold text-sm rounded-lg shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2";
    const sizeClasses = { md: "h-10 px-4", sm: "h-9 px-3" };
    const variantClasses = {
        primary: "bg-primary text-on-primary hover:bg-primary/90 focus:ring-primary",
        secondary: "bg-surface border border-border-subtle hover:bg-background text-text-primary focus:ring-primary",
    };
    return <button onClick={onClick} disabled={disabled || loading} className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]}`}>{loading ? <Loader2 className="animate-spin h-5 w-5"/> : children}</button>
};

const SettingsCard = ({ icon, title, description, children, footer }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, ease: 'easeOut' }}
    className="bg-surface border border-border-subtle rounded-2xl shadow-ambient"
  >
    <div className="p-6 border-b border-border-subtle">
      <div className="flex items-start gap-5">
        <div className="bg-primary/10 text-primary rounded-full w-10 h-10 flex-shrink-0 flex items-center justify-center">
          {icon}
        </div>
        <div>
          <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
          <p className="text-sm text-text-secondary mt-1">{description}</p>
        </div>
      </div>
    </div>
    <div className="px-6 py-5 space-y-4">{children}</div>
    {footer && <div className="px-6 py-4 bg-background/70 border-t border-border-subtle flex justify-end">{footer}</div>}
  </motion.div>
);

const FormInput = ({ id, label, type = 'text', ...props }) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const isPassword = type === 'password';

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-text-secondary mb-2">
        {label}
      </label>
      <div className="relative">
         <input
          id={id}
          type={isPassword ? (isPasswordVisible ? 'text' : 'password') : type}
          className="w-full h-10 px-3 bg-background border border-border-subtle rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
          {...props}
        />
        {isPassword && (
          <button type="button" onClick={() => setIsPasswordVisible(!isPasswordVisible)} className="absolute inset-y-0 right-0 flex items-center px-3 text-text-secondary hover:text-primary">
            {isPasswordVisible ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
    </div>
  );
};

// --- Main Component ---

export function Settings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  
  const [companyName, setCompanyName] = useState('');
  const [initialCompanyName, setInitialCompanyName] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [isSavingSecurity, setIsSavingSecurity] = useState(false);
  
  const [backupCodes, setBackupCodes] = useState([]);
  const [showCodes, setShowCodes] = useState(false);
  const [isGeneratingCodes, setIsGeneratingCodes] = useState(false);

  const loadAllSettings = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.from('companies').select('name, recovery_email, security_question, backup_codes').eq('id', user.id).single();
      if (error && error.code !== 'PGRST116') throw error; // Ignore no rows found error
      if (data) {
        setCompanyName(data.name || '');
        setInitialCompanyName(data.name || '');
        setRecoveryEmail(data.recovery_email || '');
        setSecurityQuestion(data.security_question || '');
        setBackupCodes(data.backup_codes || []);
      }
    } catch (err) {
      toast.error('Не удалось загрузить настройки: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadAllSettings();
  }, [loadAllSettings]);

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      const { error } = await supabase.from('companies').update({ name: companyName.trim() }).eq('id', user.id);
      if (error) throw error;
      setInitialCompanyName(companyName.trim());
      toast.success('Название компании обновлено.');
    } catch (err) { toast.error(err.message); }
    finally { setIsSavingProfile(false); }
  };

  const handleSaveSecurity = async () => {
    setIsSavingSecurity(true);
    try {
      const updates = { recovery_email: recoveryEmail, security_question: securityQuestion };
      if (securityAnswer) { updates.security_answer_hash = btoa(securityAnswer); } // Placeholder for hashing
      const { error } = await supabase.from('companies').update(updates).eq('id', user.id);
      if (error) throw error;
      toast.success('Настройки безопасности сохранены.');
      setSecurityAnswer('');
    } catch (err) { toast.error(err.message); }
    finally { setIsSavingSecurity(false); }
  };

  const generateBackupCodes = async () => {
    setIsGeneratingCodes(true);
    try {
      const { data, error } = await supabase.rpc('generate_backup_codes', { company_uuid: user?.id });
      if (error) throw error;
      setBackupCodes(data || []);
      setShowCodes(true);
      toast.success('Новые резервные коды созданы.');
    } catch (err) { toast.error(err.message); }
    finally { setIsGeneratingCodes(false); }
  };
  
  const downloadBackupCodes = () => {
    const codesText = backupCodes.map((c, i) => `${i + 1}. ${c.code}`).join('\n');
    const blob = new Blob([`SurveyPro Backup Codes\n---\n${codesText}`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `surveypro-backup-codes.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="flex justify-center items-center py-20"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
  }

  return (
    <div className="space-y-8">
        <div>
            <h1 className="text-3xl font-bold text-text-primary">Настройки</h1>
            <p className="text-text-secondary mt-1.5">Управление профилем компании и безопасностью.</p>
        </div>

        <SettingsCard 
            icon={<Building2 className="w-5 h-5" strokeWidth={2}/>}
            title="Профиль компании"
            description="Основная информация о вашей компании"
            footer={
                <ActionButton onClick={handleSaveProfile} loading={isSavingProfile} disabled={companyName === initialCompanyName || !companyName.trim()}>
                    <Save className="w-4 h-4 mr-2" /> Сохранить
                </ActionButton>
            }
        >
            <FormInput id="companyName" label="Название компании" type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
        </SettingsCard>

        <SettingsCard
            icon={<Shield className="w-5 h-5" strokeWidth={2} />}
            title="Безопасность"
            description="Настройте способы восстановления доступа к аккаунту"
            footer={
                <ActionButton onClick={handleSaveSecurity} loading={isSavingSecurity}>
                    <Save className="w-4 h-4 mr-2" /> Сохранить изменения
                </ActionButton>
            }
        >
             <div className="space-y-4">
                <FormInput id="recoveryEmail" label="Резервный email" type="email" placeholder="recovery@example.com" value={recoveryEmail} onChange={(e) => setRecoveryEmail(e.target.value)} />
                <FormInput id="securityQuestion" label="Секретный вопрос" type="text" placeholder="Девичья фамилия матери" value={securityQuestion} onChange={(e) => setSecurityQuestion(e.target.value)} />
                <FormInput id="securityAnswer" label="Ответ на вопрос (оставьте пустым, если не меняете)" type="password" placeholder="••••••••••••" value={securityAnswer} onChange={(e) => setSecurityAnswer(e.target.value)} />
            </div>
        </SettingsCard>

        <SettingsCard
            icon={<Key className="w-5 h-5" strokeWidth={2} />}
            title="Резервные коды"
            description="Используйте для входа, если потеряете доступ к 2FA"
            footer={
                <ActionButton onClick={generateBackupCodes} loading={isGeneratingCodes} variant="secondary">
                    <RefreshCw className="w-4 h-4 mr-2" /> Сгенерировать новые
                </ActionButton>
            }
        >
            {backupCodes.length > 0 ? (
                <div className="space-y-4">
                    <div className="flex justify-between items-center bg-background p-3 rounded-lg">
                        <p className="text-sm text-text-secondary">Коды сгенерированы. Сохраните их в безопасном месте.</p>
                        <div className="flex gap-2">
                            <ActionButton size="sm" variant="secondary" onClick={() => setShowCodes(!showCodes)}>
                               {showCodes ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                            </ActionButton>
                            <ActionButton size="sm" variant="secondary" onClick={downloadBackupCodes}>
                               <Download className="w-4 h-4"/>
                            </ActionButton>
                        </div>
                    </div>
                    {showCodes && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2"
                        >
                           {backupCodes.map((code, index) => (
                               <div key={index} className={`p-3 rounded-lg font-mono text-sm text-center border ${code.used ? 'bg-surface text-text-secondary line-through border-border-subtle' : 'bg-surface text-text-primary border-transparent'}`}>
                                   {code.code}
                               </div>
                           ))}
                        </motion.div>
                    )}
                </div>
            ) : (
                <div className="text-center py-6 bg-background rounded-lg">
                     <p className="text-text-secondary">Резервные коды еще не созданы.</p>
                </div>
            )}
        </SettingsCard>

    </div>
  );
}
