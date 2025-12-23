
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { Loader2, Trash2, Power, AlertCircle, CheckCircle, RefreshCw, Save, PlusCircle, Bot, SlidersHorizontal, DownloadCloud, XCircle } from 'lucide-react';

// --- Styled Components (consistent with the new design) ---

const Card = ({ children, className = '' }) => (
    <div className={`bg-white border border-slate-200/80 rounded-lg ${className}`}>{children}</div>
);

const CardHeader = ({ title, description, action }) => (
    <div className="p-5 border-b border-slate-200/80 flex justify-between items-start">
        <div>
            <h3 className="text-base font-semibold text-slate-800">{title}</h3>
            {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
        </div>
        {action && <div>{action}</div>}
    </div>
);

const CardContent = ({ children, className = '' }) => (
    <div className={`p-5 ${className}`}>{children}</div>
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

// --- Main Page Component ---
export function AdminSettings() {
  const [systemModels, setSystemModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newModelName, setNewModelName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [modelStatuses, setModelStatuses] = useState({});
  const [activeModel, setActiveModel] = useState('');
  const [settingsId, setSettingsId] = useState(null);
  const [generateSurveyMetaPrompt, setGenerateSurveyMetaPrompt] = useState('');
  const [isSavingPrompt, setIsSavingPrompt] = useState(false);
  const [isCheckingAll, setIsCheckingAll] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const fetchSystemData = useCallback(async () => {
    setLoading(true);
    try {
      const [settingsResult, modelsResult] = await Promise.all([
        supabase.from('system_settings').select('id, active_ai_model, generate_survey_meta_prompt').single(),
        supabase.from('ai_models').select('*')
      ]);

      const { data: settingsData, error: settingsError } = settingsResult;
      if (settingsError && settingsError.code !== 'PGRST116') throw settingsError;

      const { data: modelsData, error: modelsError } = modelsResult;
      if (modelsError) throw modelsError;

      if (settingsData) {
        setActiveModel(settingsData.active_ai_model);
        setSettingsId(settingsData.id);
        setGenerateSurveyMetaPrompt(settingsData.generate_survey_meta_prompt || '');
      }
      if (modelsData) {
        setSystemModels(modelsData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
      }

    } catch (error) {
      toast.error('Ошибка загрузки системных настроек: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSystemData(); }, [fetchSystemData]);

  const checkModelAvailability = useCallback(async (modelName) => {
    if (!modelName || typeof modelName !== 'string' || !modelName.startsWith('models/')) {
        setModelStatuses(prev => ({ ...prev, [modelName]: { status: 'error', message: 'Некорректное имя модели' }}));
        return;
    }
    setModelStatuses(prev => ({ ...prev, [modelName]: { status: 'checking' } }));
    try {
        const { data, error } = await supabase.functions.invoke('gemini-ai', {
            body: { action: 'check-model-availability', data: { modelName } }
        });
        if (error || data.error) {
            throw new Error(error?.message || data.error);
        }
        setModelStatuses(prev => ({ ...prev, [modelName]: { status: 'available' }}));
    } catch (e) {
        setModelStatuses(prev => ({ ...prev, [modelName]: { status: 'error', message: e.message }}));
    }
  }, []);

  const handleCheckAllModels = useCallback(async () => {
    setIsCheckingAll(true);
    toast.info('Запущена проверка доступности всех моделей...');
    await Promise.all(systemModels.map(model => checkModelAvailability(model.model_name)));
    setIsCheckingAll(false);
    toast.success('Проверка всех моделей завершена.');
  }, [systemModels, checkModelAvailability]);

  const handleDiscoverModels = async () => {
    setIsDiscovering(true);
    toast.info("Запрашиваем список моделей у Google...");
    try {
      const { data: functionData, error: functionError } = await supabase.functions.invoke('gemini-ai', {
        body: { action: 'discover-models' }
      });

      if (functionError || functionData.error) {
        throw new Error(functionError?.message || functionData.error?.message || "Не удалось выполнить запрос");
      }

      const discoveredModels = functionData.models || [];
      if (discoveredModels.length === 0) {
        toast.success("Запрос выполнен. Новых моделей не найдено.");
        setIsDiscovering(false);
        return;
      }

      const { data: existingModels, error: fetchExistingError } = await supabase.from('ai_models').select('model_name');
      if(fetchExistingError) throw fetchExistingError;

      const existingModelNames = new Set(existingModels.map(m => m.model_name));
      
      const newModelsToInsert = discoveredModels
        .filter(model => model.name && !existingModelNames.has(model.name))
        .map(model => ({
          model_name: model.name,
          display_name: model.displayName,
          description: model.description,
        }));

      if (newModelsToInsert.length === 0) {
        toast.success("Все доступные модели Google уже есть в вашем списке.");
        setIsDiscovering(false);
        return;
      }

      const { error: insertError } = await supabase.from('ai_models').insert(newModelsToInsert);

      if (insertError) {
        throw new Error(`Не удалось добавить новые модели в базу: ${insertError.message}`);
      }
      
      toast.success(`Найдено и добавлено ${newModelsToInsert.length} новых моделей!`, {
        description: "Список на странице обновлен."
      });
      
      fetchSystemData();

    } catch (e) {
      toast.error(`Ошибка при поиске моделей: ${e.message}`);
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleClearModels = async () => {
    if (!window.confirm("Вы уверены, что хотите полностью очистить список моделей? Это действие необратимо.")) {
      return;
    }
    setIsClearing(true);
    toast.info("Очистка списка моделей...");
    try {
      const { data: models, error: fetchError } = await supabase.from('ai_models').select('id');
      
      if (fetchError) {
        throw new Error(`Не удалось получить список моделей для удаления: ${fetchError.message}`);
      }

      if (!models || models.length === 0) {
        toast.success("Список моделей уже пуст.");
        setSystemModels([]);
        setIsClearing(false);
        return;
      }

      const idsToDelete = models.map(m => m.id);
      const { error: deleteError } = await supabase.from('ai_models').delete().in('id', idsToDelete);

      if (deleteError) {
        throw new Error(`Ошибка при удалении моделей из базы: ${deleteError.message}`);
      }

      setSystemModels([]);
      setModelStatuses({});
      if (activeModel) {
        await supabase.from('system_settings').update({ active_ai_model: null }).eq('id', settingsId);
        setActiveModel('');
      }

      toast.success("Список моделей успешно очищен.");

    } catch (e) {
      console.error("Clear models error:", e);
      toast.error(`Ошибка при очистке: ${e.message}`);
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

  const addModel = async (e) => {
    e.preventDefault();
    const trimmedName = newModelName.trim();
    if (!trimmedName) return;
    setIsAdding(true);
    const { data, error } = await supabase.from('ai_models').insert([{ model_name: trimmedName, display_name: trimmedName }]).select().single();
    if (error) {
        toast.error(`Не удалось добавить модель: ${error.message}`);
    } else {
        setSystemModels(prev => [data, ...prev]);
        setNewModelName('');
        toast.success(`Модель "${data.model_name}" добавлена.`);
        checkModelAvailability(data.model_name);
    }
    setIsAdding(false);
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
  
  const handleSavePrompt = async () => {
    setIsSavingPrompt(true);
    const { error } = await supabase.from('system_settings').update({ generate_survey_meta_prompt: generateSurveyMetaPrompt }).eq('id', settingsId);
    if (error) {
        toast.error('Не удалось сохранить промпт: ' + error.message);
    } else {
        toast.success('Системный промпт обновлен.');
    }
    setIsSavingPrompt(false);
  };

  const activeModelObject = activeModel ? systemModels.find(m => m.model_name === activeModel) : null;

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin h-8 w-8 text-slate-400" /></div>;
  }

  return (
    <div className="space-y-6">
        <div className="flex items-center gap-3">
            <SlidersHorizontal className="w-6 h-6 text-slate-700"/>
            <h1 className="text-2xl font-semibold text-slate-800">Настройки ИИ-моделей</h1>
        </div>

        <Card>
            <CardContent className="flex items-center gap-4 bg-green-50/50">
                 <Bot className="w-8 h-8 text-green-600 flex-shrink-0" strokeWidth={2} />
                 <div>
                    <h3 className="font-semibold text-green-800">{activeModelObject?.display_name || activeModel || 'Активная модель не выбрана'}</h3>
                    {activeModelObject?.description && <p className="text-sm text-green-700 mt-1 max-w-xl">{activeModelObject.description}</p>}
                    {activeModel && <p className="text-xs text-green-600 mt-2">Проверена и используется для всех запросов</p>}
                 </div>
            </CardContent>
        </Card>

        <Card>
            <CardHeader 
                title="Список доступных моделей" 
                description="Настройте и протестируйте модели Gemini для использования в системе."
                action={
                    <div className="flex items-center gap-2">
                        <ActionButton onClick={handleDiscoverModels} variant="secondary" size="sm" loading={isDiscovering} disabled={isClearing}>
                            <DownloadCloud className="h-3 w-3 mr-1.5" /> Запросить
                        </ActionButton>
                        <ActionButton onClick={handleCheckAllModels} variant="secondary" size="sm" loading={isCheckingAll} disabled={isClearing}>
                            <RefreshCw className="h-3 w-3 mr-1.5" /> Проверить все
                        </ActionButton>
                        <ActionButton onClick={handleClearModels} variant="danger" size="sm" loading={isClearing} disabled={isDiscovering || isCheckingAll}>
                            <XCircle className="h-3 w-3 mr-1.5" /> Очистить список
                        </ActionButton>
                    </div>
                }
            />
            <CardContent className="divide-y divide-slate-100 -mt-5">
                {systemModels.map(model => (
                    <div key={model.id} className="py-4 flex items-center gap-4">
                        <input 
                            type="radio" 
                            name="active-model" 
                            checked={activeModel === model.model_name}
                            onChange={() => handleSetActiveModel(model.model_name)}
                            className="form-radio h-4 w-4 text-blue-600 transition duration-150 ease-in-out mt-1 self-start" 
                        />
                        <div className="flex-1">
                           <p className="text-sm font-semibold text-slate-800">{model.display_name || model.model_name}</p>
                           {model.description && <p className="text-xs text-slate-500 mt-1">{model.description}</p>}
                           <p className="font-mono text-xs text-slate-400 mt-1">{model.model_name}</p>
                           <ModelStatus status={modelStatuses[model.model_name]?.status} message={modelStatuses[model.model_name]?.message} />
                        </div>
                        <div className="flex items-center gap-1 self-start">
                            <button onClick={() => checkModelAvailability(model.model_name)} title="Проверить доступность" className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                                <Power className="h-4 w-4" />
                            </button>
                            <button onClick={() => deleteModel(model.id, model.model_name)} title="Удалить" className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors">
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                ))}
                 {systemModels.length === 0 && (
                    <div className="text-center py-10">
                        <p className="text-sm text-slate-500">Список моделей пуст.</p>
                        <p className="text-sm text-slate-400 mt-1">Нажмите "Запросить", чтобы получить список от провайдера.</p>
                    </div>
                )}
            </CardContent>
             <form onSubmit={addModel} className="p-5 border-t border-slate-200/80 bg-slate-50/50 rounded-b-lg flex items-center gap-2">
                <input 
                    type="text"
                    value={newModelName}
                    onChange={e => setNewModelName(e.target.value)}
                    placeholder="Или добавьте модель вручную..."
                    className="flex-grow h-9 px-3 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/80"
                />
                <ActionButton type="submit" variant="secondary" disabled={isAdding} loading={isAdding} size="sm">
                    <PlusCircle className="h-4 w-4 mr-2" /> Добавить
                </ActionButton>
            </form>
        </Card>

        <Card>
            <CardHeader 
                title="Управление мета-промптами"
                description="Это 'системный промпт', который используется для генерации опросов."
            />
            <CardContent>
                <textarea
                    className="w-full h-80 p-3 font-mono text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400/80"
                    value={generateSurveyMetaPrompt}
                    onChange={(e) => setGenerateSurveyMetaPrompt(e.target.value)}
                />
            </CardContent>
             <div className="p-5 border-t border-slate-200/80 bg-slate-50/50 rounded-b-lg flex justify-end">
                <ActionButton onClick={handleSavePrompt} disabled={isSavingPrompt} loading={isSavingPrompt}>
                    <Save className="w-4 h-4 mr-2" /> Сохранить
                </ActionButton>
            </div>
        </Card>
    </div>
  );
}
