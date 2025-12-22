
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { User, Mail, Phone, Building, Plus, MoreVertical, Edit, Trash2, X, Loader2, Users, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Reusable & Styled Components --- //

const ActionButton = ({ onClick, children, variant = 'primary', size = 'md', disabled = false, loading = false }) => {
    const baseClasses = "inline-flex items-center justify-center font-semibold text-sm rounded-lg shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2";
    const sizeClasses = { md: "h-10 px-4", sm: "h-9 px-3 text-xs" };
    const variantClasses = {
        primary: "bg-primary text-on-primary hover:bg-primary/90 focus:ring-primary",
        secondary: "bg-surface border border-border-subtle hover:bg-background text-text-primary focus:ring-primary",
        ghost: "hover:bg-background text-text-secondary focus:ring-primary/50"
    };
    return <button onClick={onClick} disabled={disabled || loading} className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]}`}>{loading ? <Loader2 className="animate-spin h-5 w-5"/> : children}</button>
};

const FormInput = ({ id, label, icon, ...props }) => (
  <div>
    <label htmlFor={id} className="block text-xs font-medium text-text-secondary mb-1.5">{label}</label>
    <div className="relative">
      <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-text-secondary">{icon}</span>
      <input
        id={id}
        className="w-full h-10 pl-11 pr-4 bg-background border border-border-subtle rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
        {...props}
      />
    </div>
  </div>
);

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <AnimatePresence>
        {isOpen && (
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
                onClick={onClose}
            >
            <motion.div 
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="bg-surface border border-border-subtle rounded-2xl shadow-xl w-full max-w-lg" 
                onClick={e => e.stopPropagation()}
            >
                <header className="p-5 border-b border-border-subtle flex justify-between items-center">
                <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
                <button onClick={onClose} className="p-1 rounded-full text-text-secondary hover:bg-background hover:text-text-primary transition-colors"><X className="w-5 h-5"/></button>
                </header>
                <div className="p-6">{children}</div>
            </motion.div>
            </motion.div>
        )}
    </AnimatePresence>
  );
};

const ContactRow = ({ contact, onEdit, onDelete }) => (
    <motion.li 
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="px-4 py-3 flex justify-between items-center group hover:bg-background/80 transition-colors duration-150 rounded-lg"
    >
        <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-background border border-border-subtle flex items-center justify-center text-primary font-semibold text-sm">
                {contact.first_name?.[0]?.toUpperCase()}{contact.last_name?.[0]?.toUpperCase()}
            </div>
            <div>
                <p className="font-semibold text-text-primary">{contact.first_name} {contact.last_name}</p>
                <p className="text-sm text-text-secondary">{contact.email}</p>
            </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => onEdit(contact)} className="p-2 text-text-secondary hover:text-primary rounded-full hover:bg-primary/10 transition-colors"><Edit className="h-4 w-4"/></button>
            <button onClick={() => onDelete(contact.id)} className="p-2 text-text-secondary hover:text-red-500 rounded-full hover:bg-red-500/10 transition-colors"><Trash2 className="h-4 w-4"/></button>
        </div>
    </motion.li>
);

const EmptyState = ({ onAction }) => (
    <div className="text-center py-24 bg-transparent">
        <div className="w-16 h-16 bg-surface border border-dashed border-border-subtle rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Users size={32} className="text-text-secondary"/>
        </div>
        <h3 className="text-xl font-semibold text-text-primary mb-2">Контакты не найдены</h3>
        <p className="text-text-secondary mb-6 max-w-sm mx-auto">Начните с добавления вашего первого контакта, чтобы он появился здесь.</p>
        <ActionButton onClick={onAction}><Plus className="w-4 h-4 mr-2"/>Добавить контакт</ActionButton>
    </div>
);

// --- Main Page Component --- //
export function Contacts() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [formState, setFormState] = useState({ first_name: '', last_name: '', email: '', phone: '', company_name: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchContacts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.from('contacts').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      if (error) throw error;
      setContacts(data || []);
    } catch (err) {
      toast.error('Ошибка при загрузке контактов: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const openModal = (contact = null) => {
    setEditingContact(contact);
    setFormState(contact ? { ...contact } : { first_name: '', last_name: '', email: '', phone: '', company_name: '' });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingContact(null);
  };

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormState(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formState.email) {
        toast.error('Email является обязательным полем.');
        return;
    }
    setIsSubmitting(true);
    try {
      const { user_id, created_at, id, ...updates } = formState;
      const finalUpdates = { ...updates, user_id: user.id };
      
      const promise = editingContact
        ? supabase.from('contacts').update(finalUpdates).eq('id', editingContact.id)
        : supabase.from('contacts').insert([finalUpdates]);

      const { error } = await promise;
      if (error) throw error;

      toast.success(`Контакт успешно ${editingContact ? 'обновлен' : 'создан'}.`);
      fetchContacts();
      closeModal();
    } catch (err) {
      toast.error('Ошибка: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (contactId) => {
     toast('Вы уверены, что хотите удалить этот контакт?', {
        action: {
            label: 'Удалить', onClick: async () => {
                try {
                    const { error } = await supabase.from('contacts').delete().eq('id', contactId);
                    if (error) throw error;
                    toast.success('Контакт удален.');
                    fetchContacts();
                } catch (err) {
                    toast.error('Ошибка удаления: ' + err.message);
                }
            },
        },
        cancel: { label: 'Отмена' }
    });
  };
  
  const filteredContacts = contacts.filter(c => 
    `${c.first_name} ${c.last_name} ${c.email}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold text-text-primary">Контакты</h1>
            <p className="text-text-secondary mt-1.5">Управляйте своей базой контактов для рассылки опросов.</p>
        </div>
        <ActionButton onClick={() => openModal()}><Plus className="w-4 h-4 mr-2"/>Добавить контакт</ActionButton>
      </div>

       <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
            <input 
                type="text"
                placeholder="Поиск по имени или email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-11 pl-10 pr-4 bg-surface border-2 border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
            />
        </div>

      {loading ? (
        <div className="text-center py-20"><Loader2 className="h-8 w-8 text-primary animate-spin mx-auto"/></div>
      ) : contacts.length === 0 ? (
        <EmptyState onAction={() => openModal()} />
      ) : (
        <div className="bg-surface border border-border-subtle rounded-2xl shadow-ambient">
          <ul className="divide-y divide-border-subtle p-2">
            <AnimatePresence>
                {filteredContacts.length > 0 ? filteredContacts.map(contact => (
                    <ContactRow key={contact.id} contact={contact} onEdit={openModal} onDelete={handleDelete} />
                )) : (
                    <div className="text-center p-12 text-text-secondary">
                        <p>Контакты не найдены по вашему запросу.</p>
                    </div>
                )}
            </AnimatePresence>
          </ul>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingContact ? 'Редактировать контакт' : 'Новый контакт'}>
          <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormInput id="first_name" label="Имя" value={formState.first_name} onChange={handleInputChange} icon={<User size={16}/>}/>
                  <FormInput id="last_name" label="Фамилия" value={formState.last_name} onChange={handleInputChange} icon={<User size={16}/>}/>
              </div>
              <FormInput id="email" label="Email" type="email" required value={formState.email} onChange={handleInputChange} icon={<Mail size={16}/>}/>
              <FormInput id="phone" label="Телефон" value={formState.phone} onChange={handleInputChange} icon={<Phone size={16}/>}/>
              <FormInput id="company_name" label="Компания" value={formState.company_name} onChange={handleInputChange} icon={<Building size={16}/>}/>
              <div className="flex justify-end pt-4 gap-3">
                  <ActionButton variant='secondary' type="button" onClick={closeModal}>Отмена</ActionButton>
                  <ActionButton loading={isSubmitting} type="submit">{editingContact ? 'Сохранить' : 'Создать'}</ActionButton>
              </div>
          </form>
      </Modal>
    </div>
  );
}

export default Contacts;
