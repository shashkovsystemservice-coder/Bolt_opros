
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { PlusCircle, Trash2, Save, AlertTriangle, Info, Plus } from 'lucide-react';

// 1. Типы данных
type SurveyAxisValue = {
  id: number;
  axis_id: number;
  label: string;
  description: string | null;
  value_code: string;
  order: number;
};

type SurveyAxis = {
  id: number;
  title: string;
  description: string | null;
  code: string;
  order: number;
  survey_axis_values: SurveyAxisValue[];
};

// 2. Компонент для редактирования одного значения
const AxisValueEditor = ({ value, onUpdate, onDelete }: { value: SurveyAxisValue, onUpdate: (field: keyof SurveyAxisValue, new_value: string | number) => void, onDelete: () => void }) => {
  return (
    <div className="grid grid-cols-12 gap-x-4 gap-y-2 py-3 items-center">
      <div className="col-span-12 md:col-span-3">
        <input
          type="text"
          value={value.label}
          onChange={(e) => onUpdate('label', e.target.value)}
          className="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      <div className="col-span-12 md:col-span-6">
        <input
          type="text"
          value={value.description || ''}
          onChange={(e) => onUpdate('description', e.target.value)}
          placeholder="Описание..."
          className="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      <div className="col-span-10 md:col-span-2">
         <input
          type="text"
          value={value.value_code}
          onChange={(e) => onUpdate('value_code', e.target.value)}
          placeholder="code"
          className="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
        />
      </div>
      <div className="col-span-2 md:col-span-1 text-right">
        <button
          onClick={onDelete}
          className="text-gray-400 hover:text-red-600 transition-colors"
          aria-label="Удалить значение"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
};

// 3. Компонент для редактирования одного параметра (оси)
const AxisEditor = ({ axis, onSave, onUpdate, onDeleteNew }: { axis: SurveyAxis, onSave: (axisData: SurveyAxis) => Promise<void>, onUpdate: (updatedAxis: SurveyAxis) => void, onDeleteNew?: () => void }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isNew = axis.id < 0; // Определяем, новый ли это параметр

  const handleUpdateAxis = (field: keyof SurveyAxis, value: string) => {
    onUpdate({ ...axis, [field]: value });
  };

  const handleUpdateValue = (valueId: number, field: keyof SurveyAxisValue, newValue: string | number) => {
    const updatedValues = axis.survey_axis_values.map(v =>
      v.id === valueId ? { ...v, [field]: newValue } : v
    );
    onUpdate({ ...axis, survey_axis_values: updatedValues });
  };

  const handleDeleteValue = (valueId: number) => {
    const updatedValues = axis.survey_axis_values.filter(v => v.id !== valueId);
    onUpdate({ ...axis, survey_axis_values: updatedValues });
  };

  const handleAddValue = () => {
    const newOrder = axis.survey_axis_values.length > 0
        ? Math.max(...axis.survey_axis_values.map(v => v.order)) + 1
        : 1;

    const newValue: SurveyAxisValue = {
      id: -Date.now(),
      axis_id: axis.id,
      label: 'Новое значение',
      description: '',
      value_code: 'new_value',
      order: newOrder
    };
    onUpdate({ ...axis, survey_axis_values: [...axis.survey_axis_values, newValue] });
  };
  
  const handleSave = async () => {
      setIsSaving(true);
      setError(null);
      try {
          await onSave(axis);
      } catch (err: any) {
          setError(err.message);
      } finally {
          setIsSaving(false);
      }
  };

  return (
    <div className={`p-6 bg-white rounded-xl shadow-md border transition-all hover:shadow-lg ${isNew ? 'border-blue-400' : 'border-gray-200'}`}>
        <div className="mb-4">
             <input
                type="text"
                value={axis.title}
                onChange={(e) => handleUpdateAxis('title', e.target.value)}
                className="text-xl font-semibold text-gray-800 w-full p-1 -m-1 rounded-md hover:bg-gray-100 focus:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Название нового параметра..."
            />
             <input
                type="text"
                value={axis.description || ''}
                onChange={(e) => handleUpdateAxis('description', e.target.value)}
                className="mt-1 text-sm text-gray-500 w-full p-1 -m-1 rounded-md hover:bg-gray-100 focus:bg-blue-50 focus:outline-none"
                placeholder="Описание параметра..."
            />
             <input
                type="text"
                value={axis.code}
                onChange={(e) => handleUpdateAxis('code', e.target.value)}
                className="mt-2 text-xs font-mono text-gray-500 w-full p-1 -m-1 rounded-md hover:bg-gray-100 focus:bg-blue-50 focus:outline-none"
                placeholder="program_code..."
            />
        </div>

        <div className="grid grid-cols-12 gap-x-4 px-2 py-2 bg-gray-50 rounded-t-lg border-b border-gray-200">
            <div className="col-span-3 text-xs font-bold text-gray-600 uppercase">Название</div>
            <div className="col-span-6 text-xs font-bold text-gray-600 uppercase">Описание</div>
            <div className="col-span-2 text-xs font-bold text-gray-600 uppercase">Код</div>
            <div className="col-span-1"></div>
        </div>

        <div className="divide-y divide-gray-100">
            {axis.survey_axis_values.map((value) => (
                <AxisValueEditor
                    key={value.id}
                    value={value}
                    onUpdate={(field, newValue) => handleUpdateValue(value.id, field, newValue)}
                    onDelete={() => handleDeleteValue(value.id)}
                />
            ))}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
             <button
                onClick={handleAddValue}
                className="flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
                <PlusCircle size={18} className="mr-2" />
                Добавить значение
            </button>
            <div className="flex items-center">
                 {error && (
                    <div className="text-red-600 text-sm mr-4 flex items-center">
                       <AlertTriangle size={16} className="mr-1" />
                        <span>Ошибка</span>
                    </div>
                 )}
                 {isNew && onDeleteNew && (
                    <button onClick={onDeleteNew} className="text-sm text-gray-600 hover:text-red-700 mr-4">Отмена</button>
                 )}
                 <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300"
                >
                    <Save size={16} className="mr-2" />
                    {isSaving ? 'Сохранение...' : isNew ? 'Создать параметр' : 'Сохранить'}
                </button>
            </div>
        </div>
        {error && <p className="mt-2 text-xs text-red-700 bg-red-50 p-2 rounded-md font-mono">{error}</p>}

    </div>
  );
};


// 4. Основной компонент страницы
const AdminSurveyStructurePage = () => {
  const [axes, setAxes] = useState<SurveyAxis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSurveyStructure = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('survey_axes')
        .select(`id, title, description, code, order, survey_axis_values (id, axis_id, label, description, value_code, order)`)
        .order('order', { ascending: true })
        .order('order', { foreignTable: 'survey_axis_values', ascending: true });

      if (fetchError) throw fetchError;
      setAxes(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSurveyStructure();
  }, [fetchSurveyStructure]);
  
  const handleUpdateAxisLocally = (updatedAxis: SurveyAxis) => {
      setAxes(prevAxes => prevAxes.map(a => a.id === updatedAxis.id ? updatedAxis : a));
  };

  const handleAddNewAxis = () => {
      const newOrder = axes.length > 0 ? Math.max(...axes.map(a => a.order)) + 1 : 1;
      const newAxis: SurveyAxis = {
          id: -Date.now(), // Временный ID
          title: '',
          description: '',
          code: '',
          order: newOrder,
          survey_axis_values: [],
      };
      setAxes(prev => [...prev, newAxis]);
  };

  const handleDeleteNewAxis = (axisId: number) => {
      setAxes(prev => prev.filter(a => a.id !== axisId));
  };

  const handleSaveAxis = async (axisData: SurveyAxis) => {
    // Проверяем, это новый параметр или существующий
    const isNew = axisData.id < 0;

    if (isNew) {
      // --- ЛОГИКА СОЗДАНИЯ НОВОГО --- 
      const maxOrder = axes.length > 0 ? Math.max(...axes.filter(a => a.id > 0).map(a => a.order)) : 0;

      const { data: newAxisData, error: axisError } = await supabase
        .from('survey_axes')
        .insert({ 
            title: axisData.title, 
            description: axisData.description, 
            code: axisData.code, 
            order: maxOrder + 1 
        })
        .select()
        .single();

      if (axisError) throw new Error(`Ошибка при создании параметра: ${axisError.message}`);
      if (!newAxisData) throw new Error('Не удалось получить данные нового параметра после создания.');

      // Если есть значения для добавления
      if (axisData.survey_axis_values.length > 0) {
        const valuesToInsert = axisData.survey_axis_values.map((value, index) => ({
            axis_id: newAxisData.id, // Используем ID только что созданного параметра
            label: value.label,
            description: value.description,
            value_code: value.value_code,
            order: index + 1
        }));

        const { error: valuesError } = await supabase.from('survey_axis_values').insert(valuesToInsert);
        if (valuesError) throw new Error(`Ошибка при добавлении значений: ${valuesError.message}`);
      }

    } else {
      // --- ЛОГИКА ОБНОВЛЕНИЯ СУЩЕСТВУЮЩЕГО --- 
      const { error: axisError } = await supabase
        .from('survey_axes')
        .update({ title: axisData.title, description: axisData.description, code: axisData.code })
        .eq('id', axisData.id);

      if (axisError) throw new Error(`Ошибка при обновлении параметра: ${axisError.message}`);

      const existingValueIds = axisData.survey_axis_values.map(v => v.id).filter(id => id > 0);
      if (existingValueIds.length > 0) {
          const { data: valuesToDelete } = await supabase
            .from('survey_axis_values').select('id').eq('axis_id', axisData.id).not('id', 'in', `(${existingValueIds.join(',')})`);
          
          if (valuesToDelete && valuesToDelete.length > 0) {
              const { error: deleteError } = await supabase.from('survey_axis_values').delete().in('id', valuesToDelete.map(v => v.id));
              if (deleteError) throw new Error(`Ошибка при удалении старых значений: ${deleteError.message}`);
          }
      } else { // Если все значения были удалены
				const { error: deleteAllError } = await supabase.from('survey_axis_values').delete().eq('axis_id', axisData.id);
				if(deleteAllError) throw new Error(`Ошибка при удалении всех старых значений: ${deleteAllError.message}`);
			}

      const upsertPromises = axisData.survey_axis_values.map((value, index) => {
          const valueToUpsert = { id: value.id > 0 ? value.id : undefined, axis_id: axisData.id, label: value.label, description: value.description, value_code: value.value_code, order: index + 1 };
          return supabase.from('survey_axis_values').upsert(valueToUpsert);
      });
      
      const results = await Promise.all(upsertPromises);
      const firstError = results.find(res => res.error);
      if (firstError) throw new Error(`Ошибка при обновлении/вставке значений: ${firstError.error!.message}`);
    }

    // После успешного сохранения перезагружаем данные
    await fetchSurveyStructure();
  };
  
  if (loading) return <div className="p-8 text-center">Загрузка редактора...</div>;

  if (error) {
    return (
        <div className="p-8 m-4 text-red-600 bg-red-50 rounded-lg">
            <p className="font-bold">Критическая ошибка при загрузке данных:</p>
            <p className="mt-2 text-sm font-mono bg-red-100 p-2 rounded">{error}</p>
             <button onClick={fetchSurveyStructure} className="mt-4 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">Попробовать снова</button>
        </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-5xl mx-auto">
        <header className="mb-10">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className='text-center sm:text-left'>
              <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Редактор структуры опросов</h1>
              <p className="mt-3 text-lg text-gray-600 max-w-3xl">Управляйте параметрами и их значениями для классификации опросов.</p>
            </div>
            <button 
              onClick={handleAddNewAxis}
              className='flex-shrink-0 w-full sm:w-auto flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
            >
                <Plus size={20} className="-ml-1 mr-2"/>
                Добавить параметр
            </button>
          </div>
        </header>

        <div className="space-y-8">
          {axes.map((axis) => (
            <AxisEditor 
                key={axis.id} 
                axis={axis} 
                onSave={handleSaveAxis} 
                onUpdate={handleUpdateAxisLocally}
                onDeleteNew={axis.id < 0 ? () => handleDeleteNewAxis(axis.id) : undefined}
            />
          ))}
        </div>
        
        <div className="mt-12 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex">
                <div className="flex-shrink-0"><Info className="h-5 w-5 text-blue-400" /></div>
                <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">Как это работает?</h3>
                    <div className="mt-2 text-sm text-blue-700 space-y-1">
                        <p>Нажмите <strong>"Добавить параметр"</strong>, чтобы создать новую карточку для редактирования.</p>
                        <p>Изменения для каждого параметра сохраняются отдельно по кнопке <strong>"Создать параметр"</strong> или <strong>"Сохранить"</strong>.</p>
                        <p><strong>Код</strong> — это уникальный идентификатор для программного использования (например, 'audience_type'). Старайтесь не менять его без необходимости.</p>
                    </div>
                </div>
            </div>
        </div>
        
      </div>
    </div>
  );
};

export default AdminSurveyStructurePage;
