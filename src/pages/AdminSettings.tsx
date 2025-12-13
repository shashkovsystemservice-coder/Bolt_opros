import { useState, useEffect } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { supabase } from '../lib/supabase';
import { testAiModel } from '../lib/aiService';
import { Save, AlertCircle, CheckCircle, Mail, ExternalLink, Cpu, Trash2, PlusCircle, PlayCircle, Loader2 } from 'lucide-react';

interface SystemSettings {
  id: string;
  support_email: string;
  maintenance_mode: boolean;
  auto_delete_inactive_days: number;
  notify_admin_new_registration: boolean;
  ai_model_list: string[] | null;
  active_ai_model: string | null;
}

type TestResult = { status: 'idle' | 'testing' | 'ok' | 'error'; message: string };

export function AdminSettings() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [newModelName, setNewModelName] = useState('');
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('system_settings')
        .select('id,support_email,maintenance_mode,auto_delete_inactive_days,notify_admin_new_registration,ai_model_list,active_ai_model')
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setSettings({
          ...data,
          ai_model_list: data.ai_model_list || ['gemini-1.5-pro-latest', 'gemini-1.5-flash-latest'],
          active_ai_model: data.active_ai_model || 'gemini-1.5-pro-latest',
        });
      } else {
        const defaultModels = ['gemini-1.5-pro-latest', 'gemini-1.5-flash-latest'];
        const { data: newSettings, error: createError } = await supabase
          .from('system_settings')
          .insert([{
            support_email: 'support@surveypo.com',
            maintenance_mode: false,
            auto_delete_inactive_days: 90,
            notify_admin_new_registration: true,
            ai_model_list: defaultModels,
            active_ai_model: defaultModels[0],
          }])
          .select()
          .single();

        if (createError) throw createError;
        setSettings(newSettings);
      }
    } catch (err: any) {
      showToast('error', `Ошибка загрузки: ${err.message}`);
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
          ai_model_list: settings.ai_model_list,
          active_ai_model: settings.active_ai_model,
          updated_at: new Date().toISOString(),
        })
        .eq('id', settings.id);

      if (error) throw error;

      showToast('success', 'Настройки сохранены');
    } catch (err: any) {
      showToast('error', `Ошибка сохранения: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };
  
  const handleAddModel = () => {
    if (!settings || !newModelName.trim()) {
      showToast('error', 'Имя модели не может быть пустым');
      return;
    }
    if (settings.ai_model_list?.includes(newModelName.trim())) {
        showToast('error', 'Такая модель уже существует');
        return;
    }
    setSettings({ 
        ...settings, 
        ai_model_list: [...(settings.ai_model_list || []), newModelName.trim()] 
    });
    setNewModelName('');
  };

  const handleRemoveModel = (modelToRemove: string) => {
    if (!settings || modelToRemove === settings.active_ai_model) {
        showToast('error', 'Нельзя удалить активную модель');
        return;
    }
    setSettings({ 
        ...settings, 
        ai_model_list: settings.ai_model_list?.filter(m => m !== modelToRemove) || [] 
    });
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  // Функция для тестирования модели с авто-скрытием результата
  const handleTestModel = async (modelName: string) => {
    setTestResults(prev => ({ ...prev, [modelName]: { status: 'testing', message: '' } }));

    const hideResultAfterDelay = (name: string) => {
        setTimeout(() => {
            setTestResults(prev => ({ ...prev, [name]: { status: 'idle', message: '' } }));
        }, 5000); // 5 секунд
    };

    try {
      const result = await testAiModel(modelName);
      setTestResults(prev => ({ ...prev, [modelName]: { status: result.status, message: result.message } }));
      hideResultAfterDelay(modelName);
    } catch (error: any) {
      setTestResults(prev => ({ ...prev, [modelName]: { status: 'error', message: error.message } }));
      hideResultAfterDelay(modelName);
    }
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
              
              <div>
                <label className='block text-sm font-medium text-[#1F1F1F] mb-2'>
                  Email для поддержки
                </label>
                <input
                  type='email'
                  value={settings.support_email}
                  onChange={(e) =>
                    setSettings({ ...settings, support_email: e.target.value })
                  }
                  className='w-full h-12 px-4 border border-[#E8EAED] rounded-lg focus:outline-none focus:border-[#1A73E8]'
                />
              </div>

              <div className='pt-6 border-t border-[#E8EAED]'>
                <label className='flex items-center gap-3 cursor-pointer'>
                  <input
                    type='checkbox'
                    checked={settings.maintenance_mode}
                    onChange={(e) =>
                      setSettings({ ...settings, maintenance_mode: e.target.checked })
                    }
                    className='w-5 h-5 rounded border-[#E8EAED]'
                  />
                  <div>
                    <p className='font-medium text-[#1F1F1F]'>Режим обслуживания</p>
                    <p className='text-sm text-[#5F6368]'>
                      Сайт будет недоступен для обычных пользователей
                    </p>
                  </div>
                </label>
              </div>

              <div className='pt-6 border-t border-[#E8EAED]'>
                <label className='flex items-center gap-3 cursor-pointer mb-3'>
                  <input
                    type='checkbox'
                    checked={settings.auto_delete_inactive_days > 0}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        auto_delete_inactive_days: e.target.checked ? 90 : 0,
                      })
                    }
                    className='w-5 h-5 rounded border-[#E8EAED]'
                  />
                  <div>
                    <p className='font-medium text-[#1F1F1F]'>Автоматическое удаление</p>
                    <p className='text-sm text-[#5F6368]'>
                      Удалять неактивные аккаунты
                    </p>
                  </div>
                </label>

                {settings.auto_delete_inactive_days > 0 && (
                  <div className='ml-8'>
                    <label className='block text-sm text-[#5F6368] mb-2'>
                      Количество дней неактивности
                    </label>
                    <input
                      type='number'
                      min='1'
                      max='365'
                      value={settings.auto_delete_inactive_days}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          auto_delete_inactive_days: parseInt(e.target.value),
                        })
                      }
                      className='w-32 h-10 px-3 border border-[#E8EAED] rounded-lg focus:outline-none focus:border-[#1A73E8]'
                    />
                  </div>
                )}
              </div>

              <div className='pt-6 border-t border-[#E8EAED]'>
                <label className='flex items-center gap-3 cursor-pointer'>
                  <input
                    type='checkbox'
                    checked={settings.notify_admin_new_registration}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        notify_admin_new_registration: e.target.checked,
                      })
                    }
                    className='w-5 h-5 rounded border-[#E8EAED]'
                  />
                  <div>
                    <p className='font-medium text-[#1F1F1F]'>Email уведомления</p>
                    <p className='text-sm text-[#5F6368]'>
                      Отправлять админу уведомления при новой регистрации
                    </p>
                  </div>
                </label>
              </div>
              
              <div className="pt-6 border-t border-[#E8EAED]">
                <div className="flex items-center gap-2 mb-4">
                  <Cpu className="w-5 h-5 text-[#1A73E8]" strokeWidth={2} />
                  <h3 className="text-lg font-medium text-[#1F1F1F]">Управление ИИ-моделями</h3>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-[#5F6368]">
                        Здесь вы можете управлять списком ИИ-моделей от Google. Выберите активную модель, которая будет использоваться для всех задач в системе. Вы можете добавлять новые модели по мере их появления.
                        <br />
                        Актуальный список доступных моделей можно найти на{' '}
                        <a
                            href="https://ai.google.dev/gemini-api/docs/models/gemini"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#1A73E8] hover:underline inline-flex items-center gap-1"
                        >
                            официальной странице Google AI
                            <ExternalLink className="w-3 h-3" strokeWidth={2} />
                        </a>.
                    </p>
                </div>

                <div className="space-y-3 mb-4">
                    <label className="block text-sm font-medium text-[#1F1F1F]">Доступные модели</label>
                    {settings.ai_model_list?.map(model => {
                      const result = testResults[model];
                      return (
                        <div key={model} className="bg-gray-50 p-3 rounded-lg">
                          <div className="flex items-center justify-between">
                              <label className="flex items-center gap-3 cursor-pointer">
                                  <input
                                      type="radio"
                                      name="active_ai_model"
                                      value={model}
                                      checked={settings.active_ai_model === model}
                                      onChange={() => setSettings({...settings, active_ai_model: model})}
                                      className="w-5 h-5 accent-[#1A73E8]"
                                  />
                                  <span className="font-mono text-sm">{model}</span>
                              </label>
                              <div className="flex items-center gap-2">
                                <button 
                                    type="button"
                                    onClick={() => handleTestModel(model)}
                                    disabled={result?.status === 'testing'}
                                    className="p-1 text-blue-500 hover:bg-blue-100 rounded-full transition-colors disabled:text-gray-400 disabled:hover:bg-transparent"
                                >
                                    {result?.status === 'testing' ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => handleRemoveModel(model)}
                                    disabled={settings.active_ai_model === model}
                                    className="p-1 text-red-500 hover:bg-red-100 rounded-full disabled:text-gray-400 disabled:hover:bg-transparent transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                          </div>
                          {result && result.status !== 'idle' && result.status !== 'testing' && (
                              <div className={`mt-2 text-xs p-2 rounded-md flex items-center gap-2 ${result.status === 'ok' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {result.status === 'ok' ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                                {result.message}
                              </div>
                          )}
                        </div>
                      )
                    })}
                </div>

                <div className="flex items-center gap-2">
                    <input 
                        type="text"
                        value={newModelName}
                        onChange={(e) => setNewModelName(e.target.value)}
                        placeholder="Напр: gemini-1.5-flash-latest"
                        className="flex-grow h-11 px-4 border border-[#E8EAED] rounded-lg focus:outline-none focus:border-[#1A73E8]"
                    />
                    <button
                        type="button"
                        onClick={handleAddModel}
                        className="flex items-center justify-center shrink-0 w-11 h-11 bg-gray-100 text-[#1A73E8] rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        <PlusCircle className="w-6 h-6" />
                    </button>
                </div>
                <p className="text-xs text-[#5F6368] mt-2">
                  <strong>Правило именования:</strong> "Gemini 2.5 Pro" → <code className="bg-gray-200 px-1 py-0.5 rounded">gemini-2.5-pro</code> (нижний регистр, пробелы на дефисы).
                </p>
                
                <div className="mt-6 pt-6 border-t border-dashed border-gray-300">
                  <h4 className="text-sm font-bold text-gray-600 mb-2">
                    Верификация
                  </h4>
                  <div className="bg-gray-100 p-3 rounded-lg">
                    <p className="text-sm text-gray-800">
                      Текущее значение в базе данных:
                      <strong className="font-mono ml-2 bg-gray-200 px-2 py-1 rounded">
                        {settings.active_ai_model || 'не установлено'}
                      </strong>
                    </p>
                  </div>
                </div>
              </div>

              <div className='pt-6 border-t border-[#E8EAED]'>
                <div className='flex items-center gap-2 mb-4'>
                  <Mail className='w-5 h-5 text-[#1A73E8]' strokeWidth={2} />
                  <h3 className='text-lg font-medium text-[#1F1F1F]'>Настройка отправки Email</h3>
                </div>

                <div className='bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4'>
                  <p className='text-sm text-[#1F1F1F] font-medium mb-2'>
                    Для автоматической отправки email настройте Resend API Key
                  </p>
                  <p className='text-sm text-[#5F6368] mb-3'>
                    Resend - бесплатный сервис для отправки email (до 100 писем/день)
                  </p>
                  <ol className='text-sm text-[#5F6368] space-y-2 list-decimal ml-4'>
                    <li>
                      Зарегистрируйтесь на{' '}
                      <a
                        href='https://resend.com/signup'
                        target='_blank'
                        rel='noopener noreferrer'
                        className='text-[#1A73E8] hover:underline inline-flex items-center gap-1'
                      >
                        resend.com
                        <ExternalLink className='w-3 h-3' strokeWidth={2} />
                      </a>
                    </li>
                    <li>Создайте API Key в разделе API Keys</li>
                    <li>Откройте настройки проекта в Supabase Dashboard</li>
                    <li>
                      Перейдите в Edge Functions → Secrets
                    </li>
                    <li>
                      Добавьте секрет: <code className='bg-white px-2 py-0.5 rounded'>RESEND_API_KEY</code> с вашим API ключом
                    </li>
                    <li>После настройки кнопка "Отправить Email" будет работать автоматически</li>
                  </ol>
                </div>

                <div className='bg-gray-50 border border-[#E8EAED] rounded-lg p-4'>
                  <p className='text-sm text-[#5F6368]'>
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
                  Сохранить все изменения
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-4 right-4 z-50">
          <div
            className={`px-4 py-3 rounded-lg font-medium flex items-center gap-2 shadow-lg ${
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
