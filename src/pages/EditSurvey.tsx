
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Plus, Trash2, GripVertical, ArrowLeft, Save, Loader2, Rocket } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { RatingOptions, QuestionTemplate as DbQuestionTemplate } from '../types/database';
import RunCreateModal from '../components/RunCreateModal'; // NEW

// --- Interfaces ---
export interface LocalQuestion {
  id: string;
  db_id?: number;
  text: string;
  type: 'text' | 'number' | 'email' | 'rating' | 'choice';
  required: boolean;
  options: string[] | RatingOptions | null;
  rating_max: 3 | 5 | 10;
  rating_labels: [string, string];
}

const EditSurvey = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id: surveyId } = useParams<{ id: string }>();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [finalMessage, setFinalMessage] = useState('');
  const [questions, setQuestions] = useState<LocalQuestion[]>([]);
  const [initialQuestions, setInitialQuestions] = useState<LocalQuestion[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isRunModalOpen, setIsRunModalOpen] = useState(false); // NEW

  useEffect(() => {
    if (!surveyId || !user) return;

    const fetchSurvey = async () => {
        try {
            const { data: survey, error } = await supabase
                .from('survey_templates')
                .select('*, question_templates(*)')
                .eq('id', surveyId)
                .single();

            if (error) throw error;

            setTitle(survey.title);
            setDescription(survey.description || '');
            setFinalMessage(survey.completion_settings?.thank_you_message || 'Спасибо за участие!');

            const loadedQuestions = (survey.question_templates || [])
                .sort((a, b) => a.question_order - b.question_order)
                .map((q: DbQuestionTemplate) => {
                    const localQ: LocalQuestion = {
                        id: crypto.randomUUID(),
                        db_id: q.id as any,
                        text: q.question_text,
                        type: q.question_type as any,
                        required: q.is_required,
                        options: q.options,
                        rating_max: 5,
                        rating_labels: ['', '']
                    };

                    if (q.question_type === 'rating' && q.options && typeof q.options === 'object' && 'scale_max' in q.options) {
                        const opts = q.options as RatingOptions;
                        localQ.rating_max = opts.scale_max as 3 | 5 | 10;
                        localQ.rating_labels = [opts.label_min || '', opts.label_max || ''];
                    }
                    return localQ;
                });

            setQuestions(loadedQuestions);
            setInitialQuestions(JSON.parse(JSON.stringify(loadedQuestions)));
        } catch (err: any) {
            toast.error('Ошибка при загрузке: ' + err.message);
            navigate('/dashboard');
        } finally {
            setLoading(false);
        }
    };

    fetchSurvey();
  }, [surveyId, user, navigate]);

  const addQuestion = () => setQuestions([...questions, { 
      id: crypto.randomUUID(), text: '', type: 'text', required: true, options: [], rating_max: 5, rating_labels: ['', ''] 
  }]);

  const updateQuestion = (id: string, field: string, value: any) => {
      setQuestions(prev => prev.map(q => q.id === id ? { ...q, [field]: value } : q));
  };

  const removeQuestion = (id: string) => setQuestions(prev => prev.filter(q => q.id !== id));

  const handleSave = async () => {
    if (!title.trim()) return toast.error('Название не может быть пустым');
    setIsSaving(true);

    try {
        await supabase.from('survey_templates').update({
            title,
            description,
            completion_settings: { thank_you_message: finalMessage }
        }).eq('id', surveyId);

        const currentDbIds = questions.map(q => q.db_id).filter(Boolean);
        const toDelete = initialQuestions.map(q => q.db_id).filter(id => id && !currentDbIds.includes(id));

        if (toDelete.length > 0) {
            await supabase.from('question_templates').delete().in('id', toDelete);
        }

        const upsertPromises = questions.map((q, index) => {
            let optionsPayload = q.options;
            if (q.type === 'rating') {
                optionsPayload = {
                    scale_max: q.rating_max,
                    label_min: q.rating_labels[0],
                    label_max: q.rating_labels[1]
                };
            }

            const record = {
                survey_template_id: surveyId,
                question_text: q.text,
                question_type: q.type,
                is_required: q.required,
                question_order: index + 1,
                options: optionsPayload
            };

            return q.db_id 
                ? supabase.from('question_templates').update(record).eq('id', q.db_id)
                : supabase.from('question_templates').insert(record).select().single();
        });

        await Promise.all(upsertPromises);
        toast.success('Опрос успешно обновлен');
    } catch (err: any) {
        toast.error('Ошибка при сохранении: ' + err.message);
    } finally {
        setIsSaving(false);
    }
  };
  
  // NEW: Handle run creation callback
  const handleRunCreated = (newRun: any) => {
    toast.success(`Run "${newRun.name}" created successfully!`);
    navigate(`/runs/${newRun.id}`);
  };

  if (loading) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-blue-500"/></div>;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
        <header className="flex justify-between items-center mb-8">
            <Link to="/dashboard" className="flex items-center text-gray-500 hover:text-black transition-colors">
                <ArrowLeft size={18} className="mr-2"/> К списку опросов
            </Link>
            <div className="flex items-center gap-2">
                <button 
                    onClick={() => setIsRunModalOpen(true)} 
                    className="bg-green-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-green-600 transition-all shadow-md"
                >
                    <Rocket size={18}/>
                    Запустить
                </button>
                <button 
                    onClick={handleSave} 
                    disabled={isSaving} 
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-md disabled:opacity-50"
                >
                    {isSaving ? <Loader2 size={18} className="animate-spin"/> : <Save size={18}/>}
                    Сохранить
                </button>
            </div>
        </header>

        {/* ... rest of the form ... */}
        <div className="space-y-6 bg-white p-6 rounded-xl border shadow-sm mb-8">
            <div className="space-y-4">
                <input 
                    value={title} 
                    onChange={e => setTitle(e.target.value)} 
                    className="text-2xl font-bold w-full focus:outline-none border-b border-transparent focus:border-blue-500 pb-1 transition-colors" 
                    placeholder="Заголовок опроса"
                />
                <textarea 
                    value={description} 
                    onChange={e => setDescription(e.target.value)} 
                    className="w-full focus:outline-none text-gray-600 resize-none" 
                    placeholder="Описание опроса..." 
                    rows={2}
                />
            </div>
            <div className="pt-4 border-t">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Финальное сообщение (после завершения)</label>
                <input 
                    value={finalMessage} 
                    onChange={e => setFinalMessage(e.target.value)} 
                    className="w-full mt-1 text-sm focus:outline-none bg-gray-50 p-2 rounded border border-transparent focus:border-gray-200 transition-colors" 
                />
            </div>
        </div>

        <div className="space-y-4">
            <AnimatePresence>
                {questions.map((q, idx) => (
                    <QuestionEditor key={q.id} question={q} index={idx} update={updateQuestion} remove={removeQuestion} />
                ))}
            </AnimatePresence>
            <button 
                onClick={addQuestion} 
                className="w-full py-4 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:text-blue-500 hover:border-blue-500 transition-all flex justify-center items-center font-medium"
            >
                <Plus size={20} className="mr-2"/> Добавить вопрос
            </button>
        </div>

        {/* NEW: Run Creation Modal */}
        {surveyId && user?.user_metadata.company_id && (
            <RunCreateModal
                isOpen={isRunModalOpen}
                onClose={() => setIsRunModalOpen(false)}
                surveyTemplateId={surveyId}
                companyId={user.user_metadata.company_id}
                onRunCreated={handleRunCreated}
            />
        )}
    </div>
  );
};

const QuestionEditor = ({ question, index, update, remove }) => {
    // ... (no changes in this component)
    return (
        <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-5 rounded-xl border shadow-sm flex gap-4 group">
            <div className="flex flex-col items-center text-gray-300 group-hover:text-gray-400 transition-colors">
                <GripVertical size={20} className="cursor-move"/>
                <span className="text-xs font-bold mt-1">{index + 1}</span>
            </div>
            <div className="flex-grow space-y-4">
                <input 
                    value={question.text} 
                    onChange={e => update(question.id, 'text', e.target.value)} 
                    className="w-full font-semibold text-lg focus:outline-none placeholder:text-gray-200" 
                    placeholder="Текст вопроса"
                />
                <div className="flex gap-4 items-center">
                    <select 
                        value={question.type} 
                        onChange={e => update(question.id, 'type', e.target.value)} 
                        className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50"
                    >
                        <option value="text">Текст</option>
                        <option value="rating">Рейтинг (Шкала)</option>
                        <option value="choice">Один вариант</option>
                        <option value="number">Число</option>
                    </select>
                    <label className="flex items-center text-sm text-gray-600 cursor-pointer select-none">
                        <input 
                            type="checkbox" 
                            checked={question.required} 
                            onChange={e => update(question.id, 'required', e.target.checked)} 
                            className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        /> 
                        Обязательный
                    </label>
                </div>

                {question.type === 'rating' && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100 flex flex-col sm:flex-row gap-4 items-end">
                        <div className="w-full sm:w-auto">
                            <label className="text-[10px] font-bold text-blue-400 uppercase mb-1 block">Шкала</label>
                            <select 
                                value={question.rating_max || 5} 
                                onChange={e => update(question.id, 'rating_max', parseInt(e.target.value))} 
                                className="w-full border border-blue-200 rounded-lg p-1.5 text-sm bg-white outline-none"
                            >
                                <option value={3}>1 — 3 балла</option>
                                <option value={5}>1 — 5 баллов</option>
                                <option value={10}>1 — 10 баллов</option>
                            </select>
                        </div>
                        <div className="flex-grow flex gap-3 w-full">
                            <div className="w-full">
                                <label className="text-[10px] font-bold text-blue-400 uppercase mb-1 block">Метка min (1)</label>
                                <input 
                                    placeholder="Плохо" 
                                    value={question.rating_labels[0]} 
                                    onChange={e => update(question.id, 'rating_labels', [e.target.value, question.rating_labels[1]])} 
                                    className="w-full border-b border-blue-200 bg-transparent text-sm py-1 focus:border-blue-500 outline-none transition-colors"
                                />
                            </div>
                            <div className="w-full">
                                <label className="text-[10px] font-bold text-blue-400 uppercase mb-1 block">Метка max ({question.rating_max})</label>
                                <input 
                                    placeholder="Отлично" 
                                    value={question.rating_labels[1]} 
                                    onChange={e => update(question.id, 'rating_labels', [question.rating_labels[0], e.target.value])} 
                                    className="w-full border-b border-blue-200 bg-transparent text-sm py-1 focus:border-blue-500 outline-none transition-colors"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <button 
                onClick={() => remove(question.id)} 
                className="text-gray-300 hover:text-red-500 self-start transition-colors p-1"
            >
                <Trash2 size={20}/>
            </button>
        </motion.div>
    );
};

export default EditSurvey;
