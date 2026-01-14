
import { useState } from 'react';
import { X, Sparkles, Loader2 } from 'lucide-react';

interface AIExpressModalProps {
  onClose: () => void;
  onGenerate: (topic: string, questionsCount: number) => void;
  isGenerating: boolean;
}

export function AIExpressModal({ onClose, onGenerate, isGenerating }: AIExpressModalProps) {
  const [topic, setTopic] = useState('');
  const [questionsCount, setQuestionsCount] = useState(5);
  const [error, setError] = useState('');

  const handleGenerateClick = () => {
    console.log('КЛИК СРАБОТАЛ'); // <--- ДОБАВЛЕНО ДЛЯ ДИАГНОСТИКИ
    setError('');
    if (!topic.trim()) {
      setError('Тема опроса не может быть пустой.');
      return;
    }
    if (questionsCount < 3 || questionsCount > 25) {
      setError('Количество вопросов должно быть от 3 до 25.');
      return;
    }
    onGenerate(topic, questionsCount);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-lg w-full">
        <div className="p-6 border-b border-[#E8EAED] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#1A73E8]" strokeWidth={2} />
            <h3 className="text-xl font-medium text-[#1F1F1F]">Создать с помощью AI Express</h3>
          </div>
          <button
            onClick={onClose}
            disabled={isGenerating}
            className="p-2 hover:bg-[#F8F9FA] rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-[#5F6368]" strokeWidth={2} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label htmlFor="topic" className="block text-sm font-medium text-[#1F1F1F] mb-2">
              Тема опроса *
            </label>
            <input
              id="topic"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full h-12 px-4 border border-[#E8EAED] rounded-lg focus:outline-none focus:border-[#1A73E8] transition-colors"
              placeholder="Например: Удовлетворенность сотрудников"
              disabled={isGenerating}
            />
          </div>

          <div>
            <label htmlFor="questionsCount" className="block text-sm font-medium text-[#1F1F1F] mb-2">
              Количество вопросов (от 3 до 25) *
            </label>
            <input
              id="questionsCount"
              type="number"
              min="3"
              max="25"
              value={questionsCount}
              onChange={(e) => setQuestionsCount(parseInt(e.target.value, 10) || 5)}
              className="w-full h-12 px-4 border border-[#E8EAED] rounded-lg focus:outline-none focus:border-[#1A73E8] transition-colors"
              disabled={isGenerating}
            />
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
            disabled={isGenerating}
            className="flex-1 h-12 border border-[#E8EAED] text-[#1F1F1F] rounded-full font-medium hover:bg-[#F8F9FA] transition-colors disabled:opacity-50"
          >
            Отмена
          </button>
          <button
            onClick={handleGenerateClick}
            disabled={isGenerating || !topic.trim()}
            className="flex-1 h-12 bg-[#1A73E8] text-white rounded-full font-medium hover:bg-[#1557B0] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="animate-spin h-5 w-5" />
                Генерация...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" strokeWidth={2} />
                Сгенерировать
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
