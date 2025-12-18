import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { DashboardLayout } from '../components/DashboardLayout';
import { SurveyTemplate, SurveyRecipient } from '../types/database';
import { generateCode } from '../utils/generateCode';
import { getBaseUrl } from '../utils/urls';

export function Recipients() {
  const { id: survey_id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [survey, setSurvey] = useState<SurveyTemplate | null>(null);
  const [recipients, setRecipients] = useState<SurveyRecipient[]>([]);
  const [newRecipient, setNewRecipient] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    async function fetchData() {
      if (!user || !survey_id) {
        setError("Не удалось загрузить данные: пользователь не найден или ID опроса некорректен.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const { data: surveyData, error: surveyError } = await supabase
          .from('survey_templates')
          .select('*')
          .eq('id', survey_id)
          .eq('company_id', user.id)
          .single();

        if (surveyError) throw surveyError;
        if (!surveyData) throw new Error('Опрос не найден.');
        setSurvey(surveyData);

        const { data: recipientsData, error: recipientsError } = await supabase
          .from('survey_recipients')
          .select('*')
          .eq('survey_template_id', survey_id);

        if (recipientsError) throw recipientsError;
        setRecipients(recipientsData || []);

      } catch (err: any) {
        setError(`Ошибка при загрузке данных: ${err.message}`);
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [survey_id, user, authLoading]);

  const handleAddRecipient = async () => {
    if (!newRecipient.trim() || !survey_id || !user) return;

    setError(null);
    const code = generateCode();
    const contactValue = newRecipient.trim();
    const isEmail = contactValue.includes('@');

    const insertPayload: {
      survey_template_id: number;
      company_id: string;
      recipient_name: string;
      recipient_code: string;
      recipient_email?: string;
      recipient_phone?: string;
    } = {
      survey_template_id: parseInt(survey_id),
      company_id: user.id,
      recipient_name: contactValue, // <-- THE FIX
      recipient_code: code,
      [isEmail ? 'recipient_email' : 'recipient_phone']: contactValue,
    };

    const { data, error: insertError } = await supabase
      .from('survey_recipients')
      .insert(insertPayload)
      .select()
      .single();

    if (insertError) {
      setError(`Ошибка при добавлении получателя: ${insertError.message}`);
      console.error(insertError);
    } else if (data) {
      setRecipients([...recipients, data as SurveyRecipient]);
      setNewRecipient('');
    }
  };
  
  const getPersonalLink = (code: string | null | undefined) => {
    if (!survey_id || !code) return '';
    return `${getBaseUrl()}/survey/${survey_id}/?code=${code}`;
  };

  const handleSendEmail = (recipient: SurveyRecipient) => {
    if (!recipient.recipient_email) {
      alert("У этого получателя нет email адреса.");
      return;
    }
    const link = getPersonalLink(recipient.recipient_code);
    if (!link || !survey) return;
    
    const subject = `Приглашение к участию в опросе: ${survey.title}`;
    const emailBody = `
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
                .header { background-color: #f7f7f7; padding: 10px 20px; border-bottom: 1px solid #ddd; }
                .content { padding: 20px; }
                .footer { font-size: 12px; color: #777; text-align: center; padding-top: 20px; }
                .button {
                  display: inline-block;
                  padding: 10px 20px;
                  margin: 20px 0;
                  background-color: #007bff;
                  color: #fff !important;
                  text-decoration: none;
                  border-radius: 5px;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>${subject}</h1>
                </div>
                <div class="content">
                  <p>Здравствуйте, ${recipient.recipient_name || ''}!</p>
                  <p>Мы будем благодарны, если вы уделите несколько минут для заполнения нашего опроса.</p>
                  <p style="text-align: center;">
                    <a href="${link}" class="button">Перейти к опросу</a>
                  </p>
                  <p style="color: #5F6368; font-size: 14px;">Или скопируйте эту ссылку в браузер:<br>${link}</p>
                </div>
                <div class="footer">
                  Это письмо отправлено автоматически, пожалуйста, не отвечайте на него.
                </div>
              </div>
            </body>
          </html>
        `;

    window.location.href = `mailto:${recipient.recipient_email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;
  };

  const handleSendWhatsApp = (recipient: SurveyRecipient) => {
    if (!recipient.recipient_phone) {
        alert("У этого получателя нет номера телефона.");
        return;
    }
    const link = getPersonalLink(recipient.recipient_code);
    if (!link || !survey) return;

    const whatsappMessage = `Здравствуйте, ${recipient.recipient_name || ''}! Приглашаем вас принять участие в опросе "${survey.title}". Пожалуйста, пройдите по ссылке: ${link}`;
    window.open(`https://wa.me/${recipient.recipient_phone.replace(/\D/g, '')}?text=${encodeURIComponent(whatsappMessage)}`, '_blank');
  };


  if (loading) {
    return <DashboardLayout><div className="p-4">Загрузка...</div></DashboardLayout>;
  }

  if (error && !recipients.length) { // Only show full-page error if there's no data to display
    return <DashboardLayout><div className="p-4 text-red-500">{error}</div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="p-6 bg-gray-50 min-h-full">
        <button onClick={() => navigate('/dashboard')} className="mb-4 text-blue-600 hover:underline">
          &larr; Назад к опросам
        </button>
        <h1 className="text-2xl font-bold mb-4">Получатели опроса: {survey?.title}</h1>

        {/* Add Recipient Form */}
        <div className="mb-8 p-4 bg-white shadow rounded">
          <h2 className="text-xl font-semibold mb-3">Добавить получателя</h2>
          {error && <p className="text-red-500 mb-3">{error}</p>}
          <div className="flex gap-2">
            <input
              type="text"
              value={newRecipient}
              onChange={(e) => setNewRecipient(e.target.value)}
              placeholder="Введите email или номер телефона"
              className="flex-grow p-2 border rounded"
            />
            <button
              onClick={handleAddRecipient}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
              disabled={!newRecipient.trim()}
            >
              Добавить
            </button>
          </div>
        </div>

        {/* Recipients List */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Список получателей</h2>
          {recipients.length === 0 ? (
            <p>Получатели еще не добавлены.</p>
          ) : (
            <ul className="space-y-3">
              {recipients.map((recipient) => (
                <li key={recipient.id} className="p-4 bg-white shadow rounded-lg flex items-center justify-between flex-wrap">
                  <div className='mb-2 sm:mb-0'>
                    <p className="font-medium">{recipient.recipient_name}</p>
                     <p className="text-sm text-gray-600">{recipient.recipient_email || recipient.recipient_phone}</p>
                    <a
                      href={getPersonalLink(recipient.recipient_code)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-500 hover:underline break-all"
                    >
                      {getPersonalLink(recipient.recipient_code)}
                    </a>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button 
                      onClick={() => handleSendEmail(recipient)} 
                      className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm disabled:bg-gray-400"
                      disabled={!recipient.recipient_email}
                    >
                      Email
                    </button>
                    <button 
                      onClick={() => handleSendWhatsApp(recipient)} 
                      className="px-3 py-1 bg-teal-500 text-white rounded hover:bg-teal-600 text-sm disabled:bg-gray-400"
                      disabled={!recipient.recipient_phone}
                    >
                      WhatsApp
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
