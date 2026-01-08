
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { Loader2, Trash2, Power, AlertCircle, CheckCircle, RefreshCw, Save, PlusCircle, Bot, SlidersHorizontal, DownloadCloud, XCircle, FileText } from 'lucide-react';

const Card = ({ children, className = '' }) => (
    <div className={`bg-white border border-slate-200/80 rounded-lg ${className}`}>{children}</div>
);

const CardHeader = ({ title, description, action }) => (
    <div className="p-4 sm:p-5 border-b border-slate-200/80 flex flex-col sm:flex-row justify-between sm:items-start gap-4">
        <div className="flex-1">
            <h3 className="text-base font-semibold text-slate-800">{title}</h3>
            {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
        </div>
        {action && <div>{action}</div>}
    </div>
);

const CardContent = ({ children, className = '' }) => (
    <div className={`p-4 sm:p-5 ${className}`}>{children}</div>
);

const ActionButton = ({ onClick, children, variant = 'primary', size = 'md', disabled = false, loading = false, className = '' }) => {
    const baseClasses = "inline-flex items-center justify-center font-medium text-sm rounded-md transition-colors duration-200 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-offset-1";
    const sizeClasses = { md: "h-9 px-4", sm: "h-8 px-3 text-xs" };
    const variantClasses = {
        primary: "bg-slate-800 text-white hover:bg-slate-700 focus:ring-slate-400/50",
        secondary: "bg-slate-100 text-slate-700 hover:bg-slate-200 focus:ring-blue-400/50",
        danger: "bg-red-50 text-red-700 hover:bg-red-100 focus:ring-red-400/50",
    };
    return <button onClick={onClick} disabled={disabled || loading} className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}>{loading ? <Loader2 className="animate-spin h-4 w-4"/> : children}</button>
};

const ModelStatus = ({ status, message }) => {
    switch (status) {
      case 'checking':
        return <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1"><Loader2 className="animate-spin h-3 w-3" /> <span>Проверка...</span></div>;
      case 'available':
        return <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium mt-1"><CheckCircle className="h-3 w-3" /> <span>Модель доступна</span></div>;
      case 'error':
        return <div className="flex items-center gap-1.5 text-xs text-red-600 mt-1" title={message}><AlertCircle className="h-3 w-3" /> <span>{message || 'Ошибка доступа'}</span></div>;
      default:
        return <div className="h-5"></div>; // Placeholder for alignment
    }
};

export function AdminSettings() {
  const [systemModels, setSystemModels] = useState([]);
  const [metaPrompts, setMetaPrompts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [modelStatuses, setModelStatuses] = useState({});
  const [activeModel, setActiveModel] = useState('');
  const [settingsId, setSettingsId] = useState(null);
  const [savingPromptId, setSavingPromptId] = useState(null);
  const [isCheckingAll, setIsCheckingAll] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const fetchSystemData = useCallback(async () => {
    setLoading(true);
    try {
      const [settingsResult, modelsResult, promptsResult] = await Promise.all([
        supabase.from('system_settings').select('id, active_ai_model').single(),
        supabase.from('ai_models').select('*'),
        supabase.from('meta_prompts').select('*').order('created_at'),
      ]);

      if (settingsResult.error && settingsResult.error.code !== 'PGRST116') throw settingsResult.error;
      if (modelsResult.error) throw modelsResult.error;
      if (promptsResult.error) throw promptsResult.error;

      if (settingsResult.data) {
        setActiveModel(settingsResult.data.active_ai_model);
        setSettingsId(settingsResult.data.id);
      }
      if (modelsResult.data) {
        setSystemModels(modelsResult.data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
      }
      if (promptsResult.data) {
        setMetaPrompts(promptsResult.data);
      }

    } catch (error) {
      toast.error('Ошибка загрузки системных настроек: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSystemData(); }, [fetchSystemData]);

  const handleSavePrompt = async (promptId) => {
    const promptToSave = metaPrompts.find(p => p.id === promptId);
    if (!promptToSave) return;

    setSavingPromptId(promptId);
    const { error } = await supabase.from('meta_prompts').update({ prompt_text: promptToSave.prompt_text }).eq('id', promptId);
    if (error) {
        toast.error(`Не удалось сохранить промпт: ${error.message}`);
    } else {
        toast.success(`Промпт "${promptToSave.prompt_name}" обновлен.`);
    }
    setSavingPromptId(null);
  };

  const checkModelAvailability = useCallback(async (modelName) => {
    if (!modelName || typeof modelName !== 'string' || !modelName.startsWith('models/')) {
        setModelStatuses(prev => ({ ...prev, [modelName]: { status: 'error', message: 'Некорректное имя' }}));
        return;
    }
    setModelStatuses(prev => ({ ...prev, [modelName]: { status: 'checking' } }));
    try {
        const { data, error } = await supabase.functions.invoke('gemini-ai', { body: { action: 'check-model-availability', data: { modelName } } });
        if (error || data.error) throw new Error(error?.message || data.error);
        setModelStatuses(prev => ({ ...prev, [modelName]: { status: 'available' }}));
    } catch (e) {
        setModelStatuses(prev => ({ ...prev, [modelName]: { status: 'error', message: e.message }}));
    }
  }, []);

  const handleCheckAllModels = useCallback(async () => {
    setIsCheckingAll(true);
    toast.info('Проверка всех моделей...');
    await Promise.all(systemModels.map(model => checkModelAvailability(model.model_name)));
    setIsCheckingAll(false);
    toast.success('Проверка завершена.');
  }, [systemModels, checkModelAvailability]);

  const handleDiscoverModels = async () => {
    setIsDiscovering(true);
    toast.info("Запрос моделей у Google...");
    try {
      const { data: functionData, error: functionError } = await supabase.functions.invoke('gemini-ai', { body: { action: 'discover-models' } });
      if (functionError || functionData.error) throw new Error(functionError?.message || functionData.error?.message || "Ошибка запроса");

      const discoveredModels = functionData.models || [];
      const { data: existingModels, error: fetchExistingError } = await supabase.from('ai_models').select('model_name');
      if(fetchExistingError) throw fetchExistingError;

      const newModels = discoveredModels.filter(model => model.name && !existingModels.some(m => m.model_name === model.name))
          .map(model => ({ model_name: model.name, display_name: model.displayName, description: model.description }));

      if (newModels.length === 0) {
        toast.success("Новых моделей не найдено.");
      } else {
        const { error: insertError } = await supabase.from('ai_models').insert(newModels);
        if (insertError) throw new Error(`Ошибка добавления моделей: ${insertError.message}`);
        toast.success(`Найдено и добавлено ${newModels.length} новых моделей!`);
        fetchSystemData();
      }
    } catch (e) {
      toast.error(`Ошибка при поиске: ${e.message}`);
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleClearModels = async () => {
    if (!window.confirm("Вы уверены, что хотите очистить список моделей? Это необратимо.")) return;
    setIsClearing(true);
    toast.info("Очистка списка...");
    try {
      const { data: models, error: fetchError } = await supabase.from('ai_models').select('id');
      if (fetchError) throw new Error(`Ошибка получения списка: ${fetchError.message}`);
      if (!models || models.length === 0) {
        toast.success("Список уже пуст.");
      } else {
        const { error: deleteError } = await supabase.from('ai_models').delete().in('id', models.map(m => m.id));
        if (deleteError) throw new Error(`Ошибка удаления: ${deleteError.message}`);
        setSystemModels([]);
        setModelStatuses({});
        if (activeModel) {
          await supabase.from('system_settings').update({ active_ai_model: null }).eq('id', settingsId);
          setActiveModel('');
        }
        toast.success("Список моделей очищен.");
      }
    } catch (e) {
      toast.error(`Ошибка: ${e.message}`);
    } finally {
      setIsClearing(false);
    }
  }

  const handleSetActiveModel = async (modelName) => {
    const originalModel = activeModel;
    setActiveModel(modelName);
    const { error } = await supabase.from('system_settings').update({ active_ai_model: modelName }).eq('id', settingsId);
    if (error) {
        setActiveModel(originalModel);
        toast.error('Не удалось обновить модель: ' + error.message);
    } else {
        toast.success(`Модель "${modelName}" активна.`);
    }
  };

  const deleteModel = async (id, modelName) => {
    if (activeModel === modelName) {
        toast.error('Нельзя удалить активную модель.');
        return;
    }
    const { error } = await supabase.from('ai_models').delete().eq('id', id);
    if (error) {
        toast.error(`Не удалось удалить модель: ${error.message}`);
    } else {
        setSystemModels(prev => prev.filter(m => m.id !== id));
        setModelStatuses(prev => { const next = {...prev}; delete next[modelName]; return next; });
        toast.success(`Модель "${modelName}" удалена.`);
    }
  };
  
  const activeModelObject = activeModel ? systemModels.find(m => m.model_name === activeModel) : null;

  if (loading) return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin h-8 w-8 text-slate-400" /></div>;

  return (
    <div className="space-y-6">
        <div className="flex items-center gap-3">
            <SlidersHorizontal className="w-6 h-6 text-slate-700"/>
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-800">Настройки ИИ-моделей</h1>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold mb-2 break-words text-green-800">{activeModelObject?.display_name || activeModel || 'Активная модель не выбрана'}</h3>
          {activeModelObject?.description && <p className="text-sm text-green-700 mb-3 break-words">{activeModelObject.description}</p>}
          {activeModel && <p className="text-xs text-green-600">Проверена и используется для всех запросов</p>}
        </div>

        <Card>
            <CardHeader 
                title="Список доступных моделей" 
                description="Настройте и протестируйте модели Gemini для использования в системе."
                action={
                    <div className="flex flex-col sm:flex-row gap-2">
                        <ActionButton onClick={handleDiscoverModels} variant="secondary" size="sm" loading={isDiscovering} disabled={isClearing} className="w-full sm:w-auto">
                            <DownloadCloud className="h-3 w-3 mr-1.5" /> Запросить
                        </ActionButton>
                        <ActionButton onClick={handleCheckAllModels} variant="secondary" size="sm" loading={isCheckingAll} disabled={isClearing} className="w-full sm:w-auto">
                            <RefreshCw className="h-3 w-3 mr-1.5" /> Проверить все
                        </ActionButton>
                        <ActionButton onClick={handleClearModels} variant="danger" size="sm" loading={isClearing} disabled={isDiscovering || isCheckingAll} className="w-full sm:w-auto">
                            <XCircle className="h-3 w-3 mr-1.5" /> Очистить
                        </ActionButton>
                    </div>
                }
            />
            <CardContent className="divide-y divide-slate-100 -mt-5">
                {systemModels.map(model => (
                    <div key={model.id} className="py-4 flex items-center gap-4">
                        <input type="radio" name="active-model" checked={activeModel === model.model_name} onChange={() => handleSetActiveModel(model.model_name)} className="form-radio h-4 w-4 text-blue-600 mt-1 self-start" />
                        <div className="flex-1 min-w-0">
                           <p className="text-sm font-semibold text-slate-800 break-words">{model.display_name || model.model_name}</p>
                           {model.description && <p className="text-xs text-slate-500 mt-1 break-words">{model.description}</p>}
                           <p className="font-mono text-xs text-slate-400 mt-1 break-all">{model.model_name}</p>
                           <ModelStatus status={modelStatuses[model.model_name]?.status} message={modelStatuses[model.model_name]?.message} />
                        </div>
                        <div className="flex items-center gap-1 self-start">
                            <button onClick={() => checkModelAvailability(model.model_name)} title="Проверить" className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md"><Power className="h-4 w-4" /></button>
                            <button onClick={() => deleteModel(model.id, model.model_name)} title="Удалить" className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md"><Trash2 className="h-4 w-4" /></button>
                        </div>
                    </div>
                ))}
                 {systemModels.length === 0 && <div className="text-center py-10"><p className="text-sm text-slate-500">Список моделей пуст.</p></div>}
            </CardContent>
             <form onSubmit={(e) => { e.preventDefault(); /* Manual add disabled for now */ }} className="p-5 border-t border-slate-200/80 bg-slate-50/50 rounded-b-lg flex items-center gap-2">
                <input type="text" placeholder="Ручное добавление отключено" disabled className="flex-grow h-9 px-3 bg-slate-100 border border-slate-200 rounded-md text-sm" />
                <ActionButton type="submit" variant="secondary" disabled={true} size="sm">Добавить</ActionButton>
            </form>
        </Card>

        <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-slate-700"/>
            <h2 className="text-xl font-semibold text-slate-800">Управление мета-промптами</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {metaPrompts.map(prompt => (
                <Card key={prompt.id}>
                    <CardHeader title={prompt.prompt_name} description={prompt.notes} />
                    <CardContent>
                        <textarea className="w-full h-60 p-3 font-mono text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400/80" value={prompt.prompt_text} onChange={(e) => setMetaPrompts(metaPrompts.map(p => p.id === prompt.id ? { ...p, prompt_text: e.target.value } : p))} />
                    </CardContent>
                    <div className="p-5 border-t border-slate-200/80 bg-slate-50/50 rounded-b-lg flex justify-end">
                        <ActionButton onClick={() => handleSavePrompt(prompt.id)} disabled={savingPromptId === prompt.id} loading={savingPromptId === prompt.id}><Save className="w-4 h-4 mr-2" />Сохранить</ActionButton>
                    </div>
                </Card>
            ))}
            {metaPrompts.length === 0 && <div className="md:col-span-2 text-center py-10"><p className="text-sm text-slate-500">Системные промпты не найдены.</p></div>}
        </div>
    </div>
  );
}
