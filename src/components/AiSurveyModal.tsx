import { useState } from 'react';
import { X, Sparkles } from 'lucide-react';

interface Question {
  text: string;
  type: 'text' | 'number' | 'email' | 'rating' | 'choice';
  required: boolean;
  options: string[];
}

interface AiSurveyModalProps {
  onClose: () => void;
  onGenerate: (questions: Question[], topic: string, isInteractive: boolean) => void;
}

export function AiSurveyModal({ onClose, onGenerate }: AiSurveyModalProps) {
  const [topic, setTopic] = useState('');
  const [questionCount, setQuestionCount] = useState(5);
  const [isInteractive, setIsInteractive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError('Введите тему опроса');
      return;
    }

    if (questionCount < 1 || questionCount > 20) {
      setError('Количество вопросов должно быть от 1 до 20');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini-ai`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'generate-survey',
          data: {
            topic: topic.trim(),
            questionCount,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Ошибка при генерации опроса');
      }

      const result = await response.json();

      const questions: Question[] = result.questions.map((q: any) => ({
        text: q.question,
        type: q.type,
        required: false,
        options: q.options || [],
      }));

      onGenerate(questions, topic.trim(), isInteractive);
    } catch (err: any) {
      setError(err.message || 'Ошибка при генерации опроса');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-lg w-full">
        <div className="p-6 border-b border-[#E8EAED] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#1A73E8]" strokeWidth={2} />
            <h3 className="text-xl font-medium text-[#1F1F1F]">Создать с помощью AI</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#F8F9FA] rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-[#5F6368]" strokeWidth={2} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-[#1F1F1F] mb-2">
              Тема опроса *
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full h-12 px-4 border border-[#E8EAED] rounded-lg focus:outline-none focus:border-[#1A73E8] transition-colors"
              placeholder="Например: удовлетворенность клиентов"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1F1F1F] mb-2">
              Количество вопросов *
            </label>
            <input
              type="number"
              min="1"
              max="20"
              value={questionCount}
              onChange={(e) => setQuestionCount(parseInt(e.target.value) || 5)}
              className="w-full h-12 px-4 border border-[#E8EAED] rounded-lg focus:outline-none focus:border-[#1A73E8] transition-colors"
              disabled={loading}
            />
          </div>

          <div className="p-4 bg-[#F8F9FA] rounded-xl space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isInteractive}
                onChange={(e) => setIsInteractive(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-[#1A73E8] rounded border-[#E8EAED] focus:ring-0 focus:ring-offset-0"
                disabled={loading}
              />
              <div>
                <div className="text-sm font-medium text-[#1F1F1F]">Интерактивный режим</div>
                <div className="text-xs text-[#5F6368] mt-1">
                  Опрос будет проходить в формате чата: AI задает вопросы по очереди,
                  очищает ответы от шума и помогает респонденту
                </div>
              </div>
            </label>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
              {error}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-[#E8EAED] flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 h-12 border border-[#E8EAED] text-[#1F1F1F] rounded-full font-medium hover:bg-[#F8F9FA] transition-colors disabled:opacity-50"
          >
            Отмена
          </button>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="flex-1 h-12 bg-[#1A73E8] text-white rounded-full font-medium hover:bg-[#1557B0] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>Генерация...</>
            ) : (
              <>
                <Sparkles className="w-4 h-4" strokeWidth={2} />
                Создать
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
