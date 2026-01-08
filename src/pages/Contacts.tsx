
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { Plus, Search, Edit, Trash2, X, Loader2, Users, User, Mail, Phone, Building, Briefcase } from 'lucide-react';

// --- TypeScript Interfaces ---
interface Contact {
  id: string;
  company_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  company_name?: string;
  position?: string;
  created_at: string;
  owner?: { id: string; name: string; email: string; };
}

export default function Contacts() {
  const { user } = useAuth();
  const isSuperAdmin = user?.is_super_admin || false;

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formState, setFormState] = useState<Partial<Contact>>({});

  const fetchContacts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      let query = supabase.from('participants').select(`*, owner:companies!company_id(id, name, email)`).order('created_at', { ascending: false });
      if (!isSuperAdmin) query = query.eq('company_id', user.id);
      
      const { data, error } = await query;
      if (error) throw error;
      setContacts(data as Contact[] || []);
    } catch (err: any) {
      toast.error('Ошибка загрузки контактов: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [user, isSuperAdmin]);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  const openModal = (contact: Contact | null = null) => {
    setEditingContact(contact);
    setFormState(contact ? { ...contact } : { first_name: '', last_name: '', email: '', phone: '', company_name: '', position: '' });
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formState.email?.trim() && !formState.phone?.trim() && !formState.first_name?.trim() && !formState.last_name?.trim()) {
      toast.error('Укажите хотя бы одно: Email, Телефон или Имя');
      return;
    }

    setIsSubmitting(true);
    try {
      const { created_at, id, owner, ...formData } = formState;
      const finalUpdates = { ...formData, company_id: user.id };

      const { error } = editingContact
        ? await supabase.from('participants').update(finalUpdates).eq('id', editingContact.id)
        : await supabase.from('participants').insert([finalUpdates]);

      if (error) throw error;
      toast.success(editingContact ? 'Контакт обновлён' : 'Контакт создан');
      fetchContacts();
      closeModal();
    } catch (err: any) {
      toast.error('Ошибка сохранения: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Вы уверены?')) return;
    try {
      const { error } = await supabase.from('participants').delete().eq('id', id);
      if (error) throw error;
      toast.success('Контакт удалён');
      fetchContacts();
    } catch (error: any) {
      toast.error('Ошибка удаления: ' + error.message);
    }
  };

  const filteredContacts = useMemo(() => contacts.filter(c =>
      Object.values(c).some(val => 
          val?.toString().toLowerCase().includes(searchTerm.toLowerCase())
      )
  ), [contacts, searchTerm]);

  const stats = useMemo(() => ({
    total: contacts.length,
    withEmail: contacts.filter(c => c.email).length,
    withPhone: contacts.filter(c => c.phone).length,
  }), [contacts]);

  return (
    <div className="p-4 sm:p-6">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">Контакты</h1>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
            <input type="text" placeholder="Поиск..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 text-sm border border-border-subtle rounded-md bg-background"/>
          </div>
          <button onClick={() => openModal()} className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm font-medium rounded-md hover:bg-primary/90 transition-colors flex-shrink-0">
            <Plus className="h-4 w-4" /> Добавить
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard icon={Users} title="Всего контактов" value={stats.total} />
        <StatCard icon={Mail} title="С email" value={stats.withEmail} />
        <StatCard icon={Phone} title="С телефоном" value={stats.withPhone} />
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {filteredContacts.length > 0 ? (
            filteredContacts.map(contact => <ContactCard key={contact.id} contact={contact} onEdit={() => openModal(contact)} onDelete={() => handleDelete(contact.id)} />)
        ) : (
            <EmptyState onAdd={() => openModal()} hasSearch={!!searchTerm} />
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-surface-primary border border-border-subtle rounded-lg">
        <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead className="bg-background">
                <tr className="border-b border-border-subtle">
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Контакт</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Телефон</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Компания</th>
                  {isSuperAdmin && <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Владелец</th>}
                  <th className="relative px-6 py-3"><span className="sr-only">Действия</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {!loading && filteredContacts.length > 0 && (
                  filteredContacts.map((contact) => <ContactRow key={contact.id} contact={contact} isSuperAdmin={isSuperAdmin} onEdit={() => openModal(contact)} onDelete={() => handleDelete(contact.id)} />)
                )}
              </tbody>
            </table>
        </div>
        {(loading || filteredContacts.length === 0) && (
             <div className="p-12 text-center">
                {loading ? <Loader2 className="h-8 w-8 animate-spin mx-auto text-text-tertiary" /> : <EmptyState onAdd={() => openModal()} hasSearch={!!searchTerm} />}
            </div>
        )}
      </div>

      <ContactModal isOpen={isModalOpen} onClose={closeModal} isEditing={!!editingContact} isSubmitting={isSubmitting} formState={formState} setFormState={setFormState} onSubmit={handleSubmit} />
    </div>
  );
}

// --- Child Components ---

const StatCard = ({ icon: Icon, title, value }: { icon: React.ElementType; title: string; value: number }) => (
    <div className="bg-surface-primary border border-border-subtle rounded-lg p-4 flex items-center gap-4">
        <div className="bg-primary/10 p-2 rounded-full"><Icon className="h-5 w-5 text-primary" /></div>
        <div>
            <div className="text-sm text-text-tertiary">{title}</div>
            <p className="text-2xl font-semibold text-text-primary">{value}</p>
        </div>
    </div>
);

const ContactCard = ({ contact, onEdit, onDelete }: { contact: Contact, onEdit: () => void, onDelete: () => void }) => (
    <div className="bg-surface-primary border border-border-subtle rounded-lg p-4">
        <div className="flex justify-between items-start">
            <div className="min-w-0">
                <p className="text-sm font-semibold text-text-primary truncate">{contact.first_name} {contact.last_name}</p>
                {contact.position && <p className="text-xs text-text-tertiary truncate">{contact.position}</p>}
            </div>
            <div className="flex items-center flex-shrink-0 ml-2">
                <button onClick={onEdit} className="p-1.5 text-text-tertiary hover:text-primary"><Edit className="h-4 w-4" /></button>
                <button onClick={onDelete} className="p-1.5 text-text-tertiary hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
            </div>
        </div>
        <div className="mt-3 space-y-1 text-sm">
            {contact.email && <p className="flex items-center gap-2 text-text-secondary truncate"><Mail size={14} /> {contact.email}</p>}
            {contact.phone && <p className="flex items-center gap-2 text-text-secondary truncate"><Phone size={14} /> {contact.phone}</p>}
            {contact.company_name && <p className="flex items-center gap-2 text-text-secondary truncate"><Building size={14} /> {contact.company_name}</p>}
        </div>
    </div>
);

const ContactRow = ({ contact, isSuperAdmin, onEdit, onDelete }: { contact: Contact; isSuperAdmin: boolean; onEdit: () => void; onDelete: () => void; }) => (
    <tr className="hover:bg-background/50">
        <td className="px-6 py-4"><div className="flex items-center gap-3"><div className="w-9 h-9 bg-primary/10 rounded-full flex-shrink-0 flex items-center justify-center text-primary font-medium text-sm">{(contact.first_name?.[0] || '')}{(contact.last_name?.[0] || '')}</div><div><p className="font-medium text-text-primary truncate">{contact.first_name} {contact.last_name}</p><p className="text-xs text-text-tertiary">{contact.position}</p></div></div></td>
        <td className="px-6 py-4 text-sm text-text-secondary truncate">{contact.email || '—'}</td>
        <td className="px-6 py-4 text-sm text-text-secondary whitespace-nowrap">{contact.phone || '—'}</td>
        <td className="px-6 py-4 text-sm text-text-secondary truncate">{contact.company_name || '—'}</td>
        {isSuperAdmin && <td className="px-6 py-4 text-sm text-violet-600 truncate">{contact.owner?.name}</td>}
        <td className="px-6 py-4 text-right"><div className="flex items-center justify-end gap-1"><button onClick={onEdit} className="p-1.5 text-text-tertiary hover:text-primary rounded"><Edit className="h-4 w-4" /></button><button onClick={onDelete} className="p-1.5 text-text-tertiary hover:text-red-500 rounded"><Trash2 className="h-4 w-4" /></button></div></td>
    </tr>
);

const EmptyState = ({ onAdd, hasSearch }: { onAdd: () => void, hasSearch: boolean }) => (
    <div className="text-center py-12">
        <Users className="h-12 w-12 text-text-tertiary mx-auto mb-3" />
        <p className="font-medium">{hasSearch ? 'Ничего не найдено' : 'Контактов пока нет'}</p>
        <p className="text-sm text-text-secondary mt-1">{hasSearch ? 'Попробуйте другой поисковый запрос.' : 'Добавьте свой первый контакт.'}</p>
        {!hasSearch && <button onClick={onAdd} className="mt-4 text-primary hover:underline text-sm font-semibold">Создать контакт</button>}
    </div>
);

const ContactModal = ({ isOpen, onClose, isEditing, isSubmitting, formState, setFormState, onSubmit }: any) => {
    if (!isOpen) return null;
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => setFormState((prev: any) => ({ ...prev, [e.target.name]: e.target.value }));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
            <div className="bg-surface-primary rounded-lg shadow-xl max-w-lg w-full" onClick={e => e.stopPropagation()}>
                <form onSubmit={onSubmit}>
                    <div className="px-6 py-4 border-b border-border-subtle"><h2 className="text-lg font-semibold">{isEditing ? 'Редактировать' : 'Новый контакт'}</h2></div>
                    <div className="p-6 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <ModalInput icon={User} name="first_name" placeholder="Имя" value={formState.first_name || ''} onChange={handleInputChange} />
                            <ModalInput icon={User} name="last_name" placeholder="Фамилия" value={formState.last_name || ''} onChange={handleInputChange} />
                        </div>
                        <ModalInput icon={Mail} name="email" type="email" placeholder="Email" value={formState.email || ''} onChange={handleInputChange} />
                        <ModalInput icon={Phone} name="phone" type="tel" placeholder="Телефон" value={formState.phone || ''} onChange={handleInputChange} />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                             <ModalInput icon={Building} name="company_name" placeholder="Компания" value={formState.company_name || ''} onChange={handleInputChange} />
                             <ModalInput icon={Briefcase} name="position" placeholder="Должность" value={formState.position || ''} onChange={handleInputChange} />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 px-6 py-4 bg-background rounded-b-lg border-t border-border-subtle">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md hover:bg-surface">Отмена</button>
                        <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md w-28">
                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : (isEditing ? 'Сохранить' : 'Создать')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const ModalInput = ({ icon: Icon, ...props }: any) => (
    <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
        <input {...props} className="w-full pl-10 pr-3 py-2 border border-border-subtle rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
    </div>
);
