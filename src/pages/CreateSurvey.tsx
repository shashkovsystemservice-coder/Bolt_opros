
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import { AiSurveyModal } from '../components/AiSurveyModal';
import { Plus, Trash2, Download, UploadCloud } from 'lucide-react';
import ExcelJS from 'exceljs';

export interface LocalQuestion {
  id: string; 
  text: string;
  type: 'text' | 'number' | 'email' | 'rating' | 'choice';
  required: boolean;
  options: string[];
}

const CreateSurvey = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [surveyBasis, setSurveyBasis] = useState(''); // Новое состояние
  const [isInteractive, setIsInteractive] = useState(false);
  const [questions, setQuestions] = useState<LocalQuestion[]>([]);
  
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

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

  const handleOpenAiModal = () => setIsAiModalOpen(true);

  const handleAcceptAiSurvey = (aiQuestions: Omit<LocalQuestion, 'id'>[], topic: string, interactive: boolean, desc: string) => {
    setTitle(topic);
    setDescription(desc);
    setIsInteractive(interactive);
    setQuestions(aiQuestions.map(q => ({ ...q, id: crypto.randomUUID() })));
    setIsAiModalOpen(false);
  };

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
    setQuestions(questions.map(q => (q.id === id ? { ...q, [field]: value } : q)));
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

  const handleDownloadTemplate = async () => {
    // ... (код без изменений)
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    // ... (код без изменений)
  };

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
      const { data: surveyData, error: surveyError } = await supabase
        .from('survey_templates')
        .insert([{
          title: title,
          description: description,
          survey_basis: surveyBasis, // Добавляем новое поле
          company_id: companyId,
          is_interactive: isInteractive,
          unique_code: `${Date.now()}${Math.random().toString(36).substring(2, 9)}`
        }])
        .select()
        .single();

      if (surveyError) throw surveyError;
      if (!surveyData) throw new Error('Не удалось создать шаблон опроса.');

      const surveyId = surveyData.id;

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
        await supabase.from('survey_templates').delete().eq('id', surveyId);
        throw questionsError;
      }

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
            <div className="mb-6">
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
          
          {/* ... (остальной код без изменений) */}

        </div>
      </main>

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
