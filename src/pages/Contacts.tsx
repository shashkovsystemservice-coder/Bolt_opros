/**
 * ⚠️ ТЕРМИНОЛОГИЯ БД:
 * 
 * - Administrator (таблица companies) = администратор Survey Pro, создаёт опросы
 * - Contact/Participant (таблица participants) = респондент, получает опросы
 * - company_id в participants = ID администратора (владельца контакта)
 * - company_name в participants = компания респондента (где он работает)
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { Plus, Search, Edit, Trash2, X, Loader2 } from 'lucide-react';

// --- TypeScript Interfaces ---

/**
 * Администратор Survey Pro (запись в таблице companies)
 * ВАЖНО: таблица называется "companies", но хранит АДМИНИСТРАТОРОВ, а не компании!
 */
interface Administrator {
  id: string;              // UUID администратора
  email: string;           // Логин администратора
  name: string;            // Имя/название администратора
  is_super_admin: boolean; // Флаг супер-админа
}

/**
 * Контакт/Респондент (запись в таблице participants)
 * Это человек, которому администратор отправляет опросы для заполнения
 */
interface Contact {
  id: string;              // UUID контакта
  company_id: string;      // ID администратора, который добавил контакт [FK → companies.id]
  first_name: string;      // Имя контакта
  last_name: string;       // Фамилия контакта
  email: string;           // Email контакта
  phone?: string;          // Телефон
  company_name?: string;   // Компания, где РАБОТАЕТ контакт (не путать с company_id!)
  position?: string;       // Должность
  created_at: string;      // Дата создания
  owner?: Partial<Administrator>; // JOIN с companies (инфо о владельце для супер-админа)
}


/**
 * Компонент строки контакта
 * Показывает компанию контакта и владельца (для супер-админа)
 */
const ContactRow = ({ contact, onEdit, onDelete, isSuperAdmin }: {
  contact: Contact;
  onEdit: (contact: Contact) => void;
  onDelete: (id: string) => void;
  isSuperAdmin: boolean;
}) => (
  <div className="flex justify-between items-center group py-3.5 border-b border-border-subtle">
    <div className="flex items-center gap-4">
      {/* Аватар */}
      <div className="w-9 h-9 rounded-full bg-background border border-border-subtle flex items-center justify-center text-primary font-medium text-[13px]">
        {(contact.first_name?.[0] || '').toUpperCase()}{(contact.last_name?.[0] || '').toUpperCase()}
      </div>
      
      <div>
        {/* Имя контакта */}
        <p className="font-medium text-text-primary text-sm">
          {contact.first_name} {contact.last_name}
        </p>
        
        {/* Email контакта */}
        <p className="text-sm text-text-secondary">{contact.email}</p>
        
        {/* Компания контакта (где он работает) */}
        {contact.company_name && (
          <p className="text-xs text-text-tertiary mt-0.5">
            🏢 {contact.company_name}
          </p>
        )}
        
        {/* Владелец контакта (кто добавил) — только для супер-админа */}
        {isSuperAdmin && contact.owner && (
          <p className="text-xs text-violet-600 mt-1 font-medium">
            👤 Администратор: {contact.owner.name} ({contact.owner.email})
          </p>
        )}
      </div>
    </div>
    
    {/* Кнопки действий */}
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pr-2">
      <button onClick={() => onEdit(contact)} className="p-1.5 text-text-secondary hover:text-primary rounded-md hover:bg-primary/10 transition-colors">
        <Edit className="h-4 w-4" />
      </button>
      <button onClick={() => onDelete(contact.id)} className="p-1.5 text-text-secondary hover:text-red-500 rounded-md hover:bg-red-500/10 transition-colors">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  </div>
);


export default function Contacts() {
  const { user } = useAuth();
  const isSuperAdmin = user?.is_super_admin || false;

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // ✅ Используй snake_case (как в БД), а не camelCase
  const [formState, setFormState] = useState<Partial<Contact>>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    company_name: '',
    position: ''
  });

  /**
   * Загружает контакты с учётом прав доступа:
   * - Обычный админ: только свои контакты (WHERE company_id = auth.uid())
   * - Супер-админ: все контакты всех администраторов + информация о владельцах
   * 
   * ВАЖНО: company_id в participants — это ID администратора-владельца!
   */
  const fetchContacts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    
    try {
      console.log('📋 Fetching contacts for administrator:', user.id, 'isSuperAdmin:', user.is_super_admin);
      
      let query = supabase
        .from('participants')  // ✅ Правильная таблица (не contacts!)
        .select(`
          id,
          company_id,
          first_name,
          last_name,
          email,
          phone,
          company_name,
          position,
          created_at,
          owner:companies!company_id (
            id,
            name,
            email
          )
        `)
        .order('last_name', { ascending: true });
      
      // Обычный админ видит только свои контакты
      if (!user.is_super_admin) {
        query = query.eq('company_id', user.id);  // ✅ company_id = ID администратора!
      }
      // Супер-админ видит всё (без фильтра)
      
      const { data, error } = await query;
      
      if (error) {
        console.error('❌ Supabase error:', error);
        throw error;
      }
      
      console.log('✅ Fetched contacts:', data);
      setContacts(data as Contact[] || []);
    } catch (err: any) {
      console.error('❌ Error fetching contacts:', err);
      toast.error('Ошибка загрузки контактов: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const openModal = (contact: Contact | null = null) => {
    if (contact) {
      setEditingContact(contact);
      setFormState(contact);
    } else {
      setEditingContact(null);
      setFormState({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        company_name: '',
        position: ''
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingContact(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };

  /**
   * Сохраняет новый контакт или обновляет существующий
   * 
   * ВАЖНО: При создании нового контакта ОБЯЗАТЕЛЬНО указываем:
   * company_id = user.id (это ID администратора, а не компания респондента!)
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
        toast.error('Вы не авторизованы');
        return;
    }
    if (!formState.email) {
      toast.error('Email обязателен');
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Служебные поля, которые не нужно отправлять в БД
      const { owner, ...formData } = formState;

      const updates = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone,
        company_name: formData.company_name,
        position: formData.position,
      };

      let error;

      if (editingContact) {
        // Обновление существующего
        const { data, error: updateError } = await supabase
          .from('participants')
          .update(updates)
          .eq('id', editingContact.id)
          .select();
        error = updateError;
      } else {
        // Создание нового, добавляем ID администратора-владельца
        const { data, error: insertError } = await supabase
          .from('participants')
          .insert([{ ...updates, company_id: user.id }])
          .select();
        error = insertError;
      }

      if (error) {
        console.error('❌ Save error:', error);
        throw error;
      }

      toast.success(editingContact ? '✅ Контакт обновлён' : '✅ Контакт создан');
      fetchContacts();
      closeModal();
    } catch (err: any) {
      console.error('❌ Submit error:', err);
      toast.error('Ошибка сохранения: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот контакт?')) return;
    try {
      const { error } = await supabase.from('participants').delete().eq('id', id);
      if (error) throw error;
      toast.success('🗑️ Контакт удалён');
      fetchContacts();
    } catch (error: any) {
      toast.error('Ошибка удаления: ' + error.message);
    }
  };

  const filteredContacts = useMemo(() => {
    return contacts.filter(c =>
      (c.first_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (c.last_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (c.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (c.company_name?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );
  }, [contacts, searchTerm]);


  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">
            Контакты 
            {isSuperAdmin && <span className="text-sm text-violet-500 ml-2">(Режим супер-админа)</span>}
          </h1>
          <p className="text-text-secondary mt-1 text-sm">
            {isSuperAdmin 
              ? 'Все контакты всех администраторов системы' 
              : 'Управляйте вашей базой контактов для рассылки опросов.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-full md:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
            <input
              type="text"
              placeholder="Поиск..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 h-9 text-sm border border-border-input rounded-md w-full md:w-56 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <button
            onClick={() => openModal()}
            className="h-9 inline-flex items-center justify-center gap-2 px-4 text-sm font-semibold text-white bg-primary rounded-md hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Добавить</span>
          </button>
        </div>
      </div>
      
      {loading ? (
        <div className="text-center py-10">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-sm text-text-secondary">Загрузка контактов...</p>
        </div>
      ) : filteredContacts.length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed border-border-subtle rounded-lg">
            <h3 className="text-lg font-medium text-text-primary">Контакты не найдены</h3>
            <p className="mt-1 text-sm text-text-secondary">
                {searchTerm ? 'Попробуйте изменить поисковый запрос.' : 'Нажмите "Добавить", чтобы создать первый контакт.'}
            </p>
        </div>
      ) : (
        <div className="border-t border-border-subtle">
          {filteredContacts.map((contact) => (
            <ContactRow 
              key={contact.id} 
              contact={contact} 
              onEdit={openModal} 
              onDelete={handleDelete}
              isSuperAdmin={isSuperAdmin}
            />
          ))}
        </div>
      )}


      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={closeModal}>
          <div className="bg-background rounded-lg shadow-xl w-full max-w-md m-4" onClick={e => e.stopPropagation()}>
            <form onSubmit={handleSubmit}>
              <div className="p-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-text-primary">{editingContact ? 'Редактировать контакт' : 'Новый контакт'}</h2>
                  <button type="button" onClick={closeModal} className="p-1 rounded-full hover:bg-background-hover">
                    <X className="h-5 w-5 text-text-secondary" />
                  </button>
                </div>
                <div className="mt-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" name="first_name" value={formState.first_name || ''} onChange={handleInputChange} placeholder="Имя" className="w-full px-3 py-2 text-sm border border-border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    <input type="text" name="last_name" value={formState.last_name || ''} onChange={handleInputChange} placeholder="Фамилия" className="w-full px-3 py-2 text-sm border border-border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                  <input type="email" name="email" value={formState.email || ''} onChange={handleInputChange} placeholder="Email (обязательно)" required className="w-full px-3 py-2 text-sm border border-border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  <input type="tel" name="phone" value={formState.phone || ''} onChange={handleInputChange} placeholder="Телефон" className="w-full px-3 py-2 text-sm border border-border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" name="company_name" value={formState.company_name || ''} onChange={handleInputChange} placeholder="Компания контакта" className="w-full px-3 py-2 text-sm border border-border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    <input type="text" name="position" value={formState.position || ''} onChange={handleInputChange} placeholder="Должность" className="w-full px-3 py-2 text-sm border border-border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 bg-background-alt border-t border-border-subtle flex justify-end items-center gap-3">
                <button type="button" onClick={closeModal} className="h-9 px-4 text-sm font-semibold text-text-secondary bg-background border border-border-input rounded-md hover:bg-background-hover">Отмена</button>

                <button type="submit" disabled={isSubmitting} className="h-9 w-36 inline-flex items-center justify-center px-4 text-sm font-semibold text-white bg-primary rounded-md hover:bg-primary/90 disabled:opacity-50">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (editingContact ? 'Сохранить' : 'Создать')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
