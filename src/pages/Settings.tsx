import { useState, useEffect } from 'react';
import { Save, AlertCircle, CheckCircle, Building2, Shield, Mail, Key, Download, RefreshCw, Eye, EyeOff, Settings as SettingsIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// --- Interfaces --- //
interface CompanyData {
  id: string;
  name: string;
}

interface BackupCode {
  code: string;
  used: boolean;
  created_at: string;
  used_at?: string;
}

// --- Component --- //
export function Settings() {
  const { user } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  
  // State from original Settings.tsx
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // State from AdminSecurity.tsx
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [backupCodes, setBackupCodes] = useState<BackupCode[]>([]);
  const [showCodes, setShowCodes] = useState(false);

  useEffect(() => {
    if (!user) return;

    const checkSuperAdmin = user.email === 'shashkov.systemservice@gmail.com';
    setIsSuperAdmin(checkSuperAdmin);

    setLoading(true);
    Promise.all([
      fetchCompanyData(),
      loadSecuritySettings(),
    ]).finally(() => setLoading(false));

  }, [user]);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // --- Data Fetching --- //
  const fetchCompanyData = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.from('companies').select('*').eq('id', user.id).maybeSingle();
      if (error) throw error;
      if (data) {
        setCompany(data);
        setCompanyName(data.name);
      }
    } catch (err: any) { showToast('error', `Ошибка загрузки профиля: ${err.message}`); }
  };

  const loadSecuritySettings = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.from('companies').select('recovery_email, security_question, backup_codes').eq('id', user.id).maybeSingle();
      if (error) throw error;
      if (data) {
        setRecoveryEmail(data.recovery_email || '');
        setSecurityQuestion(data.security_question || '');
        setBackupCodes(data.backup_codes || []);
      }
    } catch (err: any) { showToast('error', `Ошибка загрузки безопасности: ${err.message}`); }
  };

  // --- Handlers --- //
  const saveProfileSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company || !companyName.trim()) { showToast('error', 'Название компании не может быть пустым'); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from('companies').update({ name: companyName.trim() }).eq('id', company.id);
      if (error) throw error;
      setCompany({ ...company, name: companyName.trim() });
      showToast('success', 'Данные компании обновлены');
    } catch (err: any) { showToast('error', err.message); }
    finally { setSaving(false); }
  };
  
  const saveSecuritySettings = async () => {
    setSaving(true);
    try {
      const updates: any = { recovery_email: recoveryEmail, security_question: securityQuestion };
      if (securityAnswer) { updates.security_answer_hash = btoa(securityAnswer); }

      const { error } = await supabase.from('companies').update(updates).eq('id', user?.id);
      if (error) throw error;

      showToast('success', 'Настройки безопасности сохранены');
      setSecurityAnswer('');
    } catch (err: any) { showToast('error', err.message); }
    finally { setSaving(false); }
  };

  const generateBackupCodes = async () => {
    setSaving(true);
    try {
      const { data, error } = await supabase.rpc('generate_backup_codes', { company_uuid: user?.id });
      if (error) throw error;
      setBackupCodes(data || []);
      setShowCodes(true);
      showToast('success', 'Новые резервные коды созданы!');
    } catch (err: any) { showToast('error', err.message); }
    finally { setSaving(false); }
  };

  const downloadBackupCodes = () => {
    const codesText = backupCodes.map((c, i) => `${i + 1}. ${c.code}`).join('\n');
    const blob = new Blob([`Ваши резервные коды для Survey Pro:\n\n${codesText}`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `survey-pro-backup-codes.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // --- Render --- //
  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border border-[#1A73E8] border-t-transparent mx-auto mb-4"></div>
          <p className="text-[#5F6368]">Загрузка настроек...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-medium text-[#1F1F1F] tracking-tight mb-2">Настройки</h1>
          <p className="text-[#5F6368]">Управление профилем компании, доступом и безопасностью.</p>
        </div>

        <div className="space-y-8">
          {/* --- Профиль компании --- */}
          <div className="bg-white rounded-2xl border border-[#E8EAED] p-6 lg:p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-[#E8F0FE] rounded-xl flex items-center justify-center">
                <Building2 className="w-6 h-6 text-[#1A73E8]" strokeWidth={2} />
              </div>
              <div>
                <h2 className="text-xl font-medium text-[#1F1F1F]">Профиль компании</h2>
                <p className="text-sm text-[#5F6368]">Основная информация о вашей компании</p>
              </div>
            </div>
            <form onSubmit={saveProfileSettings} className="space-y-4">
              <div>
                <label htmlFor="companyName" className="block text-sm font-medium text-[#1F1F1F] mb-2">Название компании</label>
                <input id="companyName" type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="w-full h-11 px-4 border border-[#E8EAED] rounded-lg focus:outline-none focus:border-[#1A73E8]" />
              </div>
              <div className="pt-4 border-t border-[#E8EAED] flex gap-3">
                <button type="submit" disabled={saving || !companyName.trim() || companyName === company?.name} className="flex items-center gap-2 px-6 h-11 bg-[#1A73E8] text-white rounded-lg font-medium hover:bg-[#1557B0] disabled:opacity-50">
                  <Save className="w-5 h-5" /> {saving ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            </form>
          </div>

          {/* --- Безопасность --- */}
          <div className="bg-white rounded-2xl border border-[#E8EAED] p-6 lg:p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center"><Shield className="w-6 h-6 text-green-600"/></div>
              <div>
                <h2 className="text-xl font-medium text-[#1F1F1F]">Безопасность и Восстановление</h2>
                <p className="text-sm text-[#5F6368]">Настройте способы восстановления доступа к аккаунту.</p>
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-[#1F1F1F] mb-2">Резервный email</label>
                <input type="email" value={recoveryEmail} onChange={(e) => setRecoveryEmail(e.target.value)} className="w-full h-11 px-4 border border-[#E8EAED] rounded-lg focus:outline-none focus:border-[#1A73E8]" placeholder="recovery@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1F1F1F] mb-2">Секретный вопрос</label>
                <input type="text" value={securityQuestion} onChange={(e) => setSecurityQuestion(e.target.value)} className="w-full h-11 px-4 border border-[#E8EAED] rounded-lg focus:outline-none focus:border-[#1A73E8]" placeholder="Например: Девичья фамилия матери" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1F1F1F] mb-2">Ответ на вопрос (оставьте пустым, если не меняете)</label>
                <input type="password" value={securityAnswer} onChange={(e) => setSecurityAnswer(e.target.value)} className="w-full h-11 px-4 border border-[#E8EAED] rounded-lg focus:outline-none focus:border-[#1A73E8]" placeholder="Введите ответ" />
              </div>
            </div>
             <div className="pt-6 mt-6 border-t border-[#E8EAED] flex gap-3">
                <button onClick={saveSecuritySettings} disabled={saving} className="flex items-center gap-2 px-6 h-11 bg-[#1A73E8] text-white rounded-lg font-medium hover:bg-[#1557B0] disabled:opacity-50">
                  <Save className="w-5 h-5" /> {saving ? 'Сохранение...' : 'Сохранить настройки безопасности'}
                </button>
              </div>
          </div>

          {/* --- Резервные коды --- */}
          <div className="bg-white rounded-2xl border border-[#E8EAED] p-6 lg:p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center"><Key className="w-6 h-6 text-amber-600"/></div>
              <div><h2 className="text-xl font-medium text-[#1F1F1F]">Резервные коды</h2><p className="text-sm text-[#5F6368]">Используйте для входа, если потеряете доступ к телефону.</p></div>
            </div>
            {backupCodes.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm text-[#5F6368]">Доступно кодов: <span className="font-semibold">{backupCodes.filter(c => !c.used).length}</span> из {backupCodes.length}</div>
                  <div className="flex gap-2">
                    <button onClick={() => setShowCodes(!showCodes)} className="flex items-center gap-2 px-3 h-9 border rounded-lg hover:bg-gray-50"><EyeOff className="w-4 h-4" /> Скрыть</button>
                    <button onClick={downloadBackupCodes} className="flex items-center gap-2 px-3 h-9 border rounded-lg hover:bg-gray-50"><Download className="w-4 h-4" /> Скачать</button>
                  </div>
                </div>
                {showCodes && <div className="grid grid-cols-2 md:grid-cols-3 gap-3 font-mono text-center">{backupCodes.map((c,i) => <div key={i} className={`p-2 rounded-lg ${c.used ? 'bg-gray-100 text-gray-400 line-through' : 'bg-blue-50 text-blue-800'}`}>{c.code}</div>)}</div>}
              </div>
            )}
            <div className="pt-4 border-t border-[#E8EAED]"><button onClick={generateBackupCodes} disabled={saving} className="flex items-center gap-2 px-6 h-11 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 disabled:opacity-50"><RefreshCw className="w-5 h-5"/>{saving ? 'Генерация...' : 'Сгенерировать новые коды'}</button></div>
          </div>

          {/* --- Super Admin Only --- */}
          {isSuperAdmin && (
              <div className="bg-white rounded-2xl border border-[#E8EAED] p-6 lg:p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center"><SettingsIcon className="w-6 h-6 text-red-600"/></div>
                  <div><h2 className="text-xl font-medium text-[#1F1F1F]">Дополнительные интеграции</h2><p className="text-sm text-[#5F6368]">Платные сервисы для расширенных возможностей.</p></div>
                </div>
                <div className="text-sm text-center text-gray-500 py-8">Раздел для настройки SMTP, SMS и других интеграций. В разработке.</div>
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className={`px-4 py-3 rounded-lg font-medium flex items-center gap-2 shadow-lg ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
            {toast.type === 'success' ? <CheckCircle className="w-5 h-5"/> : <AlertCircle className="w-5 h-5"/>}
            {toast.message}
          </div>
        </div>
      )}
    </>
  );
}
