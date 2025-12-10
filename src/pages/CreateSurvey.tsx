
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import { AiSurveyModal } from '../components/AiSurveyModal';
import { Plus, Trash2, GripVertical } from 'lucide-react';

// This interface is used both here and in AiSurveyModal.tsx
// It defines the local state structure for a question before it's saved.
export interface LocalQuestion {
  id: string; // A temporary unique ID for React keys
  text: string;
  type: 'text' | 'number' | 'email' | 'rating' | 'choice';
  required: boolean;
  options: string[];
}

const CreateSurvey = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // State for survey details
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isInteractive, setIsInteractive] = useState(false);
  const [questions, setQuestions] = useState<LocalQuestion[]>([]);
  
  // State for loading, errors, and company info
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  // Fetch the user's company ID on component mount
  useEffect(() => {
    const fetchCompany = async () => {
      if (user) {
        setLoading(true);
        try {
          const { data: company, error: companyError } = await supabase
            .from('companies')
            .select('id')
            .eq('id', user.id)
            .single();

          if (companyError) throw companyError;
          if (company) setCompanyId(company.id);
            
        } catch (err: any) {
          console.error('Error fetching company info:', err);
          setError(`Не удалось получить информацию о компании: ${err.message}`);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchCompany();
  }, [user]);

  // --- Functions to handle AI generation ---
  const handleOpenAiModal = () => setIsAiModalOpen(true);

  // This function now POPULATES the form instead of saving directly
  const handleAcceptAiSurvey = (aiQuestions: Omit<LocalQuestion, 'id'>[], topic: string, interactive: boolean, desc: string) => {
    setTitle(topic);
    setDescription(desc);
    setIsInteractive(interactive);
    setQuestions(aiQuestions.map(q => ({ ...q, id: crypto.randomUUID() })));
    setIsAiModalOpen(false);
  };

  // --- Functions for manual question manipulation ---
  const addQuestion = () => {
    const newQuestion: LocalQuestion = {
      id: crypto.randomUUID(),
      text: '',
      type: 'text',
      required: true,
      options: []
    };
    setQuestions([...questions, newQuestion]);
  };

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };
  
  const updateQuestion = (id: string, field: keyof LocalQuestion, value: any) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, [field]: value } : q));
  };
  
  const addOption = (questionId: string) => {
    setQuestions(questions.map(q => {
        if (q.id === questionId) {
            return { ...q, options: [...q.options, ''] };
        }
        return q;
    }));
  }

  const removeOption = (questionId: string, optionIndex: number) => {
      setQuestions(questions.map(q => {
          if (q.id === questionId) {
              const newOptions = q.options.filter((_, i) => i !== optionIndex);
              return { ...q, options: newOptions };
          }
          return q;
      }));
  }

  const updateOption = (questionId: string, optionIndex: number, value: string) => {
      setQuestions(questions.map(q => {
          if (q.id === questionId) {
              const newOptions = [...q.options];
              newOptions[optionIndex] = value;
              return { ...q, options: newOptions };
          }
          return q;
      }));
  }


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
    if (!companyId) {
      setError('Не удалось определить ID компании. Невозможно создать опрос.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Insert the Survey Template
      const { data: surveyData, error: surveyError } = await supabase
        .from('survey_templates')
        .insert([{
          title,
          description,
          company_id: companyId,
          is_interactive: isInteractive,
          unique_code: `${Date.now()}${Math.random().toString(36).substring(2, 9)}`
        }])
        .select()
        .single();

      if (surveyError) throw surveyError;
      if (!surveyData) throw new Error('Не удалось создать шаблон опроса.');

      const surveyId = surveyData.id;

      // 2. Prepare and Insert all Questions
      const questionsToInsert = questions.map((q, index) => ({
        survey_template_id: surveyId,
        question_text: q.text,
        question_type: q.type,
        is_required: q.required,
        question_order: index + 1,
        choice_options: (q.type === 'choice' && q.options.length > 0) ? q.options : null,
      }));

      const { error: questionsError } = await supabase
        .from('question_templates')
        .insert(questionsToInsert);

      if (questionsError) {
        // Attempt to clean up the created survey template if questions fail
        await supabase.from('survey_templates').delete().eq('id', surveyId);
        throw questionsError;
      }

      // 3. Success and Redirect
      navigate('/dashboard');

    } catch (err: any) {
      console.error('Error saving survey:', err);
      setError(`Ошибка при сохранении опроса: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6">
            <h1 className="text-3xl font-bold text-[#1F1F1F]">Создать опрос</h1>
            <div className="flex gap-2 mt-4 sm:mt-0">
                <button
                    onClick={handleOpenAiModal}
                    disabled={loading || !companyId}
                    className="flex items-center justify-center gap-2 h-11 px-6 bg-green-600 text-white font-semibold rounded-full hover:bg-green-700 transition-colors disabled:bg-gray-400"
                >
                    Сгенерировать с AI
                </button>
                <button
                    onClick={handleSaveSurvey}
                    disabled={loading || !companyId || questions.length === 0}
                    className="flex items-center justify-center gap-2 h-11 px-6 bg-[#1A73E8] text-white font-semibold rounded-full hover:bg-[#1557B0] transition-colors disabled:bg-gray-400"
                >
                    {loading ? 'Сохранение...' : 'Сохранить опрос'}
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
                placeholder="Напр., 'Ежегодный опрос вовлеченности'"
              />
            </div>
            <div className="mb-4">
              <label htmlFor="surveyDescription" className="block text-lg font-medium text-[#1F1F1F] mb-2">Описание (опционально)</label>
              <textarea
                id="surveyDescription"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 border border-[#E8EAED] rounded-lg focus:outline-none focus:border-[#1A73E8]"
                rows={3}
                placeholder="Краткое пояснение для получателей опроса"
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
          <div className='space-y-4'>
            {questions.map((q, qIndex) => (
                <div key={q.id} className="bg-white p-6 rounded-2xl border border-[#E8EAED] shadow-sm relative">
                    <div className='flex items-start gap-4'>
                        <span className="text-xl font-semibold text-gray-400 pt-2">Q{qIndex + 1}</span>
                        <div className='flex-grow'>
                            <input
                                type="text"
                                value={q.text}
                                onChange={e => updateQuestion(q.id, 'text', e.target.value)}
                                placeholder="Текст вашего вопроса"
                                className="w-full text-lg font-medium border-b-2 border-transparent focus:border-blue-500 outline-none pb-2 mb-3"
                            />
                            <div className='flex items-center gap-6'>
                                <select value={q.type} onChange={e => updateQuestion(q.id, 'type', e.target.value)} className='h-10 px-3 rounded-md border border-gray-300 bg-white'>
                                    <option value="text">Текст</option>
                                    <option value="number">Число</option>
                                    <option value="rating">Рейтинг (1-10)</option>
                                    <option value="choice">Один вариант</option>
                                </select>
                                <div className="flex items-center">
                                    <input
                                        id={`required-${q.id}`}
                                        type="checkbox"
                                        checked={q.required}
                                        onChange={e => updateQuestion(q.id, 'required', e.target.checked)}
                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <label htmlFor={`required-${q.id}`} className="ml-2 block text-sm text-gray-900">
                                        Обязательный
                                    </label>
                                </div>
                            </div>

                             {q.type === 'choice' && (
                                <div className='mt-4 pl-4 border-l-2 border-gray-200'>
                                    {q.options.map((opt, oIndex) => (
                                        <div key={oIndex} className='flex items-center gap-2 mb-2'>
                                            <input type='radio' disabled className='h-4 w-4' />
                                            <input
                                                type='text'
                                                value={opt}
                                                onChange={e => updateOption(q.id, oIndex, e.target.value)}
                                                placeholder={`Вариант ${oIndex + 1}`}
                                                className='flex-grow border-b-2 border-transparent focus:border-blue-300 outline-none'
                                            />
                                            <button onClick={() => removeOption(q.id, oIndex)} className="text-gray-400 hover:text-red-500">
                                                <Trash2 size={16}/>
                                            </button>
                                        </div>
                                    ))}
                                    <button onClick={() => addOption(q.id)} className='flex items-center gap-2 mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium'>
                                        <Plus size={16}/>
                                        Добавить вариант
                                    </button>
                                </div>
                            )}

                        </div>
                        <button onClick={() => removeQuestion(q.id)} className="text-gray-500 hover:text-red-600 absolute top-4 right-4">
                            <Trash2 size={20}/>
                        </button>
                    </div>
                </div>
            ))}
          </div>
          
          {/* Add Question Button */}
          <div className="mt-6 text-center">
            <button
              onClick={addQuestion}
              className="flex items-center justify-center gap-2 w-full h-12 border-2 border-dashed border-gray-300 text-gray-500 font-semibold rounded-lg hover:bg-gray-100 hover:border-gray-400 transition-colors"
            >
                <Plus size={20}/>
                Добавить вопрос вручную
            </button>
          </div>
        </div>
      </main>

      {/* AI Modal */}
      {isAiModalOpen && companyId && (
        <AiSurveyModal
          onClose={() => setIsAiModalOpen(false)}
          onGenerate={handleAcceptAiSurvey}
        />
      )}
    </DashboardLayout>
  );
};

export default CreateSurvey;
