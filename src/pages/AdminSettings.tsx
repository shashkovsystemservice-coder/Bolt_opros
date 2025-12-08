import { useState, useEffect } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { supabase } from '../lib/supabase';
import { Save, AlertCircle, CheckCircle, Mail, ExternalLink } from 'lucide-react';

interface SystemSettings {
  id: string;
  support_email: string;
  maintenance_mode: boolean;
  auto_delete_inactive_days: number;
  notify_admin_new_registration: boolean;
}

export function AdminSettings() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings(data);
      } else {
        // Create default settings
        const { data: newSettings, error: createError } = await supabase
          .from('system_settings')
          .insert([{
            support_email: 'support@surveypo.com',
            maintenance_mode: false,
            auto_delete_inactive_days: 90,
            notify_admin_new_registration: true,
          }])
          .select()
          .single();

        if (createError) throw createError;
        setSettings(newSettings);
      }
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from('system_settings')
        .update({
          support_email: settings.support_email,
          maintenance_mode: settings.maintenance_mode,
          auto_delete_inactive_days: settings.auto_delete_inactive_days,
          notify_admin_new_registration: settings.notify_admin_new_registration,
          updated_at: new Date().toISOString(),
        })
        .eq('id', settings.id);

      if (error) throw error;

      showToast('success', 'Настройки сохранены');
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border border-[#1A73E8] border-t-transparent mx-auto mb-4"></div>
          <p className="text-[#5F6368]">Загрузка...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div>
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-[#1F1F1F] mb-2">Системные настройки</h2>
          <p className="text-[#5F6368]">Управление глобальными параметрами системы</p>
        </div>

        {settings && (
          <div className="bg-white rounded-2xl border border-[#E8EAED] p-8 max-w-2xl">
            <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-6">
              {/* Support Email */}
              <div>
                <label className="block text-sm font-medium text-[#1F1F1F] mb-2">
                  Email для поддержки
                </label>
                <input
                  type="email"
                  value={settings.support_email}
                  onChange={(e) =>
                    setSettings({ ...settings, support_email: e.target.value })
                  }
                  className="w-full h-12 px-4 border border-[#E8EAED] rounded-lg focus:outline-none focus:border-[#1A73E8]"
                />
              </div>

              {/* Maintenance Mode */}
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.maintenance_mode}
                    onChange={(e) =>
                      setSettings({ ...settings, maintenance_mode: e.target.checked })
                    }
                    className="w-5 h-5 rounded border-[#E8EAED]"
                  />
                  <div>
                    <p className="font-medium text-[#1F1F1F]">Режим обслуживания</p>
                    <p className="text-sm text-[#5F6368]">
                      Сайт будет недоступен для обычных пользователей
                    </p>
                  </div>
                </label>
              </div>

              {/* Auto Delete Inactive */}
              <div>
                <label className="flex items-center gap-3 cursor-pointer mb-3">
                  <input
                    type="checkbox"
                    checked={settings.auto_delete_inactive_days > 0}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        auto_delete_inactive_days: e.target.checked ? 90 : 0,
                      })
                    }
                    className="w-5 h-5 rounded border-[#E8EAED]"
                  />
                  <div>
                    <p className="font-medium text-[#1F1F1F]">Автоматическое удаление</p>
                    <p className="text-sm text-[#5F6368]">
                      Удалять неактивные аккаунты
                    </p>
                  </div>
                </label>

                {settings.auto_delete_inactive_days > 0 && (
                  <div className="ml-8">
                    <label className="block text-sm text-[#5F6368] mb-2">
                      Количество дней неактивности
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={settings.auto_delete_inactive_days}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          auto_delete_inactive_days: parseInt(e.target.value),
                        })
                      }
                      className="w-32 h-10 px-3 border border-[#E8EAED] rounded-lg focus:outline-none focus:border-[#1A73E8]"
                    />
                  </div>
                )}
              </div>

              {/* Email Notifications */}
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notify_admin_new_registration}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        notify_admin_new_registration: e.target.checked,
                      })
                    }
                    className="w-5 h-5 rounded border-[#E8EAED]"
                  />
                  <div>
                    <p className="font-medium text-[#1F1F1F]">Email уведомления</p>
                    <p className="text-sm text-[#5F6368]">
                      Отправлять админу уведомления при новой регистрации
                    </p>
                  </div>
                </label>
              </div>

              {/* Email Service Configuration */}
              <div className="pt-6 border-t border-[#E8EAED]">
                <div className="flex items-center gap-2 mb-4">
                  <Mail className="w-5 h-5 text-[#1A73E8]" strokeWidth={2} />
                  <h3 className="text-lg font-medium text-[#1F1F1F]">Настройка отправки Email</h3>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-[#1F1F1F] font-medium mb-2">
                    Для автоматической отправки email настройте Resend API Key
                  </p>
                  <p className="text-sm text-[#5F6368] mb-3">
                    Resend - бесплатный сервис для отправки email (до 100 писем/день)
                  </p>
                  <ol className="text-sm text-[#5F6368] space-y-2 list-decimal ml-4">
                    <li>
                      Зарегистрируйтесь на{' '}
                      <a
                        href="https://resend.com/signup"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#1A73E8] hover:underline inline-flex items-center gap-1"
                      >
                        resend.com
                        <ExternalLink className="w-3 h-3" strokeWidth={2} />
                      </a>
                    </li>
                    <li>Создайте API Key в разделе API Keys</li>
                    <li>Откройте настройки проекта в Supabase Dashboard</li>
                    <li>
                      Перейдите в Edge Functions → Secrets
                    </li>
                    <li>
                      Добавьте секрет: <code className="bg-white px-2 py-0.5 rounded">RESEND_API_KEY</code> с вашим API ключом
                    </li>
                    <li>После настройки кнопка "Отправить Email" будет работать автоматически</li>
                  </ol>
                </div>

                <div className="bg-gray-50 border border-[#E8EAED] rounded-lg p-4">
                  <p className="text-sm text-[#5F6368]">
                    <strong>Без настройки:</strong> Кнопка "Отправить Email" будет открывать ваш почтовый клиент для ручной отправки.
                  </p>
                </div>
              </div>

              <div className="pt-6 border-t border-[#E8EAED] flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-6 h-11 bg-[#1A73E8] text-white rounded-lg font-medium hover:bg-[#1557B0] transition-colors disabled:opacity-50"
                >
                  <Save className="w-5 h-5" strokeWidth={2} />
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50">
          <div
            className={`px-4 py-3 rounded-lg font-medium flex items-center gap-2 ${
              toast.type === 'success'
                ? 'bg-green-600 text-white'
                : 'bg-red-600 text-white'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle className="w-5 h-5" strokeWidth={2} />
            ) : (
              <AlertCircle className="w-5 h-5" strokeWidth={2} />
            )}
            {toast.message}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
