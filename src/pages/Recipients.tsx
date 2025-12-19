
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { DashboardLayout } from '../components/DashboardLayout';
import { SurveyTemplate, SurveyRecipient } from '../types/database';
import { generateCode } from '../utils/generateCode';
import { getBaseUrl } from '../utils/urls';
import { Plus, Edit, Trash2, Mail, MessageSquare, ArrowLeft, X, Save, User, Building, Phone } from 'lucide-react';

const Recipients = () => {
  const { id: survey_id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [survey, setSurvey] = useState<SurveyTemplate | null>(null);
  const [recipients, setRecipients] = useState<SurveyRecipient[]>([]);
  
  const [selectedRecipient, setSelectedRecipient] = useState<SurveyRecipient | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    company_name: '',
    contact_person: '',
    email: '',
    phone: '',
    additional_info: ''
  });

  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !survey_id) {
      setError("Ошибка: Пользователь или ID опроса не найдены.");
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const { data: surveyData, error: surveyError } = await supabase
          .from('survey_templates')
          .select('*')
          .eq('id', survey_id)
          .eq('company_id', user.id)
          .single();
        if (surveyError) throw surveyError;
        setSurvey(surveyData);

        const { data: recipientsData, error: recipientsError } = await supabase
          .from('survey_recipients')
          .select('*')
          .eq('survey_template_id', survey_id)
          .order('created_at', { ascending: false });
        if (recipientsError) throw recipientsError;
        setRecipients(recipientsData || []);
      } catch (err: any) {
        setError(`Ошибка при загрузке данных: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [survey_id, user, authLoading]);

  const handleSelectRecipient = (recipient: SurveyRecipient) => {
    setSelectedRecipient(recipient);
    setIsEditing(true);
    setFormData({
      company_name: recipient.company_name || '',
      contact_person: recipient.contact_person || '',
      email: recipient.email || '',
      phone: recipient.phone || '',
      additional_info: recipient.additional_info || ''
    });
  };

  const handleCancelEdit = () => {
    setSelectedRecipient(null);
    setIsEditing(false);
    setFormData({
      company_name: '', contact_person: '', email: '', phone: '', additional_info: ''
    });
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!survey_id || !user) return;

    if (!formData.email && !formData.phone) {
        alert("Необходимо указать хотя бы Email или телефон.");
        return;
    }

    setFormLoading(true);
    setError(null);

    const payload = {
      survey_template_id: parseInt(survey_id),
      ...formData,
    };

    try {
      if (isEditing && selectedRecipient) {
        const { data, error } = await supabase
          .from('survey_recipients')
          .update(payload)
          .eq('id', selectedRecipient.id)
          .select()
          .single();
        if (error) throw error;
        setRecipients(recipients.map(r => (r.id === data.id ? data : r)));
      } else {
        const { data, error } = await supabase
          .from('survey_recipients')
          .insert({ ...payload, recipient_code: generateCode() })
          .select()
          .single();
        if (error) throw error;
        setRecipients([data, ...recipients]);
      }
      handleCancelEdit();
    } catch (err: any) {
      setError(`Ошибка сохранения: ${err.message}`);
    } finally {
      setFormLoading(false);
    }
  };
  
  const handleDeleteRecipient = async (recipientId: string) => {
      if(window.confirm("Вы уверены, что хотите удалить этого получателя?")) {
          try {
              const { error } = await supabase.from('survey_recipients').delete().eq('id', recipientId);
              if(error) throw error;
              setRecipients(recipients.filter(r => r.id !== recipientId));
              if(selectedRecipient?.id === recipientId) {
                  handleCancelEdit();
              }
          } catch (err: any) {
              setError(`Ошибка удаления: ${err.message}`);
          }
      }
  }

  const getPersonalLink = (code: string | null | undefined) => {
    if (!survey_id || !code) return '';
    return `${getBaseUrl()}/survey/${survey_id}?code=${code}`;
  };

  const handleSendEmail = (recipient: SurveyRecipient) => {
    if (!recipient.email) return;
    const link = getPersonalLink(recipient.recipient_code);
    if (!link || !survey) return;
    const subject = `Приглашение к участию в опросе: ${survey.title}`;
    const body = `Здравствуйте, ${recipient.contact_person || recipient.company_name || ''}! Приглашаем вас принять участие в опросе "${survey.title}".\n\nСсылка на опрос: ${link}`;
    window.location.href = `mailto:${recipient.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const handleSendWhatsApp = (recipient: SurveyRecipient) => {
    if (!recipient.phone) return;
    const link = getPersonalLink(recipient.recipient_code);
    if (!link || !survey) return;
    const message = `Здравствуйте, ${recipient.contact_person || recipient.company_name || ''}! Приглашаем вас принять участие в опросе "${survey.title}".\n\nСсылка: ${link}`;
    window.open(`https://wa.me/${recipient.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
  };

  if (loading) {
    return <DashboardLayout><div className="p-8 text-center">Загрузка...</div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-4rem)] flex flex-col">
        <header className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center gap-4">
                <button onClick={() => navigate('/dashboard')} className="p-2 rounded-md hover:bg-gray-100"><ArrowLeft size={20} /></button>
                <div>
                    <h1 className="text-xl font-bold text-gray-800">Получатели опроса</h1>
                    <p className="text-sm text-gray-500 truncate">{survey?.title}</p>
                </div>
            </div>
        </header>

        <div className="flex-grow grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 overflow-hidden">
            {/* Left Column: Recipients List */}
            <div className="lg:col-span-2 xl:col-span-3 bg-gray-50 overflow-y-auto">
                <div className="p-4 space-y-3">
                    {recipients.map(recipient => (
                        <div key={recipient.id} className={`p-4 rounded-lg cursor-pointer transition-all ${selectedRecipient?.id === recipient.id ? 'bg-blue-100 ring-2 ring-blue-500' : 'bg-white hover:bg-gray-100 shadow-sm'}`}>
                           <div className="flex justify-between items-start" onClick={() => handleSelectRecipient(recipient)}>
                                <div>
                                    <p className="font-semibold text-gray-800">{recipient.company_name || 'Без названия'}</p>
                                    <p className="text-sm text-gray-600">{recipient.contact_person}</p>
                                    <p className="text-sm text-blue-600 break-all">{recipient.email || recipient.phone}</p>
                                </div>
                               <div className="flex-shrink-0 ml-4">
                                    <p className={`text-xs font-medium px-2 py-1 rounded-full ${recipient.submitted_at ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                        {recipient.submitted_at ? 'Ответил' : 'Ожидание'}
                                    </p>
                                </div>
                           </div>
                           <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between">
                               <div className="flex gap-2">
                                  <button onClick={(e) => {e.stopPropagation(); handleSendEmail(recipient)}} disabled={!recipient.email} className="p-2 rounded-md text-gray-500 hover:bg-blue-100 hover:text-blue-600 disabled:opacity-50"><Mail size={18} /></button>
                                  <button onClick={(e) => {e.stopPropagation(); handleSendWhatsApp(recipient)}} disabled={!recipient.phone} className="p-2 rounded-md text-gray-500 hover:bg-green-100 hover:text-green-600 disabled:opacity-50"><MessageSquare size={18} /></button>
                               </div>
                               <div className="flex gap-2">
                                   <button onClick={(e) => {e.stopPropagation(); handleSelectRecipient(recipient)}} className="p-2 rounded-md text-gray-500 hover:bg-gray-200"><Edit size={18}/></button>
                                   <button onClick={(e) => {e.stopPropagation(); handleDeleteRecipient(recipient.id)}} className="p-2 rounded-md text-red-500 hover:bg-red-100"><Trash2 size={18}/></button>
                               </div>
                           </div>
                        </div>
                    ))}
                    {recipients.length === 0 && <div className="text-center py-10"><p className="text-gray-500">Получатели еще не добавлены.</p></div>}
                </div>
            </div>

            {/* Right Column: Add/Edit Form */}
            <div className="lg:col-span-1 xl:col-span-1 bg-white border-l border-gray-200 p-6 flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-semibold text-gray-800">{isEditing ? 'Редактировать получателя' : 'Добавить получателя'}</h2>
                    {isEditing && <button onClick={handleCancelEdit} className="p-2 rounded-md hover:bg-gray-100"><X size={20}/></button>}
                </div>
                
                {error && <p className="text-red-500 mb-4">{error}</p>}

                <form onSubmit={handleFormSubmit} className="flex-grow flex flex-col">
                    <div className="flex-grow space-y-5">
                        <div className="relative">
                            <Building size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input type="text" name="company_name" value={formData.company_name} onChange={handleFormChange} placeholder="Название компании" className="w-full h-12 pl-10 pr-4 border border-gray-300 rounded-lg" />
                        </div>
                        <div className="relative">
                            <User size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input type="text" name="contact_person" value={formData.contact_person} onChange={handleFormChange} placeholder="Контактное лицо" className="w-full h-12 pl-10 pr-4 border border-gray-300 rounded-lg" />
                        </div>
                        <div className="relative">
                            <Mail size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input type="email" name="email" value={formData.email} onChange={handleFormChange} placeholder="Email" className="w-full h-12 pl-10 pr-4 border border-gray-300 rounded-lg" />
                        </div>
                        <div className="relative">
                             <Phone size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input type="tel" name="phone" value={formData.phone} onChange={handleFormChange} placeholder="Телефон" className="w-full h-12 pl-10 pr-4 border border-gray-300 rounded-lg" />
                        </div>
                        <div>
                             <textarea name="additional_info" value={formData.additional_info} onChange={handleFormChange} placeholder="Дополнительная информация (внутренний код, заметки и т.д.)" rows={4} className="w-full p-4 border border-gray-300 rounded-lg"></textarea>
                        </div>
                    </div>
                    <div className="mt-6 flex gap-3">
                        <button type="submit" disabled={formLoading} className="w-full flex items-center justify-center gap-2 h-12 px-6 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400">
                           {formLoading ? 'Сохранение...' : <><Save size={18}/> {isEditing ? 'Сохранить' : 'Добавить'}</> }
                        </button>
                         {isEditing && <button type="button" onClick={handleCancelEdit} className="h-12 px-4 rounded-lg hover:bg-gray-100 text-sm">Отмена</button>}
                    </div>
                </form>
            </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Recipients;
