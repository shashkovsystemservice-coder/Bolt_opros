
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Loader2, X, Type, GripVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { RatingOptions, QuestionTemplate } from '../types/database';

// --- Типы данных ---
export interface LocalSection {
  id: string;
  itemType: 'section';
  text: string;
}

export interface LocalQuestion {
  id: string | number;
  itemType: 'question';
  text: string;
  type: 'text' | 'choice' | 'multi_choice' | 'rating' | 'number';
  required: boolean;
  options: string[] | RatingOptions | string | null;
  rating_max: 3 | 5 | 10;
  rating_labels: [string, string];
}

export type SurveyItem = LocalQuestion | LocalSection;

interface ManualSurveyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  isSaving: boolean;
  initialData?: {
    id?: string;
    title: string;
    description: string;
    finalMessage: string;
    items: any[];
  } | null;
}

export const ManualSurveyModal: React.FC<ManualSurveyModalProps> = ({ isOpen, onClose, onSave, isSaving, initialData }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [finalMessage, setFinalMessage] = useState('Спасибо за участие!');
  const [items, setItems] = useState<SurveyItem[]>([]);

  // Синхронизация данных при открытии (в т.ч. после AI генерации)
  useEffect(() => {
    if (initialData && isOpen) {
        setTitle(initialData.title || '');
        setDescription(initialData.description || '');
        setFinalMessage(initialData.finalMessage || 'Спасибо за участие!');
        
        const mappedItems = initialData.items.map(item => {
            // Если это вопрос типа рейтинг, проверяем вложенные опции
            if (item.type === 'rating' || (item.itemType === 'question' && item.type === 'rating')) {
                const opts = item.options && typeof item.options === 'object' ? (item.options as RatingOptions) : null;
                return {
                    ...item,
                    id: item.id || crypto.randomUUID(),
                    itemType: 'question',
                    type: 'rating',
                    rating_max: opts?.scale_max || item.rating_max || 5,
                    rating_labels: [
                        opts?.label_min || (item.rating_labels ? item.rating_labels[0] : ''),
                        opts?.label_max || (item.rating_labels ? item.rating_labels[1] : '')
                    ]
                };
            }
            return { 
                ...item, 
                id: item.id || crypto.randomUUID(),
                itemType: item.itemType || (item.text && !item.type ? 'section' : 'question') 
            };
        });
        setItems(mappedItems);
    } else if (!isOpen) {
        setTitle('');
        setDescription('');
        setItems([]);
    }
  }, [initialData, isOpen]);

  const addItem = (type: 'question' | 'section') => {
    const newItem: SurveyItem = type === 'question'
      ? { id: crypto.randomUUID(), itemType: 'question', text: '', type: 'text', required: true, options: [], rating_max: 5, rating_labels: ['', ''] }
      : { id: crypto.randomUUID(), itemType: 'section', text: '' };
    setItems([...items, newItem]);
  };

  const updateItem = (id: string | number, field: string, value: any) => {
      setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const removeItem = (id: string | number) => setItems(prev => prev.filter(i => i.id !== id));

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({ title, description, finalMessage, items });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        <header className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
          <div>
            <h2 className="text-xl font-bold text-gray-800">
                {initialData?.title ? 'Проверьте ваш опрос' : 'Новый опрос'}
            </h2>
            <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider">Ручное создание и редактирование</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 transition-colors"><X size={20}/></button>
        </header>

        <main className="flex-grow overflow-y-auto p-6 space-y-8">
          {/* Header Info */}
          <div className="space-y-4">
            <input 
                value={title} 
                onChange={e => setTitle(e.target.value)} 
                placeholder="Название опроса" 
                className="w-full text-2xl font-bold border-b border-transparent focus:border-blue-500 focus:outline-none pb-1 transition-colors"
            />
            <textarea 
                value={description} 
                onChange={e => setDescription(e.target.value)} 
                placeholder="Добавьте краткое описание цели опроса..." 
                className="w-full text-gray-600 resize-none focus:outline-none"
                rows={2}
            />
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Вопросы и секции</h3>
            <AnimatePresence>
                {items.map((item, idx) => (
                    <div key={item.id}>
                        {item.itemType === 'section' ? (
                            <div className="flex items-center gap-3 bg-gray-100 p-3 rounded-lg border border-gray-200">
                                <Type size={18} className="text-gray-400"/>
                                <input 
                                    value={item.text} 
                                    onChange={e => updateItem(item.id, 'text', e.target.value)}
                                    placeholder="Название новой секции"
                                    className="bg-transparent font-bold w-full focus:outline-none"
                                />
                                <button onClick={() => removeItem(item.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={16}/></button>
                            </div>
                        ) : (
                            <QuestionEditor question={item as LocalQuestion} index={idx} update={updateItem} remove={removeItem} />
                        )}
                    </div>
                ))}
            </AnimatePresence>

            <div className="flex gap-4 pt-4">
                <button onClick={() => addItem('question')} className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg transition-colors">
                    <Plus size={18}/> Добавить вопрос
                </button>
                <button onClick={() => addItem('section')} className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:bg-gray-100 px-4 py-2 rounded-lg transition-colors">
                    <Type size={18}/> Новая секция
                </button>
            </div>
          </div>

          <div className="pt-6 border-t">
              <label className="text-xs font-bold text-gray-400 uppercase block mb-2">Сообщение в конце опроса</label>
              <textarea 
                value={finalMessage} 
                onChange={e => setFinalMessage(e.target.value)}
                className="w-full p-3 bg-gray-50 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                rows={2}
              />
          </div>
        </main>

        <footer className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2 text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors">Отмена</button>
          <button 
            onClick={handleSave} 
            disabled={isSaving || !title || items.length === 0}
            className="px-6 py-2 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2 transition-all shadow-lg"
          >
            {isSaving ? <Loader2 size={18} className="animate-spin"/> : <Save size={18}/>}
            {isSaving ? 'Сохранение...' : 'Сохранить опрос'}
          </button>
        </footer>
      </motion.div>
    </div>
  );
};

// --- Внутренний компонент редактора вопроса ---
const QuestionEditor = ({ question, index, update, remove }) => {
    const handleOptions = (val: string) => {
        const arr = val.split(/[,;\n]/).map(s => s.trim()).filter(Boolean);
        update(question.id, 'options', arr);
    };

    return (
        <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm relative group">
            <div className="flex gap-4">
                <div className="flex flex-col items-center gap-2 mt-1">
                    <GripVertical className="text-gray-300 cursor-move" size={20}/>
                    <span className="text-xs font-bold text-gray-300">{index + 1}</span>
                </div>
                <div className="flex-grow space-y-4">
                    <input 
                        value={question.text} 
                        onChange={e => update(question.id, 'text', e.target.value)}
                        placeholder="Введите ваш вопрос здесь..."
                        className="w-full text-lg font-medium focus:outline-none placeholder:text-gray-300"
                    />
                    
                    <div className="flex flex-wrap gap-4 items-center">
                        <select 
                            value={question.type} 
                            onChange={e => update(question.id, 'type', e.target.value)}
                            className="bg-gray-50 border border-gray-200 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="text">Текст (свободный ответ)</option>
                            <option value="rating">Шкала рейтинга</option>
                            <option value="choice">Один вариант (Choice)</option>
                            <option value="multi_choice">Несколько вариантов</option>
                            <option value="number">Числовое значение</option>
                        </select>

                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input 
                                type="checkbox" 
                                checked={question.required} 
                                onChange={e => update(question.id, 'required', e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-600 font-medium">Обязательный</span>
                        </label>
                    </div>

                    {/* Настройки рейтинга */}
                    {question.type === 'rating' && (
                        <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 flex flex-wrap gap-6 items-end">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-blue-400 uppercase">Размер шкалы</label>
                                <select 
                                    value={question.rating_max || 5} 
                                    onChange={e => update(question.id, 'rating_max', parseInt(e.target.value))}
                                    className="block w-full bg-white border border-blue-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value={3}>1-3</option>
                                    <option value={5}>1-5</option>
                                    <option value={10}>1-10</option>
                                </select>
                            </div>
                            <div className="flex-grow space-y-1">
                                <label className="text-[10px] font-bold text-blue-400 uppercase">Метки шкалы (min, max)</label>
                                <div className="flex items-center gap-2">
                                     <input 
                                        type="text" 
                                        value={question.rating_labels?.[0] || ''} 
                                        onChange={e => update(question.id, 'rating_labels', [e.target.value, question.rating_labels?.[1] || ''])} 
                                        placeholder="Метка для 1"
                                        className="w-full bg-white border border-blue-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                     <input 
                                        type="text" 
                                        value={question.rating_labels?.[1] || ''} 
                                        onChange={e => update(question.id, 'rating_labels', [question.rating_labels?.[0] || '', e.target.value])} 
                                        placeholder={`Метка для ${question.rating_max || 5}`}
                                        className="w-full bg-white border border-blue-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Настройки вариантов */}
                    {(question.type === 'choice' || question.type === 'multi_choice') && (
                        <div className="mt-4">
                             <textarea 
                                value={Array.isArray(question.options) ? question.options.join(', ') : ''} 
                                onChange={e => handleOptions(e.target.value)}
                                placeholder="Варианты через запятую, точку с запятой или новую строку" 
                                rows={3}
                                className="w-full p-3 bg-gray-50 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                        </div>
                    )}
                </div>
            </div>
            <button onClick={() => remove(question.id)} className="absolute top-4 right-4 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                <Trash2 size={18} />
            </button>
        </motion.div>
    );
};
