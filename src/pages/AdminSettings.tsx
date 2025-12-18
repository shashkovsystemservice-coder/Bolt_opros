import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Loader2, Trash2, Power, AlertCircle, CheckCircle, RefreshCw, Info, X, ArrowLeft } from 'lucide-react';

interface SystemModel {
  id: string;
  model_name: string;
  is_default: boolean;
}

interface ModelStatus {
  modelName: string;
  status: 'available' | 'unavailable' | 'checking' | 'error';
  message?: string;
}

export function AdminSettings() {
  const [systemModels, setSystemModels] = useState<SystemModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [newModelName, setNewModelName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [modelStatuses, setModelStatuses] = useState<Record<string, ModelStatus>>({});
  const [activeModel, setActiveModelState] = useState('');
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [googleModelsList, setGoogleModelsList] = useState('');
  const [showGoogleModelsArea, setShowGoogleModelsArea] = useState(false);
  const [generateSurveyMetaPrompt, setGenerateSurveyMetaPrompt] = useState('');
  const [isSavingPrompt, setIsSavingPrompt] = useState(false);

  useEffect(() => {
    fetchSystemModels();
    fetchSettings();
  }, []);

  const fetchSystemModels = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('ai_models').select('*').order('created_at');
    if (error) {
      toast.error('Не удалось загрузить модели: ' + error.message);
    } else {
      const models = data || [];
      setSystemModels(models);
      const initialStatuses: Record<string, ModelStatus> = {};
      models.forEach(model => {
        initialStatuses[model.model_name] = { modelName: model.model_name, status: 'checking' };
      });
      setModelStatuses(initialStatuses);
    }
    setLoading(false);
  };

  const fetchSettings = async () => {
    const { data, error } = await supabase.from('system_settings').select('id, active_ai_model, generate_survey_meta_prompt').single();
    if (data) {
      setActiveModelState(data.active_ai_model);
      setSettingsId(data.id);
      setGenerateSurveyMetaPrompt(data.generate_survey_meta_prompt || '');
    }
     if (error) {
      toast.error('Не удалось загрузить системные настройки: ' + error.message);
    }
  };

  const handleSetActiveModel = async (modelName: string) => {
    if (!settingsId) {
      toast.error("ID системных настроек не найден. Невозможно обновить модель.");
      return;
    }
    setIsUpdating(true);
    const { error } = await supabase
      .from('system_settings')
      .update({ active_ai_model: modelName })
      .eq('id', settingsId);

    if (error) {
      toast.error('Не удалось обновить активную модель: ' + error.message);
    } else {
      setActiveModelState(modelName);
      toast.success(`Модель "${modelName}" установлена как активная.`);
    }
    setIsUpdating(false);
  };
    
  const handleSavePrompt = async () => {
    if (!settingsId) {
      toast.error("ID системных настроек не найден. Невозможно обновить промпт.");
      return;
    }
    setIsSavingPrompt(true);
    const { error } = await supabase
      .from('system_settings')
      .update({ generate_survey_meta_prompt: generateSurveyMetaPrompt })
      .eq('id', settingsId);

    if (error) {
      toast.error('Не удалось сохранить промпт: ' + error.message);
    } else {
      toast.success('Системный промпт для генерации опросов успешно обновлен.');
    }
    setIsSavingPrompt(false);
  };

  const addModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModelName.trim()) {
      toast.error('Название модели не может быть пустым');
      return;
    }
    setIsAdding(true);
    const { data, error } = await supabase.from('ai_models').insert([{ model_name: newModelName.trim() }]).select().single();
    if (error) {
      toast.error('Не удалось добавить модель: ' + error.message);
    } else if (data) {
      setSystemModels(prev => [...prev, data]);
      setModelStatuses(prev => ({ ...prev, [data.model_name]: { modelName: data.model_name, status: 'checking' } }));
      setNewModelName('');
      toast.success(`Модель "${data.model_name}" добавлена. Проверьте ее доступность.`);
    }
    setIsAdding(false);
  };

  const deleteModel = async (id: string, modelName: string) => {
    const { error } = await supabase.from('ai_models').delete().eq('id', id);
    if (error) {
      toast.error('Не удалось удалить модель: ' + error.message);
    } else {
      setSystemModels(prev => prev.filter(m => m.id !== id));
      setModelStatuses(prev => {
        const newStatuses = { ...prev };
        delete newStatuses[modelName];
        return newStatuses;
      });
      toast.success(`Модель "${modelName}" удалена.`);
    }
  };

  const checkModelAvailability = async (modelName: string) => {
    setModelStatuses(prev => ({ ...prev, [modelName]: { ...prev[modelName], status: 'checking' } }));
    const { data, error } = await supabase.functions.invoke('gemini-ai', {
      body: JSON.stringify({ action: 'check-model-availability', data: { modelName } })
    });

    if (error) {
        setModelStatuses(prev => ({ ...prev, [modelName]: { ...prev[modelName], status: 'error', message: `Edge Function returned a non-2xx: ${error.message}` } }));
    } else if (data.error) {
        setModelStatuses(prev => ({ ...prev, [modelName]: { ...prev[modelName], status: 'error', message: data.error } }));
    } else {
        setModelStatuses(prev => ({ ...prev, [modelName]: { ...prev[modelName], status: 'available' } }));
    }
  };

  const checkAllModels = () => {
    systemModels.forEach(model => checkModelAvailability(model.model_name));
  };

  const showGoogleModels = async () => {
    toast.info('Запрашиваю список моделей у Google...');
    const { data, error } = await supabase.functions.invoke('list-models');

    if (error || data.error) {
      toast.error('Не удалось получить список моделей: ' + (error?.message || data.error));
      return;
    }

    const { availableModels } = data;
    if (!availableModels || availableModels.length === 0) {
      toast.warning('Google не вернул доступных моделей.');
      return;
    }

    setGoogleModelsList(availableModels.join('\n'));
    setShowGoogleModelsArea(true);
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin h-8 w-8 text-blue-600" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      <div className="mb-6">
        <Link to="/dashboard">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Вернуться в дашборд
          </Button>
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-2 text-gray-800">Управление ИИ-моделями</h1>
      <p className="text-gray-600 mb-8">Настройте и протестируйте модели Gemini для использования в системе.</p>

      {activeModel && (
        <div className="bg-green-50 rounded-2xl border border-green-200 p-6 mb-8">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <div>
              <h2 className="font-semibold text-green-900">Активная модель в системе</h2>
              <p className="text-lg font-mono bg-green-100 px-2 py-1 rounded-md text-green-800 inline-block mt-1">{activeModel}</p>
              <p className="text-sm text-green-700 mt-1">Проверена и используется для всех запросов</p>
            </div>
          </div>
        </div>
      )}

      {showGoogleModelsArea && (
        <div className="bg-gray-100 rounded-2xl border border-gray-200 p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
                <h2 className="font-semibold text-gray-800">Список моделей от Google</h2>
                <Button variant="ghost" size="icon" onClick={() => setShowGoogleModelsArea(false)}>
                    <X className="h-5 w-5" />
                </Button>
            </div>
            <textarea
                readOnly
                className="w-full h-40 p-3 font-mono text-sm border border-gray-300 rounded-lg bg-white"
                value={googleModelsList}
            />
            <p className="text-xs text-gray-500 mt-2">Скопируйте название нужной модели и вставьте в поле "Добавить вручную" ниже.</p>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800">Список доступных моделей</h2>
          <div className='flex gap-2'>
            <Button variant="outline" onClick={showGoogleModels}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Показать модели Google
            </Button>
            <Button onClick={checkAllModels}>
                <Power className="mr-2 h-4 w-4" />
                Проверить все
            </Button>
          </div>
        </div>
        <ul className="divide-y divide-gray-200">
          {systemModels.map(model => (
            <li key={model.id} className="p-4 flex justify-between items-center hover:bg-gray-50">
              <div className="flex items-center gap-4">
                <span className="font-mono text-gray-700">{model.model_name}</span>
                {modelStatuses[model.model_name]?.status === 'checking' && <Loader2 className="animate-spin h-4 w-4 text-gray-500" />}
                {modelStatuses[model.model_name]?.status === 'available' && <span className="flex items-center gap-1 text-sm text-green-600"><CheckCircle className="h-4 w-4" /> Модель доступна</span>}
                {modelStatuses[model.model_name]?.status === 'error' && (
                  <div className='flex items-center gap-1 text-sm text-red-600'>
                    <AlertCircle className="h-4 w-4" />
                    <span title={modelStatuses[model.model_name]?.message}>{modelStatuses[model.model_name]?.message?.substring(0, 50) + '...'}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {modelStatuses[model.model_name]?.status === 'available' && activeModel !== model.model_name && (
                  <Button size="sm" variant="outline" onClick={() => handleSetActiveModel(model.model_name)} disabled={isUpdating}>
                    {isUpdating ? <Loader2 className='animate-spin h-4 w-4'/> : 'Сделать активной'}
                  </Button>
                )}
                 {activeModel === model.model_name && (
                   <span className="text-sm font-semibold text-green-600 mr-2">Активна</span>
                 )}
                <Button size="icon" variant="ghost" onClick={() => deleteModel(model.id, model.model_name)}>
                  <Trash2 className="h-4 w-4 text-gray-500 hover:text-red-600" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
        <div className="p-6 bg-gray-50/50 border-t border-gray-200">
           <form onSubmit={addModel} className="flex items-center gap-2">
              <input 
                type="text"
                value={newModelName}
                onChange={e => setNewModelName(e.target.value)}
                placeholder="Напр: gemini-1.5-pro-latest"
                className="flex-grow px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <Button type="submit" disabled={isAdding}>
                {isAdding ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
                Добавить вручную
              </Button>
           </form>
        </div>
      </div>
        
       <div className="bg-white rounded-2xl border border-gray-200 mt-8">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Промпт для генерации опроса</h2>
          <p className="text-sm text-gray-600 mt-1">
            Это системная инструкция, которую ИИ использует для создания структуры и вопросов опроса. Отредактируйте ее, чтобы изменить стиль или язык генерируемых опросов.
          </p>
        </div>
        <div className="p-6">
          <textarea
            className="w-full h-60 p-3 font-mono text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={generateSurveyMetaPrompt}
            onChange={(e) => setGenerateSurveyMetaPrompt(e.target.value)}
            placeholder="Введите системный промпт здесь..."
          />
        </div>
        <div className="p-6 bg-gray-50/50 border-t border-gray-200 flex justify-end">
          <Button onClick={handleSavePrompt} disabled={isSavingPrompt}>
            {isSavingPrompt ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
            Сохранить промпт
          </Button>
        </div>
      </div>

       <div className="bg-blue-50 rounded-2xl border border-blue-200 p-6 mt-8">
          <div className="flex items-center gap-3 text-lg font-semibold text-blue-900 mb-3">
            <Info className="w-6 h-6" />
            Чем отличаются модели?
          </div>
          <div className="space-y-2 text-sm text-blue-800">
            <p><strong>Pro-модели</strong> (напр. `gemini-2.5-pro`) — самые мощные и "умные". Они отлично подходят для сложных задач: детального анализа, написания больших текстов, сложных рассуждений. Это флагманские модели.</p>
            <p><strong>Flash-модели</strong> (напр. `gemini-2.5-flash`) — это баланс между скоростью и качеством. Они работают значительно быстрее Pro-моделей и дешевле, но могут быть чуть менее точными в очень сложных задачах. Идеальны для большинства повседневных операций, где важна скорость ответа.</p>
            <p><strong>Lite-модели</strong> — самые легкие и быстрые. Используются для очень простых, массовых задач, где не требуется глубокий анализ, например, для классификации текста или быстрых ответов в чат-ботах.</p>
            <p><strong>-latest</strong> (напр. `gemini-1.5-pro-latest`) — это не конкретная модель, а "указатель" на самую последнюю стабильную версию в семействе. Использование `-latest` гарантирует, что вы всегда работаете с новейшей версией без необходимости менять код.</p>
          </div>
        </div>

    </div>
  );
}
