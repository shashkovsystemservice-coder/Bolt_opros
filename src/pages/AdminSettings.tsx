
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { Loader2, Trash2, Power, AlertCircle, CheckCircle, RefreshCw, Info, X, ArrowLeft, BrainCircuit, Settings, FileText, Bot } from 'lucide-react';

const SettingsCard = ({ icon, title, description, children, actions }) => (
  <div className="bg-surface border border-border-subtle rounded-2xl shadow-ambient overflow-hidden">
    <div className="p-6 border-b border-border-subtle">
      <div className="flex justify-between items-start gap-4">
        <div className="flex items-start gap-4">
          <div className="bg-background flex-shrink-0 rounded-full w-10 h-10 flex items-center justify-center">
            {icon}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
            <p className="text-sm text-text-secondary mt-1">{description}</p>
          </div>
        </div>
        {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
      </div>
    </div>
    <div className="p-6 bg-background/50">{children}</div>
  </div>
);

const ModelStatusBadge = ({ status, message }) => {
  switch (status) {
    case 'checking':
      return <Loader2 className="animate-spin h-4 w-4 text-text-secondary" />;
    case 'available':
      return <span className="flex items-center gap-1.5 text-xs font-medium text-green-600"><CheckCircle className="h-4 w-4" /> Доступна</span>;
    case 'error':
      return <span className="flex items-center gap-1.5 text-xs font-medium text-red-600" title={message}><AlertCircle className="h-4 w-4" /> Ошибка</span>;
    default:
      return null;
  }
};

export function AdminSettings() {
  const [systemModels, setSystemModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newModelName, setNewModelName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [modelStatuses, setModelStatuses] = useState({});
  const [activeModel, setActiveModel] = useState('');
  const [settingsId, setSettingsId] = useState(null);
  const [generateSurveyMetaPrompt, setGenerateSurveyMetaPrompt] = useState('');
  const [isSavingPrompt, setIsSavingPrompt] = useState(false);
  const [isCheckingAll, setIsCheckingAll] = useState(false);

  const fetchSystemData = useCallback(async () => {
    setLoading(true);
    try {
      const [modelsRes, settingsRes] = await Promise.all([
        supabase.from('ai_models').select('*').order('created_at'),
        supabase.from('system_settings').select('id, active_ai_model, generate_survey_meta_prompt').single(),
      ]);

      if (modelsRes.error) throw modelsRes.error;
      if (settingsRes.error) throw settingsRes.error;
      
      const models = modelsRes.data || [];
      setSystemModels(models);
      setActiveModel(settingsRes.data.active_ai_model);
      setSettingsId(settingsRes.data.id);
      setGenerateSurveyMetaPrompt(settingsRes.data.generate_survey_meta_prompt || '');
      
      const initialStatuses = {};
      models.forEach(model => { initialStatuses[model.model_name] = { status: 'checking' }; });
      setModelStatuses(initialStatuses);
      models.forEach(model => checkModelAvailability(model.model_name, initialStatuses));

    } catch (error) {
      toast.error('Ошибка загрузки системных настроек: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSystemData();
  }, [fetchSystemData]);

  const checkModelAvailability = async (modelName, currentStatuses) => {
    const { data, error } = await supabase.functions.invoke('gemini-ai', {
      body: { action: 'check-model-availability', data: { modelName } }
    });
    setModelStatuses(prev => ({
      ...prev,
      [modelName]: error || data.error 
        ? { status: 'error', message: error?.message || data.error }
        : { status: 'available' }
    }));
  };

  const handleCheckAllModels = () => {
    setIsCheckingAll(true);
    toast.info('Запущена проверка доступности всех моделей...');
    const newStatuses = {};
    systemModels.forEach(model => { 
        newStatuses[model.model_name] = { status: 'checking' }; 
    });
    setModelStatuses(newStatuses);
    systemModels.forEach(model => checkModelAvailability(model.model_name, newStatuses));
    setTimeout(() => setIsCheckingAll(false), 2000); 
  };

  const handleShowModelList = () => {
    const modelListText = systemModels.map(m => m.model_name).join('\n');
    toast.message('Список доступных моделей', {
      description: (
        <pre className="mt-2 w-full rounded-md bg-background p-2 text-xs">
          <code>{modelListText}</code>
        </pre>
      ),
      duration: 15000,
    });
  };

  const handleSetActiveModel = async (modelName) => {
    setIsUpdating(true);
    const { error } = await supabase.from('system_settings').update({ active_ai_model: modelName }).eq('id', settingsId);
    if (error) toast.error('Не удалось обновить модель: ' + error.message);
    else {
      setActiveModel(modelName);
      toast.success(`Модель "${modelName}" активна.`);
    }
    setIsUpdating(false);
  };

  const addModel = async (e) => {
    e.preventDefault();
    if (!newModelName.trim()) return;
    setIsAdding(true);
    const { data, error } = await supabase.from('ai_models').insert([{ model_name: newModelName.trim() }]).select().single();
    if (error) toast.error('Не удалось добавить модель: ' + error.message);
    else {
      setSystemModels(prev => [...prev, data]);
      setModelStatuses(prev => ({...prev, [data.model_name]: {status: 'checking'}}));
      checkModelAvailability(data.model_name, modelStatuses);
      setNewModelName('');
      toast.success(`Модель "${data.model_name}" добавлена.`);
    }
    setIsAdding(false);
  };

  const deleteModel = async (id, modelName) => {
    const { error } = await supabase.from('ai_models').delete().eq('id', id);
    if (error) toast.error('Не удалось удалить модель: ' + error.message);
    else {
      setSystemModels(prev => prev.filter(m => m.id !== id));
      toast.success(`Модель "${modelName}" удалена.`);
    }
  };
  
  const handleSavePrompt = async () => {
    setIsSavingPrompt(true);
    const { error } = await supabase.from('system_settings').update({ generate_survey_meta_prompt: generateSurveyMetaPrompt }).eq('id', settingsId);
    if (error) toast.error('Не удалось сохранить промпт: ' + error.message);
    else toast.success('Системный промпт обновлен.');
    setIsSavingPrompt(false);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
  }

  return (
    <div className="space-y-8">
        <div>
            <h1 className="text-3xl font-bold text-text-primary">Настройки</h1>
            <p className="text-text-secondary mt-2">Управление ИИ-моделями и системными промптами.</p>
        </div>

        {activeModel && (
            <div className="bg-primary/10 rounded-2xl p-6 flex items-center gap-4">
                <Bot className="w-6 h-6 text-primary" strokeWidth={2} />
                <div>
                    <h2 className="font-semibold text-text-primary">Активная модель в системе</h2>
                    <p className="text-lg font-mono text-primary mt-1">{activeModel}</p>
                </div>
            </div>
        )}

        <SettingsCard 
            icon={<BrainCircuit className="w-6 h-6 text-primary" strokeWidth={1.5} />} 
            title="Список доступных моделей"
            description="Добавьте, удалите или проверьте доступность ИИ-моделей."
            actions={
                <div className="flex items-center gap-2">
                    <button 
                        onClick={handleShowModelList} 
                        className="h-9 px-3 inline-flex items-center justify-center gap-1.5 bg-background border border-border-subtle text-text-secondary font-medium text-sm rounded-lg shadow-sm hover:bg-surface transition-colors duration-200"
                    >
                        <Info className="h-4 w-4" />
                        <span>Список</span>
                    </button>
                    <button 
                        onClick={handleCheckAllModels} 
                        disabled={isCheckingAll}
                        className="h-9 px-3 inline-flex items-center justify-center gap-1.5 bg-background border border-border-subtle text-text-secondary font-medium text-sm rounded-lg shadow-sm hover:bg-surface transition-colors duration-200 disabled:opacity-50"
                    >
                        {isCheckingAll ? <Loader2 className="animate-spin h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}
                        <span>Проверить все</span>
                    </button>
                </div>
            }
        >
            <ul className="divide-y divide-border-subtle">
                {systemModels.map(model => (
                    <li key={model.id} className="py-3 flex justify-between items-center">
                        <span className="font-mono text-text-primary">{model.model_name}</span>
                        <div className="flex items-center gap-4">
                            <ModelStatusBadge {...modelStatuses[model.model_name]} />
                            {modelStatuses[model.model_name]?.status === 'available' && activeModel !== model.model_name && (
                                <button onClick={() => handleSetActiveModel(model.model_name)} disabled={isUpdating} className="text-xs font-medium text-primary hover:underline disabled:opacity-50">
                                    {isUpdating ? '...' : 'Сделать активной'}
                                </button>
                            )}
                            {activeModel === model.model_name && <span className="text-xs font-semibold text-primary">Активна</span>}
                            <button onClick={() => deleteModel(model.id, model.model_name)} className="text-text-secondary hover:text-red-500 transition-colors"><Trash2 className="h-4 w-4" /></button>
                        </div>
                    </li>
                ))}
            </ul>
            <form onSubmit={addModel} className="flex items-center gap-2 pt-4 mt-4 border-t border-border-subtle">
                <input 
                    type="text"
                    value={newModelName}
                    onChange={e => setNewModelName(e.target.value)}
                    placeholder="gemini-1.5-pro-latest"
                    className="flex-grow h-10 px-3 bg-background border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <button type="submit" disabled={isAdding} className="h-10 px-4 inline-flex items-center justify-center bg-primary text-on-primary font-semibold text-sm rounded-lg shadow-sm hover:bg-primary/90 transition-colors duration-200 disabled:opacity-50">
                    {isAdding ? <Loader2 className="animate-spin h-4 w-4" /> : 'Добавить'}
                </button>
            </form>
        </SettingsCard>

        <SettingsCard
            icon={<FileText className="w-6 h-6 text-primary" strokeWidth={1.5} />}
            title="Системный промпт"
            description="Инструкция, которую ИИ использует для создания структуры и вопросов опроса."
            actions={
                <button onClick={handleSavePrompt} disabled={isSavingPrompt} className="h-10 px-4 inline-flex items-center justify-center bg-primary text-on-primary font-semibold text-sm rounded-lg shadow-sm hover:bg-primary/90 transition-colors duration-200 disabled:opacity-50">
                    {isSavingPrompt ? <Loader2 className="animate-spin h-4 w-4" /> : 'Сохранить'}
                </button>
            }
        >
            <textarea
                className="w-full h-72 p-4 font-mono text-sm bg-background border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                value={generateSurveyMetaPrompt}
                onChange={(e) => setGenerateSurveyMetaPrompt(e.target.value)}
                placeholder="Вы — эксперт по созданию опросов..."
            />
        </SettingsCard>

    </div>
  );
}
