
import { useState, useMemo } from 'react';
import MetaSurveyForm from '../components/MetaSurveyForm';
import { calculateBlueprint } from '../lib/blueprintCalculator';
import { Info } from 'lucide-react';


// Define types for our data structures
type TopicContext = {
  raw_input: string;
  // ... other fields from analysis
};

type MetaParams = Record<string, any>; // Simplified for now

type SurveyBlueprint = {
  max_questions: number;
  question_mix: Record<string, number>;
  sections: any[];
};

const SurveyGeneratorWizard = () => {
  const [step, setStep] = useState(1);
  const [topic, setTopic] = useState<TopicContext | null>(null);
  const [metaParams, setMetaParams] = useState<MetaParams>({
      purpose: 'Descriptive',
      target_audience: 'General',
      time_constraint: 600, // 10 minutes default
      mode: 'Web_Visual',
      granularity: 'Medium',
  });

  // This will recalculate the blueprint whenever metaParams change
  const blueprint = useMemo(() => calculateBlueprint(metaParams), [metaParams]);

  const handleTopicSubmit = (raw_input: string) => {
    if (!raw_input.trim()) return;
    const parsedTopic = { raw_input };
    setTopic(parsedTopic);
    setStep(2);
  };

  const handleGenerate = () => {
    console.log("Generating survey with:", { topic, blueprint });
    setStep(3); // Move to the placeholder generation screen
  };
  
  // Component to display the live blueprint preview
  const SurveyBlueprintPreview = ({ blueprint }: { blueprint: SurveyBlueprint }) => (
      <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-900">Превью вашего опроса:</h3>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-center">
              <div className="p-4 bg-white rounded-lg shadow-sm">
                  <p className="text-sm text-gray-500">Примерное кол-во вопросов</p>
                  <p className="text-3xl font-bold text-gray-900">~{blueprint.max_questions}</p>
              </div>
              <div className="p-4 bg-white rounded-lg shadow-sm">
                  <p className="text-sm text-gray-500">Типы вопросов</p>
                  <p className="text-lg font-medium text-gray-800">
                      {blueprint.question_mix.closed}% Закрытые / {blueprint.question_mix.scaled}% Шкалы / {blueprint.question_mix.open}% Открытые
                  </p>
              </div>
          </div>
      </div>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-5xl mx-auto">
        <header className="mb-10">
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Мастер Создания Опросов</h1>
          <p className="mt-3 text-lg text-gray-600">
            Пройдите несколько шагов, чтобы создать идеально структурированный опрос.
          </p>
        </header>

        {step === 1 && (
            <div className="bg-white p-8 rounded-lg shadow-md">
                <h2 className="text-2xl font-semibold mb-4">Шаг 1: О чём ваш опрос?</h2>
                <p className="text-gray-600 mb-6">Опишите своими словами главную тему или задачу. Например: "Удовлетворённость клиентов нашим новым сервисом доставки".</p>
                <textarea
                id="topic-input"
                className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                rows={4}
                placeholder="Я хочу узнать..."
                defaultValue={topic?.raw_input}
                />
                <button 
                onClick={() => {
                    const input = document.getElementById('topic-input') as HTMLTextAreaElement;
                    handleTopicSubmit(input.value);
                }}
                className="mt-4 px-6 py-2 bg-indigo-600 text-white font-semibold rounded-md shadow-sm hover:bg-indigo-700 disabled:bg-gray-300"
                >
                Далее
                </button>
          </div>
        )}

        {step === 2 && (
            <div className="bg-white p-8 rounded-lg shadow-md">
                <h2 className="text-2xl font-semibold mb-4">Шаг 2: Уточните параметры</h2>
                <MetaSurveyForm params={metaParams} onChange={setMetaParams} />
                <SurveyBlueprintPreview blueprint={blueprint} />
                 <div className="flex justify-between mt-8">
                    <button onClick={() => setStep(1)} className="px-6 py-2 bg-gray-200 text-gray-800 font-semibold rounded-md hover:bg-gray-300">
                        Назад
                    </button>
                    <button onClick={handleGenerate} className="px-6 py-2 bg-green-600 text-white font-semibold rounded-md shadow-sm hover:bg-green-700">
                        Сгенерировать опрос
                    </button>
                </div>
            </div>
        )}

        {step === 3 && (
             <div className="text-center">
                <div className="mb-6 inline-flex items-center px-4 py-2 bg-yellow-100 text-yellow-800 font-semibold rounded-full text-sm">
                    <Info className="h-5 w-5 mr-2"/>
                    Это заглушка. Реальная генерация опроса пока не настроена.
                </div>
                <h2 className="text-2xl font-semibold mb-4">Генерация...</h2>
                <p className='mb-12'>ИИ создаёт ваш опрос на основе темы "{topic?.raw_input}" и выбранных параметров.</p>

                 <div className="max-w-2xl mx-auto text-left p-6 bg-white rounded-xl shadow-md border border-gray-200">
                    <details>
                        <summary className="text-lg font-semibold text-gray-800 cursor-pointer hover:text-indigo-600">
                           Как работают формулы?
                        </summary>
                        <div className="mt-4 text-gray-700 space-y-4 text-sm">
                            <p>В основе "Мастера" лежат две ключевые формулы, которые в реальном времени рассчитывают "чертёж" вашего опроса.</p>
                            <div>
                                <h4 className="font-semibold">1. Расчет максимального количества вопросов</h4>
                                <p className="mt-1">Формула определяет, сколько вопросов респондент успеет ответить за указанное время, не испытывая усталости.</p>
                                <code className="block bg-gray-100 p-2 rounded-md my-2 text-xs">Кол-во вопросов = (Выбранное время * 0.85) / Среднее время на 1 вопрос</code>
                                <ul className="list-disc list-inside space-y-1">
                                    <li><b>Выбранное время * 0.85</b>: Мы берем 85% от общего времени, оставляя 15% на чтение вступления и переходы.</li>
                                    <li><b>Среднее время на 1 вопрос</b>: Этот показатель зависит от <b>режима</b> опроса (веб-форма: ~15 сек, чат-бот: ~25 сек) и <b>глубины</b> (подробные вопросы требуют больше времени).</li>
                                </ul>
                            </div>
                             <div>
                                <h4 className="font-semibold">2. Распределение типов вопросов</h4>
                                <p className="mt-1">Эта логика определяет, какой тип вопросов лучше всего подходит для вашей цели.</p>
                                 <ul className="list-disc list-inside space-y-1 mt-2">
                                    <li><b>Основной ориентир — Цель опроса</b>:
                                        <ul className="list-inside pl-4">
                                           <li>Исследование (`Exploratory`) даёт больше <b>открытых</b> вопросов (~60%).</li>
                                           <li>Измерение (`Descriptive`) предпочитает <b>шкалы</b> (~60%).</li>
                                            <li>Анализ (`Analytical`) даёт сбалансированный <b>микс</b>.</li>
                                        </ul>
                                    </li>
                                    <li><b>Корректировка</b>: Если вы выбираете тип данных "Причины" (`Causes`), система автоматически увеличивает долю <b>открытых</b> вопросов.</li>
                                </ul>
                            </div>
                            <p className='pt-2 border-t border-gray-200'>Это позволяет создавать сбалансированную структуру, которая максимально соответствует вашей исследовательской задаче.</p>
                        </div>
                    </details>
                </div>

                <button onClick={() => setStep(2)} className="mt-10 px-6 py-2 bg-gray-200 text-gray-800 font-semibold rounded-md hover:bg-gray-300">
                    Назад к параметрам
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default SurveyGeneratorWizard;
