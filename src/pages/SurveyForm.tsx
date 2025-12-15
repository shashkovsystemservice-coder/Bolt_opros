
import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { InteractiveSurveyChat } from '../components/InteractiveSurveyChat';
import { ClipboardList, CheckCircle2, AlertTriangle, Eye } from 'lucide-react';

// Определяем типы для данных, которые мы будем загружать
interface SurveyInvitation {
  id: string; 
  status: 'pending' | 'completed';
  recipient_email: string | null;
  survey_template_id: string;
  survey_templates: {
    id: string;
    title: string;
    description: string | null;
    is_interactive: boolean;
    is_active: boolean;
  } | null;
}

interface QuestionTemplate {
  id: string;
  question_text: string;
  question_type: 'text' | 'number' | 'email' | 'rating' | 'choice';
  is_required: boolean;
  choice_options: string[] | null;
}

export function SurveyForm() {
  // Используем `token` из URL, как и договаривались
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  // Состояния компонента
  const [invitation, setInvitation] = useState<SurveyInvitation | null>(null);
  const [questions, setQuestions] = useState<QuestionTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isPreview, setIsPreview] = useState(false); // Для режима предпросмотра

  // Состояние для хранения ответов пользователя
  const [answers, setAnswers] = useState<Record<string, string>>({});
  // Email, который будет сохранен с ответами
  const [respondentEmail, setRespondentEmail] = useState('');

  const survey = useMemo(() => invitation?.survey_templates, [invitation]);

  useEffect(() => {
    const loadSurveyData = async () => {
      if (!token) {
        setError('Неверная ссылка на опрос.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      // Загружаем приглашение и связанный с ним шаблон опроса одним запросом
      const { data: invData, error: invError } = await supabase
        .from('survey_invitations')
        .select(`
          id, 
          status, 
          recipient_email, 
          survey_template_id,
          survey_templates (id, title, description, is_interactive, is_active)
        `)
        .eq('unique_token', token)
        .single();

      if (invError || !invData) {
        // Если не нашли, возможно это предпросмотр по ID шаблона
        const { data: previewData, error: previewError } = await supabase
          .from('survey_templates')
          .select('*')
          .eq('id', token)
          .single();
        
        if (previewData) {
          setIsPreview(true);
          // @ts-ignore
          setInvitation({ survey_templates: previewData });
        } else {
          setError('Ссылка на опрос недействительна, устарела или не существует.');
          setLoading(false);
          return;
        }
      } else {
        setInvitation(invData as SurveyInvitation);
      }
      
      const currentInvitation = (invData || { survey_templates: null }) as SurveyInvitation;
      const surveyId = currentInvitation.survey_template_id || (isPreview ? token : null);
      const surveyData = isPreview ? (currentInvitation as any).survey_templates : currentInvitation.survey_templates;
      
      // Проверки для реального опроса (не предпросмотра)
      if (!isPreview) {
        if (invData.status === 'completed') {
          setError('Вы уже прошли этот опрос. Спасибо!');
          setLoading(false);
          return;
        }
        if (!surveyData?.is_active) {
            setError('Этот опрос в данный момент неактивен.');
            setLoading(false);
            return;
        }
        if (invData.recipient_email) {
            setRespondentEmail(invData.recipient_email);
        }
      }

      // Загружаем вопросы для данного опроса
      const { data: questionsData, error: questionsError } = await supabase
        .from('question_templates')
        .select('*')
        .eq('survey_template_id', surveyId)
        .order('question_order');

      if (questionsError || !questionsData) {
        setError('Не удалось загрузить вопросы для этого опроса.');
      } else {
        setQuestions(questionsData);
      }

      setLoading(false);
    };

    loadSurveyData();
  }, [token, navigate, isPreview]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPreview) return; // Защита от отправки в режиме предпросмотра
    setError('');

    // 1. Валидация
    for (const question of questions) {
      if (question.is_required && !answers[question.id]?.trim()) {
        setError(`Пожалуйста, ответьте на обязательный вопрос: "${question.question_text}"`);
        return;
      }
    }

    // 2. Подготовка данных для отправки
    const responsesToInsert = questions
      .map(q => ({
        invitation_id: invitation!.id,
        question_template_id: q.id,
        response_value: answers[q.id] || null,
      }))
      .filter(r => r.response_value !== null); // Отправляем только те, на которые есть ответ

    try {
      // 3. Сохранение ответов
      if (responsesToInsert.length > 0) {
        const { error: responsesError } = await supabase
          .from('survey_responses')
          .insert(responsesToInsert);
        if (responsesError) throw responsesError;
      }

      // 4. Обновление статуса приглашения (ИСПРАВЛЕНО)
      const updatePayload: { status: 'completed'; completed_at: string; recipient_email?: string } = {
        status: 'completed',
        completed_at: new Date().toISOString(),
      };
      if (respondentEmail.trim() && !invitation?.recipient_email) {
        updatePayload.recipient_email = respondentEmail.trim();
      }

      const { error: updateError } = await supabase
        .from('survey_invitations')
        .update(updatePayload)
        .eq('id', invitation!.id);
        
      if (updateError) throw updateError;

      // 5. Показываем экран "Спасибо"
      setSubmitted(true);
    } catch (err: any) {
      console.error('Ошибка при сохранении опроса:', err);
      setError(`Произошла ошибка при сохранении ваших ответов: ${err.message}`);
    }
  };

  // --- Рендеринг компонента ---

  if (loading) {
    return <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center"><div className="text-[#5F6368]">Загрузка опроса...</div></div>;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-[#E8EAED] p-8 max-w-md text-center shadow-sm">
          <div className="text-red-500 mb-4"><AlertTriangle className="w-12 h-12 mx-auto"/></div>
          <h2 className="text-xl font-bold mb-2">Произошла ошибка</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-[#E8EAED] p-8 max-w-md w-full text-center shadow-sm">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-green-600" strokeWidth={2} />
          </div>
          <h2 className="text-2xl font-medium text-[#1F1F1F] mb-3">Спасибо!</h2>
          <p className="text-[#5F6368] mb-8">Ваши ответы успешно сохранены. Вы можете закрыть эту страницу.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl border border-[#E8EAED] p-8 mb-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <ClipboardList className="w-8 h-8 text-[#1A73E8]" strokeWidth={2} />
            <div>
              <h1 className="text-2xl font-medium text-[#1F1F1F] tracking-tight">{survey?.title}</h1>
              {survey?.description && <p className="text-[#5F6368] mt-1">{survey.description}</p>}
            </div>
          </div>
        </div>
        
        {isPreview && (
            <div className="bg-blue-50 border-l-4 border-blue-400 text-blue-800 p-4 mb-6 rounded-r-lg flex items-center gap-3">
                <Eye className="w-5 h-5"/>
                <div>
                    <p className="font-bold">Режим предпросмотра</p>
                    <p className="text-sm">Вы видите, как опрос будет выглядеть для получателей. Отправка ответов отключена.</p>
                </div>
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
         <fieldset disabled={isPreview} className="space-y-4">
            {questions.map((question, idx) => (
              <div key={question.id} className="bg-white rounded-2xl border border-[#E8EAED] p-6 shadow-sm">
                <label className="block mb-4">
                  <div className="flex items-start gap-2 mb-3">
                    <span className="text-sm font-medium text-[#5F6368]">{idx + 1}.</span>
                    <div className="flex-1">
                      <span className="text-[#1F1F1F] font-medium">{question.question_text}</span>
                      {question.is_required && <span className="text-red-500 ml-1">*</span>}
                    </div>
                  </div>

                  {question.question_type === 'text' && (
                    <input type="text" value={answers[question.id] || ''} onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })} className="w-full h-12 px-4 border border-[#E8EAED] rounded-lg focus:outline-none focus:border-[#1A73E8] transition-colors disabled:bg-slate-50" placeholder="Ваш ответ" required={question.is_required} />
                  )}

                  {question.question_type === 'number' && (
                    <input type="number" value={answers[question.id] || ''} onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })} className="w-full h-12 px-4 border border-[#E8EAED] rounded-lg focus:outline-none focus:border-[#1A73E8] transition-colors disabled:bg-slate-50" placeholder="0" required={question.is_required} />
                  )}

                  {question.question_type === 'email' && (
                     <input type="email" value={answers[question.id] || ''} onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })} className="w-full h-12 px-4 border border-[#E8EAED] rounded-lg focus:outline-none focus:border-[#1A73E8] transition-colors disabled:bg-slate-50" placeholder="email@example.com" required={question.is_required} />
                  )}

                  {question.question_type === 'rating' && (
                    <div className="flex gap-2 flex-wrap">
                      {[...Array(10)].map((_, i) => i + 1).map(rating => (
                        <button key={rating} type="button" onClick={() => setAnswers({ ...answers, [question.id]: String(rating) })} className={`w-12 h-12 rounded-lg font-medium transition-all ${answers[question.id] === String(rating) ? 'bg-[#1A73E8] text-white shadow-md' : 'bg-[#F8F9FA] text-[#5F6368] hover:bg-[#E8EAED] disabled:hover:bg-[#F8F9FA]'}`}>{rating}</button>
                      ))}
                    </div>
                  )}

                  {question.question_type === 'choice' && question.choice_options && (
                    <div className="space-y-2">
                      {question.choice_options.map(option => (
                        <label key={option} className="flex items-center gap-3 p-3 border border-[#E8EAED] rounded-lg cursor-pointer hover:bg-[#F8F9FA] transition-colors disabled:bg-slate-50">
                          <input type="radio" name={question.id} value={option} checked={answers[question.id] === option} onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })} className="w-4 h-4 text-[#1A73E8] focus:ring-blue-500" required={question.is_required} />
                          <span className="text-[#1F1F1F]">{option}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </label>
              </div>
            ))}

            {!invitation?.recipient_email && (
                <div className="bg-white rounded-2xl border border-[#E8EAED] p-6 shadow-sm">
                  <label className="block">
                    <span className="text-[#1F1F1F] font-medium mb-3 block">Ваш Email (необязательно)</span>
                    <input type="email" value={respondentEmail} onChange={(e) => setRespondentEmail(e.target.value)} className="w-full h-12 px-4 border border-[#E8EAED] rounded-lg focus:outline-none focus:border-[#1A73E8] transition-colors disabled:bg-slate-50" placeholder="your@email.com" />
                  </label>
              </div>
            )}

            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                {error}
                </div>
            )}

            <button type="submit" className="w-full h-14 bg-[#1A73E8] text-white rounded-full font-medium hover:bg-[#1557B0] transition-all text-lg disabled:bg-gray-400 disabled:cursor-not-allowed">
                Отправить ответы
            </button>
          </fieldset>
        </form>
      </div>
    </div>
  );
}
