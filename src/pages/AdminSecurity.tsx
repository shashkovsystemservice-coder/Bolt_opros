import { useState, useEffect } from 'react';
import { Shield, Mail, Key, Download, RefreshCw, AlertTriangle, Check, Eye, EyeOff, Clock, Settings, CheckCircle2, Circle } from 'lucide-react';
import { AdminLayout } from '../components/AdminLayout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface BackupCode {
  code: string;
  used: boolean;
  created_at: string;
  used_at?: string;
}

interface AuditLogEntry {
  id: string;
  action_type: string;
  target_email: string;
  details: any;
  ip_address: string;
  created_at: string;
}

interface IntegrationSettings {
  email_enabled: boolean;
  email_provider?: string;
  email_configured?: boolean;
  sms_enabled: boolean;
  sms_provider?: string;
  sms_configured?: boolean;
}

export function AdminSecurity() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [backupCodes, setBackupCodes] = useState<BackupCode[]>([]);
  const [showCodes, setShowCodes] = useState(false);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showIntegrations, setShowIntegrations] = useState(false);
  const [integrations, setIntegrations] = useState<IntegrationSettings>({
    email_enabled: false,
    email_configured: false,
    sms_enabled: false,
    sms_configured: false,
  });

  useEffect(() => {
    loadSecuritySettings();
    loadAuditLog();
  }, []);

  const loadSecuritySettings = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('recovery_email, security_question, backup_codes')
        .eq('id', user?.id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setRecoveryEmail(data.recovery_email || '');
        setSecurityQuestion(data.security_question || '');
        setBackupCodes(data.backup_codes || []);
      }
    } catch (error: any) {
      console.error('Error loading security settings:', error);
    }
  };

  const loadAuditLog = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setAuditLog(data || []);
    } catch (error: any) {
      console.error('Error loading audit log:', error);
    }
  };

  const saveSecuritySettings = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const updates: any = {
        recovery_email: recoveryEmail,
        security_question: securityQuestion,
      };

      // Если введен ответ на секретный вопрос, хешируем его
      if (securityAnswer) {
        // В продакшене здесь должен быть настоящий хеш (bcrypt)
        updates.security_answer_hash = btoa(securityAnswer);
      }

      const { error } = await supabase
        .from('companies')
        .update(updates)
        .eq('id', user?.id);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Настройки безопасности сохранены' });
      setSecurityAnswer('');
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const generateBackupCodes = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const { data, error } = await supabase.rpc('generate_backup_codes', {
        company_uuid: user?.id,
      });

      if (error) throw error;

      setBackupCodes(data || []);
      setShowCodes(true);
      setMessage({
        type: 'success',
        text: 'Новые резервные коды созданы. Сохраните их в безопасном месте!',
      });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const downloadBackupCodes = () => {
    const codesText = backupCodes
      .map((c, i) => `${i + 1}. ${c.code} ${c.used ? '(использован)' : ''}`)
      .join('\n');

    const blob = new Blob(
      [
        `РЕЗЕРВНЫЕ КОДЫ ВОССТАНОВЛЕНИЯ\n` +
        `Дата создания: ${new Date().toLocaleString('ru-RU')}\n\n` +
        `${codesText}\n\n` +
        `ВАЖНО:\n` +
        `- Храните эти коды в безопасном месте\n` +
        `- Каждый код можно использовать только один раз\n` +
        `- После использования кода сгенерируйте новые коды\n`
      ],
      { type: 'text/plain' }
    );

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-codes-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getActionLabel = (actionType: string) => {
    const labels: Record<string, string> = {
      grant_superadmin: 'Выдача прав суперадмина',
      revoke_superadmin: 'Отзыв прав суперадмина',
      block_company: 'Блокировка компании',
      unblock_company: 'Разблокировка компании',
      delete_company: 'Удаление компании',
    };
    return labels[actionType] || actionType;
  };

  const unusedCodesCount = backupCodes.filter((c) => !c.used).length;

  const StatusBadge = ({ enabled }: { enabled: boolean }) => (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
        enabled
          ? 'bg-green-100 text-green-700'
          : 'bg-gray-100 text-gray-600'
      }`}
    >
      {enabled ? (
        <>
          <CheckCircle2 className="w-3 h-3" />
          Работает
        </>
      ) : (
        <>
          <Circle className="w-3 h-3" />
          Опционально
        </>
      )}
    </span>
  );

  return (
    <AdminLayout>
      <div className="max-w-5xl">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-[#1F1F1F] mb-2">Безопасность</h1>
          <p className="text-[#5F6368]">
            Управление настройками безопасности и восстановления доступа
          </p>
        </div>

      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-2">Базовые функции работают без настройки</p>
            <ul className="list-disc list-inside space-y-1 text-blue-700">
              <li>Резервные коды можно скачать и хранить локально</li>
              <li>Секретный вопрос работает для проверки личности</li>
              <li>Журнал действий ведется автоматически</li>
              <li>Email и SMS-уведомления можно подключить позже</li>
            </ul>
          </div>
        </div>
      </div>

      {message && (
        <div
          className={`mb-6 p-4 rounded-lg border ${
            message.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-[#E8EAED] p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Mail className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[#1F1F1F]">Резервный Email</h2>
                <p className="text-sm text-[#5F6368]">
                  Для восстановления доступа в случае потери основного email
                </p>
              </div>
            </div>
            <StatusBadge enabled={true} />
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1F1F1F] mb-2">
                Резервный email
              </label>
              <input
                type="email"
                value={recoveryEmail}
                onChange={(e) => setRecoveryEmail(e.target.value)}
                className="w-full h-11 px-4 border border-[#E8EAED] rounded-lg focus:outline-none focus:border-[#1A73E8]"
                placeholder="recovery@example.com"
              />
              <p className="mt-2 text-xs text-[#5F6368]">
                {integrations.email_configured
                  ? '✓ Email-уведомления настроены'
                  : '⚠️ Email сохранится, но автоматические уведомления требуют настройки SMTP'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#E8EAED] p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[#1F1F1F]">Секретный вопрос</h2>
                <p className="text-sm text-[#5F6368]">
                  Дополнительный способ подтверждения личности
                </p>
              </div>
            </div>
            <StatusBadge enabled={true} />
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1F1F1F] mb-2">
                Вопрос
              </label>
              <input
                type="text"
                value={securityQuestion}
                onChange={(e) => setSecurityQuestion(e.target.value)}
                className="w-full h-11 px-4 border border-[#E8EAED] rounded-lg focus:outline-none focus:border-[#1A73E8]"
                placeholder="Например: Девичья фамилия матери"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1F1F1F] mb-2">
                Ответ
              </label>
              <input
                type="password"
                value={securityAnswer}
                onChange={(e) => setSecurityAnswer(e.target.value)}
                className="w-full h-11 px-4 border border-[#E8EAED] rounded-lg focus:outline-none focus:border-[#1A73E8]"
                placeholder="Введите ответ"
              />
              <p className="mt-1 text-xs text-[#5F6368]">
                Оставьте пустым, если не хотите менять ответ
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={saveSecuritySettings}
            disabled={loading}
            className="px-6 h-11 bg-[#1A73E8] text-white rounded-lg hover:bg-[#1557B0] transition-colors disabled:opacity-50"
          >
            {loading ? 'Сохранение...' : 'Сохранить настройки'}
          </button>
        </div>

        <div className="bg-white rounded-xl border border-[#E8EAED] p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Key className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-lg font-semibold text-[#1F1F1F]">Резервные коды</h2>
                  <StatusBadge enabled={true} />
                </div>
                <p className="text-sm text-[#5F6368]">
                  Одноразовые коды для восстановления доступа
                </p>
              </div>
            </div>
            <button
              onClick={generateBackupCodes}
              disabled={loading}
              className="flex items-center gap-2 px-4 h-10 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className="w-4 h-4" />
              Сгенерировать новые
            </button>
          </div>

          {backupCodes.length > 0 && (
            <>
              <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium mb-1">Важно!</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Каждый код можно использовать только один раз</li>
                    <li>Храните коды в безопасном месте (не в браузере)</li>
                    <li>После использования всех кодов сгенерируйте новые</li>
                  </ul>
                </div>
              </div>

              <div className="mb-4 flex items-center justify-between">
                <div className="text-sm text-[#5F6368]">
                  Доступно кодов: <span className="font-semibold text-[#1F1F1F]">{unusedCodesCount}</span> из {backupCodes.length}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowCodes(!showCodes)}
                    className="flex items-center gap-2 px-3 h-9 border border-[#E8EAED] rounded-lg hover:bg-[#F8F9FA] transition-colors"
                  >
                    {showCodes ? (
                      <>
                        <EyeOff className="w-4 h-4" />
                        Скрыть
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4" />
                        Показать
                      </>
                    )}
                  </button>
                  <button
                    onClick={downloadBackupCodes}
                    className="flex items-center gap-2 px-3 h-9 border border-[#E8EAED] rounded-lg hover:bg-[#F8F9FA] transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Скачать
                  </button>
                </div>
              </div>

              {showCodes && (
                <div className="grid grid-cols-2 gap-3">
                  {backupCodes.map((code, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border-2 font-mono text-sm ${
                        code.used
                          ? 'bg-gray-50 border-gray-200 text-gray-400 line-through'
                          : 'bg-blue-50 border-blue-200 text-blue-900'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{code.code}</span>
                        {code.used && <Check className="w-4 h-4 text-gray-400" />}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {backupCodes.length === 0 && (
            <div className="text-center py-8 text-[#5F6368]">
              <Key className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Резервные коды не созданы</p>
              <p className="text-sm mt-1">Нажмите "Сгенерировать новые" для создания</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-[#E8EAED] p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[#1F1F1F]">Журнал действий</h2>
                <p className="text-sm text-[#5F6368]">
                  История всех критических действий администраторов
                </p>
              </div>
            </div>
            <StatusBadge enabled={true} />
          </div>

          <div className="space-y-3">
            {auditLog.length > 0 ? (
              auditLog.map((entry) => (
                <div
                  key={entry.id}
                  className="p-4 border border-[#E8EAED] rounded-lg hover:bg-[#F8F9FA] transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-medium text-[#1F1F1F]">
                      {getActionLabel(entry.action_type)}
                    </span>
                    <span className="text-xs text-[#5F6368]">
                      {new Date(entry.created_at).toLocaleString('ru-RU')}
                    </span>
                  </div>
                  <div className="text-sm text-[#5F6368]">
                    <p>Email: {entry.target_email || 'N/A'}</p>
                    {entry.details?.company_name && (
                      <p>Компания: {entry.details.company_name}</p>
                    )}
                    {entry.ip_address && <p>IP: {entry.ip_address}</p>}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-[#5F6368]">
                <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Журнал пуст</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#E8EAED] p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Settings className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[#1F1F1F]">Дополнительные интеграции</h2>
                <p className="text-sm text-[#5F6368]">
                  Опциональные платные сервисы для расширенных возможностей
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowIntegrations(!showIntegrations)}
              className="text-sm text-[#1A73E8] hover:underline"
            >
              {showIntegrations ? 'Скрыть' : 'Настроить'}
            </button>
          </div>

          {showIntegrations && (
            <div className="space-y-4 pt-4 border-t border-[#E8EAED]">
              <div className="p-4 bg-[#F8F9FA] rounded-lg">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-medium text-[#1F1F1F] mb-1">Email-уведомления</h3>
                    <p className="text-sm text-[#5F6368]">
                      Автоматическая отправка писем для восстановления доступа
                    </p>
                  </div>
                  <StatusBadge enabled={integrations.email_configured || false} />
                </div>
                <div className="text-xs text-[#5F6368] space-y-1">
                  <p>Требуется: SMTP-сервер (Gmail, SendGrid, Resend)</p>
                  <p className="text-amber-700">💡 Без настройки коды можно скачать вручную</p>
                </div>
              </div>

              <div className="p-4 bg-[#F8F9FA] rounded-lg">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-medium text-[#1F1F1F] mb-1">SMS-уведомления</h3>
                    <p className="text-sm text-[#5F6368]">
                      Отправка кодов восстановления по SMS
                    </p>
                  </div>
                  <StatusBadge enabled={integrations.sms_configured || false} />
                </div>
                <div className="text-xs text-[#5F6368] space-y-1">
                  <p>Требуется: Twilio или аналогичный SMS-провайдер</p>
                  <p className="text-amber-700">💡 Опционально для дополнительной защиты</p>
                </div>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Совет:</strong> Начните с базовых функций (резервные коды + секретный вопрос).
                  Платные интеграции можно подключить позже, когда понадобится автоматизация.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </AdminLayout>
  );
}
