
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import { AiSurveyModal } from '../components/AiSurveyModal';
import { Plus, Trash2, GripVertical, ArrowLeft, Save, Sparkles, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { RatingOptions } from '../types/database';
import { generateCode } from '../utils/generateCode';

// --- Interfaces & Types ---
export interface LocalQuestion {
  id: string;
  text: string;
  type: 'text' | 'numeric' | 'rating' | 'choice' | 'multi_choice';
  required: boolean;
  options: string[] | RatingOptions | string | null;
  rating_max?: 3 | 5 | 10;
  rating_labels?: [string, string];
}

// --- Reusable Components ---
const ActionButton = ({ onClick, children, variant = 'primary', disabled = false, loading = false, className = '' }) => {
    const baseClasses = "whitespace-nowrap inline-flex items-center justify-center font-medium text-sm rounded-md transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2";
    const sizeClasses = "h-9 px-4";
    const variantClasses = {
        solid: "bg-gray-800 text-white hover:bg-gray-700 focus:ring-gray-800",
        primary: "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-400",
        special: "bg-gradient-to-r from-violet-500 to-purple-500 text-white hover:opacity-90 focus:ring-violet-500",
    };
    return <button onClick={onClick} disabled={disabled || loading} className={`${baseClasses} ${sizeClasses} ${variantClasses[variant]} ${className}`}>{loading ? <Loader2 className="animate-spin h-4 w-4"/> : children}</button>;
};

const FormInput = ({ id, label, value, onChange, placeholder, as = 'input', rows = 3 }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
        {as === 'textarea' ? (
            <textarea id={id} value={value} onChange={onChange} placeholder={placeholder} rows={rows} className="w-full p-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400" />
        ) : (
            <input type="text" id={id} value={value} onChange={onChange} placeholder={placeholder} className="w-full h-10 px-3 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400" />
        )}
    </div>
);

// --- Main Page Component ---
const CreateSurvey = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [finalMessage, setFinalMessage] = useState('Спасибо за участие в опросе!');
  const [isInteractive, setIsInteractive] = useState(false);
  const [questions, setQuestions] = useState<LocalQuestion[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  const handleAcceptAiSurvey = (aiQuestions: Omit<LocalQuestion, 'id'>[], topic: string, interactive: boolean, desc: string) => {
    setTitle(topic);
    setDescription(desc);
    setIsInteractive(interactive);
    setQuestions(aiQuestions.map(q => ({ ...q, id: crypto.randomUUID() })));
    setIsAiModalOpen(false);
    toast.success("Опрос сгенерирован!");
  };

  const addQuestion = () => setQuestions([...questions, { id: crypto.randomUUID(), text: '', type: 'text', required: true, options: [], rating_max: 5, rating_labels: ['', ''] }]);
  const removeQuestion = (id: string) => setQuestions(questions.filter(q => q.id !== id));
  const updateQuestion = (id: string, field: keyof LocalQuestion, value: any) => setQuestions(questions.map(q => (q.id === id ? { ...q, [field]: value } : q)));

  const handleSaveSurvey = async () => {
    if (!title.trim()) { toast.error('Название опроса не может быть пустым.'); return; }
    if (questions.length === 0) { toast.error('Добавьте хотя бы один вопрос.'); return; }
    if (!user) { toast.error('Не удалось определить ID компании. Попробуйте перезайти в аккаунт.'); return; }

    setLoading(true);
    let surveyId: string | null = null;

    try {
      const { data: survey, error: surveyError } = await supabase.from('survey_templates').insert([{
        title: title.trim(),
        description,
        company_id: user.id,
        is_interactive: isInteractive,
        is_active: true,
        unique_code: generateCode(),
        completion_settings: { thank_you_message: finalMessage }
      }]).select().single();
      
      if (surveyError) throw surveyError;
      surveyId = survey.id;

      const questionsToInsert = questions.map((q, i) => {
          let optionsPayload: string[] | RatingOptions | null = null;
          if (q.type === 'choice' || q.type === 'multi_choice') {
               optionsPayload = typeof q.options === 'string' 
                  ? q.options.split(/[,;\n]/).map(s => s.trim()).filter(Boolean) 
                  : (Array.isArray(q.options) ? q.options : []);
          } else if (q.type === 'rating') {
              optionsPayload = {
                  scale_max: q.rating_max || 5,
                  label_min: q.rating_labels?.[0] || '',
                  label_max: q.rating_labels?.[1] || ''
              };
          }
          return {
            survey_template_id: survey.id,
            question_text: q.text,
            question_type: q.type,
            is_required: q.required,
            question_order: i + 1,
            options: optionsPayload
          };
      });
      
      const { error: questionsError } = await supabase.from('question_templates').insert(questionsToInsert);
      
      if (questionsError) throw questionsError; // Rollback handled by DB trigger
      
      toast.success('Опрос успешно сохранен!');
      navigate('/dashboard');

    } catch (err: any) {
      if (surveyId && !err.message.includes('violates row-level security policy')) { // Avoid trying to delete if RLS failed
          await supabase.from('survey_templates').delete().eq('id', surveyId);
      }
      console.error("Ошибка при сохранении опроса:", err);
      toast.error(`Ошибка сохранения: ${err.message}`); 
    }
    finally { setLoading(false); }
  };

  return (
    <DashboardLayout>
        <header className="mb-8">
           <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-5 transition-colors">
                <ArrowLeft size={16}/> Назад ко всем опросам
            </button>
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <h1 className="text-2xl font-semibold text-gray-900">Создание нового опроса</h1>
            <div className="flex flex-col sm:flex-row gap-2">
              <ActionButton onClick={() => setIsAiModalOpen(true)} variant='special' disabled={loading}><Sparkles className="w-4 h-4 mr-2"/>Сгенерировать с AI</ActionButton>
              <ActionButton onClick={handleSaveSurvey} variant="solid" loading={loading} disabled={!user || questions.length === 0}><Save className="w-4 h-4 mr-2"/>Сохранить</ActionButton>
            </div>
          </div>
        </header>

        <div className="border-y border-gray-200 divide-y divide-gray-200">
            <div className="grid md:grid-cols-3 gap-4 md:gap-8 py-8">
                <div className="md:col-span-1">
                    <h3 className="text-base font-semibold text-gray-800">Основная информация</h3>
                    <p className="text-sm text-gray-500 mt-1">Название, описание и финальное сообщение.</p>
                </div>
                <div className="md:col-span-2 space-y-4">
                     <FormInput id="title" label="Название опроса" value={title} onChange={e => setTitle(e.target.value)} placeholder="Напр., Ежегодный опрос вовлеченности" />
                     <FormInput id="description" label="Описание (опционально)" value={description} onChange={e => setDescription(e.target.value)} placeholder="Краткое пояснение для получателей" as="textarea" />
                     <FormInput id="finalMessage" label="Финальное сообщение" value={finalMessage} onChange={e => setFinalMessage(e.target.value)} placeholder="Спасибо за участие в опросе!" as="textarea" />
                </div>
            </div>

             <div className="grid md:grid-cols-3 gap-4 md:gap-8 py-8">
                <div className="md:col-span-1">
                    <h3 className="text-base font-semibold text-gray-800">Настройки</h3>
                    <p className="text-sm text-gray-500 mt-1">Дополнительные параметры.</p>
                </div>
                 <div className="md:col-span-2">
                    <div className="flex items-start gap-4 p-4 rounded-md bg-white border border-gray-200">
                        <input id="isInteractive" type="checkbox" checked={isInteractive} onChange={e => setIsInteractive(e.target.checked)} className="h-4 w-4 mt-1 rounded border-gray-300 text-gray-600 focus:ring-gray-500" />
                        <div>
                            <label htmlFor="isInteractive" className="font-medium text-gray-800">Интерактивный чат-режим</label>
                            <p className="text-sm text-gray-500 mt-1">Вопросы будут задаваться по одному в формате диалога. Идеально для мобильных устройств.</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4 md:gap-8 py-8">
                <div className="md:col-span-1">
                     <h3 className="text-base font-semibold text-gray-800">Вопросы</h3>
                    <p className="text-sm text-gray-500 mt-1">Создайте и настройте вопросы для вашего опроса.</p>
                </div>
                <div className="md:col-span-2 space-y-4">
                    <AnimatePresence>
                    {questions.map((q, index) => (
                    <QuestionEditor key={q.id} question={q} index={index} update={updateQuestion} remove={removeQuestion} />
                    ))}
                    </AnimatePresence>
                    <ActionButton onClick={addQuestion} variant='primary'><Plus size={16} className="mr-2"/>Добавить вопрос</ActionButton>
                </div>
            </div>
        </div>

      {isAiModalOpen && <AiSurveyModal onClose={() => setIsAiModalOpen(false)} onGenerate={handleAcceptAiSurvey} />}
    </DashboardLayout>
  );
};

// --- Question Editor Component ---
const QuestionEditor = ({ question, index, update, remove }) => {
    const handleOptionChange = (value: string) => {
        const optionsArray = value.split(/[,;\n]/).map(s => s.trim()).filter(Boolean);
        update(question.id, 'options', optionsArray);
    };
    const optionsAsString = Array.isArray(question.options) ? question.options.join(', ') : '';

    return (
        <motion.div layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.25 }} className="bg-white p-5 rounded-lg border border-gray-200">
            <div className="flex items-start gap-4">
                <GripVertical className="w-5 h-5 text-gray-400 mt-2 cursor-grab flex-shrink-0 hidden sm:block"/>
                <div className="w-full">
                    <input type="text" value={question.text} onChange={e => update(question.id, 'text', e.target.value)} placeholder={`Текст вопроса ${index + 1}`} className="w-full text-base font-medium bg-transparent focus:outline-none"/>
                    <div className="flex flex-col sm:flex-row gap-4 mt-4">
                        <select value={question.type} onChange={e => update(question.id, 'type', e.target.value)} className="h-9 w-full sm:w-48 px-2 border border-gray-300 rounded-md bg-white focus:outline-none text-sm">
                            <option value="text">Текст</option>
                            <option value="numeric">Число</option>
                            <option value="rating">Рейтинг</option>
                            <option value="choice">Один из списка</option>
                            <option value="multi_choice">Несколько из списка</option>
                        </select>
                        <div className="flex items-center gap-2">
                            <input id={`req-${question.id}`} type="checkbox" checked={question.required} onChange={e => update(question.id, 'required', e.target.checked)} className="h-4 w-4 rounded border-gray-300"/>
                            <label htmlFor={`req-${question.id}`} className="text-sm font-medium text-gray-600">Обязательный</label>
                        </div>
                    </div>
                </div>
                <button onClick={() => remove(question.id)} className="text-gray-400 hover:text-red-500 p-1 rounded-md flex-shrink-0"><Trash2 size={16} /></button>
            </div>

            {question.type === 'rating' && (
                 <div className="mt-4 pt-4 pl-4 sm:pl-9 border-t flex items-center gap-4">
                    <div>
                        <label className="text-sm font-medium text-gray-600 block mb-1">Шкала</label>
                        <select value={question.rating_max || 5} onChange={e => update(question.id, 'rating_max', parseInt(e.target.value, 10))} className="h-9 w-full sm:w-24 px-2 border rounded-md bg-white focus:outline-none text-sm">
                            <option value={3}>1-3</option>
                            <option value={5}>1-5</option>
                            <option value={10}>1-10</option>
                        </select>
                    </div>
                    <div className="flex-grow">
                        <label className="text-sm font-medium text-gray-600 block mb-1">Метки (min, max)</label>
                        <div className="flex items-center gap-2">
                            <input type="text" value={question.rating_labels?.[0] || ''} onChange={e => update(question.id, 'rating_labels', [e.target.value, question.rating_labels?.[1] || ''])} placeholder="Метка для 1" className="w-full h-9 px-2 border-b focus:outline-none bg-transparent text-sm"/>
                            <input type="text" value={question.rating_labels?.[1] || ''} onChange={e => update(question.id, 'rating_labels', [question.rating_labels?.[0] || '', e.target.value])} placeholder={`Метка для ${question.rating_max || 5}`} className="w-full h-9 px-2 border-b focus:outline-none bg-transparent text-sm"/>
                        </div>
                    </div>
                </div>
            )}

            {(question.type === 'choice' || question.type === 'multi_choice') && (
                <div className="mt-4 pt-4 pl-4 sm:pl-9 border-t">
                    <label className="text-sm font-medium text-gray-500 mb-2 block">Варианты ответа</label>
                    <textarea value={optionsAsString} onChange={e => handleOptionChange(e.target.value)} placeholder="Введите варианты через запятую, точку с запятой или с новой строки" rows={3} className="w-full p-2 text-sm border-b-2 bg-transparent focus:outline-none"/>
                </div>
            )}
        </motion.div>
    )
}

export default CreateSurvey;
