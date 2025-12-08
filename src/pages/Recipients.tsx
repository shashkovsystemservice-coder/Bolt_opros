import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { DashboardLayout } from '../components/DashboardLayout';
import { SurveyTemplate, SurveyRecipient } from '../types/database';
import { generateCode } from '../utils/generateCode';
import { getBaseUrl } from '../utils/urls';
import {
  Plus,
  Copy,
  Mail,
  Send,
  Clock,
  Eye,
  CheckCircle2,
  Building2,
  User,
  Phone,
  FileText,
  X,
  Link as LinkIcon,
} from 'lucide-react';

export function Recipients() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [survey, setSurvey] = useState<SurveyTemplate | null>(null);
  const [recipients, setRecipients] = useState<SurveyRecipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRecipient, setNewRecipient] = useState({
    companyName: '',
    email: '',
    phone: '',
    contactPerson: '',
    additionalInfo: '',
  });

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    if (!id) return;

    const [surveyRes, recipientsRes] = await Promise.all([
      supabase.from('survey_templates').select('*').eq('id', id).single(),
      supabase
        .from('survey_recipients')
        .select('*')
        .eq('survey_template_id', id)
        .order('created_at', { ascending: false }),
    ]);

    if (surveyRes.data) setSurvey(surveyRes.data);
    if (recipientsRes.data) setRecipients(recipientsRes.data);
    setLoading(false);
  };

  const stats = {
    total: recipients.length,
    sent: recipients.filter((r) => r.sent_at).length,
    opened: recipients.filter((r) => r.opened_at).length,
    submitted: recipients.filter((r) => r.submitted_at).length,
  };

  const handleAddRecipient = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newRecipient.email && !newRecipient.phone) {
      alert('Укажите email или телефон');
      return;
    }

    const recipientCode = generateCode(6);

    const { error } = await supabase.from('survey_recipients').insert({
      survey_template_id: id!,
      company_name: newRecipient.companyName || null,
      email: newRecipient.email || null,
      phone: newRecipient.phone || null,
      contact_person: newRecipient.contactPerson || null,
      additional_info: newRecipient.additionalInfo || null,
      recipient_code: recipientCode,
    });

    if (error) {
      alert('Ошибка при добавлении получателя');
      return;
    }

    setShowAddModal(false);
    setNewRecipient({
      companyName: '',
      email: '',
      phone: '',
      contactPerson: '',
      additionalInfo: '',
    });
    loadData();
  };

  const copyLink = async (code: string, recipientId: string) => {
    const link = `${getBaseUrl()}/survey/${code}`;
    await navigator.clipboard.writeText(link);

    await supabase
      .from('survey_recipients')
      .update({ sent_at: new Date().toISOString(), sent_via: 'manual' })
      .eq('id', recipientId);

    loadData();
  };

  const sendWhatsApp = async (phone: string, code: string, recipientId: string) => {
    const link = `${getBaseUrl()}/survey/${code}`;
    const message = `Здравствуйте! Пожалуйста, заполните наш опрос: ${link}`;
    window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');

    await supabase
      .from('survey_recipients')
      .update({ sent_at: new Date().toISOString(), sent_via: 'whatsapp' })
      .eq('id', recipientId);

    loadData();
  };

  const sendEmail = async (email: string, code: string, recipientId: string) => {
    const link = `${getBaseUrl()}/survey/${code}`;
    const subject = survey?.title || 'Опрос';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #1F1F1F; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #1A73E8 0%, #0D47A1 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 24px; }
            .content { background: white; padding: 30px; border: 1px solid #E8EAED; border-top: none; border-radius: 0 0 12px 12px; }
            .button { display: inline-block; background: #1A73E8; color: white; padding: 14px 32px; text-decoration: none; border-radius: 24px; font-weight: 500; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #5F6368; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${subject}</h1>
            </div>
            <div class="content">
              <p>Здравствуйте!</p>
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

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`;
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: email,
          subject: subject,
          html: html,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 503) {
          alert('Сервис отправки email не настроен. Используйте почтовый клиент.');
          const mailtoSubject = encodeURIComponent(subject);
          const mailtoBody = encodeURIComponent(`Здравствуйте!\n\nПожалуйста, заполните наш опрос:\n${link}`);
          window.open(`mailto:${email}?subject=${mailtoSubject}&body=${mailtoBody}`, '_blank');
        } else {
          throw new Error(result.error || 'Ошибка отправки email');
        }
      } else {
        alert('Email успешно отправлен!');
      }

      await supabase
        .from('survey_recipients')
        .update({ sent_at: new Date().toISOString(), sent_via: 'email' })
        .eq('id', recipientId);

      loadData();
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Ошибка при отправке email. Попробуйте позже.');
    }
  };

  const getStatusIcon = (recipient: SurveyRecipient) => {
    if (recipient.submitted_at) return <CheckCircle2 className="w-4 h-4 text-green-600" strokeWidth={2} />;
    if (recipient.opened_at) return <Eye className="w-4 h-4 text-blue-600" strokeWidth={2} />;
    if (recipient.sent_at) return <Send className="w-4 h-4 text-purple-600" strokeWidth={2} />;
    return <Clock className="w-4 h-4 text-gray-400" strokeWidth={2} />;
  };

  const getStatusText = (recipient: SurveyRecipient) => {
    if (recipient.submitted_at) return 'Заполнено';
    if (recipient.opened_at) return 'Открыто';
    if (recipient.sent_at) return 'Отправлено';
    return 'Не отправлено';
  };

  const getStatusDate = (recipient: SurveyRecipient) => {
    const date = recipient.submitted_at || recipient.opened_at || recipient.sent_at;
    if (!date) return '';
    return new Date(date).toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-[#5F6368]">Загрузка...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-medium text-[#1F1F1F] tracking-tight mb-2">{survey?.title}</h1>
          <p className="text-[#5F6368]">Управление получателями опроса</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E8EAED] p-6 mb-6">
          <div className="flex items-center gap-2 text-sm text-[#5F6368] mb-3">
            <LinkIcon className="w-4 h-4" strokeWidth={2} />
            Общая ссылка на опрос
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={`${getBaseUrl()}/survey/${survey?.unique_code}`}
              readOnly
              className="flex-1 h-12 px-4 border border-[#E8EAED] rounded-lg bg-[#F8F9FA] text-[#1F1F1F]"
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText(
                  `${getBaseUrl()}/survey/${survey?.unique_code}`
                );
              }}
              className="flex items-center gap-2 px-6 h-12 bg-[#1A73E8] text-white rounded-full hover:bg-[#1557B0] transition-colors font-medium"
            >
              <Copy className="w-4 h-4" strokeWidth={2} />
              Копировать
            </button>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl border border-[#E8EAED] p-6">
            <div className="text-sm text-[#5F6368] mb-2">Всего получателей</div>
            <div className="text-3xl font-medium text-[#1F1F1F]">{stats.total}</div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E8EAED] p-6">
            <div className="text-sm text-[#5F6368] mb-2">Отправлено</div>
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-medium text-[#1F1F1F]">{stats.sent}</div>
              <div className="text-sm text-[#5F6368]">
                {stats.total > 0 ? Math.round((stats.sent / stats.total) * 100) : 0}%
              </div>
            </div>
            {stats.total > 0 && (
              <div className="mt-3 h-2 bg-[#F8F9FA] rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full transition-all"
                  style={{ width: `${(stats.sent / stats.total) * 100}%` }}
                />
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-[#E8EAED] p-6">
            <div className="text-sm text-[#5F6368] mb-2">Открыто</div>
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-medium text-[#1F1F1F]">{stats.opened}</div>
              <div className="text-sm text-[#5F6368]">
                {stats.total > 0 ? Math.round((stats.opened / stats.total) * 100) : 0}%
              </div>
            </div>
            {stats.total > 0 && (
              <div className="mt-3 h-2 bg-[#F8F9FA] rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${(stats.opened / stats.total) * 100}%` }}
                />
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-[#E8EAED] p-6">
            <div className="text-sm text-[#5F6368] mb-2">Заполнено</div>
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-medium text-[#1F1F1F]">{stats.submitted}</div>
              <div className="text-sm text-[#5F6368]">
                {stats.total > 0 ? Math.round((stats.submitted / stats.total) * 100) : 0}%
              </div>
            </div>
            {stats.total > 0 && (
              <div className="mt-3 h-2 bg-[#F8F9FA] rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all"
                  style={{ width: `${(stats.submitted / stats.total) * 100}%` }}
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-medium text-[#1F1F1F]">Получатели</h2>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-[#1A73E8] text-white px-6 py-3 rounded-full font-medium hover:bg-[#1557B0] transition-all"
          >
            <Plus className="w-5 h-5" strokeWidth={2} />
            Добавить получателя
          </button>
        </div>

        {recipients.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E8EAED] p-12 text-center">
            <div className="w-16 h-16 bg-[#E8F0FE] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-[#1A73E8]" strokeWidth={2} />
            </div>
            <h3 className="text-lg font-medium text-[#1F1F1F] mb-2">Нет получателей</h3>
            <p className="text-[#5F6368] mb-6">Добавьте получателей для отправки опроса</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 bg-[#1A73E8] text-white px-6 py-3 rounded-full font-medium hover:bg-[#1557B0] transition-all"
            >
              <Plus className="w-5 h-5" strokeWidth={2} />
              Добавить получателя
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {recipients.map((recipient) => (
              <div key={recipient.id} className="bg-white rounded-2xl border border-[#E8EAED] p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {recipient.company_name && (
                        <>
                          <Building2 className="w-4 h-4 text-[#5F6368]" strokeWidth={2} />
                          <span className="font-medium text-[#1F1F1F]">{recipient.company_name}</span>
                        </>
                      )}
                    </div>
                    {recipient.email && (
                      <div className="text-sm text-[#5F6368]">{recipient.email}</div>
                    )}
                    {recipient.phone && (
                      <div className="text-sm text-[#5F6368]">{recipient.phone}</div>
                    )}
                    {recipient.contact_person && (
                      <div className="text-sm text-[#5F6368]">Контакт: {recipient.contact_person}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {getStatusIcon(recipient)}
                    <span className="text-[#5F6368]">{getStatusText(recipient)}</span>
                  </div>
                </div>

                {getStatusDate(recipient) && (
                  <div className="text-xs text-[#5F6368] mb-3">{getStatusDate(recipient)}</div>
                )}

                <div className="text-xs text-[#5F6368] mb-3 font-mono bg-[#F8F9FA] px-3 py-2 rounded-lg">
                  {getBaseUrl()}/survey/{recipient.recipient_code}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => copyLink(recipient.recipient_code, recipient.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[#F8F9FA] rounded-lg text-sm font-medium text-[#1F1F1F] hover:bg-[#E8EAED] transition-colors"
                    title="Копировать ссылку"
                  >
                    <Copy className="w-4 h-4" strokeWidth={2} />
                    Копировать
                  </button>
                  {recipient.phone && (
                    <button
                      onClick={() => sendWhatsApp(recipient.phone!, recipient.recipient_code, recipient.id)}
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-green-50 rounded-lg text-sm font-medium text-green-700 hover:bg-green-100 transition-colors"
                      title="Отправить в WhatsApp"
                    >
                      <Send className="w-4 h-4" strokeWidth={2} />
                    </button>
                  )}
                  {recipient.email && (
                    <button
                      onClick={() => sendEmail(recipient.email!, recipient.recipient_code, recipient.id)}
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 rounded-lg text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                      title="Отправить Email"
                    >
                      <Mail className="w-4 h-4" strokeWidth={2} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full">
            <div className="p-6 border-b border-[#E8EAED] flex items-center justify-between">
              <h3 className="text-xl font-medium text-[#1F1F1F]">Добавить получателя</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-[#F8F9FA] rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-[#5F6368]" strokeWidth={2} />
              </button>
            </div>

            <form onSubmit={handleAddRecipient} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1F1F1F] mb-2">
                  Название компании / Имя
                </label>
                <input
                  type="text"
                  value={newRecipient.companyName}
                  onChange={(e) => setNewRecipient({ ...newRecipient, companyName: e.target.value })}
                  className="w-full h-12 px-4 border border-[#E8EAED] rounded-lg focus:outline-none focus:border-[#1A73E8] transition-colors"
                  placeholder="ООО Компания"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1F1F1F] mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={newRecipient.email}
                  onChange={(e) => setNewRecipient({ ...newRecipient, email: e.target.value })}
                  className="w-full h-12 px-4 border border-[#E8EAED] rounded-lg focus:outline-none focus:border-[#1A73E8] transition-colors"
                  placeholder="email@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1F1F1F] mb-2">
                  Телефон
                </label>
                <input
                  type="tel"
                  value={newRecipient.phone}
                  onChange={(e) => setNewRecipient({ ...newRecipient, phone: e.target.value })}
                  className="w-full h-12 px-4 border border-[#E8EAED] rounded-lg focus:outline-none focus:border-[#1A73E8] transition-colors"
                  placeholder="+7 (999) 123-45-67"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1F1F1F] mb-2">
                  Контактное лицо
                </label>
                <input
                  type="text"
                  value={newRecipient.contactPerson}
                  onChange={(e) => setNewRecipient({ ...newRecipient, contactPerson: e.target.value })}
                  className="w-full h-12 px-4 border border-[#E8EAED] rounded-lg focus:outline-none focus:border-[#1A73E8] transition-colors"
                  placeholder="Иван Иванов"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1F1F1F] mb-2">
                  Дополнительная информация
                </label>
                <textarea
                  value={newRecipient.additionalInfo}
                  onChange={(e) => setNewRecipient({ ...newRecipient, additionalInfo: e.target.value })}
                  className="w-full px-4 py-3 border border-[#E8EAED] rounded-lg focus:outline-none focus:border-[#1A73E8] transition-colors resize-none"
                  rows={3}
                  placeholder="Дополнительные заметки"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 h-12 border border-[#E8EAED] text-[#1F1F1F] rounded-full font-medium hover:bg-[#F8F9FA] transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="flex-1 h-12 bg-[#1A73E8] text-white rounded-full font-medium hover:bg-[#1557B0] transition-colors"
                >
                  Добавить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
