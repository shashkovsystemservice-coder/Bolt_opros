
import { useEffect, useState, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { SurveyTemplate, QuestionTemplate, SurveyRecipient } from '../types/database';
import { InteractiveSurveyChat } from '../components/InteractiveSurveyChat';
import { ClipboardList, CheckCircle2, Download, Eye, User, Mail, Building, Lock, AlertTriangle, Loader2, FileSpreadsheet, FileText } from 'lucide-react';
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

const SubmittedState = ({ survey, questions, answers, recipient }: { survey: SurveyTemplate, questions: QuestionTemplate[], answers: Record<string, string>, recipient: SurveyRecipient | null }) => {

    const getHtmlContent = () => {
        const respondentIdentifier = recipient?.contact_person || recipient?.email || 'Аноним';
        const submissionDate = new Date(recipient?.submitted_at || Date.now()).toLocaleString('ru-RU');

        return `
            <!DOCTYPE html>
            <html lang="ru">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${survey.title}</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; line-height: 1.6; color: #333; background-color: #fff; }
                    .container { max-width: 800px; margin: 2rem auto; padding: 0 1rem; }
                    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; border-bottom: 1px solid #eee; padding-bottom: 1rem; }
                    .logo { font-size: 1.5rem; font-weight: bold; color: #333; }
                    h1 { color: #111; font-size: 1.8rem; margin: 0; }
                    .meta-info { background-color: #f7f7f7; border: 1px solid #ddd; border-radius: 8px; padding: 1rem; margin-bottom: 2rem; font-size: 0.9rem; }
                    .meta-info div { margin-bottom: 0.5rem; }
                    table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
                    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; vertical-align: top; word-wrap: break-word; }
                    th { background-color: #f7f7f7; font-weight: bold; }
                    td:first-child { width: 40%; font-weight: 500; }
                    .footer { text-align: center; margin-top: 3rem; font-size: 0.8rem; color: #888; }
                    @media print {
                        body { margin: 0; font-size: 10pt; }
                        .container { margin: 1.5rem; padding: 0; max-width: 100%; }
                        .header, .footer { border: none; }
                        table { page-break-inside: auto; }
                        tr { page-break-inside: avoid; page-break-after: auto; }
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>${survey.title}</h1>
                        <div class="logo">Survey Pro</div>
                    </div>
                    <div class="meta-info">
                        <div><strong>Респондент:</strong> ${respondentIdentifier}</div>
                        <div><strong>Дата:</strong> ${submissionDate}</div>
                    </div>
                    <h2>Ваши ответы:</h2>
                    <table>
                        <thead><tr><th>Вопрос</th><th>Ответ</th></tr></thead>
                        <tbody>
                            ${questions.map(q => `
                                <tr>
                                    <td>${q.question_text}</td>
                                    <td>${answers[q.id] || 'Не отвечен'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <div class="footer">Создано с помощью Survey Pro</div>
                </div>
            </body>
            </html>`;
    };

    const handleExportPdf = () => {
      if (!survey) {
        toast.error('Данные опроса не загружены');
        return;
      }
      generateSurveyFormPdf(survey, questions, answers, recipient);
    };

    const handleDownloadHtml = () => {
        const blob = new Blob([getHtmlContent()], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `survey_results_${survey.unique_code}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("Загрузка HTML началась");
    };

    const handleDownloadCsv = () => {
        const escapeCsvCell = (cell) => {
            if (cell === null || cell === undefined) return '';
            const str = String(cell);
            if (str.includes(';') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };

        const respondentIdentifier = recipient?.contact_person || recipient?.email || 'Аноним';
        const submissionDate = new Date(recipient?.submitted_at || Date.now()).toLocaleString('ru-RU');

        const metaRows = [
            `"Респондент";"${escapeCsvCell(respondentIdentifier)}"`, 
            `"Дата";"${escapeCsvCell(submissionDate)}"`
        ];
        const headers = ['"Вопрос"', '"Ответ"'].join(';');
        const dataRows = questions.map(q => {
            const question = escapeCsvCell(q.question_text);
            const answer = escapeCsvCell(answers[q.id] || 'Не отвечен');
            return [question, answer].join(';');
        });

        const csvContent = '\uFEFF' + metaRows.join('\n') + '\n\n' + headers + '\n' + dataRows.join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        a.href = url;
        a.download = `survey_results_${survey.unique_code}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("Загрузка CSV началась");
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="bg-surface rounded-lg border border-border p-6 sm:p-8 max-w-lg w-full text-center">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-6" strokeWidth={1.5}/>
                <h2 className="text-2xl font-semibold text-text-primary mb-2">{survey.title}</h2>
                <p className="text-text-secondary mb-8">{survey.completion_settings?.thank_you_message || 'Ваши ответы успешно отправлены!'}</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                    <ActionButton onClick={handleDownloadHtml} variant='primary' className="text-xs px-2">
                        <Download className="w-4 h-4 mr-2" />
                        HTML
                    </ActionButton>
                     <ActionButton onClick={handleDownloadCsv} variant='primary' className="text-xs px-2">
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        CSV (Excel)
                    </ActionButton>
                    <ActionButton onClick={handleExportPdf} variant='primary' className="text-xs px-2">
                        <FileText className="w-4 h-4 mr-2" />
                        PDF
                    </ActionButton>
                </div>

                <button onClick={() => window.close()} className="w-full h-11 text-text-secondary font-medium hover:bg-background rounded-md border border-border transition-colors">Закрыть</button>
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
        let surveyData: SurveyTemplate | null = null;

        if (recipientCode) {
            const { data, error } = await supabase.from('survey_recipients').select('*').eq('recipient_code', recipientCode).single();
            if (error || !data) throw new Error('Ссылка недействительна или устарела.');
            if (data.submitted_at && !isPreviewMode) { setAlreadySubmitted(true); return; }
            
            setRecipient(data);
            if (!data.opened_at && !isPreviewMode) {
                await supabase.from('survey_recipients').update({ opened_at: new Date().toISOString() }).eq('id', data.id);
            }
            const { data: sData, error: sError } = await supabase.from('survey_templates').select('*').eq('id', data.survey_template_id).single();
            if (sError || !sData) throw new Error('Связанный опрос не найден.');
            surveyData = sData;

        } else if (surveyId) {
            const { data, error } = await supabase.from('survey_templates').select('*').eq('unique_code', surveyId).single();
            if (error || !data) throw new Error('Опрос не найден или ссылка некорректна.');
            surveyData = data;
            if (!isPreviewMode) {
                setIsIdentificationStep(true);
            }
        } else {
            throw new Error('Некорректная ссылка на опрос.');
        }

        if (!surveyData.is_active && !isPreviewMode) throw new Error('Этот опрос в данный момент неактивен.');
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
    if (!respondentInfo.email && !respondentInfo.name) { toast.error("Пожалуйста, укажите имя или email."); return; }
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.from('survey_recipients').insert({ 
        survey_template_id: survey!.id, 
        company_id: survey!.company_id, 
        contact_person: respondentInfo.name.trim() || 'Аноним', 
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
        toast.error(`Не удалось начать опрос: ${err.message}`);
    } finally { setIsSubmitting(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPreview) { toast.info("Отправка ответов отключена в режиме предпросмотра."); return; }
    for (const q of questions) {
      if (q.is_required && !answers[q.id]) { toast.error(`Ответьте на обязательный вопрос: "${q.question_text}"`); return; }
    }
    setIsSubmitting(true);
    try {
        const { data: submission, error: submissionError } = await supabase.from('survey_submissions').insert({ survey_template_id: survey!.id, recipient_id: recipient?.id, respondent_email: recipient?.email, survey_title: survey!.title }).select().single();
        if (submissionError) throw submissionError;

        const answersToInsert = questions.map(q => ({ submission_id: submission.id, question_template_id: q.id, question_text: q.question_text, answer_text: answers[q.id] || null }));
        const { error: answersError } = await supabase.from('submission_answers').insert(answersToInsert);
        if (answersError) throw answersError;
        
        if (recipient) {
            const { data: updatedRecipient } = await supabase.from('survey_recipients').update({ submitted_at: new Date().toISOString() }).eq('id', recipient.id).select().single();
            setRecipient(updatedRecipient);
        }
        setSubmitted(true);
    } catch (err: any) { toast.error(err.message || 'Ошибка при отправке ответов');
    } finally { setIsSubmitting(false); }
  };

  const renderQuestionInput = (q: QuestionTemplate) => {
    const type = q.question_type;
    const value = answers[q.id] || '';
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setAnswers({ ...answers, [q.id]: e.target.value });
    const handleButtonChange = (val: string) => setAnswers({ ...answers, [q.id]: val });

    switch (type) {
        case 'number':
            return <input type="number" value={value} onChange={handleChange} className="w-full h-10 px-3 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/80" placeholder="0" required={q.is_required} />;
        case 'email':
            return <input type="email" value={value} onChange={handleChange} className="w-full h-10 px-3 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/80" placeholder="email@example.com" required={q.is_required} />;
        
        case 'rating':
        case 'scale': // Legacy support
            return <div className="flex flex-wrap gap-2 pt-2">{[...Array(10)].map((_, i) => i + 1).map(r => (<button key={r} type="button" onClick={() => handleButtonChange(String(r))} className={`w-10 h-10 rounded-md font-medium transition-all text-sm ${value === String(r) ? 'bg-primary text-on-primary scale-110' : 'bg-background border border-border hover:bg-surface'}`}>{r}</button>))}</div>;

        case 'choice':
        case 'radio': // Legacy support
        case 'checkbox': // Legacy support
            if (q.choice_options && q.choice_options.length > 0) {
                return <div className="space-y-2 pt-1">{q.choice_options.map(opt => (<label key={opt} className={`flex items-center gap-3 p-3 border border-border rounded-md cursor-pointer hover:bg-surface transition-colors has-[:checked]:bg-primary/10 has-[:checked]:border-primary`}><input type="radio" name={q.id} value={opt} checked={value === opt} onChange={handleChange} className="w-4 h-4 text-primary border-gray-300 focus:ring-primary/50" required={q.is_required} /><span className="text-text-primary text-sm font-medium">{opt}</span></label>))}</div>;
            }
            return <FallbackTextarea value={value} onChange={handleChange} isRequired={q.is_required} />;

        case 'text':
        default: // Fallback for any unknown types
            return <FallbackTextarea value={value} onChange={handleChange} isRequired={q.is_required} />;
    }
  }


  // --- Render Logic ---
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={() => loadData(new URLSearchParams(location.search).get('code'), surveyIdFromUrl, isPreview)} />;
  if (alreadySubmitted) return <ErrorState message="Вы уже отправляли свои ответы. Повторное прохождение не допускается." />;
  if (submitted) return <SubmittedState survey={survey!} questions={questions} answers={answers} recipient={recipient} />;

  if (isIdentificationStep) {
      return (
          <div className="min-h-screen bg-background py-12 px-4 flex items-center justify-center">
            <div className="max-w-md w-full space-y-8">
              <div className="text-center"><ClipboardList className="w-12 h-12 text-primary mx-auto mb-4" strokeWidth={1.5} /><h1 className="text-2xl font-semibold text-text-primary">{survey?.title}</h1>{survey?.description && <p className="text-text-secondary mt-2">{survey.description}</p>}</div>
              <div className="bg-surface rounded-lg border border-border p-8"><h2 className="text-xl font-semibold text-center text-text-primary mb-6">Представьтесь, чтобы продолжить</h2><form onSubmit={handleIdentificationSubmit} className="space-y-4"><FormInput icon={<User size={18}/>} type="text" value={respondentInfo.name} onChange={(e) => setRespondentInfo({ ...respondentInfo, name: e.target.value })} placeholder="Ваше ФИО" required /><FormInput icon={<Mail size={18}/>} type="email" value={respondentInfo.email} onChange={(e) => setRespondentInfo({ ...respondentInfo, email: e.target.value })} placeholder="Ваш Email" /><FormInput icon={<Building size={18}/>} type="text" value={respondentInfo.company} onChange={(e) => setRespondentInfo({ ...respondentInfo, company: e.target.value })} placeholder="Название компании"/><div className="pt-2"><ActionButton variant="accent" type="submit" loading={isSubmitting}>{isSubmitting ? "Загрузка..." : "Начать опрос"}</ActionButton></div></form></div>
            </div>
          </div>
      );
  }

  if (survey?.is_interactive && recipient && !isPreview) {
    return <InteractiveSurveyChat survey={survey} questions={questions} recipient={recipient} />;
  }
  
  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <header className="bg-surface rounded-lg border border-border p-6 mb-6"><div className="flex items-center gap-4"><ClipboardList className="w-8 h-8 text-primary flex-shrink-0" strokeWidth={1.5} /><div><h1 className="text-2xl font-semibold text-text-primary">{survey?.title}</h1>{survey?.description && (<p className="text-text-secondary mt-1">{survey.description}</p>)}</div></div>{(recipient && !isPreview) && (<div className="mt-4 bg-primary/10 rounded-md p-3 text-sm text-primary/80">Опрос для: <strong>{recipient.contact_person || recipient.email}</strong></div>)}</header>
        
        {isPreview && (<div className="border-l-4 border-primary bg-primary/10 text-primary/80 p-4 mb-6 rounded-r-md flex items-center gap-3"><Eye className="w-5 h-5"/><p className="text-sm font-medium">Режим предпросмотра. Отправка ответов отключена.</p></div>)}

        <form onSubmit={handleSubmit} className="space-y-4">
         <fieldset disabled={isPreview} className="space-y-4">
            {questions.map((q, idx) => (
              <div key={q.id} className="bg-surface rounded-lg border border-border p-6">
                <label className="block mb-3 text-base font-medium text-text-primary"><span>{idx + 1}.</span> {q.question_text}{q.is_required && (<span className="text-red-500 ml-1">*</span>)}</label>
                {renderQuestionInput(q)}
              </div>
            ))}
            <div className="pt-2"><ActionButton type="submit" loading={isSubmitting}>{isSubmitting ? 'Отправка...' : 'Отправить ответы'}</ActionButton></div>
          </fieldset>
        </form>
      </div>
    </div>
  );
}
