
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { Loader2, Trash2, Power, AlertCircle, CheckCircle, RefreshCw, Save, Bot } from 'lucide-react';

// --- Reusable & Styled Components ---
const ActionButton = ({ onClick, children, variant = 'primary', size = 'md', disabled = false, loading = false, className = '' }) => {
    const baseClasses = "inline-flex items-center justify-center font-medium text-sm rounded-md transition-colors duration-200 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background";
    const sizeClasses = { md: "h-9 px-4", sm: "h-8 px-3" };
    const variantClasses = {
        primary: "bg-primary text-on-primary hover:bg-primary/90 focus:ring-primary",
        secondary: "bg-surface border border-border hover:bg-background text-text-primary focus:ring-primary",
    };
    return <button onClick={onClick} disabled={disabled || loading} className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}>{loading ? <Loader2 className="animate-spin h-4 w-4"/> : children}</button>
};

const ActionIcon = ({ onClick, children, title }) => (
    <button onClick={onClick} title={title} className="p-1.5 text-text-secondary hover:text-red-500 rounded-md hover:bg-red-500/10 transition-colors">
        {children}
    </button>
);

const SettingsSection = ({ title, description, children, footer, headerActions }) => (
  <div className="py-8 border-b border-border-subtle last:border-b-0">
    <div className="grid md:grid-cols-3 gap-4 md:gap-8">
      <div className="md:col-span-1">
        <h3 className="text-base font-semibold text-text-primary">{title}</h3>
        <p className="text-sm text-text-secondary mt-1">{description}</p>
      </div>
      <div className="md:col-span-2">
        {headerActions && <div className="flex justify-end mb-4">{headerActions}</div>}
        <div className="p-6 bg-surface border border-border rounded-lg space-y-5">{children}</div>
        {footer && <div className="flex justify-end pt-5">{footer}</div>}
      </div>
    </div>
  </div>
);

const ModelStatusBadge = ({ status, message }) => {
  switch (status) {
    case 'checking':
      return <div className="flex items-center gap-2 text-sm text-text-secondary"><Loader2 className="animate-spin h-4 w-4" /> <span>Проверка...</span></div>;
    case 'available':
      return <div className="flex items-center gap-2 text-sm text-green-600"><CheckCircle className="h-4 w-4" /> <span>Доступна</span></div>;
    case 'error':
      return <div className="flex items-center gap-2 text-sm text-red-600" title={message}><AlertCircle className="h-4 w-4" /> <span>Ошибка</span></div>;
    default:
      return <div className="w-24"></div>;
  }
};

// --- Main Page Component ---
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

  const fetchSystemData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('system_settings').select('id, active_ai_model, generate_survey_meta_prompt, ai_models(*)').single();
      if (error) throw error;
      
      const models = data.ai_models || [];
      setSystemModels(models.sort((a,b) => new Date(b.created_at) - new Date(a.created_at)));
      setActiveModel(data.active_ai_model);
      setSettingsId(data.id);
      setGenerateSurveyMetaPrompt(data.generate_survey_meta_prompt || '');
      
    } catch (error) {
      toast.error('Ошибка загрузки системных настроек: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSystemData(); }, [fetchSystemData]);

  const handleCheckAllModels = () => {
    toast.info('Запущена проверка доступности всех моделей...');
    const newStatuses = {};
    systemModels.forEach(model => { newStatuses[model.model_name] = { status: 'checking' }; });
    setModelStatuses(newStatuses);
    systemModels.forEach(model => checkModelAvailability(model.model_name));
  };

  const checkModelAvailability = async (modelName) => {
    try {
        const { data, error } = await supabase.functions.invoke('gemini-ai', {
            body: { action: 'check-model-availability', data: { modelName } }
        });
        setModelStatuses(prev => ({ ...prev, [modelName]: error || data.error ? { status: 'error', message: error?.message || data.error } : { status: 'available' }}));
    } catch (e) {
        setModelStatuses(prev => ({ ...prev, [modelName]: { status: 'error', message: e.message }}));
    }
  };

  const handleSetActiveModel = async (modelName) => {
    setIsUpdating(true);
    const { error } = await supabase.from('system_settings').update({ active_ai_model: modelName }).eq('id', settingsId);
    if (error) toast.error('Не удалось обновить модель: ' + error.message);
    else { setActiveModel(modelName); toast.success(`Модель "${modelName}" активна.`); }
    setIsUpdating(false);
  };

  const addModel = async (e) => {
    e.preventDefault();
    if (!newModelName.trim()) return;
    setIsAdding(true);
    const { data, error } = await supabase.from('ai_models').insert([{ model_name: newModelName.trim() }]).select().single();
    if (error) toast.error('Не удалось добавить модель: ' + error.message);
    else { setSystemModels(prev => [data, ...prev]); setNewModelName(''); toast.success(`Модель "${data.model_name}" добавлена.`); }
    setIsAdding(false);
  };

  const deleteModel = async (id, modelName) => {
    if (activeModel === modelName) {
        toast.error('Нельзя удалить активную модель.');
        return;
    }
    const { error } = await supabase.from('ai_models').delete().eq('id', id);
    if (error) toast.error('Не удалось удалить модель: ' + error.message);
    else { setSystemModels(prev => prev.filter(m => m.id !== id)); toast.success(`Модель "${modelName}" удалена.`); }
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
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-text-primary">Настройки системы</h1>
        <p className="text-text-secondary mt-1 text-sm">Управление ИИ-моделями и системными промптами.</p>
      </div>

      <div className="mb-8 border border-border rounded-lg p-5 flex items-center justify-between bg-primary/5">
          <div className="flex items-center gap-4">
              <Bot className="w-6 h-6 text-primary flex-shrink-0" strokeWidth={2} />
              <div>
                  <h2 className="font-medium text-text-secondary text-sm">Активная модель в системе</h2>
                  <p className="text-base font-semibold font-mono text-primary mt-0.5">{activeModel}</p>
              </div>
          </div>
      </div>

      <SettingsSection 
          title="Управление моделями"
          description="Добавьте, удалите или проверьте доступность ИИ-моделей."
          headerActions={
              <ActionButton onClick={handleCheckAllModels} variant="secondary" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Проверить все
              </ActionButton>
          }
      >
          <ul className="divide-y divide-border-subtle -m-6">
              {systemModels.map(model => (
                  <li key={model.id} className="p-4 flex justify-between items-center">
                      <span className="font-mono text-text-primary text-sm">{model.model_name}</span>
                      <div className="flex items-center gap-4">
                          <ModelStatusBadge {...modelStatuses[model.model_name]} />
                          {activeModel !== model.model_name ? (
                              <ActionButton onClick={() => handleSetActiveModel(model.model_name)} disabled={isUpdating} variant="secondary" size="sm">
                                  <Power className="h-3 w-3 mr-1.5" /> Сделать активной
                              </ActionButton>
                          ) : <span className="text-xs font-semibold text-primary px-2">Активна</span>}
                          <ActionIcon onClick={() => deleteModel(model.id, model.model_name)} title="Удалить">
                              <Trash2 className="h-4 w-4" />
                          </ActionIcon>
                      </div>
                  </li>
              ))}
          </ul>
          <form onSubmit={addModel} className="flex items-center gap-2 pt-5">
              <input 
                  type="text"
                  value={newModelName}
                  onChange={e => setNewModelName(e.target.value)}
                  placeholder="Название новой модели..."
                  className="flex-grow h-10 px-3 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/80"
              />
              <ActionButton type="submit" disabled={isAdding} loading={isAdding} size="md">
                  Добавить
              </ActionButton>
          </form>
      </SettingsSection>

      <SettingsSection
          title="Системный промпт"
          description="Инструкция, которую ИИ использует для создания структуры и вопросов опроса."
          footer={
              <ActionButton onClick={handleSavePrompt} disabled={isSavingPrompt} loading={isSavingPrompt}>
                  <Save className="w-4 h-4 mr-2" /> Сохранить промпт
              </ActionButton>
          }
      >
          <textarea
              className="w-full h-80 p-3 font-mono text-xs bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/80"
              value={generateSurveyMetaPrompt}
              onChange={(e) => setGenerateSurveyMetaPrompt(e.target.value)}
              placeholder="Вы — эксперт по созданию опросов..."
          />
      </SettingsSection>
    </div>
  );
}
