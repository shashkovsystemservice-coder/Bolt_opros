
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { generateCode } from '../utils/generateCode';
import { getBaseUrl } from '../utils/urls';
import { toast } from 'sonner';
import { Plus, Trash2, Mail, ArrowLeft, X, Copy, Link as LinkIcon, Users, UserPlus, Loader2, RefreshCw, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Reusable & Styled Components ---
const ActionButton = ({ onClick, children, loading = false, disabled = false, variant = 'primary', size = 'md' }) => {
    const base = "inline-flex items-center justify-center font-medium text-sm rounded-md transition-colors duration-200 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background";
    const sizes = { md: "h-9 px-4", sm: "h-8 px-3" };
    const variants = { 
        primary: "bg-primary text-on-primary hover:bg-primary/90 focus:ring-primary", 
        secondary: "bg-surface border border-border hover:bg-background text-text-primary focus:ring-primary" 
    };
    return <button onClick={onClick} disabled={disabled || loading} className={`${base} ${sizes[size]} ${variants[variant]}`}>{loading ? <Loader2 className="animate-spin h-4 w-4"/> : children}</button>;
};

const Section = ({ title, description, children, headerActions }) => (
    <div className="py-8 border-b border-border-subtle last:border-b-0">
        <div className="grid md:grid-cols-3 gap-4 md:gap-8">
            <div className="md:col-span-1">
                <h3 className="text-base font-semibold text-text-primary">{title}</h3>
                <p className="text-sm text-text-secondary mt-1">{description}</p>
            </div>
            <div className="md:col-span-2">
                {headerActions && <div className="flex justify-end mb-4">{headerActions}</div>}
                <div className="bg-surface border border-border rounded-lg">
                    {children}
                </div>
            </div>
        </div>
    </div>
);

const RecipientStatusBadge = ({ submitted_at }) => {
    if (submitted_at) return <span className="px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full">Ответил</span>;
    return <span className="px-2 py-1 text-xs font-medium text-amber-700 bg-amber-100 rounded-full">Ожидание</span>;
};

// --- Main Component ---
const Recipients = () => {
  const { id: survey_id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [survey, setSurvey] = useState(null);
  const [recipients, setRecipients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(null);
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
  const handleCopy = (link, id) => { navigator.clipboard.writeText(link).then(() => { setCopiedLink(id); toast.success("Ссылка скопирована!"); setTimeout(() => setCopiedLink(null), 2000); }); }

  if (loading && !survey) return <div className="flex justify-center items-center py-20"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;

  return (
      <div className="max-w-5xl mx-auto space-y-4 px-4 py-8">
        <header className="mb-8">
            <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-sm text-text-secondary hover:text-primary mb-5 transition-colors"><ArrowLeft size={16}/> Назад ко всем опросам</button>
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-semibold text-text-primary">Получатели и ссылки</h1>
                    <p className="text-sm text-text-secondary mt-1 truncate">Опрос: {survey?.title}</p>
                </div>
                 <ActionButton variant="secondary" onClick={fetchData} loading={loading}><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /></ActionButton>
            </div>
        </header>

        <Section title="Массовая ссылка" description="Любой, у кого есть эта ссылка, может пройти опрос.">
           <div className="p-4 flex items-center gap-2">
                <input type="text" readOnly value={getLink()} className="flex-grow bg-background border border-border rounded-md h-9 px-3 text-sm focus:outline-none" />
                <ActionButton onClick={() => handleCopy(getLink(), 'public')} variant="secondary" size='sm'><Copy size={15} className="mr-1.5"/>Скопировать</ActionButton>
            </div>
        </Section>

        <Section title="Одноразовые ссылки" description="Каждая ссылка уникальна и может быть использована только один раз." headerActions={<ActionButton onClick={handleGenerateDisposable} size="sm"><Plus size={16} className="mr-1.5"/>Создать ссылку</ActionButton>}>
           <div className="divide-y divide-border-subtle">
           {disposableRecipients.length > 0 ? disposableRecipients.map(r => (
                <div key={r.id} className="p-4 flex items-center justify-between group">
                    <div className="flex items-center gap-3"><LinkIcon size={16} className="text-text-secondary"/><span className="font-mono text-sm text-text-primary">{r.recipient_code}</span></div>
                    <div className="flex items-center gap-4">
                       {!r.submitted_at ? <span className="text-xs font-medium text-gray-500">Не использована</span> : <RecipientStatusBadge {...r} />}
                       <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                           <button onClick={() => handleCopy(getLink(r.recipient_code), r.id)} className="p-1.5 text-text-secondary hover:text-primary rounded-md hover:bg-primary/10"><Copy size={15}/></button>
                           <button onClick={() => handleDeleteRecipient(r.id)} className="p-1.5 text-text-secondary hover:text-red-500 rounded-md hover:bg-red-500/10"><Trash2 size={15}/></button>
                       </div>
                    </div>
                </div>
            )) : <div className="text-center py-10 text-text-secondary text-sm">Нет одноразовых ссылок.</div>}
           </div>
        </Section>
        
        <Section icon={<Users size={20} />} title="Персональные получатели" description="Отправьте уникальные ссылки конкретным людям." headerActions={<ActionButton onClick={() => setIsModalOpen(true)} size="sm"><UserPlus size={16} className="mr-1.5"/>Добавить</ActionButton>}>
            <div className="divide-y divide-border-subtle">
            {personalRecipients.length > 0 ? personalRecipients.map(r => (
                <div key={r.id} className="p-4 flex items-center justify-between group">
                    <div className="flex flex-col"><p className="font-medium text-text-primary text-sm">{r.contact_person}</p><p className="text-sm text-text-secondary">{r.email}</p></div>
                    <div className="flex items-center gap-4">
                        <RecipientStatusBadge {...r} />
                         <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                            <button onClick={() => handleCopy(getLink(r.recipient_code), r.id)} className="p-1.5 text-text-secondary hover:text-primary rounded-md hover:bg-primary/10"><Copy size={15}/></button>
                            <button onClick={() => handleDeleteRecipient(r.id)} className="p-1.5 text-text-secondary hover:text-red-500 rounded-md hover:bg-red-500/10"><Trash2 size={15}/></button>
                        </div>
                    </div>
                </div>
            )) : <div className="text-center py-10 text-text-secondary text-sm">Нет персональных получателей.</div>}
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-surface rounded-lg shadow-xl w-full max-w-2xl h-[70vh] flex flex-col border border-border-subtle" onClick={e => e.stopPropagation()}>
                <header className="p-5 border-b border-border-subtle flex justify-between items-center"><h2 className="text-lg font-semibold text-text-primary">Добавить из контактов</h2><button onClick={onClose} className="p-1.5 rounded-md hover:bg-background"><X size={18}/></button></header>
                <div className="p-4 border-b border-border-subtle"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" /><input type="text" placeholder="Поиск по имени или email..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full h-10 pl-10 pr-4 bg-background border border-border rounded-md focus:outline-none ring-primary/80 focus:ring-2"/></div></div>
                <div className="overflow-y-auto flex-grow p-2">
                    {loading ? <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin h-6 w-6 text-primary"/></div>
                    : filteredContacts.length === 0 ? <div className="text-center py-16 text-text-secondary text-sm">Все контакты уже добавлены или не найдены.</div>
                    : <ul className="divide-y divide-border-subtle">
                        {filteredContacts.map(c => (
                            <li key={c.id} onClick={() => handleSelect(c.id)} className={`p-3 flex items-center gap-4 cursor-pointer transition-colors rounded-md ${selected.has(c.id) ? 'bg-primary/10' : 'hover:bg-background'}`}>
                                <input type="checkbox" readOnly checked={selected.has(c.id)} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/50 pointer-events-none"/>
                                <div><p className="font-medium text-text-primary text-sm">{c.first_name} {c.last_name}</p><p className="text-sm text-text-secondary">{c.email}</p></div>
                            </li>
                        ))}
                    </ul>}
                </div>
                <footer className="p-4 bg-surface border-t border-border-subtle flex justify-end gap-3">
                    <ActionButton variant="secondary" onClick={onClose}>Отмена</ActionButton>
                    <ActionButton onClick={handleAddRecipients} loading={isAdding} disabled={selected.size === 0}>{`Добавить (${selected.size})`}</ActionButton>
                </footer>
            </motion.div>
            </motion.div>
        )}
        </AnimatePresence>
    );
}

export default Recipients;
