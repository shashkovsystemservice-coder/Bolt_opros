
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

// 1. Типы данных, специфичные для этой страницы
type SurveyAxisValue = {
  id: number;
  label: string;
  description: string | null;
  value_code: string;
};

type SurveyAxis = {
  id: number;
  title: string;
  description: string | null;
  code: string;
  survey_axis_values: SurveyAxisValue[];
};

// 2. Компонент страницы
const AdminSurveyStructurePage = () => {
  const [axes, setAxes] = useState<SurveyAxis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSurveyStructure = async () => {
      try {
        setLoading(true);
        // 3. Запрос для получения вложенных данных
        const { data, error } = await supabase
          .from('survey_axes')
          .select(`
            id,
            title,
            description,
            code,
            survey_axis_values (
              id,
              label,
              description,
              value_code
            )
          `)
          .order('order', { ascending: true })
          .order('order', { foreignTable: 'survey_axis_values', ascending: true });

        if (error) {
          throw error;
        }

        setAxes(data || []);
      } catch (err: any) {
        setError(err.message);
        console.error("Error fetching survey structure:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSurveyStructure();
  }, []);

  // 4. Рендеринг состояний
  if (loading) {
    return <div className="p-8 text-center">Загрузка...</div>;
  }

  if (error) {
    return (
        <div className="p-8 text-red-600 bg-red-50 rounded-lg">
            <p className="font-bold">Ошибка при загрузке данных:</p>
            <p className="mt-2 text-sm font-mono bg-red-100 p-2 rounded">{error}</p>
            <p className="mt-4 text-sm text-gray-700"><strong>Примечание:</strong> Убедитесь, что вы выполнили SQL-запрос в Supabase SQL Editor и таблицы `survey_axes` и `survey_axis_values` существуют и заполнены данными.</p>
        </div>
    );
  }

  // 5. Основная разметка страницы
  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <header className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Структурные параметры опросов</h1>
          <p className="mt-2 text-md text-gray-600 max-w-3xl mx-auto">
            Это справочная модель, описывающая концептуальное пространство для проектирования опросов. Эти параметры не влияют на текущие опросы и предназначены для использования в будущих версиях системы.
          </p>
        </header>

        <div className="space-y-12">
          {axes.map((axis) => (
            <div key={axis.id} className="p-6 bg-white rounded-xl shadow-sm border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">{axis.title}</h2>
              {axis.description && <p className="mt-1 text-sm text-gray-500">{axis.description}</p>}

              <div className="mt-6 border-t border-gray-200">
                <dl className="divide-y divide-gray-200">
                  {axis.survey_axis_values.map((value) => (
                    <div key={value.id} className="py-5 grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                      <dt className="text-sm font-medium text-gray-800 md:col-span-3">{value.label}</dt>
                      <dd className="text-sm text-gray-600 md:col-span-9">{value.description || ' '}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminSurveyStructurePage;
