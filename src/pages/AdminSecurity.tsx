import { useState, useEffect, useCallback } from 'react';
import { Save, Loader2, Eye, EyeOff, Download, RefreshCw, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

// --- Reusable & Styled Components (Aligned with new design system) ---

const ActionButton = ({ onClick, children, variant = 'primary', size = 'md', disabled = false, loading = false }) => {
    const baseClasses = "inline-flex items-center justify-center font-medium text-sm rounded-md transition-colors duration-200 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background";
    const sizeClasses = { md: "h-9 px-4", sm: "h-8 px-3" };
    const variantClasses = {
        primary: "bg-primary text-on-primary hover:bg-primary/90 focus:ring-primary",
        secondary: "bg-surface border border-border hover:bg-background text-text-primary focus:ring-primary",
    };
    return <button onClick={onClick} disabled={disabled || loading} className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]}`}>{loading ? <Loader2 className="animate-spin h-5 w-5"/> : children}</button>
};

const FormInput = ({ id, label, type = 'text', ...props }) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const isPassword = type === 'password';

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-text-primary mb-1.5">
        {label}
      </label>
      <div className="relative">
         <input
          id={id}
          type={isPassword ? (isPasswordVisible ? 'text' : 'password') : type}
          className="w-full h-10 px-3 bg-background border border-border rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/80 focus:border-primary"
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

const SecuritySection = ({ title, description, children }) => (
  <div className="py-8 border-b border-border-subtle last:border-b-0">
    <div className="grid md:grid-cols-3 gap-4 md:gap-8">
      <div className="md:col-span-1">
        <h3 className="text-base font-semibold text-text-primary">{title}</h3>
        <p className="text-sm text-text-secondary mt-1">{description}</p>
      </div>
      <div className="md:col-span-2">
        <div className="space-y-5 max-w-lg">{children}</div>
      </div>
    </div>
  </div>
);

// Main Component
export function AdminSecurity() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formState, setFormState] = useState({ recoveryEmail: '', securityQuestion: '', securityAnswer: '' });
  const [initialFormState, setInitialFormState] = useState({ recoveryEmail: '', securityQuestion: '' });
  const [backupCodes, setBackupCodes] = useState([]);
  const [showCodes, setShowCodes] = useState(false);
  const [auditLog, setAuditLog] = useState([]);

  const loadSecurityData = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.from('companies').select('recovery_email, security_question, backup_codes').eq('id', user.id).single();
      if (error) throw error;
      if (data) {
        const currentData = { recoveryEmail: data.recovery_email || '', securityQuestion: data.security_question || '' };
        setFormState(prev => ({...prev, ...currentData}));
        setInitialFormState(currentData);
        setBackupCodes(data.backup_codes || []);
      }
    } catch (err) { toast.error('Ошибка загрузки настроек: ' + err.message); }
  }, [user]);

  const loadAuditLog = useCallback(async () => {
    if (!user || user.email !== 'shashkov.systemservice@gmail.com') return;
    try {
      const { data, error } = await supabase.from('admin_audit_log').select('*').order('created_at', { ascending: false }).limit(10);
      if (error) throw error;
      setAuditLog(data || []);
    } catch (err) { toast.error('Ошибка загрузки журнала: ' + err.message); }
  }, [user]);

  useEffect(() => {
    loadSecurityData();
    loadAuditLog();
  }, [loadSecurityData, loadAuditLog]);

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormState(prev => ({ ...prev, [id]: value }));
  };
  
  const isFormChanged = () => {
      return formState.recoveryEmail !== initialFormState.recoveryEmail || formState.securityQuestion !== initialFormState.securityQuestion || !!formState.securityAnswer;
  }

  const saveSecuritySettings = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updates = { recovery_email: formState.recoveryEmail, security_question: formState.securityQuestion };
      if (formState.securityAnswer) {
        updates.security_answer_hash = btoa(formState.securityAnswer); // Placeholder
      }
      const { error } = await supabase.from('companies').update(updates).eq('id', user.id);
      if (error) throw error;
      toast.success('Настройки безопасности сохранены.');
      setFormState(prev => ({ ...prev, securityAnswer: '' }));
      setInitialFormState({ recoveryEmail: formState.recoveryEmail, securityQuestion: formState.securityQuestion });
    } catch (err: any) {
      toast.error(err.message);
    } finally { setLoading(false); }
  };

  const generateBackupCodes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('generate_backup_codes', { company_uuid: user?.id });
      if (error) throw error;
      setBackupCodes(data || []);
      setShowCodes(true);
      toast.success('Новые резервные коды созданы.');
    } catch (err: any) { toast.error(err.message); } 
    finally { setLoading(false); }
  };

  const downloadBackupCodes = () => {
    const codesText = backupCodes.map((c, i) => `${i + 1}. ${c.code}`).join('\n');
    const blob = new Blob([`SurveyPro Backup Codes\n\n${codesText}`], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = `data:text/plain;charset=utf-8,${encodeURIComponent(codesText)}`;
    a.download = `surveypro-backup-codes.txt`;
    a.click();
  };
  
  const getActionLabel = (action) => ({ grant_superadmin: 'Права суперадмина выданы' }[action] || action);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-text-primary">Безопасность</h1>
        <p className="text-text-secondary mt-1 text-sm">Управление настройками безопасности и восстановления доступа.</p>
      </div>

      <form onSubmit={saveSecuritySettings}>
        <SecuritySection title="Восстановление аккаунта" description="Эти данные помогут восстановить доступ в случае его утери.">
          <FormInput id="recoveryEmail" label="Резервный email" type="email" placeholder="recovery@example.com" value={formState.recoveryEmail} onChange={handleInputChange} />
          <FormInput id="securityQuestion" label="Секретный вопрос" type="text" placeholder="Например: Девичья фамилия матери" value={formState.securityQuestion} onChange={handleInputChange} />
          <FormInput id="securityAnswer" label="Ответ на вопрос" type="password" placeholder="Оставьте пустым, если не меняете" value={formState.securityAnswer} onChange={handleInputChange} />
          <div className="flex justify-end pt-2">
            <ActionButton type="submit" disabled={!isFormChanged() || loading} loading={loading}>
                <Save className="w-4 h-4 mr-2" /> Сохранить
            </ActionButton>
          </div>
        </SecuritySection>
      </form>

      <SecuritySection title="Резервные коды" description="Одноразовые коды для входа без пароля и 2FA.">
         {backupCodes.length > 0 ? (
                <div className="space-y-4">
                    <div className="bg-background p-4 rounded-lg border border-border-subtle">
                        <p className="text-sm text-text-secondary mb-4">Коды сгенерированы. Сохраните их в безопасном месте. Каждый код можно использовать только один раз.</p>
                        {showCodes && (
                           <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pb-4 font-mono">
                               {backupCodes.map((code, index) => (
                                   <div key={index} className={`p-3 rounded-md text-sm text-center border ${code.used ? 'bg-surface text-text-secondary line-through border-border-subtle' : 'bg-surface text-text-primary border-transparent'}`}>
                                       {code.code}
                                   </div>
                               ))}
                            </div>
                        )}
                         <div className="flex flex-col sm:flex-row gap-3">
                            <ActionButton size="sm" variant="secondary" onClick={() => setShowCodes(!showCodes)}>
                               {showCodes ? <EyeOff className="w-4 h-4 mr-2"/> : <Eye className="w-4 h-4 mr-2"/>} {showCodes ? 'Скрыть' : 'Показать'}
                            </ActionButton>
                            <ActionButton size="sm" variant="secondary" onClick={downloadBackupCodes}>
                               <Download className="w-4 h-4 mr-2"/> Скачать
                            </ActionButton>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-center py-6 bg-background rounded-lg border border-dashed">
                     <p className="text-text-secondary text-sm">Резервные коды еще не созданы.</p>
                </div>
            )}
             <div className="flex justify-start pt-5">
                 <ActionButton onClick={generateBackupCodes} loading={loading} variant="secondary">
                    <RefreshCw className="w-4 h-4 mr-2" /> {backupCodes.length > 0 ? 'Сгенерировать новые' : 'Сгенерировать коды'}
                </ActionButton>
            </div>
      </SecuritySection>

      {user && user.email === 'shashkov.systemservice@gmail.com' && (
        <SecuritySection title="Журнал действий" description="История критических действий в системе.">
           {auditLog.length > 0 ? (
              <div className="border border-border-subtle rounded-lg">
                <ul className="divide-y divide-border-subtle">
                  {auditLog.map(entry => (
                   <li key={entry.id} className="px-4 py-3 flex justify-between items-center">
                     <div className="flex items-center gap-3">
                        <Clock className="w-4 h-4 text-text-secondary" />
                        <div>
                           <p className="font-medium text-text-primary text-sm">{getActionLabel(entry.action_type)}</p>
                           <p className="text-sm text-text-secondary">{entry.target_email || 'N/A'} <span className="text-xs">({entry.ip_address})</span></p>
                        </div>
                     </div>
                     <p className="text-xs text-text-secondary flex-shrink-0">{new Date(entry.created_at).toLocaleString('ru-RU', {dateStyle: 'short', timeStyle: 'short'})}</p>
                   </li>
                  ))}
                </ul>
              </div>
           ) : (
             <div className="text-center py-10 text-text-secondary text-sm">Журнал действий пуст.</div>
           )}
        </SecuritySection>
      )}
    </div>
  );
}
