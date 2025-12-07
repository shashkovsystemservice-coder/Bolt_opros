import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { DashboardLayout } from '../components/DashboardLayout';
import { generateCode } from '../utils/generateCode';
import { Plus, Trash2, ChevronUp, ChevronDown, Download, Upload, X } from 'lucide-react';
import * as XLSX from 'xlsx';

interface Question {
  text: string;
  type: 'text' | 'number' | 'email' | 'rating' | 'choice';
  required: boolean;
  options: string[];
}

export function CreateSurvey() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<Question[]>([
    { text: '', type: 'text', required: false, options: [] },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [previewQuestions, setPreviewQuestions] = useState<Question[]>([]);

  const addQuestion = () => {
    setQuestions([...questions, { text: '', type: 'text', required: false, options: [] }]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((_, i) => i !== index));
    }
  };

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index > 0) {
      const newQuestions = [...questions];
      [newQuestions[index - 1], newQuestions[index]] = [newQuestions[index], newQuestions[index - 1]];
      setQuestions(newQuestions);
    } else if (direction === 'down' && index < questions.length - 1) {
      const newQuestions = [...questions];
      [newQuestions[index], newQuestions[index + 1]] = [newQuestions[index + 1], newQuestions[index]];
      setQuestions(newQuestions);
    }
  };

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    const newQuestions = [...questions];
    newQuestions[index] = { ...newQuestions[index], [field]: value };
    if (field === 'type' && value !== 'choice') {
      newQuestions[index].options = [];
    }
    setQuestions(newQuestions);
  };

  const updateOptions = (index: number, optionsText: string) => {
    const options = optionsText.split(',').map((opt) => opt.trim()).filter(Boolean);
    updateQuestion(index, 'options', options);
  };

  const downloadTemplate = () => {
    const templateData = [
      ['Текст вопроса', 'Тип (text/number/email/rating/choice)', 'Обязательный (да/нет)', 'Варианты ответа (через запятую)'],
      ['Как вас зовут?', 'text', 'да', ''],
      ['Ваш возраст', 'number', 'нет', ''],
      ['Выберите категорию', 'choice', 'да', 'Вариант 1, Вариант 2, Вариант 3'],
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Вопросы');
    XLSX.writeFile(wb, 'шаблон_вопросов.xlsx');
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        const imported: Question[] = [];
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row[0] || !row[1]) continue;

          const questionText = String(row[0]).trim();
          const typeRaw = String(row[1]).toLowerCase().trim();
          const requiredRaw = String(row[2] || '').toLowerCase().trim();
          const optionsRaw = String(row[3] || '').trim();

          const validTypes = ['text', 'number', 'email', 'rating', 'choice'];
          const type = validTypes.includes(typeRaw) ? typeRaw as Question['type'] : 'text';
          const required = ['да', 'yes', '1', 'true'].includes(requiredRaw);
          const options = type === 'choice' ? optionsRaw.split(',').map((o) => o.trim()).filter(Boolean) : [];

          if (type === 'choice' && options.length === 0) continue;

          imported.push({ text: questionText, type, required, options });
        }

        setPreviewQuestions(imported);
        setShowImportModal(true);
      } catch (err) {
        setError('Ошибка при чтении файла. Проверьте формат.');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const applyImport = () => {
    setQuestions([...questions, ...previewQuestions]);
    setShowImportModal(false);
    setPreviewQuestions([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Введите название опроса');
      return;
    }

    const validQuestions = questions.filter((q) => q.text.trim());
    if (validQuestions.length === 0) {
      setError('Добавьте хотя бы один вопрос');
      return;
    }

    for (const q of validQuestions) {
      if (q.type === 'choice' && q.options.length === 0) {
        setError('Для вопросов типа "выбор" укажите варианты ответа');
        return;
      }
    }

    setLoading(true);

    try {
      const uniqueCode = generateCode(6);

      const { data: survey, error: surveyError } = await supabase
        .from('survey_templates')
        .insert({
          company_id: user!.id,
          title: title.trim(),
          description: description.trim() || null,
          unique_code: uniqueCode,
          is_active: true,
        })
        .select()
        .single();

      if (surveyError) throw surveyError;

      const questionInserts = validQuestions.map((q, idx) => ({
        survey_template_id: survey.id,
        question_text: q.text.trim(),
        question_type: q.type,
        is_required: q.required,
        question_order: idx,
        choice_options: q.type === 'choice' ? q.options : null,
      }));

      const { error: questionsError } = await supabase
        .from('question_templates')
        .insert(questionInserts);

      if (questionsError) throw questionsError;

      navigate(`/survey/${survey.id}/recipients`);
    } catch (err: any) {
      setError(err.message || 'Ошибка при создании опроса');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-medium text-[#1F1F1F] tracking-tight mb-2">Создать опрос</h1>
          <p className="text-[#5F6368]">Заполните информацию о вашем опросе и добавьте вопросы</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-2xl border border-[#E8EAED] p-6">
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-[#1F1F1F] mb-2">
                  Название опроса *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full h-12 px-4 border border-[#E8EAED] rounded-lg focus:outline-none focus:border-[#1A73E8] transition-colors"
                  placeholder="Опрос удовлетворенности клиентов"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1F1F1F] mb-2">
                  Описание
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-3 border border-[#E8EAED] rounded-lg focus:outline-none focus:border-[#1A73E8] transition-colors resize-none"
                  rows={3}
                  placeholder="Краткое описание опроса"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <h2 className="text-xl font-medium text-[#1F1F1F]">Вопросы</h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={downloadTemplate}
                className="flex items-center gap-2 px-4 py-2 border border-[#E8EAED] text-[#1F1F1F] rounded-full hover:bg-[#F8F9FA] transition-colors text-sm font-medium"
              >
                <Download className="w-4 h-4" strokeWidth={2} />
                Скачать шаблон
              </button>
              <label className="flex items-center gap-2 px-4 py-2 bg-[#E8F0FE] text-[#1A73E8] rounded-full hover:bg-[#D2E3FC] transition-colors cursor-pointer text-sm font-medium">
                <Upload className="w-4 h-4" strokeWidth={2} />
                Импорт из Excel
                <input type="file" accept=".xlsx,.xls" onChange={handleFileImport} className="hidden" />
              </label>
            </div>
          </div>

          <div className="space-y-4">
            {questions.map((question, index) => (
              <div key={index} className="bg-white rounded-2xl border border-[#E8EAED] p-6">
                <div className="flex items-start justify-between mb-4">
                  <span className="text-sm font-medium text-[#5F6368]">Вопрос {index + 1}</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => moveQuestion(index, 'up')}
                      disabled={index === 0}
                      className="p-1.5 hover:bg-[#F8F9FA] rounded-lg transition-colors disabled:opacity-30"
                    >
                      <ChevronUp className="w-4 h-4 text-[#5F6368]" strokeWidth={2} />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveQuestion(index, 'down')}
                      disabled={index === questions.length - 1}
                      className="p-1.5 hover:bg-[#F8F9FA] rounded-lg transition-colors disabled:opacity-30"
                    >
                      <ChevronDown className="w-4 h-4 text-[#5F6368]" strokeWidth={2} />
                    </button>
                    {questions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeQuestion(index)}
                        className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" strokeWidth={2} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <input
                    type="text"
                    value={question.text}
                    onChange={(e) => updateQuestion(index, 'text', e.target.value)}
                    className="w-full h-12 px-4 border border-[#E8EAED] rounded-lg focus:outline-none focus:border-[#1A73E8] transition-colors"
                    placeholder="Текст вопроса"
                    required
                  />

                  <div className="grid sm:grid-cols-2 gap-4">
                    <select
                      value={question.type}
                      onChange={(e) => updateQuestion(index, 'type', e.target.value)}
                      className="h-12 px-4 border border-[#E8EAED] rounded-lg focus:outline-none focus:border-[#1A73E8] transition-colors bg-white"
                    >
                      <option value="text">Текст</option>
                      <option value="number">Число</option>
                      <option value="email">Email</option>
                      <option value="rating">Рейтинг (1-10)</option>
                      <option value="choice">Выбор варианта</option>
                    </select>

                    <label className="flex items-center gap-2 h-12 px-4 border border-[#E8EAED] rounded-lg cursor-pointer hover:bg-[#F8F9FA] transition-colors">
                      <input
                        type="checkbox"
                        checked={question.required}
                        onChange={(e) => updateQuestion(index, 'required', e.target.checked)}
                        className="w-4 h-4 text-[#1A73E8] rounded border-[#E8EAED] focus:ring-0 focus:ring-offset-0"
                      />
                      <span className="text-sm text-[#1F1F1F]">Обязательный вопрос</span>
                    </label>
                  </div>

                  {question.type === 'choice' && (
                    <input
                      type="text"
                      value={question.options.join(', ')}
                      onChange={(e) => updateOptions(index, e.target.value)}
                      className="w-full h-12 px-4 border border-[#E8EAED] rounded-lg focus:outline-none focus:border-[#1A73E8] transition-colors"
                      placeholder="Варианты ответа через запятую"
                      required
                    />
                  )}
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addQuestion}
            className="w-full py-3 border-2 border-dashed border-[#E8EAED] rounded-2xl text-[#5F6368] hover:border-[#1A73E8] hover:text-[#1A73E8] transition-all flex items-center justify-center gap-2 font-medium"
          >
            <Plus className="w-5 h-5" strokeWidth={2} />
            Добавить вопрос
          </button>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="flex-1 h-12 border border-[#E8EAED] text-[#1F1F1F] rounded-full font-medium hover:bg-[#F8F9FA] transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 h-12 bg-[#1A73E8] text-white rounded-full font-medium hover:bg-[#1557B0] transition-colors disabled:opacity-50"
            >
              {loading ? 'Создание...' : 'Создать опрос'}
            </button>
          </div>
        </form>
      </div>

      {showImportModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-[#E8EAED] flex items-center justify-between">
              <h3 className="text-xl font-medium text-[#1F1F1F]">Предпросмотр импорта</h3>
              <button
                onClick={() => setShowImportModal(false)}
                className="p-2 hover:bg-[#F8F9FA] rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-[#5F6368]" strokeWidth={2} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <p className="text-sm text-[#5F6368] mb-4">Найдено вопросов: {previewQuestions.length}</p>
              <div className="space-y-3">
                {previewQuestions.map((q, idx) => (
                  <div key={idx} className="p-4 bg-[#F8F9FA] rounded-xl">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-sm font-medium text-[#1F1F1F]">{q.text}</span>
                      {q.required && (
                        <span className="text-xs bg-[#1A73E8] text-white px-2 py-0.5 rounded-full">обязательный</span>
                      )}
                    </div>
                    <div className="text-xs text-[#5F6368]">
                      Тип: {q.type}
                      {q.type === 'choice' && q.options.length > 0 && (
                        <span className="ml-2">| Варианты: {q.options.join(', ')}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 border-t border-[#E8EAED] flex gap-3">
              <button
                onClick={() => setShowImportModal(false)}
                className="flex-1 h-12 border border-[#E8EAED] text-[#1F1F1F] rounded-full font-medium hover:bg-[#F8F9FA] transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={applyImport}
                className="flex-1 h-12 bg-[#1A73E8] text-white rounded-full font-medium hover:bg-[#1557B0] transition-colors"
              >
                Применить
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
