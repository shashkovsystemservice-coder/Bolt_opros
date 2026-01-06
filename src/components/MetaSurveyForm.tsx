
import React from 'react';

// TODO: Define the full MetaParams type later
type MetaParams = Record<string, any>;

interface MetaSurveyFormProps {
  params: MetaParams;
  onChange: (newParams: MetaParams) => void;
}

// This is a simplified placeholder for the full meta-survey form.
// In a real application, this would be a multi-step form (e.g., using a library like react-hook-form).

const MetaSurveyForm: React.FC<MetaSurveyFormProps> = ({ params, onChange }) => {

  const handleChange = (field: string, value: any) => {
    onChange({ ...params, [field]: value });
  };

  return (
    <div className="space-y-8">
      {/* Block 1: Purpose & Audience */}
      <div>
        <h3 className="text-lg font-medium text-gray-900">1. Зачем и для кого?</h3>
        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="purpose" className="block text-sm font-medium text-gray-700">Зачем вам эти данные?</label>
            <select
              id="purpose"
              value={params.purpose || ''}
              onChange={(e) => handleChange('purpose', e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="" disabled>Выберите цель...</option>
              <option value="Exploratory">Понять ситуацию (исследование)</option>
              <option value="Descriptive">Измерить показатели (описание)</option>
              <option value="Analytical">Найти причины (анализ)</option>
              <option value="Confirmatory">Проверить гипотезу</option>
            </select>
          </div>
          <div>
            <label htmlFor="target_audience" className="block text-sm font-medium text-gray-700">Кто будет отвечать?</label>
            <select
              id="target_audience"
              value={params.target_audience || ''}
              onChange={(e) => handleChange('target_audience', e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
                <option value="" disabled>Выберите аудиторию...</option>
                <option value="General">Обычные люди</option>
                <option value="Experienced">Люди с опытом в теме</option>
                <option value="Expert">Эксперты/профессионалы</option>
            </select>
          </div>
        </div>
      </div>

      {/* Block 2: How to conduct? */}
       <div>
        <h3 className="text-lg font-medium text-gray-900">2. Как проводить?</h3>
        <div className="mt-4 space-y-4">
           <div>
            <label htmlFor="time_constraint" className="block text-sm font-medium text-gray-700">Сколько времени у людей есть?</label>
            <select
              id="time_constraint"
              value={params.time_constraint || ''}
              onChange={(e) => handleChange('time_constraint', Number(e.target.value))}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
                <option value="" disabled>Выберите время...</option>
                <option value={180}>1-3 минуты (экспресс)</option>
                <option value={600}>5-10 минут (стандарт)</option>
                <option value={1200}>10-20 минут (подробный)</option>
            </select>
          </div>
            <div>
            <label htmlFor="mode" className="block text-sm font-medium text-gray-700">Где и как они будут отвечать?</label>
            <select
              id="mode"
              value={params.mode || ''}
              onChange={(e) => handleChange('mode', e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
                <option value="" disabled>Выберите режим...</option>
                <option value="Web_Visual">Веб-форма (на компьютере)</option>
                <option value="Mobile_Visual">Мобильное приложение</option>
                <option value="Conversational_Text">Чат-бот</option>
            </select>
          </div>
        </div>
      </div>

      {/* Other blocks would go here... */}

    </div>
  );
};

export default MetaSurveyForm;
