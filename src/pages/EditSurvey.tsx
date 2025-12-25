
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2, GripVertical, ArrowLeft, Save, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

// --- Interfaces & Types ---
export interface LocalQuestion {
  id: string;
  text: string;
  type: 'text' | 'number' | 'email' | 'rating' | 'choice';
  required: boolean;
  options: string[];
  db_id?: number;
}

// --- Styled Components (Google AI Studio Style) ---
const ActionButton = ({ onClick, children, variant = 'primary', size = 'md', disabled = false, loading = false }) => {
    const baseClasses = "whitespace-nowrap inline-flex items-center justify-center font-medium text-sm rounded-md transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2";
    const sizeClasses = { md: "h-9 px-4", sm: "h-8 px-3 text-xs" };
    const variantClasses = {
        solid: "bg-gray-800 text-white hover:bg-gray-700 focus:ring-gray-800",
        primary: "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-400",
    };
    return <button onClick={onClick} disabled={disabled || loading} className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]}`}>{loading ? <Loader2 className="animate-spin h-4 w-4"/> : children}</button>;
};

const FormInput = ({ id, label, value, onChange, placeholder, as = 'input', rows = 3 }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
        {as === 'textarea' ? (
            <textarea id={id} value={value} onChange={onChange} placeholder={placeholder} rows={rows} className="w-full p-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400 transition-colors" />
        ) : (
            <input type="text" id={id} value={value} onChange={onChange} placeholder={placeholder} className="w-full h-10 px-3 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400 transition-colors" />
        )}
    </div>
);

// --- Main Page Component ---
const EditSurvey = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id: surveyId } = useParams<{ id: string }>();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isInteractive, setIsInteractive] = useState(false);
  const [questions, setQuestions] = useState<LocalQuestion[]>([]);
  const [initialQuestions, setInitialQuestions] = useState<LocalQuestion[]>([]);
  
  const [isSaving, setIsSaving] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    if (!surveyId || !user) {
        setInitialLoading(false);
        return;
    }
    const fetchSurvey = async () => {
        try {
            const { data: surveyData, error: surveyError } = await supabase.from('survey_templates').select('*, question_templates(*)').eq('id', surveyId).eq('company_id', user.id).single();
            if (surveyError) throw new Error('Опрос не найден или у вас нет прав на его редактирование.');

            setTitle(surveyData.title);
            setDescription(surveyData.description || '');
            setIsInteractive(surveyData.is_interactive || false);

            const loadedQuestions = (surveyData.question_templates || []).sort((a,b) => a.question_order - b.question_order).map(q => ({ id: crypto.randomUUID(), db_id: q.id, text: q.question_text, type: q.question_type, required: q.is_required, options: q.choice_options || [] }));
            setQuestions(loadedQuestions);
            setInitialQuestions(loadedQuestions);
        } catch(err: any) {
            toast.error(err.message);
            navigate('/dashboard');
        } finally {
            setInitialLoading(false);
        }
    };
    fetchSurvey();
  }, [surveyId, user, navigate]);

  const addQuestion = () => setQuestions([...questions, { id: crypto.randomUUID(), text: '', type: 'text', required: true, options: [] }]);
  const removeQuestion = (id: string) => setQuestions(questions.filter(q => q.id !== id));
  const updateQuestion = (id: string, field: keyof LocalQuestion, value: any) => setQuestions(questions.map(q => (q.id === id ? { ...q, [field]: value } : q)));

  const handleSaveSurvey = async () => {
    if (!title.trim()) { toast.error('Название опроса не может быть пустым.'); return; }
    if (questions.length === 0) { toast.error('Добавьте хотя бы один вопрос.'); return; }
    if (!surveyId) return;

    setIsSaving(true);

    try {
        const { error: templateError } = await supabase.from('survey_templates').update({ title, description, is_interactive: isInteractive }).eq('id', surveyId);
        if (templateError) throw templateError;

        const initialDbIds = new Set(initialQuestions.map(q => q.db_id).filter(Boolean));
        const currentDbIds = new Set(questions.map(q => q.db_id).filter(Boolean));

        const questionsToInsert = questions.filter(q => !q.db_id).map((q, index) => ({ survey_template_id: surveyId, question_text: q.text, question_type: q.type, is_required: q.is_required, question_order: initialQuestions.length + index + 1, choice_options: q.type === 'choice' ? q.options : null }));
        const questionsToUpdate = questions.filter(q => q.db_id && initialDbIds.has(q.db_id)).map((q, index) => ({ id: q.db_id, question_text: q.text, question_type: q.type, is_required: q.is_required, question_order: index + 1, choice_options: q.type === 'choice' ? q.options : null }));
        const questionIdsToDelete = initialQuestions.filter(q => q.db_id && !currentDbIds.has(q.db_id)).map(q => q.db_id);

        if (questionsToInsert.length > 0) {
            const { error } = await supabase.from('question_templates').insert(questionsToInsert);
            if (error) throw new Error(`Ошибка добавления вопросов: ${error.message}`);
        }
        if (questionsToUpdate.length > 0) {
            for (const q of questionsToUpdate) {
                const { error } = await supabase.from('question_templates').update({ question_text: q.question_text, question_type: q.type, is_required: q.is_required, question_order: q.question_order, choice_options: q.choice_options }).eq('id', q.id);
                if (error) throw new Error(`Ошибка обновления вопроса (ID: ${q.id}): ${error.message}`);
            }
        }
        if (questionIdsToDelete.length > 0) {
            const { error } = await supabase.from('question_templates').delete().in('id', questionIdsToDelete);
            if (error) throw new Error(`Ошибка удаления вопросов: ${error.message}`);
        }

        toast.success('Опрос успешно обновлен!');
        navigate('/dashboard');
    } catch (err: any) {
        toast.error(`Ошибка сохранения: ${err.message}`);
    } finally {
        setIsSaving(false);
    }
  };

  if (initialLoading) return <div className="flex justify-center items-center py-20"><Loader2 className="animate-spin h-8 w-8 text-gray-400" /></div>;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
        <header className="mb-8">
           <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-5 transition-colors">
                <ArrowLeft size={16}/> Назад ко всем опросам
            </button>
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <h1 className="text-2xl font-semibold text-gray-900">Редактор опроса</h1>
            <ActionButton onClick={handleSaveSurvey} variant="solid" loading={isSaving} disabled={questions.length === 0}><Save className="w-4 h-4 mr-2"/>Сохранить изменения</ActionButton>
          </div>
        </header>

        <div className="border-y border-gray-200 divide-y divide-gray-200">
            <div className="grid md:grid-cols-3 gap-4 md:gap-8 py-8">
                <div className="md:col-span-1">
                    <h3 className="text-base font-semibold text-gray-800">Основная информация</h3>
                    <p className="text-sm text-gray-500 mt-1">Название и описание вашего опроса.</p>
                </div>
                <div className="md:col-span-2 space-y-4">
                     <FormInput id="title" label="Название опроса" value={title} onChange={e => setTitle(e.target.value)} placeholder="Напр., Ежегодный опрос вовлеченности" />
                     <FormInput id="description" label="Описание (опционально)" value={description} onChange={e => setDescription(e.target.value)} placeholder="Краткое пояснение для получателей" as="textarea" />
                </div>
            </div>

             <div className="grid md:grid-cols-3 gap-4 md:gap-8 py-8">
                <div className="md:col-span-1">
                    <h3 className="text-base font-semibold text-gray-800">Настройки</h3>
                    <p className="text-sm text-gray-500 mt-1">Дополнительные параметры проведения опроса.</p>
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
    </div>
  );
};

// --- Question Editor Component ---
const QuestionEditor = ({ question, index, update, remove }) => {
    const addOption = () => update(question.id, 'options', [...question.options, '']);
    const updateOption = (optIndex, value) => {
        const newOptions = [...question.options];
        newOptions[optIndex] = value;
        update(question.id, 'options', newOptions);
    };
    const removeOption = (optIndex) => update(question.id, 'options', question.options.filter((_, i) => i !== optIndex));

    return (
        <motion.div layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.25, ease: 'easeInOut' }} className="bg-white p-5 rounded-lg border border-gray-200">
            <div className="flex items-start gap-4">
                <GripVertical className="w-5 h-5 text-gray-400 mt-2 cursor-grab flex-shrink-0"/>
                <div className="w-full">
                    <input type="text" value={question.text} onChange={e => update(question.id, 'text', e.target.value)} placeholder={`Текст вопроса ${index + 1}`} className="w-full text-base font-medium bg-transparent focus:outline-none focus:text-gray-800"/>
                    
                    <div className="flex flex-col sm:flex-row gap-4 mt-4">
                        <select value={question.type} onChange={e => update(question.id, 'type', e.target.value)} className="h-9 w-full sm:w-48 px-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm">
                            <option value="text">Текст</option>
                            <option value="number">Число</option>
                            <option value="email">Email</option>
                            <option value="rating">Рейтинг (1-10)</option>
                            <option value="choice">Один из списка</option>
                        </select>
                        <div className="flex items-center gap-2">
                            <input id={`req-${question.id}`} type="checkbox" checked={question.required} onChange={e => update(question.id, 'required', e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-gray-600 focus:ring-gray-500"/>
                            <label htmlFor={`req-${question.id}`} className="text-sm font-medium text-gray-600">Обязательный</label>
                        </div>
                    </div>
                </div>
                <button onClick={() => remove(question.id)} className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded-md"><Trash2 size={16} /></button>
            </div>

            {question.type === 'choice' && (
                <div className="mt-4 pt-4 pl-9 border-t border-gray-200">
                    <h3 className="text-sm font-medium text-gray-500 mb-3">Варианты ответа</h3>
                    <div className="space-y-2">
                    {question.options.map((opt, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <input type="text" value={opt} onChange={e => updateOption(i, e.target.value)} placeholder={`Вариант ${i + 1}`} className="w-full h-9 px-2 border-b border-gray-300 focus:outline-none focus:border-gray-500 bg-transparent text-sm"/>
                            <button onClick={() => removeOption(i)} className="p-1 text-gray-400 hover:text-red-500 rounded-md"><Trash2 size={14} /></button>
                        </div>
                    ))}
                    </div>
                    <button onClick={addOption} className="text-sm font-semibold text-gray-600 hover:underline mt-4">+ Добавить вариант</button>
                </div>
            )}
        </motion.div>
    )
}

export default EditSurvey; 
