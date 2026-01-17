
import { useState } from 'react';
import { X, Sparkles, Loader2 } from 'lucide-react';
import { LocalQuestion } from '../types/survey-types';
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
      const generatedData = await generateSurveyWithAI(prompt.trim(), questionCount);
      onGenerate(
        generatedData.questions,
        generatedData.title,
        isInteractive,
        generatedData.description
      );
    } catch (err: any) {
      setError(err.message || 'Неизвестная ошибка при генерации опроса');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <header className="p-5 border-b flex justify-between items-center">
           <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-500" />
            <h2 className="text-lg font-semibold">Сгенерировать с помощью AI</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100"><X size={20}/></button>
        </header>

        <main className="p-6 space-y-4">
          <div>
            <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-1.5">Тема или задача опроса</label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
              rows={4}
              placeholder="Например: &#x27;Создай опрос для IT-компании, чтобы оценить удовлетворенность сотрудников работой, руководством и рабочими инструментами.&#x27;"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="questionCount" className="block text-sm font-medium text-gray-700 mb-1.5">Примерное количество вопросов</label>
            <input
              id="questionCount"
              type="number"
              min="1"
              max="20"
              value={questionCount}
              onChange={(e) => setQuestionCount(parseInt(e.target.value) || 5)}
              className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
              disabled={loading}
            />
          </div>

          <div className="flex items-start gap-4 p-3 rounded-md bg-gray-50 border">
              <input id="isInteractive" type="checkbox" checked={isInteractive} onChange={e => setIsInteractive(e.target.checked)} className="h-4 w-4 mt-1 rounded border-gray-300 text-violet-600 focus:ring-violet-500" disabled={loading}/>
              <div>
                  <label htmlFor="isInteractive" className="font-medium text-gray-800">Интерактивный чат-режим</label>
                  <p className="text-sm text-gray-500 mt-1">Вопросы будут задаваться по одному в формате диалога. Идеально для мобильных устройств.</p>
              </div>
          </div>

          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">{error}</div>}
        </main>

        <footer className="p-5 border-t flex justify-end gap-3 bg-gray-50">
          <button onClick={onClose} disabled={loading} className="h-9 px-4 bg-white border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50 disabled:opacity-50">Отмена</button>
          <button onClick={handleGenerate} disabled={loading} className="h-9 px-5 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
            {loading ? <Loader2 className="animate-spin h-4 w-4"/> : <Sparkles className="h-4 w-4"/>}
            {loading ? 'Генерация...' : 'Сгенерировать'}
          </button>
        </footer>
      </div>
    </div>
  );
}
