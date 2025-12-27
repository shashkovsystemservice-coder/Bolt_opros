
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, X, Loader2, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Типы ---
interface MetaPrompt {
  id: number;
  created_at: string;
  updated_at: string;
  prompt_name: string;
  prompt_text: string;
  generation_mode: string;
  is_active: boolean;
  version: number;
  notes: string | null;
}

// --- Переиспользуемые компоненты ---
const ActionButton = ({ onClick, children, variant = 'primary', size = 'md', disabled = false, loading = false, className = '' }) => {
    const baseClasses = "whitespace-nowrap inline-flex items-center justify-center font-medium text-sm rounded-md transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background";
    const sizeClasses = { md: "h-9 px-4", sm: "h-8 px-3" };
    const variantClasses = {
        primary: "bg-primary text-on-primary hover:bg-primary/90 focus:ring-primary",
        secondary: "bg-surface border border-border hover:bg-background text-text-primary focus:ring-primary",
        ghost: "hover:bg-background text-text-secondary focus:ring-primary/50",
        danger: "bg-red-500 text-white hover:bg-red-600 focus:ring-red-500",
    };
    return <button onClick={onClick} disabled={disabled || loading} className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}>{loading ? <Loader2 className="animate-spin h-5 w-5"/> : children}</button>;
};

const FormInput = ({ id, label, ...props }) => (
  <div>
    {label && <label htmlFor={id} className="block text-sm font-medium text-text-primary mb-1.5">{label}</label>}
    <input id={id} className="w-full h-10 px-3 bg-background border border-border rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/80" {...props} />
  </div>
);

const FormTextarea = ({ id, label, rows = 10, ...props }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-text-primary mb-1.5">{label}</label>
        <textarea id={id} rows={rows} className="w-full p-3 bg-background border border-border rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/80 font-mono text-sm" {...props}></textarea>
    </div>
);

const FormSelect = ({ id, label, children, ...props }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-text-primary mb-1.5">{label}</label>
        <select id={id} className="w-full h-10 px-3 bg-background border border-border rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/80" {...props}>
            {children}
        </select>
    </div>
);

const Modal = ({ isOpen, onClose, title, children, size = '2xl' }) => {
  if (!isOpen) return null;
  const sizeClasses = { '2xl': 'max-w-2xl' };
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center p-4 pt-[5vh]" onClick={onClose}>
          <motion.div initial={{ scale: 0.95, y: -20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: -20 }} transition={{ duration: 0.2, ease: 'easeOut' }} className={`bg-surface border border-border-subtle rounded-lg shadow-xl w-full ${sizeClasses[size]}`} onClick={e => e.stopPropagation()}>
            <header className="px-6 py-4 border-b border-border-subtle flex justify-between items-center">
              <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
              <button onClick={onClose} className="p-1.5 rounded-full text-text-secondary hover:bg-background"><X className="w-4 h-4"/></button>
            </header>
            <div className="p-6 max-h-[80vh] overflow-y-auto">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};


// --- Основной компонент ---
const AdminMetaPrompts = () => {
  const [prompts, setPrompts] = useState<MetaPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<MetaPrompt | null>(null);
  const [formState, setFormState] = useState<Partial<MetaPrompt>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPrompts = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('meta_prompts').select('*').order('updated_at', { ascending: false });
      if (error) throw error;
      setPrompts(data || []);
    } catch (err: any) {
      toast.error('Ошибка при загрузке промптов: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPrompts(); }, [fetchPrompts]);

  const openModal = (prompt: MetaPrompt | null = null) => {
    setEditingPrompt(prompt);
    setFormState(prompt ? { ...prompt } : { prompt_name: '', prompt_text: '', generation_mode: 'survey', version: 1, notes: '' });
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setFormState(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.prompt_name || !formState.prompt_text) {
        toast.error('Название и текст промпта обязательны.');
        return;
    }
    setIsSubmitting(true);
    try {
      const { id, created_at, updated_at, is_active, ...updates } = formState;
      const promise = editingPrompt
        ? supabase.from('meta_prompts').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', editingPrompt.id)
        : supabase.from('meta_prompts').insert([updates]);
      const { error } = await promise;
      if (error) throw error;
      toast.success(`Промпт успешно ${editingPrompt ? 'обновлен' : 'создан'}.`);
      fetchPrompts();
      closeModal();
    } catch (err: any) {
      toast.error('Ошибка сохранения: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (promptId: number) => {
     toast.error('Вы уверены, что хотите удалить этот промпт?', {
        action: { label: 'Удалить', onClick: async () => {
          try {
            const { error } = await supabase.from('meta_prompts').delete().eq('id', promptId);
            if (error) throw error;
            toast.success('Промпт удален.');
            fetchPrompts();
          } catch (err: any) { toast.error('Ошибка удаления: ' + err.message); }
        }},
        cancel: { label: 'Отмена' },
    });
  };

  const handleSetActive = async (prompt: MetaPrompt) => {
    if (prompt.is_active) return;
    try {
        const { error } = await supabase.rpc('set_active_meta_prompt', { p_id: prompt.id, p_mode: prompt.generation_mode });
        if (error) throw error;
        toast.success(`Промпт "${prompt.prompt_name}" активирован.`);
        fetchPrompts();
    } catch(err: any) {
        toast.error('Ошибка активации: ' + err.message);
    }
  }

  if (loading) {
      return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 text-primary animate-spin"/></div>
  }

  return (
    <div>
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-text-primary">Управление метапромптами</h2>
            <ActionButton onClick={() => openModal()}><Plus className="w-4 h-4 mr-1.5"/>Создать промпт</ActionButton>
        </div>

        <div className="bg-surface border border-border rounded-lg">
            <div className="grid grid-cols-12 gap-4 px-4 py-2.5 border-b border-border-subtle font-medium text-sm text-text-secondary">
                <div className="col-span-4">Название</div>
                <div className="col-span-2">Режим</div>
                <div className="col-span-2">Статус</div>
                <div className="col-span-2">Обновлено</div>
                <div className="col-span-2 text-right">Действия</div>
            </div>

            {prompts.map(prompt => (
                <div key={prompt.id} className="grid grid-cols-12 gap-4 px-4 py-3 items-center border-b border-border-subtle last:border-b-0">
                    <div className="col-span-4 font-medium text-text-primary">{prompt.prompt_name}</div>
                    <div className="col-span-2 text-sm"><span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md">{prompt.generation_mode}</span></div>
                    <div className="col-span-2">
                        {prompt.is_active ? (
                            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-green-600"><ShieldCheck size={16}/> Активен</span>
                        ) : (
                            <span className="text-sm text-text-secondary">-</span>
                        )}
                    </div>
                    <div className="col-span-2 text-sm text-text-secondary">{new Date(prompt.updated_at).toLocaleDateString()}</div>
                    <div className="col-span-2 flex justify-end items-center gap-1">
                        {!prompt.is_active && (
                            <ActionButton onClick={() => handleSetActive(prompt)} variant="secondary" size="sm">Активировать</ActionButton>
                        )}
                        <ActionButton onClick={() => openModal(prompt)} variant="ghost" size="sm"><Edit size={16}/></ActionButton>
                        <ActionButton onClick={() => handleDelete(prompt.id)} variant="ghost" size="sm"><Trash2 size={16}/></ActionButton>
                    </div>
                </div>
            ))}
             {prompts.length === 0 && <p className="text-center py-8 text-text-secondary">Метапромпты еще не созданы.</p>}
        </div>

        <Modal isOpen={isModalOpen} onClose={closeModal} title={editingPrompt ? 'Редактировать метапромпт' : 'Создать метапромпт'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <FormInput id="prompt_name" label="Название промпта" value={formState.prompt_name || ''} onChange={handleInputChange} required/>
                <FormSelect id="generation_mode" label="Режим генерации" value={formState.generation_mode || 'survey'} onChange={handleInputChange}>
                    <option value="survey">Survey (Опрос)</option>
                    <option value="diagnostic">Diagnostic (Диагностика)</option>
                    <option value="framework">Framework (Фреймворк)</option>
                </FormSelect>
                <FormTextarea id="prompt_text" label="Текст промпта" value={formState.prompt_text || ''} onChange={handleInputChange} required/>
                <FormInput id="version" label="Версия" type="number" value={formState.version || 1} onChange={handleInputChange} />
                <FormTextarea id="notes" label="Заметки" value={formState.notes || ''} onChange={handleInputChange} rows={3} />
                <div className="flex justify-end pt-4 gap-3">
                    <ActionButton variant='secondary' type="button" onClick={closeModal}>Отмена</ActionButton>
                    <ActionButton loading={isSubmitting} variant="primary" type="submit">{editingPrompt ? 'Сохранить' : 'Создать'}</ActionButton>
                </div>
            </form>
        </Modal>
    </div>
  );
}

export default AdminMetaPrompts;
