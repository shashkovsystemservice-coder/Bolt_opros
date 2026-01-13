
import React from 'react';
import { X, Download, UploadCloud } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { toast } from 'sonner';

// --- Типы данных ---
export const questionTypes = [
  'text', 'choice', 'multi_choice', 'rating', 'boolean', 'numeric'
] as const;

export type QuestionType = typeof questionTypes[number];

export interface ParsedSurveyData {
  title: string;
  description: string;
  items: Array<{
    id: string;
    itemType: 'question';
    text: string;
    type: QuestionType;
    required: boolean;
    options: string[];
  }>;
}

interface ImportExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (data: ParsedSurveyData) => void;
}

// --- Основной компонент ---
export const ImportExcelModal: React.FC<ImportExcelModalProps> = ({ isOpen, onClose, onImportSuccess }) => {

    const handleDownloadTemplate = async () => {
    const workbook = new ExcelJS.Workbook();
    const mainSheet = workbook.addWorksheet('Шаблон импорта');
    const instructionSheet = workbook.addWorksheet('Инструкция');

    // === Лист 1: Шаблон импорта ===

    // --- Стили ---
    const boldStyle: Partial<ExcelJS.Style> = { font: { bold: true } };
    const headerStyle: Partial<ExcelJS.Style> = {
      font: { bold: true, color: { argb: 'FF000000' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3EAF6' } },
      border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } },
    };
    const placeholderStyle: Partial<ExcelJS.Style> = {
      font: { color: { argb: 'FF888888' }, italic: true } // Светло-серый курсив
    };

    // --- Метаданные ---
    mainSheet.getCell('A1').value = 'Название инструмента:';
    mainSheet.getCell('A1').style = boldStyle;
    mainSheet.getCell('B1').value = 'Годовой опрос удовлетворенности';
    mainSheet.getCell('B1').style = placeholderStyle;

    mainSheet.getCell('A2').value = 'Описание:';
    mainSheet.getCell('A2').style = boldStyle;
    mainSheet.getCell('B2').value = 'Краткое описание для сотрудников';
    mainSheet.getCell('B2').style = placeholderStyle;

    // --- Заголовки таблицы ---
    mainSheet.getRow(4).values = [
        'Текст вопроса',
        'Тип вопроса',
        'Варианты ответов (через запятую)',
        'Обязательный (1 - да, 0 - нет)'
    ];
    mainSheet.getRow(4).eachCell(cell => cell.style = headerStyle);

    // --- Настройка колонок ---
    mainSheet.columns = [
        { key: 'text', width: 60 },
        { key: 'type', width: 25 },
        { key: 'options', width: 45 },
        { key: 'required', width: 15 },
    ];
    mainSheet.getColumn('A').alignment = { wrapText: true, vertical: 'top' };

    // --- Валидация данных ---
    const typeFormula = `"${[...questionTypes].join(',')}"`;
    mainSheet.dataValidations.add('B5:B999', { type: 'list', allowBlank: true, formulae: [typeFormula] });
    mainSheet.dataValidations.add('D5:D999', { type: 'list', allowBlank: true, formulae: ['"1,0"'] });

    // --- Примеры для заполнения ---
    const examples = [
      ['Напишите ваши пожелания по развитию нашей компании', 'text', '', 0],
      ['Как часто вы пользуетесь нашими услугами?', 'choice', 'Ежедневно, Раз в неделю, Раз в месяц, Редко', 1],
      ['Какие категории товаров вам интересны? (выберите несколько)', 'multi_choice', 'Электроника, Одежда, Продукты, Дом и сад', 1],
      ['Оцените чистоту в нашем офисе', 'rating', '', 1],
      ['Готовы ли вы рекомендовать нас друзьям?', 'boolean', '', 1],
      ['Сколько полных лет вы работаете в текущей сфере?', 'numeric', '', 0]
    ];
    const exampleRows = mainSheet.addRows(examples);
    exampleRows.forEach(row => {
        row.eachCell(cell => { cell.style = placeholderStyle; });
    });

    // === Лист 2: Инструкция ===
    instructionSheet.columns = [
      { header: 'Тип вопроса', key: 'type', width: 20 },
      { header: 'Описание', key: 'desc', width: 50 },
      { header: 'Как заполнять «Варианты ответов»', key: 'options', width: 40 },
    ];
    instructionSheet.getRow(1).eachCell(cell => cell.style = headerStyle);
    instructionSheet.addRows([
        {type: 'text', desc: 'Свободный текстовый ответ', options: 'Оставить пустым'},
        {type: 'choice', desc: 'Выбор одного варианта', options: 'Вариант 1, Вариант 2, Вариант 3'},
        {type: 'multi_choice', desc: 'Выбор нескольких вариантов', options: 'Вариант 1, Вариант 2, Вариант 3'},
        {type: 'rating', desc: 'Оценка по шкале (автоматически 1-5)', options: 'Оставить пустым'},
        {type: 'boolean', desc: 'Вопрос с ответом Да или Нет', options: 'Оставить пустым'},
        {type: 'numeric', desc: 'Ввод только цифр', options: 'Оставить пустым'},
    ]);

    // --- Генерация и скачивание файла ---
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), 'Professional_Survey_Template.xlsx');
    toast.success('Шаблон загружен. Заполните его и перетащите в это окно.');
  };

  // --- ОБНОВЛЕННАЯ ФУНКЦИЯ ОБРАБОТКИ ФАЙЛА ---
  const onDrop = React.useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) {
      toast.error("Файл не выбран.");
      return;
    }
    console.log("1. Файл получен:", file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        console.log("2. Файл прочитан, начинаю парсинг...");
        const workbook = XLSX.read(e.target.result, { type: 'binary' });
        const mainSheet = workbook.Sheets[workbook.SheetNames[0]];

        const title = mainSheet['B1']?.v || 'Импортированный опрос';
        const description = mainSheet['B2']?.v || '';
        console.log("3. Метаданные извлечены:", { title, description });
        
        // Ключевое исправление: range: 3 означает, что данные начинаются с 4-й строки,
        // и именно эта строка используется как строка заголовков.
        const jsonData = XLSX.utils.sheet_to_json<any>(mainSheet, { range: 3 });
        console.log("4. Сырые данные из таблицы (JSON):", jsonData);

        if (jsonData.length === 0) {
          throw new Error('Не найдено строк с вопросами (таблица должна начинаться с 5-й строки).');
        }

        const items: ParsedSurveyData['items'] = jsonData
          .map((row) => {
            const questionText = row['Текст вопроса'];
            if (!questionText || !String(questionText).trim()) return null;

            const questionTypeRaw = String(row['Тип вопроса'] || 'text').toLowerCase();
            const questionType = questionTypes.includes(questionTypeRaw as any) ? (questionTypeRaw as QuestionType) : 'text';
            const optionsRaw = row['Варианты ответов (через запятую)'];
            const isRequiredRaw = row['Обязательный (1 - да, 0 - нет)'];

            return {
              id: crypto.randomUUID(),
              itemType: 'question',
              text: String(questionText).trim(),
              type: questionType,
              required: ['1', 1, true].includes(isRequiredRaw),
              options: (questionType === 'choice' || questionType === 'multi_choice') && optionsRaw ? String(optionsRaw).split(',').map(s => s.trim()).filter(Boolean) : [],
            };
          })
          .filter((item): item is NonNullable<typeof item> => item !== null);

        console.log("5. Данные преобразованы в нужный формат:", items);

        if (items.length === 0) {
          throw new Error('Не найдено ни одного корректного вопроса. Проверьте, что колонка "Текст вопроса" заполнена.');
        }
        
        const parsedData: ParsedSurveyData = { title, description, items };
        
        toast.success(`Успешно импортировано ${items.length} вопросов!`);
        console.log("6. Запускаю переход в редактор с данными:", parsedData);
        onImportSuccess(parsedData);

      } catch (error: any) {
        console.error("Ошибка парсинга:", error);
        toast.error(`Ошибка чтения файла: ${error.message || 'Проверьте соответствие шаблону.'}`);
      }
    };
    reader.onerror = () => {
        console.error("Ошибка FileReader");
        toast.error("Не удалось прочитать файл.");
    }
    reader.readAsBinaryString(file);
  }, [onImportSuccess]);


  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] }, maxFiles: 1 });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl transform transition-all">
        <header className="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Импорт опроса из Excel</h2>
          <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"><X size={20} /></button>
        </header>
        <div className="p-8 space-y-8">
            <div className="text-left">
                <h3 className="font-semibold text-gray-700">Шаг 1: Подготовьте файл</h3>
                <p className="text-sm text-gray-500 mt-1 mb-3">Скачайте наш профессиональный шаблон, чтобы гарантировать правильный формат.</p>
                <button onClick={handleDownloadTemplate} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 font-semibold rounded-md hover:bg-blue-100 transition-colors text-sm"><Download size={16}/>Скачать эталонный шаблон (.xlsx)</button>
            </div>
            <div>
                <h3 className="font-semibold text-gray-700 text-left">Шаг 2: Загрузите файл</h3>
                 <div {...getRootProps()} className={`mt-3 border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'}`}>
                    <input {...getInputProps()} />
                    <div className="flex flex-col items-center gap-2 text-gray-500">
                        <UploadCloud size={40} className={`transition-transform ${isDragActive ? 'scale-110' : ''}`}/>
                        <p className="font-semibold">{isDragActive ? 'Отпустите, чтобы начать импорт' : 'Перетащите сюда заполненный файл'}</p>
                        <p className="text-sm">или <span className="text-blue-600 font-semibold">нажмите для выбора файла</span></p>
                         <p className="text-xs text-gray-400 mt-2">Поддерживается только .xlsx</p>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
