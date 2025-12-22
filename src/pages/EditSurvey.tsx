
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2, GripVertical, ArrowLeft, Save, AlertTriangle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardLayout } from '../components/DashboardLayout';

// --- Interfaces & Types ---
export interface LocalQuestion {
  id: string;
  text: string;
  type: 'text' | 'number' | 'email' | 'rating' | 'choice';
  required: boolean;
  options: string[];
  db_id?: number;
}

// --- Styled Components ---
const FormInput = ({ id, label, value, onChange, placeholder, as = 'input', rows = 3 }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-text-secondary mb-1.5">{label}</label>
        {as === 'textarea' ? (
            <textarea id={id} value={value} onChange={onChange} placeholder={placeholder} rows={rows} className="w-full p-3 bg-background border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors" />
        ) : (
            <input type="text" id={id} value={value} onChange={onChange} placeholder={placeholder} className="w-full h-11 p-3 bg-background border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors" />
        )}
    </div>
);

const ActionButton = ({ onClick, children, variant = 'primary', disabled = false, loading = false }) => {
    const variants = {
        primary: 'bg-primary text-on-primary hover:bg-primary/90 focus:ring-primary',
        secondary: 'bg-surface border border-border-subtle hover:bg-background text-text-primary focus:ring-primary',
    };
    return <button onClick={onClick} disabled={disabled || loading} className={`h-10 px-5 inline-flex items-center justify-center font-semibold text-sm rounded-lg shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 ${variants[variant]}`}>{loading ? <Loader2 className="animate-spin h-5 w-5"/> : children}</button>;
};

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
  
  const [error, setError] = useState<string | null>(null);
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
            setError(err.message);
        } finally {
            setInitialLoading(false);
        }
    };
    fetchSurvey();
  }, [surveyId, user]);

  const addQuestion = () => setQuestions([...questions, { id: crypto.randomUUID(), text: '', type: 'text', required: true, options: [] }]);
  const removeQuestion = (id: string) => setQuestions(questions.filter(q => q.id !== id));
  const updateQuestion = (id: string, field: keyof LocalQuestion, value: any) => setQuestions(questions.map(q => (q.id === id ? { ...q, [field]: value } : q)));

  const handleSaveSurvey = async () => {
    if (!title.trim()) { setError('Название опроса не может быть пустым.'); return; }
    if (questions.length === 0) { setError('Добавьте хотя бы один вопрос.'); return; }
    if (!surveyId) return;

    setIsSaving(true);
    setError(null);

    try {
        const { error: templateError } = await supabase.from('survey_templates').update({ title, description, is_interactive: isInteractive }).eq('id', surveyId);
        if (templateError) throw templateError;

        const initialDbIds = new Set(initialQuestions.map(q => q.db_id).filter(Boolean));
        const currentDbIds = new Set(questions.map(q => q.db_id).filter(Boolean));

        const questionsToInsert = questions.filter(q => !q.db_id).map((q, index) => ({ survey_template_id: surveyId, question_text: q.text, question_type: q.type, is_required: q.required, question_order: initialQuestions.length + index + 1, choice_options: q.type === 'choice' ? q.options : null }));
        const questionsToUpdate = questions.filter(q => q.db_id && initialDbIds.has(q.db_id)).map((q, index) => ({ id: q.db_id, question_text: q.text, question_type: q.type, is_required: q.is_required, question_order: index + 1, choice_options: q.type === 'choice' ? q.options : null }));
        const questionIdsToDelete = initialQuestions.filter(q => q.db_id && !currentDbIds.has(q.db_id)).map(q => q.db_id);

        if (questionsToInsert.length > 0) {
            const { error } = await supabase.from('question_templates').insert(questionsToInsert);
            if (error) throw new Error(`Ошибка добавления вопросов: ${error.message}`);
        }
        if (questionsToUpdate.length > 0) {
            for (const q of questionsToUpdate) {
                const { error } = await supabase.from('question_templates').update({ question_text: q.question_text, question_type: q.question_type, is_required: q.is_required, question_order: q.question_order, choice_options: q.choice_options }).eq('id', q.id);
                if (error) throw new Error(`Ошибка обновления вопроса (ID: ${q.id}): ${error.message}`);
            }
        }
        if (questionIdsToDelete.length > 0) {
            const { error } = await supabase.from('question_templates').delete().in('id', questionIdsToDelete);
            if (error) throw new Error(`Ошибка удаления вопросов: ${error.message}`);
        }

        navigate('/dashboard');
        toast.success('Опрос успешно обновлен!');
    } catch (err: any) {
        setError(`Ошибка сохранения: ${err.message}`);
    } finally {
        setIsSaving(false);
    }
  };

  if (initialLoading) return <DashboardLayout><div className="flex justify-center items-center py-20"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto py-8 px-4">
        <header className="mb-8">
            <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-text-secondary hover:text-primary mb-4 transition-colors">
                <ArrowLeft size={18}/> Назад ко всем опросам
            </button>
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <h1 className="text-3xl font-bold text-text-primary">Редактор опроса</h1>
                <ActionButton onClick={handleSaveSurvey} loading={isSaving} disabled={questions.length === 0}><Save className="w-4 h-4 mr-2"/>Сохранить изменения</ActionButton>
            </div>
            {error && <div className="mt-4 bg-red-100/60 border border-red-500/50 text-red-700 p-3 rounded-lg flex items-center gap-3"><AlertTriangle size={20}/> <span className="text-sm">{error}</span></div>}
        </header>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-surface p-6 sm:p-8 rounded-2xl border border-border-subtle shadow-ambient mb-8">
            <div className="space-y-6">
                <FormInput id="title" label="Название опроса" value={title} onChange={e => setTitle(e.target.value)} placeholder="Напр., Ежегодный опрос вовлеченности" />
                <FormInput id="description" label="Описание (опционально)" value={description} onChange={e => setDescription(e.target.value)} placeholder="Краткое пояснение для получателей" as="textarea" />
                <div className="flex items-start gap-3 pt-2">
                    <input id="isInteractive" type="checkbox" checked={isInteractive} onChange={e => setIsInteractive(e.target.checked)} className="h-5 w-5 mt-0.5 rounded border-gray-400 text-primary focus:ring-primary/50" />
                    <div>
                         <label htmlFor="isInteractive" className="font-medium text-text-primary">Интерактивный чат-режим</label>
                         <p className="text-sm text-text-secondary mt-1">Вопросы будут задаваться по одному в формате диалога.</p>
                    </div>
                </div>
            </div>
        </motion.div>

        <AnimatePresence>
        {questions.map((q, index) => (
          <QuestionEditor key={q.id} question={q} index={index} update={updateQuestion} remove={removeQuestion} />
        ))}
        </AnimatePresence>

        <div className="mt-6 flex justify-center">
            <ActionButton onClick={addQuestion} variant='secondary'><Plus size={16} className="mr-2"/>Добавить вопрос</ActionButton>
        </div>
      </div>
    </DashboardLayout>
  );
};

// --- Question Editor Component (identical to CreateSurvey) ---
const QuestionEditor = ({ question, index, update, remove }) => {
    const addOption = () => update(question.id, 'options', [...question.options, '']);
    const updateOption = (optIndex, value) => {
        const newOptions = [...question.options];
        newOptions[optIndex] = value;
        update(question.id, 'options', newOptions);
    };
    const removeOption = (optIndex) => update(question.id, 'options', question.options.filter((_, i) => i !== optIndex));

    return (
        <motion.div layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.3, ease: 'easeInOut' }} className="bg-surface p-6 rounded-2xl border border-border-subtle shadow-ambient mb-6">
            <div className="flex items-start gap-4">
                <GripVertical className="w-5 h-5 text-text-secondary mt-2 cursor-grab"/>
                <div className="w-full">
                    <input type="text" value={question.text} onChange={e => update(question.id, 'text', e.target.value)} placeholder={`Вопрос ${index + 1}`} className="w-full text-lg font-semibold bg-transparent focus:outline-none focus:text-primary"/>
                    <div className="flex flex-col sm:flex-row gap-4 mt-4 pt-4 border-t border-border-subtle">
                        <select value={question.type} onChange={e => update(question.id, 'type', e.target.value)} className="h-10 w-full sm:w-48 px-3 border border-border-subtle rounded-lg bg-background focus:outline-none focus:border-primary text-sm">
                           <option value="text">Текст</option>
                            <option value="number">Число</option>
                            <option value="email">Email</option>
                            <option value="rating">Рейтинг (1-10)</option>
                            <option value="choice">Выбор варианта</option>
                        </select>
                        <div className="flex items-center gap-2">
                            <input id={`req-${question.id}`} type="checkbox" checked={question.required} onChange={e => update(question.id, 'required', e.target.checked)} className="h-4 w-4 rounded border-gray-400 text-primary focus:ring-primary/50"/>
                            <label htmlFor={`req-${question.id}`} className="text-sm font-medium text-text-secondary">Обязательный</label>
                        </div>
                    </div>
                </div>
                <button onClick={() => remove(question.id)} className="text-text-secondary hover:text-red-500 transition-colors p-2"><Trash2 size={18} /></button>
            </div>

            {question.type === 'choice' && (
                <div className="mt-4 pt-4 pl-9 border-t border-border-subtle">
                    <h3 className="text-sm font-medium text-text-secondary mb-3">Варианты ответа</h3>
                    <div className="space-y-2">
                    {question.options.map((opt, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <input type="text" value={opt} onChange={e => updateOption(i, e.target.value)} placeholder={`Вариант ${i + 1}`} className="w-full h-10 px-3 border-b-2 border-border-subtle focus:outline-none focus:border-primary bg-transparent"/>
                            <button onClick={() => removeOption(i)} className="p-1 text-text-secondary hover:text-red-500"><Trash2 size={16} /></button>
                        </div>
                    ))}
                    </div>
                    <button onClick={addOption} className="text-sm font-semibold text-primary hover:underline mt-3">+ Добавить вариант</button>
                </div>
            )}
        </motion.div>
    )
}

export default EditSurvey;
