
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import { AiSurveyModal } from '../components/AiSurveyModal';
import { Plus, Trash2, Settings2, GripVertical, ArrowLeft, Save, Sparkles, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Interfaces & Types ---
export interface LocalQuestion {
  id: string;
  text: string;
  type: 'text' | 'number' | 'email' | 'rating' | 'choice';
  required: boolean;
  options: string[];
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
        special: 'bg-gradient-to-r from-violet-500 to-purple-500 text-white hover:opacity-90 focus:ring-violet-500'
    };
    return <button onClick={onClick} disabled={disabled || loading} className={`h-10 px-5 inline-flex items-center justify-center font-semibold text-sm rounded-lg shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 ${variants[variant]}`}>{loading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-on-primary"></div> : children}</button>;
};

// --- Main Page Component ---
const CreateSurvey = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isInteractive, setIsInteractive] = useState(false);
  const [questions, setQuestions] = useState<LocalQuestion[]>([]);
  
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  useEffect(() => {
    if (user) setCompanyId(user.id);
  }, [user]);

  const handleOpenAiModal = () => setIsAiModalOpen(true);
  const handleAcceptAiSurvey = (aiQuestions: Omit<LocalQuestion, 'id'>[], topic: string, interactive: boolean, desc: string) => {
    setTitle(topic);
    setDescription(desc);
    setIsInteractive(interactive);
    setQuestions(aiQuestions.map(q => ({ ...q, id: crypto.randomUUID() })));
    setIsAiModalOpen(false);
  };

  const addQuestion = () => setQuestions([...questions, { id: crypto.randomUUID(), text: '', type: 'text', required: true, options: [] }]);
  const removeQuestion = (id: string) => setQuestions(questions.filter(q => q.id !== id));
  const updateQuestion = (id: string, field: keyof LocalQuestion, value: any) => setQuestions(questions.map(q => (q.id === id ? { ...q, [field]: value } : q)));

  const handleSaveSurvey = async () => {
    if (!title.trim()) { setError('Название опроса не может быть пустым.'); return; }
    if (questions.length === 0) { setError('Добавьте хотя бы один вопрос.'); return; }
    if (!companyId) { setError('Не удалось определить ID компании.'); return; }

    setLoading(true);
    setError(null);

    try {
      const { data: survey, error: surveyError } = await supabase.from('survey_templates').insert([{ title, description, company_id: companyId, is_interactive: isInteractive, is_active: true }]).select().single();
      if (surveyError) throw surveyError;

      const questionsToInsert = questions.map((q, i) => ({ survey_template_id: survey.id, question_text: q.text, question_type: q.type, is_required: q.required, question_order: i + 1, choice_options: q.type === 'choice' ? q.options : null }));
      const { error: questionsError } = await supabase.from('question_templates').insert(questionsToInsert);
      
      if (questionsError) {
        await supabase.from('survey_templates').delete().eq('id', survey.id); // Rollback
        throw questionsError;
      }
      navigate('/dashboard');
    } catch (err: any) { setError(`Ошибка сохранения: ${err.message}`); }
    finally { setLoading(false); }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto py-8 px-4">
        <header className="mb-8">
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-text-secondary hover:text-primary mb-4 transition-colors">
            <ArrowLeft size={18}/> Назад ко всем опросам
          </button>
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <h1 className="text-3xl font-bold text-text-primary">Создание опроса</h1>
            <div className="flex gap-2">
              <ActionButton onClick={handleOpenAiModal} variant='special' disabled={loading}><Sparkles className="w-4 h-4 mr-2"/>Сгенерировать с AI</ActionButton>
              <ActionButton onClick={handleSaveSurvey} loading={loading} disabled={!companyId || questions.length === 0}><Save className="w-4 h-4 mr-2"/>Сохранить</ActionButton>
            </div>
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

      {isAiModalOpen && companyId && <AiSurveyModal onClose={() => setIsAiModalOpen(false)} onGenerate={handleAcceptAiSurvey} />}
    </DashboardLayout>
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

export default CreateSurvey;
