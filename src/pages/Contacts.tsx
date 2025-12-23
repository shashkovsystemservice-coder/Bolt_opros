
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { User, Mail, Phone, Building, Plus, MoreVertical, Edit, Trash2, X, Loader2, Users, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Reusable & Styled Components (Redesigned for consistency) --- //

const ActionButton = ({ onClick, children, variant = 'primary', size = 'md', disabled = false, loading = false }) => {
    const baseClasses = "inline-flex items-center justify-center font-medium text-sm rounded-md transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background";
    const sizeClasses = { md: "h-9 px-4", sm: "h-8 px-3" };
    const variantClasses = {
        primary: "bg-primary text-on-primary hover:bg-primary/90 focus:ring-primary",
        secondary: "bg-surface border border-border hover:bg-background text-text-primary focus:ring-primary",
        ghost: "hover:bg-surface text-text-secondary focus:ring-primary/50"
    };
    return <button onClick={onClick} disabled={disabled || loading} className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]}`}>{loading ? <Loader2 className="animate-spin h-5 w-5"/> : children}</button>
};

const FormInput = ({ id, label, ...props }) => (
  <div>
    {label && <label htmlFor={id} className="block text-sm font-medium text-text-primary mb-1.5">{label}</label>}
    <input
      id={id}
      className="w-full h-10 px-3 bg-background border border-border rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/80 focus:border-primary"
      {...props}
    />
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
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="bg-surface border border-border-subtle rounded-lg shadow-xl w-full max-w-md" 
            onClick={e => e.stopPropagation()}
          >
            <header className="px-6 py-4 border-b border-border-subtle flex justify-between items-center">
              <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
              <button onClick={onClose} className="p-1.5 rounded-full text-text-secondary hover:bg-background hover:text-text-primary transition-colors"><X className="w-4 h-4"/></button>
            </header>
            <div className="p-6">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const ContactRow = ({ contact, onEdit, onDelete }) => (
  <div className="flex justify-between items-center group py-3.5 border-b border-border-subtle">
    <div className="flex items-center gap-4">
      <div className="w-9 h-9 rounded-full bg-background border border-border-subtle flex items-center justify-center text-primary font-medium text-[13px]">
        {contact.first_name?.[0]?.toUpperCase()}{contact.last_name?.[0]?.toUpperCase() || ''}
      </div>
      <div>
        <p className="font-medium text-text-primary text-sm">{contact.first_name || ''} {contact.last_name || ''}</p>
        <p className="text-sm text-text-secondary">{contact.email}</p>
      </div>
    </div>
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pr-2">
      <button onClick={() => onEdit(contact)} className="p-1.5 text-text-secondary hover:text-primary rounded-md hover:bg-primary/10 transition-colors"><Edit className="h-4 w-4"/></button>
      <button onClick={() => onDelete(contact.id)} className="p-1.5 text-text-secondary hover:text-red-500 rounded-md hover:bg-red-500/10 transition-colors"><Trash2 className="h-4 w-4"/></button>
    </div>
  </div>
);

const EmptyState = ({ onAction }) => (
  <div className="text-center py-16">
    <Users size={40} className="text-text-secondary/70 mx-auto mb-4"/>
    <h3 className="text-lg font-semibold text-text-primary mb-1.5">Создайте ваш список контактов</h3>
    <p className="text-text-secondary mb-6 max-w-sm mx-auto text-sm">Импортируйте существующих или добавляйте новые контакты по одному.</p>
    <ActionButton onClick={onAction}><Plus className="w-4 h-4 mr-1.5"/>Добавить контакт</ActionButton>
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
      const { data, error } = await supabase.from('contacts').select('*').eq('user_id', user.id).order('last_name', { ascending: true });
      if (error) throw error;
      setContacts(data || []);
    } catch (err) {
      toast.error('Ошибка при загрузке контактов: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

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
     toast('Вы уверены, что хотите удалить контакт?', {
        action: { label: 'Удалить', onClick: async () => {
          try {
            const { error } = await supabase.from('contacts').delete().eq('id', contactId);
            if (error) throw error;
            toast.success('Контакт удален.');
            fetchContacts();
          } catch (err) {
            toast.error('Ошибка удаления: ' + err.message);
          }
        }},
        cancel: { label: 'Отмена' },
        style: { background: 'var(--surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' },
    });
  };
  
  const filteredContacts = contacts.filter(c => 
    `${c.first_name || ''} ${c.last_name || ''} ${c.email || ''}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Контакты</h1>
          <p className="text-text-secondary mt-1 text-sm">Управляйте вашей базой контактов для рассылки опросов.</p>
        </div>
        <div className="flex items-center gap-2">
           <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
              <input 
                  type="text"
                  placeholder="Поиск..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-9 pl-9 pr-4 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
              />
          </div>
          <ActionButton onClick={() => openModal()}><Plus className="w-4 h-4 mr-1.5"/>Добавить</ActionButton>
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="text-center py-20"><Loader2 className="h-8 w-8 text-primary animate-spin mx-auto"/></div>
      ) : contacts.length === 0 ? (
        <EmptyState onAction={() => openModal()} />
      ) : (
        <div className="border-t border-border-subtle">
          {filteredContacts.length > 0 ? filteredContacts.map(contact => (
              <ContactRow key={contact.id} contact={contact} onEdit={openModal} onDelete={handleDelete} />
          )) : (
              <div className="text-center py-16 text-text-secondary">
                  <p>Контакты не найдены по вашему запросу.</p>
              </div>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingContact ? 'Редактировать контакт' : 'Новый контакт'}>
          <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormInput id="first_name" label="Имя" value={formState.first_name} onChange={handleInputChange} />
                  <FormInput id="last_name" label="Фамилия" value={formState.last_name} onChange={handleInputChange} />
              </div>
              <FormInput id="email" label="Email" type="email" required value={formState.email} onChange={handleInputChange} />
              <FormInput id="phone" label="Телефон (опционально)" value={formState.phone} onChange={handleInputChange} />
              <div className="flex justify-end pt-3 gap-3">
                  <ActionButton variant='secondary' type="button" onClick={closeModal}>Отмена</ActionButton>
                  <ActionButton loading={isSubmitting} type="submit">{editingContact ? 'Сохранить' : 'Создать контакт'}</ActionButton>
              </div>
          </form>
      </Modal>
    </div>
  );
}

export default Contacts;
