import { useEffect, useState, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { SurveyTemplate, QuestionTemplate, SurveyRecipient, RatingOptions } from '../types/database';
import { InteractiveSurveyChat } from '../components/InteractiveSurveyChat';
import { CheckCircle2, Download, Eye, User, Mail, Building, AlertTriangle, Loader2, FileSpreadsheet, FileText } from 'lucide-react';
import { generateCode } from '../utils/generateCode';
import { toast } from 'sonner';
import { generateSurveyFormPdf } from '../lib/pdfExport';

// --- Reusable Components ---
const ActionButton = ({ onClick, children, variant = 'primary', loading = false, disabled = false, className = '' }) => {
    const baseClasses = "w-full h-11 inline-flex items-center justify-center font-semibold text-sm rounded-md transition-colors duration-200 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background";
    const variantClasses = {
        primary: "bg-surface-contrast border border-border-contrast hover:bg-background-contrast text-text-primary focus:ring-primary",
        accent: "bg-primary text-on-primary hover:bg-primary/90 focus:ring-primary",
    };
    return (
        <button onClick={onClick} disabled={disabled || loading} className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
            {loading ? <Loader2 className="animate-spin h-5 w-5"/> : children}
        </button>
    );
};

const FormInput = ({ icon, ...props }) => (
    <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-text-secondary">{icon}</div>
        <input {...props} className="w-full h-11 pl-10 pr-4 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/80" />
    </div>
);

const FallbackTextarea = ({ value, onChange, isRequired }) => (
    <textarea 
        value={value} 
        onChange={onChange} 
        className="w-full p-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/80" 
        placeholder="Ваш развернутый ответ..." 
        required={isRequired} 
        rows={4}
    />
);

// --- Main Component States ---
const LoadingState = () => <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;

const ErrorState = ({ message, onRetry }) => (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-surface rounded-lg border border-border p-8 max-w-md w-full text-center">
            <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-6" strokeWidth={1.5} />
            <h2 className="text-xl font-semibold text-text-primary mb-3">Произошла ошибка</h2>
            <p className="text-text-secondary mb-8">{message}</p>
            {onRetry && <ActionButton onClick={onRetry} variant="accent">Попробовать снова</ActionButton>}
        </div>
    </div>
);

const SubmittedState = ({ survey, questions, answers, recipient, brandName }: { survey: SurveyTemplate, questions: QuestionTemplate[], answers: Record<string, string>, recipient: SurveyRecipient | null, brandName: string }) => {

    const handleClose = () => {
        // Пытаемся закрыть вкладку
        window.close();
        
        // Если через 300мс вкладка все еще открыта (браузер заблокировал close)
        // перенаправляем на пустую страницу или логотип бренда
        setTimeout(() => {
            window.location.href = 'about:blank';
        }, 300);
    };

    const handleExportPdf = () => {
      if (!survey) { toast.error('Данные опроса не загружены'); return; }
      
      const formattedAnswers = { ...answers };
      // Форматируем рейтинг только для отображения в PDF
      questions.forEach(q => {
          if (q.question_type === 'rating' && answers[q.id] && q.options && typeof q.options === 'object' && 'scale_max' in q.options) {
              formattedAnswers[q.id] = `${answers[q.id]} / ${(q.options as RatingOptions).scale_max}`;
          }
      });
      generateSurveyFormPdf(survey, questions, formattedAnswers, recipient, brandName);
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="bg-surface rounded-lg border border-border p-6 sm:p-8 max-w-lg w-full text-center">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-6" strokeWidth={1.5}/>
                <h2 className="text-2xl font-semibold text-text-primary mb-2">{survey.title}</h2>
                <p className="text-text-secondary mb-8">{survey.completion_settings?.thank_you_message || 'Ваши ответы успешно отправлены!'}</p>
                
                <div className="mb-8">
                    <p className="text-xs text-text-secondary uppercase font-bold tracking-widest mb-4">Вы можете скачать свои ответы</p>
                    <ActionButton onClick={handleExportPdf} variant='primary' className="bg-gray-50 border-gray-200">
                        <FileText className="w-4 h-4 mr-2" />
                        Скачать результаты (PDF)
                    </ActionButton>
                </div>

                <button 
                    onClick={handleClose} 
                    className="w-full h-12 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-all active:scale-95"
                >
                    Закрыть опрос
                </button>
            </div>
        </div>
    );
};


// --- Main Component ---
export function SurveyForm() {
  const { id: surveyIdFromUrl } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const [survey, setSurvey] = useState<SurveyTemplate | null>(null);
  const [questions, setQuestions] = useState<QuestionTemplate[]>([]);
  const [recipient, setRecipient] = useState<SurveyRecipient | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [brandName, setBrandName] = useState('SurveyPro');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [isPreview, setIsPreview] = useState(false);

  const [isIdentificationStep, setIsIdentificationStep] = useState(false);
  const [respondentInfo, setRespondentInfo] = useState({ name: '', email: '', company: '' });

  const loadData = useCallback(async (recipientCode: string | null, surveyId: string | undefined, isPreviewMode: boolean) => {
    setLoading(true);
    setError('');

    try {
        const { data: brandData } = await supabase.from('system_settings').select('setting_value').eq('setting_name', 'brand_name').single();
        if (brandData?.setting_value) setBrandName(brandData.setting_value);
        
        let surveyData: SurveyTemplate | null = null;

        if (recipientCode) {
            const { data, error } = await supabase.from('survey_recipients').select('*').eq('recipient_code', recipientCode).single();
            if (error || !data) throw new Error('Ссылка недействительна.');
            if (data.submitted_at && !isPreviewMode) { setAlreadySubmitted(true); return; }
            
            setRecipient(data);
            if (!data.opened_at && !isPreviewMode) {
                await supabase.from('survey_recipients').update({ opened_at: new Date().toISOString() }).eq('id', data.id);
            }
            const { data: sData } = await supabase.from('survey_templates').select('*, completion_settings').eq('id', data.survey_template_id).single();
            surveyData = sData;

        } else if (surveyId) {
            const { data } = await supabase.from('survey_templates').select('*, completion_settings').eq('unique_code', surveyId).single();
            surveyData = data;
            if (surveyData && !isPreviewMode) setIsIdentificationStep(true);
        }

        if (!surveyData) throw new Error('Опрос не найден.');
        if (!surveyData.is_active && !isPreviewMode) throw new Error('Опрос неактивен.');
        
        setSurvey(surveyData);
        const { data: qData } = await supabase.from('question_templates').select('*').eq('survey_template_id', surveyData.id).order('question_order');
        setQuestions(qData || []);

    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get('code');
    const preview = params.get('preview') === 'true';
    setIsPreview(preview);
    loadData(code, surveyIdFromUrl, preview);
  }, [surveyIdFromUrl, location.search, loadData]);

  const handleIdentificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!respondentInfo.name) { toast.error("Укажите имя."); return; }
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.from('survey_recipients').insert({ 
        survey_template_id: survey!.id, 
        company_id: survey!.company_id, 
        contact_person: respondentInfo.name.trim(), 
        email: respondentInfo.email.trim() || null,
        company_name: respondentInfo.company.trim() || null,
        recipient_code: generateCode(),
        opened_at: new Date().toISOString()
      }).select().single();

      if (error) throw error;
      setRecipient(data);
      setIsIdentificationStep(false);
      navigate(`/survey/${survey?.unique_code}?code=${data.recipient_code}`, { replace: true });
    } catch(err: any) {
        toast.error(`Ошибка: ${err.message}`);
    } finally { setIsSubmitting(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPreview) return;
    
    for (const q of questions) {
      if (q.is_required && !answers[q.id]) { toast.error(`Ответьте на вопрос: ${q.question_text}`); return; }
    }
    
    setIsSubmitting(true);
    try {
        const { data: submission, error: submissionError } = await supabase.from('survey_submissions').insert({ 
            survey_template_id: survey!.id, 
            recipient_id: recipient?.id, 
            respondent_email: recipient?.email, 
            survey_title: survey!.title 
        }).select().single();
        
        if (submissionError) throw submissionError;

        const answersToInsert = questions.map(q => ({
            submission_id: submission.id, 
            question_template_id: q.id, 
            question_text: q.question_text, 
            answer_text: answers[q.id] || null // Сохраняем ЧИСТОЕ значение без слэшей
        }));

        await supabase.from('submission_answers').insert(answersToInsert);
        
        if (recipient) {
            const { data: updated } = await supabase.from('survey_recipients').update({ submitted_at: new Date().toISOString() }).eq('id', recipient.id).select().single();
            setRecipient(updated);
        }
        setSubmitted(true);
    } catch (err: any) { 
        toast.error('Ошибка при отправке');
    } finally { setIsSubmitting(false); }
  };

  const renderQuestionInput = (q: QuestionTemplate) => {
    const value = answers[q.id] || '';
    const handleChange = (e: any) => setAnswers({ ...answers, [q.id]: e.target.value });

    if (q.question_type === 'rating') {
        const opts = q.options as RatingOptions;
        return (
            <div>
                <div className="flex justify-between text-[10px] text-text-secondary uppercase font-bold px-1 mb-2">
                    <span>{opts.label_min}</span>
                    <span>{opts.label_max}</span>
                </div>
                <div className="flex gap-2">
                    {[...Array(opts.scale_max)].map((_, i) => i + 1).map(r => (
                        <button 
                            key={r} type="button" 
                            onClick={() => setAnswers({ ...answers, [q.id]: String(r) })} 
                            className={`flex-grow h-12 rounded-xl font-bold transition-all ${value === String(r) ? 'bg-primary text-white scale-105 shadow-md' : 'bg-gray-50 border border-gray-200 hover:bg-white'}`}
                        >
                            {r}
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    if (q.question_type === 'choice' && Array.isArray(q.options)) {
        return (
            <div className="space-y-2">
                {q.options.map(opt => (
                    <label key={opt} className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-all ${value === opt ? 'bg-primary/5 border-primary' : 'bg-gray-50 border-gray-200'}`}>
                        <input type="radio" name={q.id} value={opt} checked={value === opt} onChange={handleChange} className="w-4 h-4 text-primary" />
                        <span className="font-medium">{opt}</span>
                    </label>
                ))}
            </div>
        );
    }

    return <FallbackTextarea value={value} onChange={handleChange} isRequired={q.is_required} />;
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;
  if (alreadySubmitted) return <ErrorState message="Ответы уже приняты." />;
  if (submitted) return <SubmittedState survey={survey!} questions={questions} answers={answers} recipient={recipient} brandName={brandName} />;

  if (isIdentificationStep) {
      return (
          <div className="min-h-screen bg-background p-6 flex items-center justify-center">
            <div className="max-w-md w-full bg-white rounded-2xl border p-8 shadow-sm">
              <h1 className="text-2xl font-bold text-center mb-6">{survey?.title}</h1>
              <form onSubmit={handleIdentificationSubmit} className="space-y-4">
                <FormInput icon={<User size={18}/>} type="text" value={respondentInfo.name} onChange={(e:any) => setRespondentInfo({ ...respondentInfo, name: e.target.value })} placeholder="Ваше имя" required />
                <FormInput icon={<Mail size={18}/>} type="email" value={respondentInfo.email} onChange={(e:any) => setRespondentInfo({ ...respondentInfo, email: e.target.value })} placeholder="Email (необязательно)" />
                <ActionButton variant="accent" type="submit" loading={isSubmitting}>Начать</ActionButton>
              </form>
            </div>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <header className="bg-white rounded-2xl border p-8 shadow-sm">
            <h1 className="text-3xl font-bold text-gray-900">{survey?.title}</h1>
            {survey?.description && <p className="text-gray-500 mt-2">{survey.description}</p>}
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
            {questions.map((q, idx) => (
              <div key={q.id} className="bg-white rounded-2xl border p-8 shadow-sm">
                <label className="block mb-6 text-lg font-semibold text-gray-800">
                    <span className="text-primary mr-2">{idx + 1}.</span> {q.question_text}
                </label>
                {renderQuestionInput(q)}
              </div>
            ))}
            <ActionButton type="submit" variant="accent" loading={isSubmitting} className="h-14 text-lg shadow-lg">Отправить ответы</ActionButton>
        </form>
      </div>
    </div>
  );
}