import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-react';
import { v4 as uuidv4 } from 'uuid';
import { Button } from './ui/button';
import { calculateBlueprint } from '../lib/survey-engine';

export default function MetaSurveyWizard({ onComplete }: any) {
  const supabase = createClientComponentClient();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    topic: '',
    purpose: 'descriptive',
    depth: 1,
    mode: 'webvisual',
    time_constraint: 600,
    knowledge_type: ['attitudes'],
    structure: 'linear',
    response_format: 'mixed',
    sensitivity: 'low',
    target_audience: 'general',
    tone: 'friendly'
  });

  const steps = [
    { id: 0, title: '📝 Тема опроса' },
    { id: 1, title: '🎯 Цель и аудитория' },
    { id: 2, title: '⏱️ Время и режим' },
    { id: 3, title: '📊 Типы данных' },
    { id: 4, title: '⚙️ Дополнительно' },
    { id: 5, title: '✅ Подтверждение' }
  ];

  const handleNext = () => {
    if (step < steps.length - 1) setStep(step + 1);
  };

  const handlePrev = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    const projectId = uuidv4();
    
    // 1. Сохранить meta_params
    await supabase.from('survey_meta_params').upsert({
      project_id: projectId,
      ...formData
    }, { onConflict: 'project_id' });

    // 2. Создать topic_context (если нужно AI-анализ)
    await supabase.from('topic_context').insert({
      project_id: projectId,
      raw_input: formData.topic
    });

    // 3. Рассчитать Blueprint
    const blueprint = await calculateBlueprint(supabase, projectId);

    setLoading(false);
    onComplete?.(projectId);
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="flex justify-between mb-8">
        {steps.map((s) => (
          <div key={s.id} className={`flex-1 text-center ${step === s.id ? 'font-bold text-blue-600' : 'text-gray-400'}`}>
            {s.title}
          </div>
        ))}
      </div>

      {/* Шаг 0: Тема */}
      {step === 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-4">О чём ваш опрос?</h2>
          <textarea
            value={formData.topic}
            onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
            className="w-full h-32 border rounded p-4"
            placeholder="Например: Удовлетворенность клиентов доставкой"
          />
        </div>
      )}

      {/* Шаг 1: Цель и аудитория */}
      {step === 1 && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Цель и аудитория</h2>
          <label>Цель опроса:</label>
          <select
            value={formData.purpose}
            onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
            className="w-full border rounded p-2 mb-4"
          >
            <option value="exploratory">Разведочное исследование</option>
            <option value="descriptive">Описательное</option>
            <option value="analytical">Аналитическое</option>
          </select>

          <label>Аудитория:</label>
          <select
            value={formData.target_audience}
            onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })}
            className="w-full border rounded p-2"
          >
            <option value="general">Широкая аудитория</option>
            <option value="experienced">Опытные пользователи</option>
            <option value="expert">Эксперты</option>
          </select>
        </div>
      )}

      {/* Остальные шаги (2-5) — аналогично */}

      <div className="flex justify-between mt-8">
        <Button onClick={handlePrev} disabled={step === 0}>Назад</Button>
        {step < steps.length - 1 ? (
          <Button onClick={handleNext}>Далее</Button>
        ) : (
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Создаём...' : 'Создать опрос'}
          </Button>
        )}
      </div>
    </div>
  );
}
