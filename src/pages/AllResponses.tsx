
import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ChevronDown, ChevronRight, Download, Search, User, Mail, Building, Calendar, ArrowDown, ArrowUp } from 'lucide-react';
import { toast } from 'sonner';
import ExcelJS from 'exceljs';
import pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';

(pdfMake as any).vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts;

// --- Export Functions ---
const exportSinglePDF = (response: any) => {
  const docDefinition: any = {
    pageSize: 'A4',
    pageMargins: [40, 60, 40, 60],
    header: { text: 'Survey Pro', alignment: 'right', margin: [0, 30, 40, 0], color: '#888', fontSize: 10 },
    footer: (currentPage: number, pageCount: number) => ({ text: `Страница ${currentPage} из ${pageCount}`, alignment: 'center', margin: [0, 20, 0, 0], fontSize: 9, color: '#888' }),
    content: [
      { text: 'Ответ на опрос', style: 'header' },
      { canvas: [{ type: 'line', x1: 0, y1: 5, x2: 515, y2: 5, lineWidth: 1.5, lineColor: '#3B82F6' }], margin: [0, 0, 0, 20] },
      { text: [{ text: 'Опрос: ', bold: true }, response.survey_template?.title || 'Без названия'], margin: [0, 0, 0, 5] },
      { text: [{ text: 'Респондент: ', bold: true }, response.recipient?.contact_person || 'Не указан'], margin: [0, 0, 0, 5] },
      { text: [{ text: 'Email: ', bold: true }, response.respondent_email], margin: [0, 0, 0, 5] },
      { text: [{ text: 'Компания: ', bold: true }, response.recipient?.company_name || 'Не указана'], margin: [0, 0, 0, 15] },
      { text: [{ text: 'Дата: ', bold: true }, new Date(response.submitted_at).toLocaleString('ru')], margin: [0, 0, 0, 15] },
      { text: 'Ответы:', style: 'subheader', margin: [0, 10, 0, 10] },
      {
        table: {
          headerRows: 1,
          widths: ['auto', '*', '*'],
          body: [
            [{ text: '№', style: 'tableHeader' }, { text: 'Вопрос', style: 'tableHeader' }, { text: 'Ответ', style: 'tableHeader' }],
            ...response.submission_answers.map((answer: any, idx: number) => [ (idx + 1), answer.question_text || '', answer.answer_text || answer.answer_number?.toString() || '-'])
          ]
        },
        layout: 'lightHorizontalLines'
      }
    ],
    styles: {
      header: { fontSize: 22, bold: true },
      subheader: { fontSize: 16, bold: true, margin: [0, 10, 0, 5] },
      tableHeader: { bold: true, fontSize: 12, color: '#374151' }
    },
    defaultStyle: { font: 'Roboto', fontSize: 11, lineHeight: 1.3 }
  };
  (pdfMake as any).createPdf(docDefinition).download(`Ответ_${response.survey_template?.title.replace(/\s/g, '_')}.pdf`);
  toast.success('PDF скачан');
};

const exportSingleExcel = async (response: any) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Ответ');
  sheet.mergeCells('A1:C1');
  sheet.getCell('A1').value = `Ответ на опрос: ${response.survey_template?.title}`;
  sheet.getCell('A1').font = { size: 16, bold: true };
  sheet.addRow([]);
  sheet.addRow(['Респондент:', response.recipient?.contact_person || response.respondent_email]);
  sheet.addRow(['Дата:', new Date(response.submitted_at).toLocaleString('ru')]);
  sheet.addRow([]);
  const headerRow = sheet.addRow(['№', 'Вопрос', 'Ответ']);
  headerRow.font = { bold: true };
  response.submission_answers.forEach((answer: any, idx: number) => {
    sheet.addRow([idx + 1, answer.question_text, answer.answer_text || answer.answer_number || '-']);
  });
  sheet.columns = [{ width: 5 }, { width: 50 }, { width: 50 }];
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `Ответ_${response.survey_template?.title.replace(/\s/g, '_')}.xlsx`;
  link.click();
  toast.success('Excel файл скачан');
};

const exportSingleCSV = (response: any) => {
    let csvContent = '\uFEFF'; // BOM for UTF-8
    csvContent += `"Опрос:","${response.survey_template?.title}"\n`;
    csvContent += `"Респондент:","${response.recipient?.contact_person || response.respondent_email}"\n`;
    csvContent += `"Дата:","${new Date(response.submitted_at).toLocaleString('ru')}"\n\n`;
    csvContent += '"№","Вопрос","Ответ"\n';
    response.submission_answers.forEach((answer: any, index: number) => {
        const row = [index + 1, `"${answer.question_text}"`, `"${answer.answer_text || answer.answer_number || '-'}"`].join(',');
        csvContent += row + '\n';
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Ответ_${response.survey_template?.title.replace(/\s/g, '_')}.csv`;
    link.click();
    toast.success('CSV файл скачан');
};

// --- Main Component ---
export function AllResponses() {
  const { user } = useAuth();
  const [responses, setResponses] = useState<any[]>([]);
  const [expandedIds, setExpandedIds] = useState(new Set<string>());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSurvey, setSelectedSurvey] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'week' | 'month' | 'year'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'survey' | 'respondent'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    supabase
      .from('survey_submissions')
      .select(`id, submitted_at, respondent_email, survey_template:survey_templates(id, title, company_id), recipient:survey_recipients(contact_person, company_name, email), submission_answers(id, question_text, answer_text, answer_number)`)
      .eq('survey_templates.company_id', user.id)
      .order('submitted_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) toast.error('Не удалось загрузить ответы: ' + error.message);
        else setResponses(data || []);
        setLoading(false);
      });
  }, [user]);

  const handleSort = (column: 'date' | 'survey' | 'respondent') => {
    if (sortBy === column) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else { setSortBy(column); setSortOrder('desc'); }
  };

  const uniqueSurveys = useMemo(() => Array.from(new Set(responses.map(r => r.survey_template?.id))).map(id => responses.find(r => r.survey_template?.id === id)?.survey_template).filter(Boolean), [responses]);

  const filteredResponses = useMemo(() => {
    const getDateThreshold = () => {
        const now = new Date();
        if (dateFilter === 'week') { now.setDate(now.getDate() - 7); return now; }
        if (dateFilter === 'month') { now.setMonth(now.getMonth() - 1); return now; }
        if (dateFilter === 'year') { now.setFullYear(now.getFullYear() - 1); return now; }
        return null;
    };
    const threshold = getDateThreshold();
    return responses
        .filter(r => {
            const searchLower = searchTerm.toLowerCase();
            const matchSearch = !searchTerm || 
                (r.survey_template?.title || '').toLowerCase().includes(searchLower) ||
                (r.respondent_email || '').toLowerCase().includes(searchLower) ||
                (r.recipient?.contact_person || '').toLowerCase().includes(searchLower);
            const matchSurvey = !selectedSurvey || r.survey_template?.id === selectedSurvey;
            const matchDate = !threshold || new Date(r.submitted_at) >= threshold;
            return matchSearch && matchSurvey && matchDate;
        })
        .sort((a, b) => { 
            let comparison = 0;
            if (sortBy === 'date') comparison = new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime();
            else if (sortBy === 'survey') comparison = (a.survey_template?.title || '').localeCompare(b.survey_template?.title || '');
            else {
              const aName = a.recipient?.contact_person || a.respondent_email; 
              const bName = b.recipient?.contact_person || b.respondent_email;
              comparison = aName.localeCompare(bName);
            }
            return sortOrder === 'asc' ? comparison : -comparison;
        });
  }, [responses, searchTerm, selectedSurvey, dateFilter, sortBy, sortOrder]);

  const paginatedResponses = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredResponses.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredResponses, currentPage]);

  const totalPages = Math.ceil(filteredResponses.length / ITEMS_PER_PAGE);
  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  if (loading) return <div className="flex justify-center p-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>

  return (
    <div className="p-4 md:p-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-semibold">Все ответы</h1>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
          <input type="text" placeholder="Поиск..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="h-10 w-full pl-10 pr-4 bg-surface border border-border rounded-lg"/>
        </div>
      </header>
      
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <select value={selectedSurvey} onChange={e => { setSelectedSurvey(e.target.value); setCurrentPage(1); }} className="h-10 px-4 w-full md:w-auto bg-background border border-border rounded-lg">
          <option value="">Все опросы</option>
          {uniqueSurveys.map(s => <option key={s?.id} value={s?.id}>{s?.title}</option>)}
        </select>
        <select value={dateFilter} onChange={e => { setDateFilter(e.target.value as any); setCurrentPage(1); }} className="h-10 px-4 w-full md:w-auto bg-background border border-border rounded-lg">
          <option value="all">За всё время</option>
          <option value="week">За неделю</option>
          <option value="month">За месяц</option>
          <option value="year">За год</option>
        </select>
      </div>

      {/* Mobile Cards View */}
      <div className="md:hidden space-y-3">
        {paginatedResponses.map(r => (
          <ResponseCard 
            key={r.id} 
            response={r} 
            isExpanded={expandedIds.has(r.id)} 
            onToggle={() => toggleExpanded(r.id)} 
          />
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block border border-border rounded-lg overflow-x-auto">
        <table className="w-full text-sm text-left min-w-[700px]">
           <thead className="bg-surface border-b border-border">
            <tr>
              <th className="px-4 py-3 w-12"></th>
              <SortableHeader title="Опрос" column="survey" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
              <SortableHeader title="Респондент" column="respondent" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
              <SortableHeader title="Дата" column="date" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
              <th className="px-4 py-3">Ответов</th>
            </tr>
          </thead>
          <tbody>
            {paginatedResponses.map(r => (
              <ResponseRow key={r.id} response={r} isExpanded={expandedIds.has(r.id)} onToggle={() => toggleExpanded(r.id)} />
            ))}
          </tbody>
        </table>
      </div>
      
       {paginatedResponses.length === 0 && !loading && <div className="text-center py-16 text-text-secondary">Нет ответов, соответствующих вашему запросу.</div>}

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <span className="text-sm text-text-secondary">Стр. {currentPage} из {totalPages}</span>
          <div className="flex gap-2">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 h-8 rounded bg-surface hover:bg-background disabled:opacity-50">←</button>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 h-8 rounded bg-surface hover:bg-background disabled:opacity-50">→</button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Child Components ---

const ResponseDetails = ({ response }: { response: any }) => (
    <div className="bg-background p-4 md:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 mb-6 text-sm">
            <InfoItem icon={User} label="Респондент" value={response.recipient?.contact_person} />
            <InfoItem icon={Mail} label="Email" value={response.respondent_email} />
            <InfoItem icon={Building} label="Компания" value={response.recipient?.company_name} />
            <InfoItem icon={Calendar} label="Дата сдачи" value={new Date(response.submitted_at).toLocaleString('ru')} />
        </div>
        <div className="border-t border-border pt-4">
            {response.submission_answers.map((answer: any, index: number) => (
            <div key={answer.id} className="mb-4 text-sm">
                <div className="font-semibold text-text-primary mb-1">{index + 1}. {answer.question_text}</div>
                <div className="text-text-secondary pl-4 break-words">➤ {answer.answer_text || answer.answer_number}</div>
            </div>
            ))}
        </div>
        <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-border">
            <button onClick={(e) => { e.stopPropagation(); exportSinglePDF(response); }} className="inline-flex items-center gap-2 h-9 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"> <Download size={14} /> PDF</button>
            <button onClick={(e) => { e.stopPropagation(); exportSingleExcel(response); }} className="inline-flex items-center gap-2 h-9 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"> <Download size={14} /> Excel</button>
            <button onClick={(e) => { e.stopPropagation(); exportSingleCSV(response); }} className="inline-flex items-center gap-2 h-9 px-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"> <Download size={14} /> CSV</button>
        </div>
    </div>
);

const ResponseCard = ({ response, isExpanded, onToggle }: { response: any, isExpanded: boolean, onToggle: () => void }) => (
    <div className="bg-surface border border-border rounded-lg text-sm overflow-hidden">
        <div className="p-4 cursor-pointer active:bg-background" onClick={onToggle}>
            <p className="font-semibold truncate mb-1">{response.survey_template?.title}</p>
            <p className="text-text-secondary truncate">{response.recipient?.contact_person || response.respondent_email}</p>
            <div className="flex justify-between items-center mt-2 text-xs text-text-tertiary">
                <span>{new Date(response.submitted_at).toLocaleDateString('ru')}</span>
                <div className="flex items-center gap-2 text-text-secondary">
                    <span>{response.submission_answers.length} ответов</span>
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </div>
            </div>
        </div>
        {isExpanded && <ResponseDetails response={response} />}
    </div>
);

function ResponseRow({ response, isExpanded, onToggle }: any) {
  return (
    <>
      <tr onClick={onToggle} className="cursor-pointer hover:bg-surface transition-colors">
        <td className="px-4 py-3 text-center text-text-secondary">{isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</td>
        <td className="px-4 py-3 font-medium truncate max-w-sm">{response.survey_template?.title}</td>
        <td className="px-4 py-3 truncate max-w-xs">{response.recipient?.contact_person || response.respondent_email}</td>
        <td className="px-4 py-3 whitespace-nowrap">{new Date(response.submitted_at).toLocaleDateString('ru')}</td>
        <td className="px-4 py-3 text-center">{response.submission_answers.length}</td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={5} className="p-0"><ResponseDetails response={response} /></td>
        </tr>
      )}
    </>
  );
}

const InfoItem = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value?: string }) => (
  <div className="flex items-start gap-3">
    <Icon size={16} className="text-text-secondary flex-shrink-0 mt-0.5" />
    <div className="min-w-0">
      <div className="font-semibold text-text-primary">{label}</div>
      <div className="text-text-secondary truncate">{value || '–'}</div>
    </div>
  </div>
);

const StatCard = ({ title, value }: { title: string; value: string | number }) => (
  <div className="p-4 bg-surface rounded-lg border border-border">
    <div className="text-sm text-text-secondary mb-1">{title}</div>
    <div className="text-2xl font-semibold">{value}</div>
  </div>
);

const SortableHeader = ({ title, column, sortBy, sortOrder, onSort }: any) => (
  <th onClick={() => onSort(column)} className="text-left p-4 cursor-pointer hover:bg-background whitespace-nowrap">
    <div className="flex items-center gap-2">
      {title}
      {sortBy === column && (
        <span className="text-primary">{sortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}</span>
      )}
    </div>
  </th>
);
