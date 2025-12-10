
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
  const addQuestion = () => {
    const newQuestion: LocalQuestion = {
      id: `new-${crypto.randomUUID()}`, // Mark as new
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
    setQuestions(questions.map(q => q.id === questionId ? { ...q, options: [...q.options, ''] } : q));
  }

  const removeOption = (questionId: string, optionIndex: number) => {
      setQuestions(questions.map(q => {
          if (q.id === questionId) {
              return { ...q, options: q.options.filter((_, i) => i !== optionIndex) };
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
                is_interactive: isInteractive
            })
            .eq('id', surveyId);
        
        if (templateError) throw templateError;

        // 2. Separate questions into new, updated, and get a list of IDs for deletion checking
        const newQuestions = questions.filter(q => q.id.startsWith('new-'));
        const updatedQuestions = questions.filter(q => !q.id.startsWith('new-'));
        const currentQuestionIds = updatedQuestions.map(q => parseInt(q.id));

        // 3. Delete questions that are no longer in the list
        const { data: existingQuestions, error: fetchError } = await supabase
            .from('question_templates').select('id').eq('survey_template_id', surveyId);
        if(fetchError) console.error("Could not fetch existing questions to check for deletions");
        else {
            const questionIdsToDelete = existingQuestions
                .filter(q => !currentQuestionIds.includes(q.id))
                .map(q => q.id);
            if (questionIdsToDelete.length > 0) {
                const { error: deleteError } = await supabase.from('question_templates').delete().in('id', questionIdsToDelete);
                if (deleteError) console.error("Error deleting questions:", deleteError);
            }
        }

        // 4. Update existing questions
        if (updatedQuestions.length > 0) {
            const updates = updatedQuestions.map((q, index) => ({
                id: parseInt(q.id),
                question_text: q.text,
                question_type: q.type,
                is_required: q.required,
                question_order: index + 1,
                choice_options: (q.type === 'choice' && q.options.length > 0) ? q.options : null,
            }));
            // Supabase upsert can work here if we had a unique constraint on (survey_template_id, id)
            // but we will do manual updates for clarity
            for (const u of updates) {
                 await supabase.from('question_templates').update(u).eq('id', u.id);
            }
        }

        // 5. Insert new questions
        if (newQuestions.length > 0) {
             const inserts = newQuestions.map((q, index) => ({
                survey_template_id: parseInt(surveyId),
                question_text: q.text,
                question_type: q.type,
                is_required: q.required,
                question_order: updatedQuestions.length + index + 1, // Order them after existing ones
                choice_options: (q.type === 'choice' && q.options.length > 0) ? q.options : null,
            }));
            const { error: insertError } = await supabase.from('question_templates').insert(inserts);
             if (insertError) throw insertError;
        }

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
              <div className="mb-4">
                  <label htmlFor="surveyDescription" className="block text-lg font-medium text-[#1F1F1F] mb-2">Описание</label>
                  <textarea
                      id="surveyDescription"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-4 py-3 border border-[#E8EAED] rounded-lg focus:outline-none focus:border-[#1A73E8]"
                      rows={3}
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
          <h2 class="text-2xl font-bold text-[#1F1F1F] mb-4">Вопросы</h2>
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
                Добавить вопрос
            </button>
          </div>
        </div>
      </main>
    </DashboardLayout>
  );
};

export default EditSurvey;
