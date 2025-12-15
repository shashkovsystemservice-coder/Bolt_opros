
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import { AiSurveyModal } from '../components/AiSurveyModal';
import { Plus, Trash2, Download, UploadCloud, GripVertical } from 'lucide-react';
import ExcelJS from 'exceljs';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';


export interface LocalQuestion {
  id: string; 
  text: string;
  type: 'text' | 'number' | 'email' | 'rating' | 'choice';
  required: boolean;
  options: string[];
}

// Helper component for individual questions to make them draggable
const SortableQuestionItem = React.memo(({
    q, qIndex, updateQuestion, removeQuestion, addOption, removeOption, updateOption
}: { 
    q: LocalQuestion; 
    qIndex: number;
    updateQuestion: (id: string, field: keyof LocalQuestion, value: any) => void;
    removeQuestion: (id: string) => void;
    addOption: (questionId: string) => void;
    removeOption: (questionId: string, optionIndex: number) => void;
    updateOption: (questionId: string, optionIndex: number, value: string) => void;
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({id: q.id});
  
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} className="bg-white p-6 rounded-2xl border border-[#E8EAED] shadow-sm relative">
            <div className='flex items-start gap-4'>
                <div className="flex items-center pt-2 gap-2">
                    <button {...attributes} {...listeners} className="cursor-grab text-gray-400 hover:text-gray-600">
                        <GripVertical size={20}/>
                    </button>
                    <span className="text-xl font-semibold text-gray-400">Q{qIndex + 1}</span>
                </div>
                <div className='flex-grow'>
                    <input
                        type="text"
                        value={q.text}
                        onChange={e => updateQuestion(q.id, 'text', e.target.value)}
                        placeholder="Текст вашего вопроса"
                        className="w-full text-lg font-medium border-b-2 border-transparent focus:border-blue-500 outline-none pb-2 mb-3"
                    />
                    <div className='flex items-center gap-6'>
                        <select value={q.type} onChange={e => updateQuestion(q.id, 'type', e.target.value)} className='h-10 px-3 rounded-md border border-gray-300 bg-white'>
                            <option value="text">Текст</option>
                            <option value="number">Число</option>
                            <option value="rating">Рейтинг (1-10)</option>
                            <option value="choice">Один вариант</option>
                        </select>
                        <div className="flex items-center">
                            <input
                                id={`required-${q.id}`}
                                type="checkbox"
                                checked={q.required}
                                onChange={e => updateQuestion(q.id, 'required', e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <label htmlFor={`required-${q.id}`} className="ml-2 block text-sm text-gray-900">
                                Обязательный
                            </label>
                        </div>
                    </div>

                    {q.type === 'choice' && (
                        <div className='mt-4 pl-4 border-l-2 border-gray-200'>
                            {q.options.map((opt, oIndex) => (
                                <div key={oIndex} className='flex items-center gap-2 mb-2'>
                                    <input type='radio' disabled className='h-4 w-4' />
                                    <input
                                        type='text'
                                        value={opt}
                                        onChange={e => updateOption(q.id, oIndex, e.target.value)}
                                        placeholder={`Вариант ${oIndex + 1}`}
                                        className='flex-grow border-b-2 border-transparent focus:border-blue-300 outline-none'
                                    />
                                    <button onClick={() => removeOption(q.id, oIndex)} className="text-gray-400 hover:text-red-500">
                                        <Trash2 size={16}/>
                                    </button>
                                </div>
                            ))}
                            <button onClick={() => addOption(q.id)} className='flex items-center gap-2 mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium'>
                                <Plus size={16}/>
                                Добавить вариант
                            </button>
                        </div>
                    )}
                </div>
                <button onClick={() => removeQuestion(q.id)} className="text-gray-500 hover:text-red-600 absolute top-4 right-4">
                    <Trash2 size={20}/>
                </button>
            </div>
        </div>
    );
});


const CreateSurvey = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isInteractive, setIsInteractive] = useState(false);
  const [questions, setQuestions] = useState<LocalQuestion[]>([]);
  
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  
  const questionIds = useMemo(() => questions.map(q => q.id), [questions]);

  const handleOpenAiModal = () => setIsAiModalOpen(true);

  const handleAcceptAiSurvey = (aiQuestions: Omit<LocalQuestion, 'id'>[], topic: string, interactive: boolean, desc: string) => {
    setTitle(topic);
    setDescription(desc);
    setIsInteractive(interactive);
    setQuestions(aiQuestions.map(q => ({ ...q, id: crypto.randomUUID() })));
    setIsAiModalOpen(false);
  };

  const addQuestion = () => {
    const newQuestion: LocalQuestion = {
      id: crypto.randomUUID(),
      text: '',
      type: 'text',
      required: true,
      options: []
    };
    setQuestions([...questions, newQuestion]);
  };

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };
  
  const updateQuestion = (id: string, field: keyof LocalQuestion, value: any) => {
    setQuestions(questions.map(q => (q.id === id ? { ...q, [field]: value } : q)));
  };
  
  const addOption = (questionId: string) => {
    setQuestions(questions.map(q => {
        if (q.id === questionId) {
            return { ...q, options: [...q.options, ''] };
        }
        return q;
    }));
  }

  const removeOption = (questionId: string, optionIndex: number) => {
      setQuestions(questions.map(q => {
          if (q.id === questionId) {
              const newOptions = q.options.filter((_, i) => i !== optionIndex);
              return { ...q, options: newOptions };
          }
          return q;
      }));
  }

  const updateOption = (questionId: string, optionIndex: number, value: string) => {
      setQuestions(questions.map(q => {
          if (q.id === questionId) {
              const newOptions = [...q.options];
              newOptions[optionIndex] = value;
              return { ...q, options: newOptions };
          }
          return q;
      }));
  }
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const {active, over} = event;
    
    if (over && active.id !== over.id) {
      setQuestions((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }

  const handleDownloadTemplate = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Шаблон для вопросов');

    const headers = [
      { header: 'Текст вопроса', key: 'text', width: 70 },
      { header: 'Тип вопроса', key: 'type', width: 25 },
      { header: 'Обязательный?', key: 'required', width: 20 },
      { header: 'Варианты ответа (для типа "Один вариант")', key: 'options', width: 50 },
    ];
    worksheet.columns = headers;

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1A73E8' },
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    headerRow.height = 30;

    const questionTypes = ['Текст', 'Число', 'Рейтинг (1-10)', 'Один вариант'];
    const requiredOptions = ['Да', 'Нет'];
    
    for (let i = 2; i <= 101; i++) {
        worksheet.getCell(`B${i}`).dataValidation = {
            type: 'list',
            allowBlank: false,
            formulae: [`"${questionTypes.join(',')}"`],
            showErrorMessage: true,
            errorTitle: 'Неверный тип',
            error: 'Пожалуйста, выберите тип из выпадающего списка.',
        };
        worksheet.getCell(`C${i}`).dataValidation = {
            type: 'list',
            allowBlank: false,
            formulae: [`"${requiredOptions.join(',')}"`],
            showErrorMessage: true,
            errorTitle: 'Неверное значение',
            error: 'Пожалуйста, выберите "Да" или "Нет".',
        };
    }

    worksheet.views = [{ state: 'frozen', ySplit: 1 }];
    worksheet.mergeCells('E1:G1');
    const instructionTitle = worksheet.getCell('E1');
    instructionTitle.value = 'ИНСТРУКЦИЯ';
    instructionTitle.font = { bold: true, color: { argb: 'FF1A73E8' }, size: 14 };
    instructionTitle.alignment = { horizontal: 'center' };
    worksheet.getCell('E2').value = '1. Текст вопроса: Просто напишите ваш вопрос.';
    worksheet.getCell('E3').value = '2. Тип вопроса: Выберите из выпадающего списка.';
    worksheet.getCell('E4').value = '3. Обязательный?: Выберите "Да" или "Нет".';
    worksheet.getCell('E5').value = '4. Варианты ответа: Если выбрали тип "Один вариант", перечислите варианты через запятую ( , ).';
    
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'survey_template.xlsx';
    document.body.appendChild(link);
    link.click();
    URL.revokeObjectURL(link.href);
    document.body.removeChild(link);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const buffer = e.target?.result;
        if (!buffer) return;
        
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer as ArrayBuffer);
        
        const worksheet = workbook.getWorksheet(1);
        if (!worksheet) {
            throw new Error("Не удалось найти лист в файле Excel.");
        }
        
        const newQuestions: LocalQuestion[] = [];
        const headerMap: Record<string, number> = {};
        worksheet.getRow(1).eachCell({ includeEmpty: true }, (cell, colNumber) => {
            headerMap[cell.value as string] = colNumber;
        });

        const textCol = headerMap['Текст вопроса'];
        const typeCol = headerMap['Тип вопроса'];
        const requiredCol = headerMap['Обязательный?'];
        const optionsCol = headerMap['Варианты ответа (для типа "Один вариант")'];

        if (!textCol || !typeCol || !requiredCol) {
            throw new Error('Не удалось найти обязательные колонки: "Текст вопроса", "Тип вопроса", "Обязательный?". Пожалуйста, используйте скачанный шаблон.');
        }

        const typeMap: Record<string, LocalQuestion['type']> = {
            'Текст': 'text',
            'Число': 'number',
            'Рейтинг (1-10)': 'rating',
            'Один вариант': 'choice'
        };

        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber > 1) { 
            const text = row.getCell(textCol).value as string || '';
            const userType = row.getCell(typeCol).value as string || 'Текст';
            const userRequired = row.getCell(requiredCol).value as string || 'Нет';
            const optionsRaw = (optionsCol ? row.getCell(optionsCol).value : '') as string || '';
            
            const type = typeMap[userType] || 'text';
            const required = userRequired === 'Да';
            const options = type === 'choice' ? optionsRaw.split(',').map(o => o.trim()).filter(o => o) : [];

            if (text) {
              newQuestions.push({ id: crypto.randomUUID(), text, type, required, options });
            }
          }
        });

        setQuestions(newQuestions);
        setError(null);

      } catch (err: any) {
        console.error("Ошибка при обработке файла:", err);
        setError(`Ошибка при обработке файла: ${err.message}`);
      } finally {
        if(fileInputRef.current) {
            fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSaveSurvey = async () => {
    if (!title.trim()) {
      setError('Название опроса не может быть пустым.');
      return;
    }
     if (questions.length === 0) {
      setError('Добавьте хотя бы один вопрос.');
      return;
    }
    if (!user) {
      setError('Не удалось определить ID пользователя. Невозможно создать опрос.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // === ИСПРАВЛЕНИЕ: Используем user.id напрямую для company_id ===
      const { data: surveyData, error: surveyError } = await supabase
        .from('survey_templates')
        .insert([{'title': title, 'description': description, 'company_id': user.id, 'is_interactive': isInteractive, 'unique_code': `${Date.now()}${Math.random().toString(36).substring(2, 9)}`}])
        .select()
        .single();

      if (surveyError) throw surveyError;
      if (!surveyData) throw new Error('Не удалось создать шаблон опроса.');

      const surveyId = surveyData.id;

      const questionsToInsert = questions.map((q, index) => ({
        survey_template_id: surveyId,
        question_text: q.text,
        question_type: q.type,
        is_required: q.required,
        question_order: index + 1,
        choice_options: (q.type === 'choice' && q.options.length > 0) ? q.options : null,
      }));

      const { error: questionsError } = await supabase
        .from('question_templates')
        .insert(questionsToInsert);

      if (questionsError) {
        await supabase.from('survey_templates').delete().eq('id', surveyId);
        throw questionsError;
      }

      navigate('/dashboard');

    } catch (err: any) {
      console.error('Error saving survey:', err);
      setError(`Ошибка при сохранении опроса: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6">
            <h1 className="text-3xl font-bold text-[#1F1F1F]">Создать опрос</h1>
            <div className="flex gap-2 mt-4 sm:mt-0">
                <button
                    onClick={handleOpenAiModal}
                    disabled={loading || !user}
                    className="flex items-center justify-center gap-2 h-11 px-6 bg-green-600 text-white font-semibold rounded-full hover:bg-green-700 transition-colors disabled:bg-gray-400"
                >
                    Сгенерировать с AI
                </button>
                <button
                    onClick={handleSaveSurvey}
                    disabled={loading || !user || questions.length === 0}
                    className="flex items-center justify-center gap-2 h-11 px-6 bg-[#1A73E8] text-white font-semibold rounded-full hover:bg-[#1557B0] transition-colors disabled:bg-gray-400"
                >
                    {loading ? 'Сохранение...' : 'Сохранить опрос'}
                </button>
            </div>
          </div>
          
          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md my-4" role="alert">
              <p className="font-bold">Ошибка</p>
              <p>{error}</p>
            </div>
          )}

          <div className="bg-white p-8 rounded-2xl border border-[#E8EAED] shadow-sm mb-6">
            <div className="mb-6">
              <label htmlFor="surveyTitle" className="block text-lg font-medium text-[#1F1F1F] mb-2">Название</label>
              <input
                type="text"
                id="surveyTitle"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full h-12 px-4 border border-[#E8EAED] rounded-lg focus:outline-none focus:border-[#1A73E8]"
                placeholder="Напр., 'Ежегодный опрос вовлеченности'"
              />
            </div>
            <div className="mb-4">
              <label htmlFor="surveyDescription" className="block text-lg font-medium text-[#1F1F1F] mb-2">Описание (опционально)</label>
              <textarea
                id="surveyDescription"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 border border-[#E8EAED] rounded-lg focus:outline-none focus:border-[#1A73E8]"
                rows={3}
                placeholder="Краткое пояснение для получателей опроса"
              />
            </div>
             <div className="flex items-center">
                <input
                    id="isInteractive"
                    type="checkbox"
                    checked={isInteractive}
                    onChange={(e) => setIsInteractive(e.target.checked)}
                    className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="isInteractive" className="ml-3 block text-md font-medium text-gray-700">
                    Интерактивный чат-режим
                </label>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl border border-[#E8EAED] shadow-sm mb-6">
              <h3 className="text-lg font-medium text-[#1F1F1F] mb-4">Массовое добавление вопросов</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                  <button
                      onClick={handleDownloadTemplate}
                      className="flex items-center justify-center gap-2 h-11 px-4 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition-colors"
                  >
                      <Download size={18} />
                      Скачать шаблон Excel
                  </button>
                  <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center justify-center gap-2 h-11 px-4 bg-blue-50 text-blue-700 font-medium rounded-lg hover:bg-blue-100 transition-colors"
                  >
                      <UploadCloud size={18} />
                      Загрузить из Excel
                  </button>
                  <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      className="hidden"
                      accept=".xlsx, .xls"
                  />
              </div>
               <p className="text-xs text-gray-500 mt-3 text-center">
                  Скачайте шаблон, заполните его и загрузите для быстрого создания опроса.
              </p>
          </div>

            <DndContext 
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext 
                    items={questionIds}
                    strategy={verticalListSortingStrategy}
                >
                    <div className='space-y-4'>
                        {questions.map((q, qIndex) => (
                           <SortableQuestionItem
                                key={q.id}
                                q={q}
                                qIndex={qIndex}
                                updateQuestion={updateQuestion}
                                removeQuestion={removeQuestion}
                                addOption={addOption}
                                removeOption={removeOption}
                                updateOption={updateOption}
                           />
                        ))
                        }
                    </div>
                </SortableContext>
            </DndContext>
          
          <div className="mt-6 text-center">
            <button
              onClick={addQuestion}
              className="flex items-center justify-center gap-2 w-full h-12 border-2 border-dashed border-gray-300 text-gray-500 font-semibold rounded-lg hover:bg-gray-100 hover:border-gray-400 transition-colors"
            >
                <Plus size={20}/>
                Добавить вопрос вручную
            </button>
          </div>
        </div>
      </main>

      {isAiModalOpen && user && (
        <AiSurveyModal
          onClose={() => setIsAiModalOpen(false)}
          onGenerate={handleAcceptAiSurvey}
        />
      )}
    </DashboardLayout>
  );
};

export default CreateSurvey;
