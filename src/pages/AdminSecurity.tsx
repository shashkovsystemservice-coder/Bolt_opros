import { useState, useEffect, useCallback } from 'react';
import { Shield, Mail, Key, Download, RefreshCw, AlertTriangle, Eye, EyeOff, Clock, Settings, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// Reusable Card Component
const SecurityCard = ({ icon, title, description, children, badge, actions }) => (
  <div className="bg-surface border border-border-subtle rounded-2xl shadow-ambient overflow-hidden">
    <div className="p-6">
      <div className="flex justify-between items-start gap-4">
        <div className="flex items-start gap-4">
          <div className="bg-background flex-shrink-0 rounded-full w-10 h-10 flex items-center justify-center">
            {icon}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
            {description && <p className="text-sm text-text-secondary mt-1">{description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-4 flex-shrink-0">
          {badge}
          {actions}
        </div>
      </div>
    </div>
    {children && <div className="px-6 pb-6 space-y-4">{children}</div>}
  </div>
);

// Reusable Input Component
const FormInput = ({ id, label, ...props }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-text-secondary mb-2">
      {label}
    </label>
    <input
      id={id}
      className="w-full h-11 px-4 bg-background border border-border-subtle rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
      {...props}
    />
  </div>
);

// Main Component
export function AdminSecurity() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formState, setFormState] = useState({ recoveryEmail: '', securityQuestion: '', securityAnswer: '' });
  const [backupCodes, setBackupCodes] = useState([]);
  const [showCodes, setShowCodes] = useState(false);
  const [auditLog, setAuditLog] = useState([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadSecurityData = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.from('companies').select('recovery_email, security_question, backup_codes').eq('id', user.id).single();
      if (error) throw error;
      if (data) {
        setFormState(prev => ({ ...prev, recoveryEmail: data.recovery_email || '', securityQuestion: data.security_question || '' }));
        setBackupCodes(data.backup_codes || []);
      }
    } catch (err) { console.error('Error loading security settings:', err); }
  }, [user]);

  const loadAuditLog = useCallback(async () => {
    if (!user || user.email !== 'shashkov.systemservice@gmail.com') return;
    try {
      const { data, error } = await supabase.from('admin_audit_log').select('*').order('created_at', { ascending: false }).limit(10);
      if (error) throw error;
      setAuditLog(data || []);
    } catch (err) { console.error('Error loading audit log:', err); }
  }, [user]);

  useEffect(() => {
    loadSecurityData();
    loadAuditLog();
  }, [loadSecurityData, loadAuditLog]);

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormState(prev => ({ ...prev, [id]: value }));
  };

  const saveSecuritySettings = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const updates = { recovery_email: formState.recoveryEmail, security_question: formState.securityQuestion };
      if (formState.securityAnswer) {
        updates.security_answer_hash = btoa(formState.securityAnswer); // Placeholder for real hashing
      }
      const { error } = await supabase.from('companies').update(updates).eq('id', user.id);
      if (error) throw error;
      setMessage({ type: 'success', text: 'Настройки безопасности сохранены.' });
      setFormState(prev => ({ ...prev, securityAnswer: '' }));
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally { setLoading(false); }
  };

  const generateBackupCodes = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const { data, error } = await supabase.rpc('generate_backup_codes', { company_uuid: user?.id });
      if (error) throw error;
      setBackupCodes(data || []);
      setShowCodes(true);
      setMessage({ type: 'success', text: 'Новые резервные коды успешно созданы.' });
    } catch (err: any) { setMessage({ type: 'error', text: err.message }); } 
    finally { setLoading(false); }
  };

  const downloadBackupCodes = () => {
    const codesText = backupCodes.map((c, i) => `${i + 1}. ${c.code}`).join('\n');
    const blob = new Blob([`SurveyPro Backup Codes\nCreated: ${new Date().toLocaleString()}\n\n${codesText}`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `surveypro-backup-codes.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  const getActionLabel = (action) => ({ grant_superadmin: 'Права суперадмина выданы' }[action] || action);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-text-primary">Безопасность</h1>
        <p className="text-text-secondary mt-2">Управление настройками безопасности и восстановления доступа.</p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg border-l-4 ${message.type === 'success' ? 'bg-green-500/10 border-green-500 text-green-700' : 'bg-red-500/10 border-red-500 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={saveSecuritySettings} className="space-y-8">
        <SecurityCard icon={<Mail className="w-5 h-5 text-primary" strokeWidth={1.5} />} title="Резервный Email" description="Для восстановления доступа в случае потери основного email.">
          <FormInput id="recoveryEmail" label="Резервный email" type="email" placeholder="recovery@example.com" value={formState.recoveryEmail} onChange={handleInputChange} />
        </SecurityCard>

        <SecurityCard icon={<Shield className="w-5 h-5 text-primary" strokeWidth={1.5} />} title="Секретный вопрос" description="Дополнительный способ подтверждения личности.">
          <div className="space-y-4">
             <FormInput id="securityQuestion" label="Вопрос" type="text" placeholder="Например: Девичья фамилия матери" value={formState.securityQuestion} onChange={handleInputChange} />
             <FormInput id="securityAnswer" label="Ответ" type="password" placeholder="Оставьте пустым, если не хотите менять ответ" value={formState.securityAnswer} onChange={handleInputChange} />
          </div>
        </SecurityCard>

        <div className="flex justify-end">
            <button type="submit" disabled={loading} className="h-11 px-6 inline-flex items-center justify-center bg-primary text-on-primary font-semibold rounded-lg shadow-sm hover:bg-primary/90 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Сохранить настройки'}
            </button>
        </div>
      </form>

      <SecurityCard
        icon={<Key className="w-5 h-5 text-primary" strokeWidth={1.5} />} 
        title="Резервные коды"
        description="Одноразовые коды для восстановления доступа."
        actions={
          <button onClick={generateBackupCodes} disabled={loading} className="h-10 px-4 inline-flex items-center justify-center bg-background border border-border-subtle text-text-primary font-medium rounded-lg shadow-sm hover:bg-surface transition-colors duration-200 disabled:opacity-50">
            <RefreshCw className="w-4 h-4 mr-2" />
            Сгенерировать
          </button>
        }>
        {backupCodes.length === 0 ? (
          <div className="text-center py-10 text-text-secondary">Резервные коды еще не созданы.</div>
        ) : (
          <div>
            <div className="p-4 mb-4 bg-primary/10 border border-primary/20 rounded-lg flex items-start gap-3 text-sm text-primary/80">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>Храните коды в безопасном месте. Каждый код можно использовать только один раз.</div>
            </div>
            <div className="flex justify-end gap-2 mb-4">
              <button onClick={() => setShowCodes(!showCodes)} className="h-9 px-3 inline-flex items-center justify-center bg-background border border-border-subtle text-text-secondary font-medium rounded-lg hover:bg-surface transition-colors duration-200">
                {showCodes ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />} {showCodes ? 'Скрыть' : 'Показать'}
              </button>
              <button onClick={downloadBackupCodes} className="h-9 px-3 inline-flex items-center justify-center bg-background border border-border-subtle text-text-secondary font-medium rounded-lg hover:bg-surface transition-colors duration-200">
                <Download className="w-4 h-4 mr-2" /> Скачать
              </button>
            </div>
            {showCodes && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {backupCodes.map((code, index) => (
                  <div key={index} className={`p-3 rounded-lg font-mono text-sm flex justify-between items-center ${code.used ? 'bg-surface text-text-secondary line-through' : 'bg-background text-text-primary'}`}>
                    <span>{code.code}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </SecurityCard>

      {user && user.email === 'shashkov.systemservice@gmail.com' && (
        <SecurityCard icon={<Clock className="w-5 h-5 text-primary" strokeWidth={1.5} />} title="Журнал действий" description="История критических действий администраторов.">
           {auditLog.length > 0 ? (
              <ul className="space-y-2">
                {auditLog.map(entry => (
                   <li key={entry.id} className="flex justify-between items-center p-3 rounded-lg hover:bg-background">
                     <div>
                        <p className="font-medium text-text-primary">{getActionLabel(entry.action_type)}</p>
                        <p className="text-sm text-text-secondary">{entry.target_email || 'N/A'} - {entry.ip_address}</p>
                     </div>
                     <p className="text-xs text-text-secondary">{new Date(entry.created_at).toLocaleString()}</p>
                   </li>
                ))}
              </ul>
           ) : (
             <div className="text-center py-10 text-text-secondary">Журнал действий пуст.</div>
           )}
        </SecurityCard>
      )}
    </div>
  );
}
