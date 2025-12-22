
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { generateCode } from '../utils/generateCode';
import { getBaseUrl } from '../utils/urls';
import { toast } from 'sonner';
import { DashboardLayout } from '../components/DashboardLayout';
import { Plus, Trash2, Mail, ArrowLeft, X, Copy, CheckCircle2, Link as LinkIcon, Users, UserPlus, Send, Loader2, RefreshCw, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Reusable Components ---
const ActionButton = ({ onClick, children, loading = false, disabled = false, variant = 'primary', size = 'md' }) => {
    const base = "inline-flex items-center justify-center font-semibold text-sm rounded-lg shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2";
    const sizes = { md: "h-10 px-4", sm: "h-9 px-3" };
    const variants = { primary: "bg-primary text-on-primary hover:bg-primary/90 focus:ring-primary", secondary: "bg-surface border border-border-subtle hover:bg-background text-text-primary focus:ring-primary" };
    return <button onClick={onClick} disabled={disabled || loading} className={`${base} ${sizes[size]} ${variants[variant]}`}>{loading ? <Loader2 className="animate-spin h-5 w-5"/> : children}</button>;
};

const Card = ({ icon, title, description, children, actions }) => (
  <motion.div layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: 'easeOut' }} className="bg-surface border border-border-subtle rounded-2xl shadow-ambient">
    <div className="p-6 border-b border-border-subtle flex justify-between items-start gap-4">
      <div className="flex items-start gap-5">
        <div className="bg-primary/10 text-primary rounded-full w-10 h-10 flex-shrink-0 flex items-center justify-center">{icon}</div>
        <div>
          <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
          <p className="text-sm text-text-secondary mt-1">{description}</p>
        </div>
      </div>
      {actions && <div className="flex-shrink-0">{actions}</div>}
    </div>
    <div className="p-4 bg-background/50">{children}</div>
  </motion.div>
);

const RecipientStatusBadge = ({ submitted_at, additional_info }) => {
    if (submitted_at) return <span className="px-2 py-0.5 text-xs font-medium text-green-800 bg-green-100 rounded-md">Ответил</span>;
    if (additional_info === 'Одноразовая ссылка') return <span className="px-2 py-0.5 text-xs font-medium text-gray-700 bg-gray-200 rounded-md">Не использована</span>;
    return <span className="px-2 py-0.5 text-xs font-medium text-amber-800 bg-amber-100 rounded-md">Ожидание</span>;
};

// --- Main Component --- //
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
  const handleCopy = (link, id) => { navigator.clipboard.writeText(link).then(() => { setCopiedLink(id); setTimeout(() => setCopiedLink(null), 2000); }); }

  if (loading && !survey) return <DashboardLayout><div className="flex justify-center items-center py-20"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8 px-4 py-8">
        <header>
            <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-text-secondary hover:text-primary mb-4 transition-colors"><ArrowLeft size={18}/> Назад ко всем опросам</button>
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-text-primary">Получатели и ссылки</h1>
                    <p className="text-text-secondary mt-1.5 truncate">Опрос: {survey?.title}</p>
                </div>
                <ActionButton variant="secondary" onClick={fetchData} loading={loading}><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /></ActionButton>
            </div>
        </header>

        <Card icon={<LinkIcon size={20} />} title="Массовая ссылка" description="Любой, у кого есть эта ссылка, может пройти опрос.">
            <div className="flex items-center gap-2 p-2">
                <input type="text" readOnly value={getLink()} className="flex-grow bg-background border border-border-subtle rounded-lg h-10 px-3 text-sm focus:outline-none" />
                <ActionButton onClick={() => handleCopy(getLink(), 'public')} variant="secondary" size='sm'>{copiedLink === 'public' ? <CheckCircle2 size={16} className="text-green-500"/> : <Copy size={16}/>}</ActionButton>
            </div>
        </Card>

        <Card icon={<LinkIcon size={20} />} title="Одноразовые анонимные ссылки" description="Каждая ссылка может быть использована только один раз." actions={<ActionButton onClick={handleGenerateDisposable}><Plus size={16} className="mr-2"/>Создать ссылку</ActionButton>}>
           <div className="p-2 space-y-2">
           <AnimatePresence>
           {disposableRecipients.length > 0 ? disposableRecipients.map(r => (
                <motion.div layout key={r.id} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} className="p-2.5 rounded-lg flex items-center justify-between bg-white group hover:bg-slate-50 border border-border-subtle">
                    <div className="flex items-center gap-3"><LinkIcon size={16} className="text-text-secondary"/><span className="font-mono text-sm text-text-primary">{r.recipient_code}</span></div>
                    <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                       <RecipientStatusBadge {...r} />
                       <button onClick={() => handleCopy(getLink(r.recipient_code), r.id)} className="p-2 text-text-secondary hover:text-primary rounded-full hover:bg-primary/10">{copiedLink === r.id ? <CheckCircle2 size={16} className="text-green-500"/> : <Copy size={16}/>}</button>
                       <button onClick={() => handleDeleteRecipient(r.id)} className="p-2 text-text-secondary hover:text-red-500 rounded-full hover:bg-red-500/10"><Trash2 size={16}/></button>
                    </div>
                </motion.div>
            )) : <div className="text-center py-10 text-text-secondary text-sm">Нет одноразовых ссылок.</div>}
            </AnimatePresence>
           </div>
        </Card>
        
        <Card icon={<Users size={20} />} title="Персональные получатели" description="Отправьте уникальные ссылки конкретным людям." actions={<ActionButton onClick={() => setIsModalOpen(true)}><UserPlus size={16} className="mr-2"/>Добавить из контактов</ActionButton>}>
            <div className="p-2 space-y-2">
            <AnimatePresence>
            {personalRecipients.length > 0 ? personalRecipients.map(r => (
                <motion.div layout key={r.id} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} className="p-2.5 rounded-lg flex items-center justify-between bg-white group hover:bg-slate-50 border border-border-subtle">
                    <div className="flex flex-col"><span className="font-semibold text-text-primary">{r.contact_person}</span><span className="text-sm text-text-secondary">{r.email}</span></div>
                    <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <RecipientStatusBadge {...r} />
                        <button onClick={() => handleCopy(getLink(r.recipient_code), r.id)} className="p-2 text-text-secondary hover:text-primary rounded-full hover:bg-primary/10">{copiedLink === r.id ? <CheckCircle2 size={16} className="text-green-500"/> : <Copy size={16}/>}</button>
                        <button onClick={() => handleDeleteRecipient(r.id)} className="p-2 text-text-secondary hover:text-red-500 rounded-full hover:bg-red-500/10"><Trash2 size={16}/></button>
                    </div>
                </motion.div>
            )) : <div className="text-center py-10 text-text-secondary text-sm">Нет персональных получателей.</div>}
             </AnimatePresence>
            </div>
        </Card>

        <SelectContactsModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} surveyId={survey_id} existingRecipients={recipients} onRecipientsAdded={fetchData} />
      </div>
    </DashboardLayout>
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-surface rounded-2xl shadow-xl w-full max-w-2xl h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="p-5 border-b border-border-subtle flex justify-between items-center"><h2 className="text-lg font-semibold text-text-primary">Добавить из контактов</h2><button onClick={onClose} className="p-1 rounded-full hover:bg-background"><X/></button></header>
                <div className="p-4 border-b border-border-subtle"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" /><input type="text" placeholder="Поиск..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full h-10 pl-10 pr-4 bg-background border border-border-subtle rounded-lg focus:outline-none ring-primary/50 focus:ring-2"/></div></div>
                <div className="overflow-y-auto flex-grow p-2">
                    {loading ? <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin h-6 w-6 text-primary"/></div>
                    : filteredContacts.length === 0 ? <div className="text-center py-10 text-text-secondary">Все контакты уже добавлены или не найдены.</div>
                    : <div className="space-y-1">
                        {filteredContacts.map(c => (
                            <div key={c.id} onClick={() => handleSelect(c.id)} className={`p-3 flex items-center gap-4 rounded-lg cursor-pointer transition-colors ${selected.has(c.id) ? 'bg-primary/10' : 'hover:bg-background'}`}>
                                <input type="checkbox" readOnly checked={selected.has(c.id)} className="h-4 w-4 rounded border-gray-400 text-primary focus:ring-primary/50 pointer-events-none"/>
                                <div><p className="font-medium text-text-primary">{c.first_name} {c.last_name}</p><p className="text-sm text-text-secondary">{c.email}</p></div>
                            </div>
                        ))}
                    </div>}
                </div>
                <footer className="p-4 border-t border-border-subtle flex justify-end gap-3">
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
