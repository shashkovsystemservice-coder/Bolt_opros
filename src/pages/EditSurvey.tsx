
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useNavigate, useParams } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import { Plus, Trash2 } from 'lucide-react';

// Re-using the same question structure from CreateSurvey
export interface LocalQuestion {
  id: string; // Temporary ID for new questions, or DB ID for existing ones
  text: string;
  type: 'text' | 'number' | 'email' | 'rating' | 'choice';
  required: boolean;
  options: string[];
}

// Type for DB question templates
interface QuestionTemplate {
    id: number;
    survey_template_id: number;
    question_text: string;
    question_type: 'text' | 'number' | 'email' | 'rating' | 'choice';
    is_required: boolean;
    question_order: number;
    choice_options: string[] | null;
}

const EditSurvey = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id: surveyId } = useParams<{ id: string }>();

  // State for survey details
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [surveyBasis, setSurveyBasis] = useState(''); // Новое состояние
  const [isInteractive, setIsInteractive] = useState(false);
  const [questions, setQuestions] = useState<LocalQuestion[]>([]);
  
  // State for loading, errors
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    if (!surveyId || !user) {
        setInitialLoading(false);
        return;
    }

    const fetchSurvey = async () => {
        try {
            // Fetch survey template details
            const { data: surveyData, error: surveyError } = await supabase
                .from('survey_templates')
                .select('*, question_templates(*)')
                .eq('id', surveyId)
                .eq('company_id', user.id)
                .single();

            if (surveyError) throw new Error('Опрос не найден или у вас нет прав на его редактирование.');

            // Populate form fields
            setTitle(surveyData.title);
            setDescription(surveyData.description || '');
            setSurveyBasis(surveyData.survey_basis || ''); // Загружаем новое поле
            setIsInteractive(surveyData.is_interactive || false);

            // Populate questions
            const loadedQuestions = (surveyData.question_templates as QuestionTemplate[] || [])
                .sort((a,b) => a.question_order - b.question_order)
                .map(q => ({
                    id: q.id.toString(), // Use the actual DB ID
                    text: q.question_text,
                    type: q.question_type,
                    required: q.is_required,
                    options: q.choice_options || []
                }));
            setQuestions(loadedQuestions);

        } catch(err: any) {
            setError(err.message);
        } finally {
            setInitialLoading(false);
        }
    };

    fetchSurvey();
  }, [surveyId, user]);

  
  // --- Functions for question manipulation (same as CreateSurvey) ---
  // ... (код без изменений)

  // --- Main Save Function ---
  const handleSaveSurvey = async () => {
    if (!title.trim()) {
      setError('Название опроса не может быть пустым.');
      return;
    }
    if (questions.length === 0) {
      setError('Добавьте хотя бы один вопрос.');
      return;
    }
    if (!surveyId) return;

    setLoading(true);
    setError(null);

    try {
        // 1. Update the Survey Template itself
        const { error: templateError } = await supabase
            .from('survey_templates')
            .update({
                title: title,
                description: description,
                survey_basis: surveyBasis, // Добавляем новое поле
                is_interactive: isInteractive
            })
            .eq('id', surveyId);
        
        if (templateError) throw templateError;

        // ... (остальной код без изменений)

      // 6. Success and Redirect
      navigate('/dashboard');

    } catch (err: any) {
      console.error('Error saving survey:', err);
      setError(`Ошибка при сохранении опроса: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) return <DashboardLayout><div className="p-8 text-center">Загрузка редактора...</div></DashboardLayout>

  return (
    <DashboardLayout>
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6">
            <h1 className="text-3xl font-bold text-[#1F1F1F]">Редактор опроса</h1>
            <div className="flex gap-2 mt-4 sm:mt-0">
                <button
                    onClick={handleSaveSurvey}
                    disabled={loading || questions.length === 0}
                    className="flex items-center justify-center gap-2 h-11 px-6 bg-blue-600 text-white font-semibold rounded-full hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                >
                    {loading ? 'Сохранение...' : 'Сохранить изменения'}
                </button>
            </div>
          </div>
          
          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md my-4" role="alert">
              <p className="font-bold">Ошибка</p>
              <p>{error}</p>
            </div>
          )}

          {/* Survey Details Form */}
          <div className="bg-white p-8 rounded-2xl border border-[#E8EAED] shadow-sm mb-6">
              <div className="mb-6">
                  <label htmlFor="surveyTitle" className="block text-lg font-medium text-[#1F1F1F] mb-2">Название</label>
                  <input
                      type="text"
                      id="surveyTitle"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full h-12 px-4 border border-[#E8EAED] rounded-lg focus:outline-none focus:border-[#1A73E8]"
                  />
              </div>
              <div className="mb-6">
                  <label htmlFor="surveyDescription" className="block text-lg font-medium text-[#1F1F1F] mb-2">Описание</label>
                  <textarea
                      id="surveyDescription"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-4 py-3 border border-[#E8EAED] rounded-lg focus:outline-none focus:border-[#1A73E8]"
                      rows={3}
                  />
              </div>
              <div className="mb-4">
                <label htmlFor="surveyBasis" className="block text-lg font-medium text-[#1F1F1F] mb-2">Основание для опроса (опционально)</label>
                <textarea
                  id="surveyBasis"
                  value={surveyBasis}
                  onChange={(e) => setSurveyBasis(e.target.value)}
                  className="w-full px-4 py-3 border border-[#E8EAED] rounded-lg focus:outline-none focus:border-[#1A73E8]"
                  rows={2}
                  placeholder="Напр., 'Внутренняя политика компании от 15.03.2024'"
                />
              </div>
              <div className="flex items-center">
                  <input
                      id="isInteractive"
                      type="checkbox"
                      checked={isInteractive}
                      onChange={(e) => setIsInteractive(e.target.checked)}
                      className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="isInteractive" className="ml-3 block text-md font-medium text-gray-700">
                      Интерактивный чат-режим
                  </label>
              </div>
          </div>
          
          {/* Questions Editor */}
          {/* ... (остальной код без изменений) */}
        </div>
      </main>
    </DashboardLayout>
  );
};

export default EditSurvey;
