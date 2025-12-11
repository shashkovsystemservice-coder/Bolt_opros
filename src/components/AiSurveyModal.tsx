
import { useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import { LocalQuestion } from '../pages/CreateSurvey';
// Import the new AI service
import { generateSurveyWithAI } from '../lib/aiService'; 

interface AiSurveyModalProps {
  onClose: () => void;
  onGenerate: (
    questions: Omit<LocalQuestion, 'id'>[], 
    topic: string, 
    isInteractive: boolean, 
    description: string
  ) => void;
}

export function AiSurveyModal({ onClose, onGenerate }: AiSurveyModalProps) {
  const [prompt, setPrompt] = useState('');
  const [questionCount, setQuestionCount] = useState(5);
  const [isInteractive, setIsInteractive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Опишите подробно, о чем должен быть опрос');
      return;
    }
    if (questionCount < 1 || questionCount > 20) {
      setError('Количество вопросов должно быть от 1 до 20');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // The component no longer knows HOW the survey is generated.
      // It just calls our service and waits for the result.
      const generatedData = await generateSurveyWithAI(prompt.trim(), questionCount);

      // Pass the data back to the parent component.
      onGenerate(
        generatedData.questions,
        generatedData.title,
        isInteractive, // We still control this UI-specific option here
        generatedData.description
      );

    } catch (err: any) {
      setError(err.message || 'Неизвестная ошибка при генерации опроса');
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
              Подробный промпт для AI *
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full px-4 py-3 border border-[#E8EAED] rounded-lg focus:outline-none focus:border-[#1A73E8] transition-colors resize-none"
              rows={4}
              placeholder="Опишите подробно, о чем должен быть опрос. Например: 'Создай опрос для IT-компании, чтобы оценить удовлетворенность сотрудников работой...'"
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
                  Опрос будет проходить в формате чата: AI задает вопросы по очереди.
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
              <>
                <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24"><path d="M12,4a8,8,0,0,1,8,8H12Z" fill="currentColor"></path></svg>
                Генерация...
              </>
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
