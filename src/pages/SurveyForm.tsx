import { useEffect, useState, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { SurveyTemplate, QuestionTemplate, SurveyRecipient, RatingOptions } from '../types/database';
import { InteractiveSurveyChat } from '../components/InteractiveSurveyChat';
import { CheckCircle2, Eye, User, Mail, AlertTriangle, Loader2, FileText, Quote, BarChart3 } from 'lucide-react';
import { generateCode } from '../utils/generateCode';
import { toast } from 'sonner';
import { generateSurveyFormPdf } from '../lib/pdfExport';

// --- UI Компоненты ---
const ActionButton = ({ onClick, children, variant = 'primary', loading = false, disabled = false, className = '' }: any) => {
    const baseClasses = "w-full h-11 inline-flex items-center justify-center font-bold text-sm rounded-xl transition-all duration-200 disabled:opacity-60 focus:outline-none shadow-sm active:scale-[0.98]";
    const variantClasses: any = {
        primary: "bg-white border-2 border-gray-200 text-gray-700 hover:bg-gray-50",
        accent: "bg-indigo-600 text-white hover:bg-indigo-700",
    };
    return (
        <button onClick={onClick} disabled={disabled || loading} className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
            {loading ? <Loader2 className="animate-spin h-5 w-5"/> : children}
        </button>
    );
};

const FormInput = ({ icon, ...props }: any) => (
    <div className="relative group">
        <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-gray-400 group-focus-within:text-indigo-500 transition-colors">{icon}</div>
        <input {...props} className="w-full h-12 pl-11 pr-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:bg-white focus:border-indigo-500 focus:outline-none transition-all" />
    </div>
);

const FallbackTextarea = ({ value, onChange, isRequired }: any) => (
    <textarea 
        value={value} 
        onChange={onChange} 
        className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:bg-white focus:border-indigo-500 focus:outline-none transition-all" 
        placeholder="Введите ваш ответ..." 
        required={isRequired} 
        rows={4}
    />
);

// --- Состояния экрана ---
const LoadingState = () => <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center space-y-4"><Loader2 className="animate-spin h-10 w-10 text-indigo-600" /><p className="text-gray-500 font-medium">Загрузка...</p></div>;

const ErrorState = ({ message, onRetry }: any) => (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl border-2 border-gray-100 p-10 max-w-md w-full text-center shadow-xl">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-6" strokeWidth={2} />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Ошибка</h2>
            <p className="text-gray-500 mb-8 leading-relaxed">{message}</p>
            {onRetry && <ActionButton onClick={onRetry} variant="accent">Обновить</ActionButton>}
        </div>
    </div>
);

// === ЭКРАН ЗАВЕРШЕНИЯ ===
const SubmittedState = ({ survey, questions, answers, recipient, brandName }: any) => {
    const [isFinished, setIsFinished] = useState(false);

    const handleClose = () => {
        window.close();
        setTimeout(() => { if (!window.closed) setIsFinished(true); }, 250);
    };

    const handleExportPdf = () => {
        const formattedAnswers = { ...answers };
        questions.forEach((q: any) => {
            if (q.question_type === 'rating' && answers[q.id] && q.options) {
                formattedAnswers[q.id] = `${answers[q.id]} / ${q.options.scale_max}`;
            }
        });
        generateSurveyFormPdf(survey, questions, formattedAnswers, recipient, brandName);
    };

    if (isFinished) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="text-center animate-in fade-in duration-500">
                    <div className="w-20 h-20 bg-indigo-100 rounded-3xl flex items-center justify-center mx-auto mb-8"><CheckCircle2 className="w-10 h-10 text-indigo-600" /></div>
                    <h2 className="text-3xl font-black text-gray-900 mb-3">Готово!</h2>
                    <p className="text-gray-500">Ответы сохранены. Теперь вы можете закрыть вкладку.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] border-2 border-gray-100 p-10 max-w-lg w-full text-center shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-3 bg-indigo-600"></div>
                <div className="mt-6 mb-8">
                    <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
                    <p className="text-xs font-black text-indigo-500 uppercase tracking-widest">{survey.title}</p>
                </div>
                <div className="my-10 p-8 bg-gray-50 rounded-3xl border-2 border-gray-100 relative">
                    <Quote className="absolute -top-4 -left-2 text-indigo-100 w-16 h-16 -z-10" />
                    <h3 className="text-2xl md:text-3xl font-black text-gray-900 leading-tight">
                        "{survey.completion_settings?.thank_you_message || 'Спасибо за участие!'}"
                    </h3>
                </div>
                <div className="mb-10">
                    <button onClick={handleExportPdf} className="flex items-center justify-center gap-3 mx-auto px-6 py-3 bg-white border-2 border-gray-200 rounded-2xl font-bold text-gray-600 hover:text-indigo-600 transition-all"><FileText size={20} className="text-indigo-500" /> PDF отчет</button>
                </div>
                <button onClick={handleClose} className="w-full h-16 bg-gray-900 text-white font-black rounded-2xl hover:bg-black transition-all shadow-xl text-lg">Закрыть</button>
            </div>
        </div>
    );
};

export function SurveyForm() {
  const { id: surveyIdFromUrl } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const [survey, setSurvey] = useState<SurveyTemplate | null>(null);
  const [questions, setQuestions] = useState<QuestionTemplate[]>([]);
  const [recipient, setRecipient] = useState<SurveyRecipient | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [brandName, setBrandName] = useState('SurveyEngine');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [isIdentificationStep, setIsIdentificationStep] = useState(false);
  const [respondentInfo, setRespondentInfo] = useState({ name: '', email: '' });

  const loadData = useCallback(async (recipientCode: string | null, surveyId: string | undefined, isPreviewMode: boolean) => {
    setLoading(true);
    setError('');
    try {
        const { data: brandData } = await supabase
            .from('system_settings')
            .select('brand_name')
            .single(); 
            
        if (brandData?.brand_name) {
            setBrandName(brandData.brand_name);
        }
        
        let surveyData: SurveyTemplate | null = null;
        if (recipientCode) {
            const { data, error: rError } = await supabase.from('survey_recipients').select('*').eq('recipient_code', recipientCode).maybeSingle();
            if (rError || !data) throw new Error('Ссылка недействительна.');
            if (data.submitted_at && !isPreviewMode) { setAlreadySubmitted(true); return; }
            setRecipient(data);
            const { data: sData } = await supabase.from('survey_templates').select('*, completion_settings').eq('id', data.survey_template_id).single();
            surveyData = sData;
        } else if (surveyId) {
            const { data, error: sError } = await supabase.from('survey_templates').select('*, completion_settings').eq('unique_code', surveyId).maybeSingle();
            if (sError || !data) throw new Error('Опрос не найден.');
            surveyData = data;
            if (surveyData && !isPreviewMode) setIsIdentificationStep(true);
        }
        if (!surveyData) throw new Error('Ошибка данных.');
        setSurvey(surveyData);
        const { data: qData } = await supabase.from('question_templates').select('*').eq('survey_template_id', surveyData.id).order('question_order');
        setQuestions(qData || []);
    } catch (err: any) { 
        console.error("Ошибка загрузки данных:", err);
        setError(err.message); 
    } finally { 
        setLoading(false); 
    }
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
    if (!respondentInfo.name.trim()) { toast.error("Представьтесь."); return; }
    setIsSubmitting(true);
    try {
      const { data, error: iError } = await supabase.from('survey_recipients').insert({ 
        survey_template_id: survey!.id, company_id: survey!.company_id, contact_person: respondentInfo.name.trim(), email: respondentInfo.email.trim() || null, recipient_code: generateCode(), opened_at: new Date().toISOString()
      }).select().single();
      if (iError) throw iError;
      setRecipient(data);
      setIsIdentificationStep(false);
      navigate(`/survey/${survey?.unique_code}?code=${data.recipient_code}`, { replace: true });
    } catch(err: any) { toast.error(err.message); } finally { setIsSubmitting(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPreview) return;
    for (const q of questions) if (q.is_required && !answers[q.id]) { toast.error(`Ответьте на вопрос №${questions.indexOf(q) + 1}`); return; }
    setIsSubmitting(true);
    try {
        const { data: submission, error: subError } = await supabase.from('survey_submissions').insert({ survey_template_id: survey!.id, recipient_id: recipient?.id, respondent_email: recipient?.email, survey_title: survey!.title }).select().single();
        if (subError) throw subError;
        const answersToInsert = questions.map(q => ({ submission_id: submission.id, question_template_id: q.id, question_text: q.question_text, answer_text: answers[q.id] || null }));
        await supabase.from('submission_answers').insert(answersToInsert);
        if (recipient) await supabase.from('survey_recipients').update({ submitted_at: new Date().toISOString() }).eq('id', recipient.id);
        setSubmitted(true);
    } catch (err: any) { toast.error('Ошибка сохранения.'); } finally { setIsSubmitting(false); }
  };

  const renderInput = (q: QuestionTemplate) => {
    const val = answers[q.id] || '';
    const updateAns = (newVal: string) => setAnswers(prev => ({ ...prev, [q.id]: newVal }));

    if (q.question_type === 'rating') {
        const opts = q.options as RatingOptions;
        const scaleMax = opts?.scale_max || 5;
        const scale = Array.from({ length: scaleMax }, (_, i) => i + 1);
        return (
            <div className="space-y-4">
                <div className="flex justify-between text-[11px] font-black text-gray-400 uppercase px-2">
                    <span>{opts?.label_min || 'Минимум'}</span>
                    <span>{opts?.label_max || 'Максимум'}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                    {scale.map(num => (
                        <button key={num} type="button" onClick={() => updateAns(String(num))} className={`flex-1 h-14 min-w-[3.5rem] rounded-2xl font-black text-lg transition-all ${val === String(num) ? 'bg-indigo-600 text-white scale-110 shadow-lg' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}>{num}</button>
                    ))}
                </div>
            </div>
        );
    }
    if (q.question_type === 'choice' && Array.isArray(q.options)) {
        return <div className="space-y-3">{q.options.map(opt => (<label key={opt} className={`flex items-center gap-4 p-5 border-2 rounded-2xl cursor-pointer transition-all ${val === opt ? 'bg-indigo-50 border-indigo-500 text-indigo-900 ring-4 ring-indigo-50' : 'bg-gray-50 border-gray-100 hover:bg-gray-100'}`}><input type="radio" checked={val === opt} onChange={() => updateAns(opt)} className="w-5 h-5 text-indigo-600" /><span className="font-bold text-base">{opt}</span></label>))}</div>;
    }
    return <FallbackTextarea value={val} onChange={(e: any) => updateAns(e.target.value)} isRequired={q.is_required} />;
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;
  if (alreadySubmitted) return <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4"><div className="bg-white rounded-3xl border-2 border-gray-100 p-10 max-w-sm text-center shadow-xl"><BarChart3 className="w-16 h-16 text-amber-500 mx-auto mb-6" /><h2 className="text-xl font-bold mb-2">Пройден</h2><p className="text-gray-500">Спасибо!</p></div></div>;
  if (submitted) return <SubmittedState survey={survey!} questions={questions} answers={answers} recipient={recipient} brandName={brandName} />;

  if (isIdentificationStep) {
      return (
          <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
            <div className="max-w-md w-full bg-white rounded-[2.5rem] border-2 border-gray-100 p-10 shadow-2xl text-center animate-in fade-in duration-500">
              <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto mb-8 text-indigo-600"><BarChart3 size={40} /></div>
              <h2 className="text-[11px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-3">Вход в опрос</h2>
              <h1 className="text-3xl font-black text-gray-900 mb-4 leading-none">{survey?.title}</h1>
              {survey?.description && <p className="text-gray-500 mb-10 leading-relaxed font-medium">{survey.description}</p>}
              <form onSubmit={handleIdentificationSubmit} className="space-y-6 text-left">
                <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase ml-1">Представьтесь</label><FormInput icon={<User size={20}/>} type="text" value={respondentInfo.name} onChange={(e:any) => setRespondentInfo(prev => ({ ...prev, name: e.target.value }))} placeholder="ФИО" required /></div>
                <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase ml-1">Email</label><FormInput icon={<Mail size={20}/>} type="email" value={respondentInfo.email} onChange={(e:any) => setRespondentInfo(prev => ({ ...prev, email: e.target.value }))} placeholder="email@example.com" /></div>
                <div className="pt-4"><ActionButton variant="accent" type="submit" loading={isSubmitting} className="h-16 text-lg font-black">Начать прохождение</ActionButton></div>
              </form>
            </div>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-16 px-4">
      <div className="max-w-2xl mx-auto space-y-10">
        <header className="bg-white rounded-[2rem] border-2 border-gray-100 p-10 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-indigo-500"></div>
            <h1 className="text-4xl font-black text-gray-900 leading-tight mb-3">{survey?.title}</h1>
            {survey?.description && <p className="text-gray-500 text-lg font-medium">{survey.description}</p>}
        </header>
        {isPreview && <div className="bg-indigo-600 text-white rounded-2xl p-4 flex items-center justify-center gap-3 shadow-lg"><Eye size={20} /> <span className="text-sm font-black uppercase tracking-widest">Предпросмотр</span></div>}
        <form onSubmit={handleSubmit} className="space-y-6">
            {questions.map((q, idx) => (
              <div key={q.id} className="bg-white rounded-[2rem] border-2 border-gray-100 p-10 shadow-xl group">
                <label className="block mb-8 text-xl font-black text-gray-900"><span className="inline-block w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg text-sm flex items-center justify-center mr-4 mb-1 align-middle">{idx + 1}</span> {q.question_text}</label>
                {renderInput(q)}
              </div>
            ))}
            {!isPreview && <ActionButton type="submit" variant="accent" loading={isSubmitting} className="h-20 text-xl font-black rounded-[1.5rem]">Отправить</ActionButton>}
        </form>
      </div>
    </div>
  );
}