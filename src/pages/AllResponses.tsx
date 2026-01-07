
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ChevronDown, ChevronRight, Download, Search, FileText, FileSpreadsheet, Mail, User, Building, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import ExcelJS from 'exceljs';
import pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';

// Инициализация шрифтов для Vite
(pdfMake as any).vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts;


// 1. PDF для одного ответа (pdfmake)
const exportSinglePDF = (response: any) => {
  // Подготовка данных
  const surveyTitle = response.survey_template?.title || 'Без названия';
  const respondent = response.recipient?.contact_person || 'Не указан';
  const email = response.respondent_email;
  const company = response.recipient?.company_name || 'Не указана';
  const date = new Date(response.submitted_at).toLocaleString('ru');
  
  // Таблица с вопросами и ответами
  const answersTable = [
    [
      { text: '№', style: 'tableHeader', alignment: 'center' },
      { text: 'Вопрос', style: 'tableHeader' },
      { text: 'Ответ', style: 'tableHeader' }
    ],
    ...response.submission_answers.map((answer: any, idx: number) => [
      { text: (idx + 1).toString(), alignment: 'center' },
      { text: answer.question_text || '', style: 'question' },
      { text: answer.answer_text || answer.answer_number?.toString() || '(без ответа)', style: 'answer' }
    ])
  ];
  
  // Определение документа
  const docDefinition: any = {
    pageSize: 'A4',
    pageMargins: [40, 60, 40, 60],
    
    header: {
      text: 'Survey Pro',
      alignment: 'right',
      margin: [0, 30, 40, 0],
      color: '#888',
      fontSize: 10
    },
    
    footer: function(currentPage: number, pageCount: number) {
      return {
        text: `Страница ${currentPage} из ${pageCount}`,
        alignment: 'center',
        margin: [0, 20, 0, 0],
        fontSize: 9,
        color: '#888'
      };
    },
    
    content: [
      {
        text: 'Ответ на опрос',
        style: 'header',
        margin: [0, 0, 0, 10]
      },
      {
        canvas: [
          {
            type: 'line',
            x1: 0, y1: 0,
            x2: 515, y2: 0,
            lineWidth: 2,
            lineColor: '#3B82F6'
          }
        ],
        margin: [0, 0, 0, 20]
      },
      {
        text: [
          { text: 'Опрос: ', bold: true },
          surveyTitle
        ],
        margin: [0, 0, 0, 5]
      },
      {
        text: [
          { text: 'Респондент: ', bold: true },
          respondent
        ],
        margin: [0, 0, 0, 5]
      },
      {
        text: [
          { text: 'Email: ', bold: true },
          email
        ],
        margin: [0, 0, 0, 5]
      },
      {
        text: [
          { text: 'Компания: ', bold: true },
          company
        ],
        margin: [0, 0, 0, 15]
      },
      {
        text: [
          { text: 'Дата заполнения: ', bold: true },
          date
        ],
        margin: [0, 0, 0, 15]
      },
      {
        canvas: [
          {
            type: 'line',
            x1: 0, y1: 0,
            x2: 515, y2: 0,
            lineWidth: 1,
            lineColor: '#DDD'
          }
        ],
        margin: [0, 0, 0, 15]
      },
      {
        text: 'Ответы:',
        style: 'subheader',
        margin: [0, 0, 0, 10]
      },
      {
        table: {
          headerRows: 1,
          widths: [30, '*', '*'],
          body: answersTable
        },
        layout: {
          fillColor: function (rowIndex: number) {
            return rowIndex === 0 ? '#F3F4F6' : (rowIndex % 2 === 0 ? '#FAFAFA' : null);
          },
          hLineWidth: function (i: number, node: any) {
            return i === 0 || i === 1 || i === node.table.body.length ? 1 : 0.5;
          },
          vLineWidth: function () {
            return 0.5;
          },
          hLineColor: function (i: number, node: any) {
            return i === 0 || i === 1 || i === node.table.body.length ? '#3B82F6' : '#E5E7EB';
          },
          vLineColor: function () {
            return '#E5E7EB';
          }
        }
      }
    ],
    
    styles: {
      header: {
        fontSize: 22,
        bold: true,
        color: '#1F2937'
      },
      subheader: {
        fontSize: 16,
        bold: true,
        color: '#374151'
      },
      tableHeader: {
        bold: true,
        fontSize: 12,
        color: '#1F2937',
        fillColor: '#F3F4F6'
      },
      question: {
        fontSize: 11,
        color: '#1F2937'
      },
      answer: {
        fontSize: 10,
        color: '#4B5563',
        italics: false
      }
    },
    
    defaultStyle: {
      font: 'Roboto',
      fontSize: 11,
      lineHeight: 1.3
    }
  };
  
  // Генерация и скачивание
  const fileName = `otvet-${surveyTitle.replace(/[^a-zA-Zа-яА-Я0-9]/g, '_').substring(0, 30)}-${new Date().toISOString().split('T')[0]}.pdf`;
  
  (pdfMake as any).createPdf(docDefinition).download(fileName);
  toast.success('PDF скачан');
};

// 2. Excel для одного ответа
const exportSingleExcel = async (response: any) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Ответ');
  
  // Заголовок
  sheet.mergeCells('A1:D1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = `Ответ на опрос: ${response.survey_template?.title}`;
  titleCell.font = { size: 16, bold: true };
  titleCell.alignment = { horizontal: 'center' };
  
  // Информация
  sheet.addRow([]);
  sheet.addRow(['Респондент:', response.recipient?.contact_person || response.respondent_email]);
  sheet.addRow(['Email:', response.respondent_email]);
  if (response.recipient?.company_name) {
    sheet.addRow(['Компания:', response.recipient.company_name]);
  }
  sheet.addRow(['Дата заполнения:', new Date(response.submitted_at).toLocaleString('ru')]);
  sheet.addRow([]);
  
  // Заголовки таблицы
  const headerRow = sheet.addRow(['№', 'Вопрос', 'Ответ']);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };
  
  // Данные
  response.submission_answers.forEach((answer: any, idx: number) => {
    sheet.addRow([
      idx + 1,
      answer.question_text,
      answer.answer_text || answer.answer_number || '(без ответа)'
    ]);
  });
  
  // Ширина колонок
  sheet.getColumn(1).width = 5;
  sheet.getColumn(2).width = 50;
  sheet.getColumn(3).width = 40;
  
  // Скачать
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer]);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `otvet-${response.survey_template?.title?.replace(/[^a-zA-Zа-яА-Я0-9]/g, '_').substring(0, 30)}-${new Date().toISOString().split('T')[0]}.xlsx`;
  a.click();
  toast.success('Excel файл скачан');
};

// 3. CSV для одного ответа
const exportSingleCSV = (response: any) => {
  const headers = ['№', 'Вопрос', 'Ответ'];
  const infoRows = [
    ['Опрос:', response.survey_template?.title || ''],
    ['Респондент:', response.recipient?.contact_person || response.respondent_email],
    ['Email:', response.respondent_email],
    ['Компания:', response.recipient?.company_name || ''],
    ['Дата:', new Date(response.submitted_at).toLocaleString('ru')],
    [''],
    headers
  ];
  
  const dataRows = response.submission_answers.map((answer: any, idx: number) => [
    idx + 1,
    answer.question_text,
    answer.answer_text || answer.answer_number || '(без ответа)'
  ]);
  
  const allRows = [...infoRows, ...dataRows];
  const csv = allRows
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  
  // BOM для правильной кодировки в Excel
  const bom = '\uFEFF';
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `otvet-${response.survey_template?.title?.replace(/[^a-zA-Zа-яА-Я0-9]/g, '_').substring(0, 30)}-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  toast.success('CSV файл скачан');
};

function ResponseRow({ response, isExpanded, onToggle }: any) {
  return (
    <>
      <tr onClick={onToggle} className="cursor-pointer hover:bg-surface transition-colors">
        <td className="px-4 py-3">
          {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </td>
        <td className="px-4 py-3 font-medium">{response.survey_template?.title}</td>
        <td className="px-4 py-3">{response.recipient?.contact_person || response.respondent_email}</td>
        <td className="px-4 py-3">{new Date(response.submitted_at).toLocaleDateString('ru')}</td>
        <td className="px-4 py-3">{response.submission_answers.length}</td>
      </tr>
      
      {isExpanded && (
        <tr>
          <td colSpan={5} className="p-0">
            <div className="bg-background p-6">
              <div className="max-w-4xl mx-auto">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-sm">
                  <div className="flex items-center gap-2">
                    <User size={16} className="text-text-secondary" />
                    <div>
                      <div className="font-semibold">Респондент</div>
                      <div>{response.recipient?.contact_person || 'N/A'}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail size={16} className="text-text-secondary" />
                    <div>
                      <div className="font-semibold">Email</div>
                      <div>{response.respondent_email}</div>
                    </div>
                  </div>
                   <div className="flex items-center gap-2">
                    <Building size={16} className="text-text-secondary" />
                    <div>
                      <div className="font-semibold">Компания</div>
                      <div>{response.recipient?.company_name || 'N/A'}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-text-secondary" />
                    <div>
                      <div className="font-semibold">Дата сдачи</div>
                      <div>{new Date(response.submitted_at).toLocaleString('ru')}</div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-border pt-4">
                  {response.submission_answers.map((answer: any, index: number) => (
                    <div key={answer.id} className="mb-4">
                      <div className="font-semibold text-sm mb-1">{index + 1}. {answer.question_text}</div>
                      <div className="text-text-secondary pl-4">➤ {answer.answer_text || answer.answer_number}</div>
                    </div>
                  ))}
                </div>
                
                <div className="flex gap-3 mt-6 pt-6 border-t border-border">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      exportSinglePDF(response);
                    }}
                    className="h-10 px-4 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Скачать PDF
                  </button>
                  
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      exportSingleExcel(response);
                    }}
                    className="h-10 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Скачать Excel
                  </button>
                  
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      exportSingleCSV(response);
                    }}
                    className="h-10 px-4 border border-border rounded-lg hover:bg-surface flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Скачать CSV
                  </button>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export function AllResponses() {
  const { user } = useAuth();
  const [responses, setResponses] = useState<any[]>([]);
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  
  // Поиск и фильтры
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSurvey, setSelectedSurvey] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'week' | 'month' | 'year'>('all');

  // Сортировка
  const [sortBy, setSortBy] = useState<'date' | 'survey' | 'respondent'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Пагинация
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    if (user) {
      const fetchResponses = async () => {
        setLoading(true);
        const { data, error } = await supabase
          .from('survey_submissions')
          .select(`
            id,
            submitted_at,
            respondent_email,
            survey_template:survey_templates(id, title, company_id),
            recipient:survey_recipients(contact_person, company_name, email),
            submission_answers(id, question_text, answer_text, answer_number)
          `)
          .eq('survey_templates.company_id', user.id)
          .order('submitted_at', { ascending: false });

        if (error) {
          toast.error('Не удалось загрузить ответы: ' + error.message);
        } else {
          setResponses(data || []);
        }
        setLoading(false);
      };

      fetchResponses();
    }
  }, [user]);

  const handleSort = (column: 'date' | 'survey' | 'respondent') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const sortedResponses = useMemo(() => {
    return [...responses].sort((a, b) => {
        let comparison = 0;
        if (sortBy === 'date') {
            comparison = new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime();
        } else if (sortBy === 'survey') {
            comparison = (a.survey_template?.title || '').localeCompare(b.survey_template?.title || '');
        } else {
            const aName = a.recipient?.contact_person || a.respondent_email;
            const bName = b.recipient?.contact_person || b.respondent_email;
            comparison = aName.localeCompare(bName);
        }
        return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [responses, sortBy, sortOrder]);

  const uniqueSurveys = useMemo(() => Array.from(
    new Set(responses.map(r => r.survey_template?.id))
  ).map(id => responses.find(r => r.survey_template?.id === id)?.survey_template)
    .filter(Boolean), [responses]);

  const getDateThreshold = () => {
    const now = new Date();
    if (dateFilter === 'week') {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return d;
    }
    if (dateFilter === 'month') {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 1);
      return d;
    }
    if (dateFilter === 'year') {
      const d = new Date(now);
      d.setFullYear(d.getFullYear() - 1);
      return d;
    }
    return null;
  };
  
  const filteredResponses = useMemo(() => sortedResponses.filter(r => {
    const searchLower = searchTerm.toLowerCase();
    const matchSearch = !searchTerm || 
      r.survey_template?.title.toLowerCase().includes(searchLower) ||
      r.respondent_email.toLowerCase().includes(searchLower) ||
      r.recipient?.contact_person?.toLowerCase().includes(searchLower);
    
    const matchSurvey = !selectedSurvey || r.survey_template?.id === selectedSurvey;
    
    const threshold = getDateThreshold();
    const matchDate = !threshold || new Date(r.submitted_at) >= threshold;
    
    return matchSearch && matchSurvey && matchDate;
  }), [sortedResponses, searchTerm, selectedSurvey, dateFilter]);
  
  // Статистика (считается из filteredResponses)
  const totalResponses = filteredResponses.length;
  const monthAgo = new Date();
  monthAgo.setMonth(monthAgo.getMonth() - 1);
  const monthResponses = filteredResponses.filter(r => new Date(r.submitted_at) >= monthAgo).length;
  const avgAnswers = totalResponses > 0
    ? filteredResponses.reduce((sum, r) => sum + r.submission_answers.length, 0) / totalResponses
    : 0;
    
  // Пагинация
  const totalPages = Math.ceil(filteredResponses.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedResponses = filteredResponses.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="p-0 md:p-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold mb-4 md:mb-0">Все ответы</h1>
        <div className="flex w-full md:w-auto items-center gap-2">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
              <input 
                type="text" 
                placeholder="Поиск по опросу, email..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-10 w-full pl-10 pr-4 bg-surface border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
        </div>
      </div>
      
      <div className="flex items-center gap-4 mb-6">
        <select
          value={selectedSurvey}
          onChange={(e) => { setSelectedSurvey(e.target.value); setCurrentPage(1); }}
          className="h-10 px-4 bg-background border border-border rounded-lg"
        >
          <option value="">Все опросы</option>
          {uniqueSurveys.map(s => (
            <option key={s?.id} value={s?.id}>{s?.title}</option>
          ))}
        </select>

        <select
          value={dateFilter}
          onChange={(e) => { setDateFilter(e.target.value as any); setCurrentPage(1); }}
          className="h-10 px-4 bg-background border border-border rounded-lg"
        >
          <option value="all">За всё время</option>
          <option value="week">За неделю</option>
          <option value="month">За месяц</option>
          <option value="year">За год</option>
        </select>
      </div>
      
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-surface rounded-lg border border-border">
          <div className="text-sm text-text-secondary mb-1">📊 Всего ответов</div>
          <div className="text-2xl font-semibold">{totalResponses}</div>
        </div>
        <div className="p-4 bg-surface rounded-lg border border-border">
          <div className="text-sm text-text-secondary mb-1">📅 За последний месяц</div>
          <div className="text-2xl font-semibold">{monthResponses}</div>
        </div>
        <div className="p-4 bg-surface rounded-lg border border-border">
          <div className="text-sm text-text-secondary mb-1">⭐ Среднее кол-во ответов</div>
          <div className="text-2xl font-semibold">{avgAnswers.toFixed(1)}</div>
        </div>
      </div>
      
      <div className="border border-border rounded-lg overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-surface border-b border-border">
            <tr>
              <th className="px-4 py-3 w-12"></th>
              <th onClick={() => handleSort('survey')} className="text-left p-4 cursor-pointer hover:bg-background">
                  <div className="flex items-center gap-2">
                    Опрос {sortBy === 'survey' && <span className="text-primary">{sortOrder === 'asc' ? '▲' : '▼'}</span>}
                  </div>
              </th>
              <th onClick={() => handleSort('respondent')} className="text-left p-4 cursor-pointer hover:bg-background">
                  <div className="flex items-center gap-2">
                    Респондент {sortBy === 'respondent' && <span className="text-primary">{sortOrder === 'asc' ? '▲' : '▼'}</span>}
                  </div>
              </th>
              <th onClick={() => handleSort('date')} className="text-left p-4 cursor-pointer hover:bg-background">
                  <div className="flex items-center gap-2">
                    Дата {sortBy === 'date' && <span className="text-primary">{sortOrder === 'asc' ? '▲' : '▼'}</span>}
                  </div>
              </th>
              <th className="px-4 py-3">Ответов</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-10">Загрузка...</td></tr>
            ) : paginatedResponses.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-10">Ответы не найдены.</td></tr>
            ) : (
              paginatedResponses.map(r => (
                <ResponseRow
                  key={r.id}
                  response={r}
                  isExpanded={expandedIds.has(r.id)}
                  onToggle={() => toggleExpanded(r.id)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 px-4">
          <span className="text-sm text-text-secondary">
            Показано {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, filteredResponses.length)} из {filteredResponses.length}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 h-8 rounded bg-surface hover:bg-background disabled:opacity-50"
            >
              ←
            </button>
            
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let page;
              if (totalPages <= 5) page = i + 1;
              else if (currentPage <= 3) page = i + 1;
              else if (currentPage >= totalPages - 2) page = totalPages - 4 + i;
              else page = currentPage - 2 + i;
              
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded ${
                    currentPage === page 
                      ? 'bg-primary text-white' 
                      : 'bg-surface hover:bg-background'
                  }`}
                >
                  {page}
                </button>
              );
            })}
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 h-8 rounded bg-surface hover:bg-background disabled:opacity-50"
            >
              →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
