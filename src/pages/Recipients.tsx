
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { generateCode } from '../utils/generateCode';
import { getBaseUrl } from '../utils/urls';
import { toast } from 'sonner';
import { Plus, Trash2, X, Copy, Link as LinkIcon, Users, UserPlus, Loader2, RefreshCw, Search, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Reusable & Styled Components (Google AI Studio Style) ---
const ActionButton = ({ onClick, children, loading = false, disabled = false, variant = 'primary', size = 'md' }) => {
    const baseClasses = "whitespace-nowrap inline-flex items-center justify-center font-medium text-sm rounded-md transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2";
    const sizeClasses = { md: "h-9 px-4", sm: "h-8 px-3 text-xs" };
    const variantClasses = {
        solid: "bg-gray-800 text-white hover:bg-gray-700 focus:ring-gray-800",
        primary: "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-400",
        ghost: "bg-transparent hover:bg-gray-100 text-gray-600 focus:ring-gray-400",
    };
    return <button onClick={onClick} disabled={disabled || loading} className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]}`}>{loading ? <Loader2 className="animate-spin h-4 w-4"/> : children}</button>;
};

const Section = ({ title, description, children, headerActions }) => (
    <div className="py-8 border-b border-gray-200 last:border-b-0">
        <div className="grid md:grid-cols-3 gap-4 md:gap-8">
            <div className="md:col-span-1">
                <h3 className="text-base font-semibold text-gray-800">{title}</h3>
                <p className="text-sm text-gray-500 mt-1">{description}</p>
            </div>
            <div className="md:col-span-2">
                {headerActions && <div className="flex justify-end mb-4">{headerActions}</div>}
                <div className="bg-white border border-gray-200 rounded-lg">
                    {children}
                </div>
            </div>
        </div>
    </div>
);

const RecipientStatusBadge = ({ submitted_at }) => {
    if (submitted_at) return <span className="px-2 py-1 text-xs font-medium text-green-800 bg-green-100 rounded-full">Ответил</span>;
    return <span className="px-2 py-1 text-xs font-medium text-amber-800 bg-amber-100 rounded-full">Ожидание</span>;
};

// --- Main Component ---
const Recipients = () => {
  const { id: survey_id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [survey, setSurvey] = useState(null);
  const [recipients, setRecipients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user || !survey_id) return;
    setLoading(true);
    try {
      const [surveyRes, recipientsRes] = await Promise.all([
        supabase.from('survey_templates').select('title, unique_code').eq('id', survey_id).single(),
        supabase.from('survey_recipients').select('*').eq('survey_template_id', survey_id).order('created_at', { ascending: false })
      ]);
      if (surveyRes.error) throw surveyRes.error;
      if (recipientsRes.error) throw recipientsRes.error;
      setSurvey(surveyRes.data);
      setRecipients(recipientsRes.data || []);
    } catch (err) {
      toast.error(`Ошибка загрузки: ${err.message}`);
    } finally { setLoading(false); }
  }, [survey_id, user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const { personalRecipients, disposableRecipients } = useMemo(() => ({
    disposableRecipients: recipients.filter(r => r.additional_info === 'Одноразовая ссылка'),
    personalRecipients: recipients.filter(r => r.additional_info !== 'Одноразовая ссылка'),
  }), [recipients]);
  
  const handleGenerateDisposable = async () => {
      const { data, error } = await supabase.from('survey_recipients').insert({ survey_template_id: survey_id, company_id: user.id, recipient_code: generateCode(), contact_person: 'Анонимный участник', additional_info: 'Одноразовая ссылка' }).select().single();
      if (error) toast.error("Ошибка генерации ссылки: " + error.message); else { setRecipients(prev => [data, ...prev]); toast.success("Новая одноразовая ссылка создана!") }
  }

  const handleDeleteRecipient = async (id) => {
    const { error } = await supabase.from('survey_recipients').delete().eq('id', id);
    if (error) toast.error("Ошибка удаления: " + error.message); else { setRecipients(recipients.filter(r => r.id !== id)); toast.success("Удалено.") }
  }

  const getLink = (code) => `${getBaseUrl()}/survey/${survey?.unique_code}${code ? `?code=${code}` : ''}`;
  const handleCopy = (link) => { navigator.clipboard.writeText(link).then(() => { toast.success("Ссылка скопирована!"); }); }

  if (loading && !survey) return <div className="flex justify-center items-center py-20"><Loader2 className="animate-spin h-8 w-8 text-gray-400" /></div>;

  return (
      <div className="max-w-5xl mx-auto space-y-4 px-4 py-8">
        <header className="mb-8">
            <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-5 transition-colors"><ArrowLeft size={16}/> Назад ко всем опросам</button>
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Получатели и ссылки</h1>
                    <p className="text-sm text-gray-500 mt-1 truncate">Опрос: {survey?.title}</p>
                </div>
                 <ActionButton variant="ghost" onClick={fetchData} loading={loading}><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /></ActionButton>
            </div>
        </header>

        <Section title="Массовая ссылка" description="Любой, у кого есть эта ссылка, может пройти опрос.">
           <div className="p-4 flex items-center gap-2">
                <input type="text" readOnly value={getLink()} className="flex-grow bg-gray-50 border border-gray-300 rounded-md h-9 px-3 text-sm focus:outline-none" />
                <ActionButton onClick={() => handleCopy(getLink())} variant="primary" size='sm'><Copy size={15} className="mr-1.5"/>Скопировать</ActionButton>
            </div>
        </Section>

        <Section title="Одноразовые ссылки" description="Каждая ссылка уникальна и может быть использована только один раз." headerActions={<ActionButton onClick={handleGenerateDisposable} variant="primary" size="sm"><Plus size={16} className="mr-1.5"/>Создать ссылку</ActionButton>}>
           <div className="divide-y divide-gray-200">
           {disposableRecipients.length > 0 ? disposableRecipients.map(r => (
                <div key={r.id} className="p-4 flex items-center justify-between group">
                    <div className="flex items-center gap-3"><LinkIcon size={16} className="text-gray-400"/><span className="font-mono text-sm text-gray-800">{r.recipient_code}</span></div>
                    <div className="flex items-center gap-4">
                       {!r.submitted_at ? <span className="text-xs font-medium text-gray-500">Не использована</span> : <RecipientStatusBadge {...r} />}
                       <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                           <button onClick={() => handleCopy(getLink(r.recipient_code))} className="p-1.5 text-gray-500 hover:text-gray-800 rounded-md hover:bg-gray-200"><Copy size={15}/></button>
                           <button onClick={() => handleDeleteRecipient(r.id)} className="p-1.5 text-gray-500 hover:text-red-600 rounded-md hover:bg-red-100"><Trash2 size={15}/></button>
                       </div>
                    </div>
                </div>
            )) : <div className="text-center py-10 text-gray-500 text-sm">Нет одноразовых ссылок.</div>}
           </div>
        </Section>
        
        <Section title="Персональные получатели" description="Отправьте уникальные ссылки конкретным людям." headerActions={<ActionButton onClick={() => setIsModalOpen(true)} variant="primary" size="sm"><UserPlus size={16} className="mr-1.5"/>Добавить</ActionButton>}>
            <div className="divide-y divide-gray-200">
            {personalRecipients.length > 0 ? personalRecipients.map(r => (
                <div key={r.id} className="p-4 flex items-center justify-between group">
                    <div className="flex flex-col"><p className="font-medium text-gray-800 text-sm">{r.contact_person}</p><p className="text-sm text-gray-500">{r.email}</p></div>
                    <div className="flex items-center gap-4">
                        <RecipientStatusBadge {...r} />
                         <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                            <button onClick={() => handleCopy(getLink(r.recipient_code))} className="p-1.5 text-gray-500 hover:text-gray-800 rounded-md hover:bg-gray-200"><Copy size={15}/></button>
                            <button onClick={() => handleDeleteRecipient(r.id)} className="p-1.5 text-gray-500 hover:text-red-600 rounded-md hover:bg-red-100"><Trash2 size={15}/></button>
                        </div>
                    </div>
                </div>
            )) : <div className="text-center py-10 text-gray-500 text-sm">Нет персональных получателей.</div>}
            </div>
        </Section>

        <SelectContactsModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} surveyId={survey_id} existingRecipients={recipients} onRecipientsAdded={fetchData} />
      </div>
  );
};

// --- Add from contacts Modal ---
const SelectContactsModal = ({ isOpen, onClose, surveyId, existingRecipients, onRecipientsAdded }) => {
    const { user } = useAuth();
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [selected, setSelected] = useState(new Set());
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (isOpen && user) {
            const fetchContacts = async () => {
                setLoading(true);
                const { data, error } = await supabase.from('contacts').select('id, first_name, last_name, email').eq('user_id', user.id);
                if (error) toast.error('Ошибка загрузки контактов'); else setContacts(data);
                setLoading(false);
            }
            fetchContacts();
        }
    }, [isOpen, user]);

    const filteredContacts = useMemo(() => {
        const existingEmails = new Set(existingRecipients.map(r => r.email));
        return contacts
            .filter(c => !existingEmails.has(c.email))
            .filter(c => `${c.first_name} ${c.last_name} ${c.email}`.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [contacts, existingRecipients, searchTerm]);

    const handleSelect = (contactId) => {
        const newSelection = new Set(selected);
        if (newSelection.has(contactId)) newSelection.delete(contactId); else newSelection.add(contactId);
        setSelected(newSelection);
    }

    const handleAddRecipients = async () => {
        setIsAdding(true);
        const contactsToAdd = contacts.filter(c => selected.has(c.id));
        const newRecipients = contactsToAdd.map(c => ({ survey_template_id: surveyId, company_id: user.id, contact_person: `${c.first_name || ''} ${c.last_name || ''}`.trim(), email: c.email, recipient_code: generateCode(), additional_info: 'Личный контакт' }));
        const { error } = await supabase.from('survey_recipients').insert(newRecipients);
        if (error) toast.error("Ошибка добавления: " + error.message);
        else { toast.success(`${newRecipients.length} получателей добавлено.`); onRecipientsAdded(); onClose(); setSelected(new Set()); }
        setIsAdding(false);
    }

    if (!isOpen) return null;

    return (
        <AnimatePresence>
        {isOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white rounded-lg shadow-xl w-full max-w-2xl h-[70vh] flex flex-col border border-gray-200" onClick={e => e.stopPropagation()}>
                <header className="p-5 border-b border-gray-200 flex justify-between items-center"><h2 className="text-lg font-semibold text-gray-900">Добавить из контактов</h2><button onClick={onClose} className="p-1.5 rounded-md hover:bg-gray-100"><X size={18}/></button></header>
                <div className="p-4 border-b border-gray-200"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input type="text" placeholder="Поиск по имени или email..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full h-10 pl-10 pr-4 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400"/></div></div>
                <div className="overflow-y-auto flex-grow p-2">
                    {loading ? <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin h-6 w-6 text-gray-400"/></div>
                    : filteredContacts.length === 0 ? <div className="text-center py-16 text-gray-500 text-sm">Все контакты уже добавлены или не найдены.</div>
                    : <ul className="divide-y divide-gray-200">
                        {filteredContacts.map(c => (
                            <li key={c.id} onClick={() => handleSelect(c.id)} className={`p-3 flex items-center gap-4 cursor-pointer transition-colors rounded-md ${selected.has(c.id) ? 'bg-gray-100' : 'hover:bg-gray-50'}`}>
                                <input type="checkbox" readOnly checked={selected.has(c.id)} className="h-4 w-4 rounded border-gray-300 text-gray-600 focus:ring-gray-500 pointer-events-none"/>
                                <div><p className="font-medium text-gray-800 text-sm">{c.first_name} {c.last_name}</p><p className="text-sm text-gray-500">{c.email}</p></div>
                            </li>
                        ))}
                    </ul>}
                </div>
                <footer className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
                    <ActionButton variant="ghost" onClick={onClose}>Отмена</ActionButton>
                    <ActionButton onClick={handleAddRecipients} variant="solid" loading={isAdding} disabled={selected.size === 0}>{`Добавить (${selected.size})`}</ActionButton>
                </footer>
            </motion.div>
            </motion.div>
        )}
        </AnimatePresence>
    );
}

export default Recipients;
