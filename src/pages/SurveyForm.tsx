
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { SurveyTemplate, QuestionTemplate, RatingOptions } from '../types/database';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// --- Reusable UI Components ---
const ActionButton: React.FC<any> = ({ onClick, children, variant = 'primary', loading = false, disabled = false, className = '' }) => {
    const baseClasses = "w-full h-11 inline-flex items-center justify-center font-semibold text-sm rounded-md transition-colors duration-200 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background";
    const variantClasses = {
        accent: "bg-primary text-on-primary hover:bg-primary/90 focus:ring-primary",
    };
    return (
        <button onClick={onClick} disabled={disabled || loading} className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
            {loading ? <Loader2 className="animate-spin h-5 w-5"/> : children}
        </button>
    );
};

const SubmittedState: React.FC<any> = ({ survey, message }) => (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-surface rounded-lg border border-border p-6 sm:p-8 max-w-lg w-full text-center">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-6" strokeWidth={1.5}/>
            <h2 className="text-2xl font-semibold text-text-primary mb-2">{survey?.title || 'Спасибо!'}</h2>
            <p className="text-text-secondary mb-8">{message || 'Ваши ответы успешно отправлены!'}</p>
        </div>
    </div>
);

// --- Main Survey Form Component ---

interface SurveyFormProps {
  runId?: string;
  surveyTemplateId?: string;
}

export function SurveyForm({ runId, surveyTemplateId }: SurveyFormProps) {
  const { id: surveyIdFromUrl } = useParams<{ id: string }>();
  const [survey, setSurvey] = useState<SurveyTemplate | null>(null);
  const [questions, setQuestions] = useState<QuestionTemplate[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    const templateId = surveyTemplateId || surveyIdFromUrl; 

    if (!templateId) {
        setError('ID опроса не найден.');
        setLoading(false);
        return;
    }

    try {
        const { data: surveyData, error: surveyError } = await supabase
            .from('survey_templates')
            .select('*')
            .eq('id', templateId)
            .single();

        if (surveyError) throw surveyError;
        if (!surveyData) throw new Error('Опрос не найден.');

        setSurvey(surveyData);

        const { data: qData, error: qError } = await supabase
            .from('question_templates')
            .select('*')
            .eq('survey_template_id', surveyData.id)
            .order('question_order');
        
        if (qError) throw qError;
        setQuestions(qData || []);

    } catch (err: any) { 
        setError(err.message); 
    } finally { 
        setLoading(false); 
    }
  }, [surveyTemplateId, surveyIdFromUrl]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!runId) {
        toast.error("Submission Failed: This survey link is invalid or missing a Run ID.");
        return;
    }
    
    for (const q of questions) {
      if (q.is_required && !answers[q.id]) {
        toast.error(`Пожалуйста, ответьте на обязательный вопрос: "${q.question_text}"`);
        return;
      }
    }
    
    setIsSubmitting(true);
    try {
        const { data: submission, error: submissionError } = await supabase.from('survey_submissions').insert({ 
            survey_template_id: survey!.id,
            run_id: runId, 
            survey_title: survey!.title,
            survey_description: survey!.description || null,
        }).select().single();
        
        if (submissionError) throw submissionError;

        const answersToInsert = questions.map(q => ({
            submission_id: submission.id, 
            question_template_id: q.id,
            run_id: runId, 
            question_text: q.question_text, 
            answer_text: answers[q.id] || null
        }));

        const { error: answersError } = await supabase.from('submission_answers').insert(answersToInsert);
        if (answersError) throw answersError;
        
        setSubmitted(true);
    } catch (err: any) { 
        toast.error('Ошибка при отправке: ' + err.message);
    } finally { 
        setIsSubmitting(false); 
    }
  };

  // CORRECTED renderQuestionInput with defensive code
  const renderQuestionInput = (q: QuestionTemplate) => {
    const value = answers[q.id] || '';
    const handleChange = (e: any) => setAnswers({ ...answers, [q.id]: e.target.value });

    if (q.question_type === 'rating') {
        const opts = q.options as RatingOptions | null;

        // --- THE FIX --- 
        // Use optional chaining and nullish coalescing to provide safe defaults
        const scaleMax = opts?.scale_max || 5;
        const labelMin = opts?.label_min || 'Низко';
        const labelMax = opts?.label_max || 'Высоко';

        return (
            <div>
                <div className="flex justify-between text-xs text-gray-500 uppercase font-semibold px-1 mb-2">
                    <span>{labelMin}</span>
                    <span>{labelMax}</span>
                </div>
                <div className="flex gap-2">
                    {[...Array(scaleMax)].map((_, i) => i + 1).map(r => (
                        <button 
                            key={r} type="button" 
                            onClick={() => setAnswers({ ...answers, [q.id]: String(r) })} 
                            className={`flex-grow h-12 rounded-xl font-bold transition-all ${value === String(r) ? 'bg-primary text-white scale-105 shadow-md' : 'bg-gray-100 border border-gray-200 hover:bg-gray-200'}`}
                        >
                            {r}
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    return <textarea value={value} onChange={handleChange} required={q.is_required} className="w-full p-3 bg-gray-50 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary" placeholder="Ваш ответ..." rows={4} />;
  }

  if (loading) return <div className="text-center p-8">Loading...</div>;
  if (error) return <div className="text-center p-8 text-red-500">Error: {error}</div>;
  if (submitted) return <SubmittedState survey={survey} message={survey?.completion_settings?.thank_you_message} />;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <header className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
            <h1 className="text-3xl font-bold text-gray-900">{survey?.title}</h1>
            {survey?.description && <p className="text-gray-500 mt-2">{survey.description}</p>}
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
            {questions.map((q, idx) => (
              <div key={q.id} className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
                <label className="block mb-6 text-lg font-semibold text-gray-800">
                    <span className="text-primary mr-2">{idx + 1}.</span> {q.question_text}
                </label>
                {renderQuestionInput(q)}
              </div>
            ))}
            <div className="px-8 py-4">
                <ActionButton type="submit" variant="accent" loading={isSubmitting} disabled={isSubmitting} className="h-14 text-lg shadow-lg w-full">Отправить ответы</ActionButton>
            </div>
        </form>
      </div>
    </div>
  );
}
