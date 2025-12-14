import { useState, useEffect } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { supabase } from '../lib/supabase';
import { Save, AlertCircle, CheckCircle, Cpu, Trash2, PlusCircle, Power, RefreshCcw, ExternalLink, HelpCircle, FileText } from 'lucide-react';

interface SystemSettings {
  id: string;
  support_email: string;
  maintenance_mode: boolean;
  auto_delete_inactive_days: number;
  notify_admin_new_registration: boolean;
  ai_model_list: string[] | null;
  active_ai_model: string | null;
}

interface ModelStatus {
    modelName: string;
    status: 'idle' | 'testing' | 'success' | 'error';
    message: string;
}

export function AdminSettings() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [metaPrompt, setMetaPrompt] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [newModelName, setNewModelName] = useState('');
  const [modelStatuses, setModelStatuses] = useState<Record<string, ModelStatus>>({});

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (settings?.active_ai_model && modelStatuses[settings.active_ai_model]?.status === 'idle') {
      handleTestModel(settings.active_ai_model);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings?.active_ai_model, modelStatuses]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [settingsRes, metaPromptRes] = await Promise.all([
          supabase.from('system_settings').select('*').single(),
          supabase.from('meta_prompts').select('prompt_text').eq('prompt_name', 'generate-survey').single(),
      ]);

      if (settingsRes.error && settingsRes.error.code !== 'PGRST116') throw settingsRes.error;
      if (metaPromptRes.error && metaPromptRes.error.code !== 'PGRST116') throw metaPromptRes.error;

      let systemSettings = settingsRes.data;
      if (!systemSettings) {
        const { data: newSettings, error: createError } = await supabase
          .from('system_settings')
          .insert([{
            support_email: 'support@example.com',
            ai_model_list: ['gemini-1.5-pro-latest', 'gemini-1.5-flash-latest', 'gemini-pro'],
            active_ai_model: 'gemini-1.5-pro-latest',
          }])
          .select()
          .single();
        if (createError) throw createError;
        systemSettings = newSettings;
      }
      setSettings(systemSettings);
      setMetaPrompt(metaPromptRes.data?.prompt_text || '');
      
      const initialStatuses: Record<string, ModelStatus> = {};
      (systemSettings?.ai_model_list || []).forEach(model => {
          initialStatuses[model] = { modelName: model, status: 'idle', message: 'Не проверено' };
      });
      setModelStatuses(initialStatuses);

    } catch (err: any) {
      showToast('error', `Ошибка загрузки данных: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    try {
      setSaving(true);
      const settingsUpdate = supabase
        .from('system_settings')
        .update({ ...settings, updated_at: new Date().toISOString() })
        .eq('id', settings.id);
      
      const { error: metaPromptError } = await supabase
        .from('meta_prompts')
        .upsert({ 
            prompt_name: 'generate-survey', 
            prompt_text: metaPrompt, 
            updated_at: new Date().toISOString() 
        }, { onConflict: 'prompt_name' });

      const { error: settingsError } = await settingsUpdate;

      if (settingsError) throw settingsError;
      if (metaPromptError) throw metaPromptError;
      
      showToast('success', 'Настройки сохранены');
    } catch (err: any) {
      showToast('error', `Ошибка сохранения: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleTestModel = async (modelName: string) => {
    setModelStatuses(prev => ({ ...prev, [modelName]: { modelName, status: 'testing', message: 'Проверка...' } }));
    try {
      const { data, error } = await supabase.functions.invoke('gemini-ai', {
        body: { action: 'test-model', data: { modelName } },
      });
      if (error) throw new Error(`Network error: ${error.message}`);
      if (data.status === 'success') {
        setModelStatuses(prev => ({ ...prev, [modelName]: { modelName, status: 'success', message: 'Модель доступна' } }));
      } else {
        throw new Error(data.message || 'Неизвестная ошибка функции');
      }
    } catch (err: any) {
      setModelStatuses(prev => ({ ...prev, [modelName]: { modelName, status: 'error', message: err.message } }));
    }
  };

  const handleTestAllModels = async () => {
    if (!settings?.ai_model_list) return;
    const testPromises = settings.ai_model_list.map(modelName => handleTestModel(modelName));
    await Promise.all(testPromises);
  };

  const handleAddModel = () => {
    if (!settings || !newModelName.trim()) {
      showToast('error', 'Имя модели не может быть пустым');
      return;
    }
    const modelToAdd = newModelName.trim();
    if (settings.ai_model_list?.includes(modelToAdd)) {
        showToast('error', 'Такая модель уже существует');
        return;
    }
    const newModelList = [...(settings.ai_model_list || []), modelToAdd];
    setSettings({ ...settings, ai_model_list: newModelList });
    setModelStatuses(prev => ({ ...prev, [modelToAdd]: { modelName: modelToAdd, status: 'idle', message: 'Не проверено' } }));
    setNewModelName('');
    handleTestModel(modelToAdd);
  };

  const handleRemoveModel = (modelToRemove: string) => {
    if (!settings || modelToRemove === settings.active_ai_model) {
        showToast('error', 'Нельзя удалить активную модель');
        return;
    }
    setSettings({ ...settings, ai_model_list: settings.ai_model_list?.filter(m => m !== modelToRemove) || [] });
    const newStatuses = { ...modelStatuses };
    delete newStatuses[modelToRemove];
    setModelStatuses(newStatuses);
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  if (loading) {
    return <AdminLayout><div className="text-center py-12">Загрузка...</div></AdminLayout>;
  }

  const isActiveModelVerified = settings?.active_ai_model ? modelStatuses[settings.active_ai_model]?.status === 'success' : false;

  const getStatusColorClasses = (status: ModelStatus['status']) => {
    switch (status) {
      case 'testing': return 'bg-blue-100 text-blue-700';
      case 'success': return 'bg-green-100 text-green-700';
      case 'error': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  }

  return (
    <AdminLayout>
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-[#1F1F1F]">Системные настройки</h2>
        <p className="text-[#5F6368]">Управляйте глобальными параметрами, ИИ-моделями и системными промптами.</p>
      </div>

      {settings && (
        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-8 max-w-4xl">
          
          <div className="bg-white rounded-2xl border border-[#E8EAED] p-8">
            <h3 className="text-xl font-semibold text-[#1F1F1F] mb-1">Управление ИИ-моделями</h3>
            <p className="text-sm text-[#5F6368] mb-6">Настройте и протестируйте модели Gemini для использования в системе.</p>

            <div className="space-y-6">
              <div className="space-y-3">
                  <label className="block text-sm font-medium text-[#1F1F1F]">Активная модель в системе</label>
                  <div className={`flex items-center gap-3 p-3 rounded-lg border-2 ${isActiveModelVerified ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
                      <Cpu className={`w-6 h-6 ${isActiveModelVerified ? 'text-green-600' : 'text-red-600'}`} />
                      <div>
                          <p className="font-mono font-semibold text-base">{settings.active_ai_model || 'Не выбрана'}</p>
                          <p className={`text-sm ${isActiveModelVerified ? 'text-green-700' : 'text-red-700'}`}>
                              {isActiveModelVerified ? 'Проверена и используется для всех запросов' : 'Модель недоступна или не выбрана. Запросы будут отклонены.'}
                          </p>
                      </div>
                  </div>
              </div>

              <div className="pt-6 border-t border-[#E8EAED]">
                  <div className="flex justify-between items-center mb-3">
                      <label className="block text-sm font-medium text-[#1F1F1F]">Список доступных моделей</label>
                      <button
                          type="button"
                          onClick={handleTestAllModels}
                          className="flex items-center gap-2 px-3 h-9 bg-gray-100 text-gray-800 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                      >
                          <RefreshCcw className="w-4 h-4" />
                          Проверить все
                      </button>
                  </div>
                  <div className="space-y-2">
                      {settings.ai_model_list?.map(model => {
                          const status = modelStatuses[model];
                          return (
                              <div key={model} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg">
                                  <label className="flex items-center gap-3 cursor-pointer flex-grow">
                                      <input
                                          type="radio"
                                          name="active_ai_model"
                                          value={model}
                                          checked={settings.active_ai_model === model}
                                          onChange={() => setSettings({...settings, active_ai_model: model})}
                                          className="w-5 h-5 accent-[#1A73E8]"
                                      />
                                      <span className="font-mono text-sm pt-0.5">{model}</span>
                                  </label>
                                  
                                  <div className="flex items-center gap-2">
                                      {status && (
                                          <div className={`text-xs px-2 py-1 rounded-md flex items-center gap-1.5 ${getStatusColorClasses(status.status)}`}>
                                              {status.status === 'testing' && <RefreshCcw className="w-3 h-3 animate-spin" />}
                                              {status.status === 'success' && <CheckCircle className="w-3 h-3" />}
                                              {status.status === 'error' && <AlertCircle className="w-3 h-3" />}
                                              {status.status === 'idle' && <HelpCircle className="w-3 h-3" />}
                                              <span className='max-w-[200px] truncate'>{status.message}</span>
                                          </div>
                                      )}
                                      <button
                                          type="button"
                                          onClick={() => handleTestModel(model)}
                                          disabled={status?.status === 'testing'}
                                          className="p-2 text-gray-500 hover:bg-gray-200 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                      >
                                          <Power className="w-4 h-4" />
                                      </button>
                                      <button 
                                          type="button"
                                          onClick={() => handleRemoveModel(model)}
                                          disabled={settings.active_ai_model === model}
                                          className="p-2 text-red-500 hover:bg-red-100 rounded-full disabled:text-gray-400 disabled:hover:bg-transparent transition-colors"
                                      >
                                          <Trash2 className="w-4 h-4" />
                                      </button>
                                  </div>
                              </div>
                          )}
                      )}
                  </div>
              </div>

              <div className="pt-6 border-t border-[#E8EAED]">
                  <label className="block text-sm font-medium text-[#1F1F1F] mb-2">Добавить новую модель</label>
                  <div className="flex items-center gap-2">
                      <input 
                          type="text"
                          value={newModelName}
                          onChange={(e) => setNewModelName(e.target.value)}
                          placeholder="Напр: gemini-1.5-pro или gemini-1.5-flash"
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
                      Актуальный список и правила именования смотрите на{' '}
                      <a href="https://ai.google.dev/gemini-api/docs/models/gemini" target="_blank" rel="noopener noreferrer" className="text-[#1A73E8] hover:underline">официальной странице Google</a>.
                      <ExternalLink className="w-3 h-3 inline-block ml-1"/>
                  </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E8EAED] p-8">
            <h3 className="text-xl font-semibold text-[#1F1F1F] mb-1">Управление мета-промптами</h3>
            <p className="text-sm text-[#5F6368] mb-6">Это 'системный промпт', который используется для генерации опросов. Используйте переменные <code>{'${prompt}'}</code> и <code>{'${numQuestions}'}</code>, чтобы вставить данные от пользователя.</p>
            
            <div className="space-y-3">
                <label htmlFor="meta-prompt-textarea" className="flex items-center gap-2 text-sm font-medium text-[#1F1F1F]">
                  <FileText className="w-5 h-5" />
                  <span>Промпт для генерации опросов (generate-survey)</span>
                </label>
                <textarea 
                  id="meta-prompt-textarea"
                  value={metaPrompt}
                  onChange={(e) => setMetaPrompt(e.target.value)} 
                  className="w-full h-48 p-4 font-mono text-sm bg-gray-50 rounded-lg border border-gray-300 focus:outline-none focus:border-[#1A73E8] focus:ring-1 focus:ring-[#1A73E8]"
                  placeholder="Вставьте сюда системный промпт, который указывает AI, как генерировать опросы..."
                />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 h-11 bg-[#1A73E8] text-white rounded-lg font-medium hover:bg-[#1557B0] transition-colors disabled:opacity-50"
            >
              <Save className="w-5 h-5" strokeWidth={2} />
              {saving ? 'Сохранение...' : 'Сохранить все настройки'}
            </button>
          </div>
        </form>
      )}

      {toast && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className={`px-4 py-3 rounded-lg font-medium flex items-center gap-2 shadow-lg ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
            {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {toast.message}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
