
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Loader2, X, Type } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Типы данных ---
export interface LocalSection {
  id: string;
  itemType: 'section';
  text: string;
}

export interface LocalQuestion {
  id: string;
  itemType: 'question';
  text: string;
  type: 'text' | 'choice' | 'multi_choice' | 'rating' | 'numeric';
  required: boolean;
  options: string[] | string; // Может быть строкой или массивом
}

export type SurveyItem = LocalQuestion | LocalSection;

// --- Пропсы компонента ---
interface ManualSurveyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  isSaving: boolean;
  initialData?: {
    title: string;
    description: string;
    finalMessage: string;
    items: SurveyItem[];
  } | null;
}

// --- Вспомогательные компоненты ---
const FormInput = ({ id, label, value, onChange, placeholder, as = 'input', rows = 3 }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
        {as === 'textarea' ? (
            <textarea id={id} value={value} onChange={onChange} placeholder={placeholder} rows={rows} className="w-full p-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400" />
        ) : (
            <input type="text" id={id} value={value} onChange={onChange} placeholder={placeholder} className="w-full h-10 px-3 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400" />
        )}
    </div>
);

const SectionEditor = ({ item, update, remove }) => (
    <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-gray-100 p-3 rounded-lg border border-gray-200 flex items-center gap-3">
        <input 
            type="text" 
            value={item.text} 
            onChange={e => update(item.id, 'text', e.target.value)} 
            placeholder="Название секции" 
            className="w-full text-base bg-transparent focus:outline-none font-semibold text-gray-700 placeholder-gray-500"
        />
        <button onClick={() => remove(item.id)} className="text-gray-400 hover:text-red-500 p-1 rounded-md flex-shrink-0">
            <Trash2 size={16} />
        </button>
    </motion.div>
);

const QuestionEditor = ({ question, qNumber, update, remove }) => {

    const placeholders = {
        text: "Например: Опишите ваши впечатления от работы с Петром Петровичем",
        rating: "Например: Оцените пунктуальность руководителя от 1 до 5",
        choice: "Например: Какой отдел вы представляете? (Варианты: Маркетинг, IT, Продажи)",
        multi_choice: "Например: Какие инструменты вы используете? (Варианты: Figma, Jira, Slack)",
        numeric: "Например: Сколько лет вы работаете в компании?",
    };

    const optionsPlaceholder = "Введите варианты через запятую. Пример: Да, Нет, Затрудняюсь ответить";

    return (
        <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-start gap-3">
                <div className="w-full">
                    <input type="text" value={question.text} onChange={e => update(question.id, 'text', e.target.value)} placeholder={placeholders[question.type] || placeholders.text} className="w-full text-base bg-transparent focus:outline-none font-medium"/>
                    <div className="flex flex-col sm:flex-row gap-4 mt-3">
                        <select value={question.type} onChange={e => update(question.id, 'type', e.target.value)} className="h-9 w-full sm:w-48 px-2 border border-gray-300 rounded-md bg-white focus:outline-none text-sm">
                            <option value="text">Текст</option>
                            <option value="numeric">Число</option>
                            <option value="rating">Шкала (1-5)</option>
                            <option value="choice">Один вариант</option>
                            <option value="multi_choice">Несколько вариантов</option>
                        </select>
                        <div className="flex items-center gap-2">
                            <input id={`req-${question.id}`} type="checkbox" checked={question.required} onChange={e => update(question.id, 'required', e.target.checked)} className="h-4 w-4 rounded border-gray-300"/>
                            <label htmlFor={`req-${question.id}`} className="text-sm font-medium text-gray-600">Обязательный</label>
                        </div>
                    </div>
                </div>
                <button onClick={() => remove(question.id)} className="text-gray-400 hover:text-red-500 p-1 rounded-md flex-shrink-0"><Trash2 size={16} /></button>
            </div>
            {(question.type === 'choice' || question.type === 'multi_choice') && (
                <div className="mt-4 pt-4 pl-4 border-t">
                    <input type="text" value={Array.isArray(question.options) ? question.options.join(', ') : question.options} onChange={e => update(question.id, 'options', e.target.value)} placeholder={optionsPlaceholder} className="w-full h-8 px-2 border-b focus:outline-none bg-transparent text-sm"/>
                </div>
            )}
        </motion.div>
    );
};

// --- Основной компонент модального окна ---
export const ManualSurveyModal: React.FC<ManualSurveyModalProps> = ({ isOpen, onClose, onSave, isSaving, initialData }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [finalMessage, setFinalMessage] = useState('');
  const [items, setItems] = useState<SurveyItem[]>([]);

  useEffect(() => {
    if (initialData && isOpen) {
      setTitle(initialData.title || '');
      setDescription(initialData.description || '');
      setFinalMessage(initialData.finalMessage || 'Спасибо за участие в опросе!');
      setItems(initialData.items || []);
    } else if (!isOpen) {
        setTitle('');
        setDescription('');
        setFinalMessage('');
        setItems([]);
    }
  }, [initialData, isOpen]);

  const addItem = (type: 'question' | 'section') => {
    const newItem: SurveyItem = type === 'question'
      ? { id: crypto.randomUUID(), itemType: 'question', text: '', type: 'text', required: true, options: [] }
      : { id: crypto.randomUUID(), itemType: 'section', text: '' };
    setItems([...items, newItem]);
  };

  const removeItem = (id: string) => setItems(items.filter(item => item.id !== id));
  const updateItem = (id: string, field: string, value: any) => setItems(items.map(item => (item.id === id ? { ...item, [field]: value } : item)));
  const handleSave = () => onSave({ title, description, finalMessage, items });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <header className="p-5 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold">{initialData?.title ? 'Импортированный опрос' : 'Создание опроса вручную'}</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100"><X size={20}/></button>
        </header>

        <main className="p-6 space-y-6 overflow-y-auto">
          <div className="space-y-4">
            <FormInput id="title" label="Название опроса" value={title} onChange={e => setTitle(e.target.value)} placeholder="Напр., Ежегодный опрос вовлеченности" />
            <FormInput id="description" label="Описание (опционально)" value={description} onChange={e => setDescription(e.target.value)} placeholder="Например: Исследование компетенций руководителя для ежегодного отчета" as="textarea" />
            <FormInput id="finalMessage" label="Финальное сообщение (опционально)" value={finalMessage} onChange={e => setFinalMessage(e.target.value)} placeholder="Спасибо за участие в опросе!" as="textarea" />
          </div>
          <div>
            <h3 className="text-md font-semibold mb-3">Структура опроса</h3>
            <div className="space-y-3">
                <AnimatePresence>
                {items.map((item, index) => (
                    item.itemType === 'section'
                        ? <SectionEditor key={item.id} item={item} update={updateItem} remove={removeItem} />
                        : <QuestionEditor key={item.id} question={item} qNumber={index + 1} update={updateItem} remove={removeItem} />
                ))}
                </AnimatePresence>
                {items.length === 0 && (
                    <div className="text-center py-8 border-2 border-dashed rounded-lg">
                        <p className="text-sm text-gray-500">Начните с добавления секции или вопроса</p>
                    </div>
                )}
                 <div className="flex items-center gap-4 mt-4">
                    <button onClick={() => addItem('question')} className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-500">
                        <Plus size={16}/> Добавить вопрос
                    </button>
                    <button onClick={() => addItem('section')} className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900">
                        <Type size={16}/> Добавить секцию
                    </button>
                </div>
            </div>
          </div>
        </main>

        <footer className="p-5 border-t flex justify-end gap-3 bg-gray-50">
          <button onClick={onClose} disabled={isSaving} className="h-9 px-4 bg-white border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50 disabled:opacity-50">Отмена</button>
          <button onClick={handleSave} disabled={isSaving || !title || items.filter(i => i.itemType === 'question').length === 0} className="h-9 px-4 bg-gray-800 text-white rounded-md text-sm font-medium hover:bg-gray-700 disabled:opacity-50 flex items-center gap-2">
            {isSaving ? <Loader2 className="animate-spin h-4 w-4"/> : <Save className="h-4 w-4"/>}
            {isSaving ? 'Сохранение...' : 'Сохранить опрос'}
          </button>
        </footer>
      </div>
    </div>
  );
};
