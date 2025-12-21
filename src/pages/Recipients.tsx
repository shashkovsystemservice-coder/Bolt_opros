
import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { SurveyTemplate, SurveyRecipient, Contact } from '../types/database';
import { generateCode } from '../utils/generateCode';
import { getBaseUrl } from '../utils/urls';
import { Plus, Edit, Trash2, Mail, ArrowLeft, X, Save, User, Building, Phone, Copy, RefreshCw, CheckCircle2, Link as LinkIcon, Users } from 'lucide-react';

const Recipients = () => {
  const { id: survey_id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [survey, setSurvey] = useState<SurveyTemplate | null>(null);
  const [recipients, setRecipients] = useState<SurveyRecipient[]>([]);
  
  const [selectedRecipient, setSelectedRecipient] = useState<SurveyRecipient | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ company_name: '', contact_person: '', email: '', phone: '' });

  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [globalContacts, setGlobalContacts] = useState<Contact[]>([]);
  const [selectedGlobalContacts, setSelectedGlobalContacts] = useState<string[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [addingContacts, setAddingContacts] = useState(false);

  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !survey_id) { setError("Ошибка: Пользователь или ID опроса не найдены."); setLoading(false); return; }
    fetchData();
  }, [survey_id, user, authLoading]);

  const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: surveyData, error: surveyError } = await supabase.from('survey_templates').select('*').eq('id', survey_id!).eq('company_id', user!.id).single();
        if (surveyError) throw surveyError;
        setSurvey(surveyData);

        const { data: recipientsData, error: recipientsError } = await supabase.from('survey_recipients').select('*').eq('survey_template_id', survey_id!).order('created_at', { ascending: false });
        if (recipientsError) throw recipientsError;
        setRecipients(recipientsData || []);
      } catch (err: any) { setError(`Ошибка при загрузке данных: ${err.message}`);
      } finally { setLoading(false); }
    };

  const { personalRecipients, disposableRecipients, publicRespondents } = useMemo(() => ({
    disposableRecipients: recipients.filter(r => r.additional_info === 'Одноразовая ссылка'),
    personalRecipients: recipients.filter(r => r.additional_info === 'Личный контакт'),
    publicRespondents: recipients.filter(r => !r.additional_info),
  }), [recipients]);
  
  const openContactModal = async () => {
    if (!user) return;
    setLoadingContacts(true);
    setIsContactModalOpen(true);
    setError(null);
    try {
        // ОТКЛЮЧЕНА ФИЛЬТРАЦИЯ: всегда показываем полный список
        const { data, error } = await supabase.from('contacts').select('*').eq('user_id', user.id);
        if (error) throw error;
        setGlobalContacts(data || []);
    } catch (err: any) { setError(`Ошибка загрузки контактов: ${err.message}`);
    } finally { setLoadingContacts(false); }
  };

  const handleToggleGlobalContact = (contactId: string) => {
    setSelectedGlobalContacts(prev => prev.includes(contactId) ? prev.filter(id => id !== contactId) : [...prev, contactId]);
  };

  const handleAddSelectedContacts = async () => {
    if (!survey_id || !user || selectedGlobalContacts.length === 0) return;
    setAddingContacts(true);
    setError(null);
    try {
        const selected = globalContacts.filter(c => selectedGlobalContacts.includes(c.id));
        const newRecipientsPayload = selected.map(contact => ({
            survey_template_id: survey_id,
            company_id: user.id, 
            recipient_code: generateCode(),
            contact_person: [contact.first_name, contact.last_name].filter(Boolean).join(' ') || contact.email,
            company_name: contact.company_name,
            email: contact.email,
            phone: contact.phone,
            additional_info: 'Личный контакт',
        }));

        const { data: newRecipients, error } = await supabase.from('survey_recipients').insert(newRecipientsPayload).select();
        if (error) throw error;

        setRecipients(prev => [...newRecipients, ...prev]);
        setIsContactModalOpen(false);
        setSelectedGlobalContacts([]);
    } catch (err: any) { setError(`Ошибка добавления получателей: ${err.message}`);
    } finally { setAddingContacts(false); }
  };

  const handleSelectRecipient = (recipient: SurveyRecipient) => {
    setSelectedRecipient(recipient);
    setIsEditing(true);
    setFormData({ company_name: recipient.company_name || '', contact_person: recipient.contact_person || '', email: recipient.email || '', phone: recipient.phone || '' });
  };

  const handleCancelEdit = () => {
    setSelectedRecipient(null);
    setIsEditing(false);
    setFormData({ company_name: '', contact_person: '', email: '', phone: '' });
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!survey_id || !user) return;
    if (!formData.email && !formData.phone && !formData.contact_person && !formData.company_name) return alert("Нужно заполнить хотя бы одно поле.");

    setFormLoading(true);
    setError(null);
    try {
      let newRecipient;
      if (isEditing && selectedRecipient) {
        const { data, error } = await supabase.from('survey_recipients').update({ ...formData }).eq('id', selectedRecipient.id).select().single();
        if (error) throw error;
        setRecipients(recipients.map(r => (r.id === data.id ? data : r)));
      } else {
        const payload = { ...formData, additional_info: 'Личный контакт', survey_template_id: survey_id, company_id: user.id, recipient_code: generateCode() };
        const { data, error } = await supabase.from('survey_recipients').insert(payload).select().single();
        if (error) throw error;
        newRecipient = data;
        setRecipients([data, ...recipients]);
      }
      handleCancelEdit();

      if (newRecipient && newRecipient.email) {
          const [firstName, ...lastNameParts] = newRecipient.contact_person?.split(' ') || [];
          await supabase.from('contacts').upsert({ 
              user_id: user.id, 
              email: newRecipient.email, 
              first_name: firstName || '',
              last_name: lastNameParts.join(' '),
              company_name: newRecipient.company_name,
              phone: newRecipient.phone
          }, { onConflict: 'email' });
      }
    } catch (err: any) { setError(`Ошибка сохранения: ${err.message}`);
    } finally { setFormLoading(false); }
  };
  
  const handleDeleteRecipient = async (recipientId: string) => {
      if(window.confirm("Вы уверены?")) {
          try {
              await supabase.from('survey_recipients').delete().eq('id', recipientId);
              setRecipients(recipients.filter(r => r.id !== recipientId));
          } catch (err: any) { setError(`Ошибка удаления: ${err.message}`); }
      }
  }

  const handleGenerateDisposableLink = async () => {
    if (!survey_id || !user) return;
    setGeneratingLink(true);
    try {
        const payload = { survey_template_id: survey_id, company_id: user.id, recipient_code: generateCode(), contact_person: 'Анонимный участник', additional_info: 'Одноразовая ссылка' };
        const { data, error } = await supabase.from('survey_recipients').insert(payload).select().single();
        if (error) throw error;
        setRecipients(prev => [data, ...prev]);
    } catch (err: any) { setError(`Ошибка генерации ссылки: ${err.message}`);
    } finally { setGeneratingLink(false); }
  }

  const getPersonalLink = (code: string) => `${getBaseUrl()}/survey/${survey?.unique_code}?code=${code}`;
  const getPublicLink = () => `${getBaseUrl()}/survey/${survey?.unique_code}`;

  const handleCopyLink = (link: string, id: string) => {
    navigator.clipboard.writeText(link).then(() => { setCopiedLink(id); setTimeout(() => setCopiedLink(null), 2500); });
  }

  if (loading) return <div className="p-8 text-center">Загрузка...</div>;

  return (
    <>
      {isContactModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg m-4 max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b"><h3 className="font-semibold text-lg">Выбрать контакты</h3><button onClick={() => setIsContactModalOpen(false)} className="p-2 rounded-md hover:bg-gray-100"><X size={20}/></button></div>
            <div className="p-4 overflow-y-auto">
              {loadingContacts ? <p>Загрузка...</p> : globalContacts.length > 0 ? <div className="space-y-2">
                  {globalContacts.map(contact => (
                    <label key={contact.id} htmlFor={`contact-${contact.id}`} className="flex items-center p-3 rounded-lg hover:bg-gray-100 cursor-pointer">
                      <input type="checkbox" id={`contact-${contact.id}`} checked={selectedGlobalContacts.includes(contact.id)} onChange={() => handleToggleGlobalContact(contact.id)} className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"/>
                      <div className="ml-4"><p className="font-medium">{[contact.first_name, contact.last_name].filter(Boolean).join(' ') || 'Без имени'}</p><p className="text-sm text-gray-500">{contact.email || contact.phone}</p></div>
                    </label>
                  ))}
                </div> : <div className="text-center py-10"><p className="text-gray-600">Список контактов пуст.</p><p className="text-sm text-gray-400 mt-1">Сначала добавьте их в разделе "Контакты".</p></div>}
            </div>
            <div className="flex justify-end items-center gap-3 p-4 border-t bg-gray-50">
                <button onClick={() => setIsContactModalOpen(false)} className="h-10 px-4 rounded-lg hover:bg-gray-200 text-sm font-medium">Отмена</button>
                <button onClick={handleAddSelectedContacts} disabled={selectedGlobalContacts.length === 0 || addingContacts} className="h-10 px-6 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400">{addingContacts ? 'Добавление...' : `Добавить (${selectedGlobalContacts.length})`}</button>
            </div>
          </div>
        </div>
      )}

      <div className="h-[calc(100vh-4rem)] flex flex-col">
        <header className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center gap-4">
                <button onClick={() => navigate('/dashboard')} className="p-2 rounded-md hover:bg-gray-100"><ArrowLeft size={20} /></button>
                <div><h1 className="text-xl font-bold text-gray-800">Ссылки и получатели</h1><p className="text-sm text-gray-500 truncate">{survey?.title}</p></div>
            </div>
             <button onClick={fetchData} className="p-2 rounded-md hover:bg-gray-100"><RefreshCw size={20} /></button>
        </header>

        <div className="flex-grow grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 overflow-hidden">
            <div className="lg:col-span-2 xl:col-span-3 bg-gray-50 overflow-y-auto p-6">
                {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-4" role="alert"><span className="block sm:inline">{error}</span></div>}

                <div className="bg-white p-4 rounded-lg shadow-sm border border-blue-200 mb-6">
                    <h3 className="font-bold text-gray-800 mb-2">Массовая ссылка (для всех)</h3>
                    <p className="text-sm text-gray-600 mb-4">Любой, кто перейдет по ней, сможет пройти опрос, предварительно указав свои данные.</p>
                    <div className="flex gap-2"><input type="text" readOnly value={getPublicLink()} className="w-full h-10 px-3 bg-gray-100 border rounded-md text-sm" /><button onClick={() => handleCopyLink(getPublicLink(), 'public')} className="flex-shrink-0 flex items-center justify-center gap-2 h-10 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 text-sm">{copiedLink === 'public' ? 'Скопировано!' : <><Copy size={16}/> Копировать</>}</button></div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-sm border border-green-200 mb-6">
                    <div className="flex justify-between items-center mb-4"><div><h3 className="font-bold text-gray-800">Одноразовые ссылки</h3><p className="text-sm text-gray-600">Каждая ссылка используется только один раз.</p></div><button onClick={handleGenerateDisposableLink} disabled={generatingLink} className="flex-shrink-0 flex items-center justify-center gap-2 h-10 px-4 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 text-sm disabled:bg-gray-400">{generatingLink ? 'Генерация...' : <><Plus size={16}/> Анонимная</>}</button></div>
                    <div className="space-y-2">
                        {disposableRecipients.map(r => (<div key={r.id} className="flex items-center justify-between bg-gray-50 p-2 rounded-md"><span className="text-sm text-gray-700 truncate px-2 w-1/4">{r.contact_person}</span><input type="text" readOnly value={getPersonalLink(r.recipient_code)} className="flex-grow h-9 px-2 bg-transparent border-none text-sm text-center" /><div className="flex items-center gap-2 flex-shrink-0"><p className={`text-xs font-medium px-2 py-1 rounded-full ${r.submitted_at ? 'bg-red-100 text-red-800' : 'bg-gray-200 text-gray-800'}`}>{r.submitted_at ? 'Использована' : 'Не использована'}</p><button onClick={() => handleCopyLink(getPersonalLink(r.recipient_code), r.id)} className="p-2 rounded-md text-gray-500 hover:bg-gray-200">{copiedLink === r.id ? <CheckCircle2 size={16} className="text-green-600"/> : <Copy size={16}/>}</button><button onClick={() => handleDeleteRecipient(r.id)} className="p-2 rounded-md text-gray-500 hover:text-red-500 hover:bg-red-100"><Trash2 size={16}/></button></div></div>))}
                        {disposableRecipients.length === 0 && <p className="text-sm text-center text-gray-500 py-4">Одноразовые ссылки еще не созданы.</p>}
                    </div>
                </div>

                <div className="mb-6">
                    <div className="flex justify-between items-center mb-3"><h3 className="font-bold text-gray-800">Персональные получатели</h3><button onClick={openContactModal} className="flex items-center gap-2 h-10 px-4 bg-white border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 text-sm"><Users size={16}/> Выбрать из контактов</button></div>
                    <div className="space-y-3 mt-3">
                        {personalRecipients.map(recipient => (<div key={recipient.id} className={`p-4 rounded-lg transition-all ${selectedRecipient?.id === recipient.id ? 'bg-blue-100 ring-2 ring-blue-500' : 'bg-white hover:bg-gray-100 shadow-sm'}`}><div className="flex justify-between items-start cursor-pointer" onClick={() => handleSelectRecipient(recipient)}><div><p className="font-semibold text-gray-800">{recipient.contact_person || recipient.company_name || 'Без названия'}</p><p className="text-sm text-gray-600">{recipient.email || recipient.phone}</p></div><div className="flex-shrink-0 ml-4"><p className={`text-xs font-medium px-2 py-1 rounded-full ${recipient.submitted_at ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{recipient.submitted_at ? 'Ответил' : 'Ожидание'}</p></div></div><div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between"><div className="flex items-center gap-1"><button onClick={() => handleCopyLink(getPersonalLink(recipient.recipient_code), recipient.id)} title="Копировать персональную ссылку" className="p-2 rounded-md text-gray-500 hover:bg-gray-200"><Copy size={14}/></button><button onClick={() => {}} disabled={!recipient.email} title="Отправить по Email" className="p-2 rounded-md text-gray-500 hover:bg-blue-100 hover:text-blue-600 disabled:opacity-50"><Mail size={16} /></button></div><div className="flex gap-2"><button onClick={() => handleSelectRecipient(recipient)} title="Редактировать" className="p-2 rounded-md text-gray-500 hover:bg-gray-200"><Edit size={16}/></button><button onClick={() => handleDeleteRecipient(recipient.id)} title="Удалить" className="p-2 rounded-md text-gray-500 hover:text-red-500 hover:bg-red-100"><Trash2 size={16}/></button></div></div></div>))}
                        {personalRecipients.length === 0 && <div className="text-center py-10 border-2 border-dashed rounded-lg"><p className="text-gray-500">Получатели не добавлены.</p><p className="text-xs text-gray-400 mt-1">Выберите из контактов или добавьте вручную справа.</p></div>}
                    </div>
                </div>

                <div><h3 className="font-bold text-gray-800 mb-3">Ответы по общей ссылке</h3><div className="space-y-2">
                    {publicRespondents.length > 0 ? publicRespondents.map(respondent => (<div key={respondent.id} className="p-3 rounded-lg bg-white shadow-sm flex justify-between items-center"><div><p className="font-semibold text-gray-800">{respondent.contact_person || respondent.company_name || 'Неизвестный'}</p><p className="text-sm text-gray-600">{respondent.email || respondent.phone}</p></div><p className="text-xs font-medium px-2 py-1 rounded-full bg-blue-100 text-blue-800 flex-shrink-0">Ответил {new Date(respondent.submitted_at!).toLocaleDateString()}</p></div>)) : <div className="text-center py-10 border-2 border-dashed rounded-lg"><p className="text-gray-500">По общей ссылке еще никто не ответил.</p></div>}
                </div></div>

            </div>

            <div className="lg:col-span-1 xl:col-span-1 bg-white border-l border-gray-200 p-6 flex flex-col">
                <div className="flex justify-between items-center mb-6"><h2 className="text-lg font-semibold text-gray-800">{isEditing ? 'Редактировать получателя' : 'Быстрое добавление'}</h2>{isEditing && <button onClick={handleCancelEdit} className="p-2 rounded-md hover:bg-gray-100"><X size={20}/></button>}</div>
                <p className="text-sm text-gray-500 mb-4 -mt-4">{isEditing ? 'Измените данные получателя.' : 'Добавьте в опрос. Он сохранится и в общих контактах, если указан email.'}</p>
                <form onSubmit={handleFormSubmit} className="flex-grow flex flex-col"><div className="flex-grow space-y-5"><div className="relative"><User size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input type="text" name="contact_person" value={formData.contact_person} onChange={handleFormChange} placeholder="Контактное лицо" className="w-full h-12 pl-10 pr-4 border border-gray-300 rounded-lg" /></div><div className="relative"><Building size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input type="text" name="company_name" value={formData.company_name} onChange={handleFormChange} placeholder="Название компании" className="w-full h-12 pl-10 pr-4 border border-gray-300 rounded-lg" /></div><div className="relative"><Mail size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input type="email" name="email" value={formData.email} onChange={handleFormChange} placeholder="Email" className="w-full h-12 pl-10 pr-4 border border-gray-300 rounded-lg" /></div><div className="relative"><Phone size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input type="tel" name="phone" value={formData.phone} onChange={handleFormChange} placeholder="Телефон" className="w-full h-12 pl-10 pr-4 border border-gray-300 rounded-lg" /></div></div><div className="mt-6 flex gap-3"><button type="submit" disabled={formLoading} className="w-full flex items-center justify-center gap-2 h-12 px-6 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400">{formLoading ? 'Сохранение...' : <><Save size={18}/>{isEditing ? 'Сохранить' : 'Добавить в опрос'}</>}</button>{isEditing && <button type="button" onClick={handleCancelEdit} className="h-12 px-4 rounded-lg hover:bg-gray-100 text-sm">Отмена</button>}</div></form>
            </div>
        </div>
      </div>
    </>
  );
};

export default Recipients;
