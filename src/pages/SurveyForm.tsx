
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { SurveyTemplate, QuestionTemplate } from '../types/database';
import { CheckCircle2, Loader2, FileText, Table, UserCircle } from 'lucide-react';
import { toast } from 'sonner';
import { generateSurveyFormPdf, handleExportExcel } from '../lib/pdfExport';

// --- Компонент формы данных респондента ---
const ParticipantInfoForm: React.FC<{ onSubmit: (data: any) => void, survey: any }> = ({ onSubmit, survey }) => {
  const [formData, setFormData] = useState({ name: '', company: '', email: '' });

  const handleStart = () => {
    if (!formData.name) {
      toast.error('Пожалуйста, укажите ваше имя.');
      return;
    }
    onSubmit(formData);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-md w-full shadow-xl">
        <UserCircle className="w-12 h-12 text-primary mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-center mb-2">{survey?.title}</h2>
        <p className="text-gray-500 text-center mb-6">Пожалуйста, представьтесь для начала прохождения</p>
        <div className="space-y-4">
          <input type="text" placeholder="Ваше имя *" className="w-full p-3 border rounded-lg" 
            onChange={e => setFormData({...formData, name: e.target.value})} required />
          <input type="text" placeholder="Компания" className="w-full p-3 border rounded-lg" 
            onChange={e => setFormData({...formData, company: e.target.value})} />
          <input type="email" placeholder="Email" className="w-full p-3 border rounded-lg" 
            onChange={e => setFormData({...formData, email: e.target.value})} />
          <button onClick={handleStart} className="w-full bg-primary text-white p-3 rounded-lg font-bold hover:bg-primary/90">
            Начать опрос
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Компонент экрана завершения с экспортом ---
const SubmittedState: React.FC<{ survey: any, questions: any[], answers: any, participant: any }> = ({ survey, questions, answers, participant }) => {

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-border p-8 max-w-lg w-full text-center shadow-lg">
        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-6" />
        <h2 className="text-2xl font-bold mb-2">Спасибо за участие!</h2>
        <p className="text-gray-500 mb-8">{survey?.completion_settings?.thank_you_message || 'Ваши ответы сохранены'}</p>
        <div className="grid grid-cols-2 gap-4">
          <button onClick={() => generateSurveyFormPdf(survey, questions, answers, participant)} className="flex items-center justify-center gap-2 p-3 border rounded-xl hover:bg-gray-50 font-medium">
            <FileText size={18} /> PDF
          </button>
          <button onClick={() => handleExportExcel(survey, questions, answers)} className="flex items-center justify-center gap-2 p-3 border rounded-xl hover:bg-gray-50 font-medium">
            <Table size={18} /> Excel
          </button>
        </div>
      </div>
    </div>
  );
};

export function SurveyForm({ runId: propRunId, surveyTemplateId }: { runId?: string, surveyTemplateId?: string }) {
  const { id: urlId } = useParams<{ id: string }>();
  const [survey, setSurvey] = useState<SurveyTemplate | null>(null);
  const [questions, setQuestions] = useState<QuestionTemplate[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [participant, setParticipant] = useState({ name: '', email: '', company: '' });
  const [isInfoSubmitted, setIsInfoSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const isUuid = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-12][0-9a-f]{12}$/i.test(val);

  const loadData = useCallback(async () => {
    const targetId = surveyTemplateId || urlId;
    if (!targetId) return;

    try {
      let query = supabase.from('survey_templates').select('*');
      query = isUuid(targetId) ? query.eq('id', targetId) : query.eq('unique_code', targetId);
      
      const { data: sData, error: sErr } = await query.single();
      if (sErr) throw sErr;
      setSurvey(sData);

      const { data: qData, error: qErr } = await supabase.from('question_templates')
        .select('*').eq('survey_template_id', sData.id).order('question_order');
      if (qErr) throw qErr;
      setQuestions(qData || []);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [urlId, surveyTemplateId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleInfoSubmit = (data: any) => {
    setParticipant(data);
    setIsInfoSubmitted(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
        let participantId: string | null = null;

        if (participant.email && participant.email.trim() !== '') {
            const { data: pData, error: pError } = await supabase
                .from('participants')
                .upsert({ 
                    email: participant.email, 
                    first_name: participant.name, 
                    company_name: participant.company,
                    company_id: survey!.company_id
                }, { onConflict: 'email' })
                .select()
                .single();
            if (pError) throw pError;
            participantId = pData.id;
        } else {
            const { data: pData, error: pError } = await supabase
                .from('participants')
                .insert({ 
                    first_name: participant.name, 
                    company_name: participant.company,
                    email: null,
                    company_id: survey!.company_id
                })
                .select()
                .single();
            if (pError) throw pError;
            participantId = pData.id;
        }

        const { data: sub, error: sErr } = await supabase.from('survey_submissions').insert({
            survey_template_id: survey!.id,
            participant_id: participantId,
            respondent_name: participant.name,
            respondent_email: participant.email || null,
            respondent_company: participant.company || null,
            survey_title: survey!.title,
            run_id: propRunId || null,
        }).select().single();
        
        if (sErr) throw sErr;

        const ansPayload = questions.filter(q => q.question_type !== 'section').map(q => ({
            submission_id: sub.id,
            question_template_id: q.id,
            question_text: q.question_text,
            answer_text: answers[q.id] || null
        }));

        await supabase.from('submission_answers').insert(ansPayload);
        setSubmitted(true);
        toast.success('Опрос успешно пройден!');
    } catch (e: any) { 
        console.error("Submit Error:", e);
        toast.error(e.message);
    }
    finally { setIsSubmitting(false); }
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
  if (!isInfoSubmitted && survey?.survey_basis !== 'self_diagnosis') {
    return <ParticipantInfoForm survey={survey} onSubmit={handleInfoSubmit} />;
  }
  if (submitted) return <SubmittedState survey={survey} questions={questions} answers={answers} participant={participant} />;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="bg-white rounded-2xl p-8 border shadow-sm">
          <h1 className="text-3xl font-bold">{survey?.title}</h1>
          <p className="text-gray-500 mt-2">{survey?.description}</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          {questions.map((q, idx) => {
            if (q.question_type === 'section') {
              return (
                <div key={q.id} className="pt-8 pb-4 border-b-2 border-primary/20">
                  <h2 className="text-xl font-bold text-primary uppercase tracking-wide">{q.question_text}</h2>
                </div>
              );
            }

            return (
              <div key={q.id} className="bg-white rounded-2xl p-8 border shadow-sm transition-all hover:shadow-md">
                <label className="block text-lg font-medium mb-6 text-gray-800">
                  <span className="text-primary font-bold mr-2">{idx + 1}.</span> {q.question_text}
                </label>
                {q.question_type === 'rating' ? (
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map(num => (
                      <button type="button" key={num} onClick={() => setAnswers({...answers, [q.id]: String(num)})}
                        className={`flex-grow h-12 rounded-xl border font-bold ${answers[q.id] === String(num) ? 'bg-primary text-white' : 'bg-gray-50'}`}>
                        {num}
                      </button>
                    ))}
                  </div>
                ) : (
                  <textarea className="w-full p-4 bg-gray-50 border rounded-xl" rows={3} 
                    onChange={e => setAnswers({...answers, [q.id]: e.target.value})} />
                )}
              </div>
            );
          })}
          <button type="submit" disabled={isSubmitting} className="w-full h-14 bg-primary text-white rounded-xl font-bold text-lg shadow-lg hover:scale-[1.01] transition-transform">
            {isSubmitting ? <Loader2 className="animate-spin mx-auto" /> : 'Завершить опрос'}
          </button>
        </form>
      </div>
    </div>
  );
}
