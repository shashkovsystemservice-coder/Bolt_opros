
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { SurveyTemplate, SurveySubmission, SubmissionAnswer, SurveyRecipient } from '../types/database';
import { toast } from 'sonner';
import { Download, Search, ChevronDown, ChevronUp, Mail, Calendar, Maximize2, Minimize2, List, Table2, BarChart3, Sparkles, Loader2, ArrowLeft, RefreshCw, AlertCircle } from 'lucide-react';

// --- Type Definitions ---
interface SubmissionWithDetails extends SurveySubmission {
  answers: SubmissionAnswer[];
  recipient?: SurveyRecipient | null;
}

// --- Reusable Components ---
const ActionButton = ({ onClick, children, loading = false, disabled = false, variant = 'primary', size = 'md' }) => {
    const base = "inline-flex items-center justify-center font-medium text-sm rounded-md transition-colors duration-200 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background";
    const sizes = { md: "h-9 px-4", sm: "h-8 px-3" };
    const variants = { 
        primary: "bg-primary text-on-primary hover:bg-primary/90 focus:ring-primary", 
        secondary: "bg-surface border border-border hover:bg-background text-text-primary focus:ring-primary",
        special: "bg-gradient-to-r from-violet-500 to-purple-500 text-white hover:opacity-90 focus:ring-violet-500",
    };
    return <button onClick={onClick} disabled={disabled || loading} className={`${base} ${sizes[size]} ${variants[variant]}`}>{loading ? <Loader2 className="animate-spin h-4 w-4"/> : children}</button>;
};

const SegmentedControl = ({ value, onChange, options }) => (
    <div className="inline-flex gap-1 p-1 rounded-lg bg-background border border-border">
        {options.map(opt => (
            <button key={opt.value} onClick={() => onChange(opt.value)} className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${value === opt.value ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-surface'}`}>
                <opt.icon className="w-4 h-4" />
                {opt.label}
            </button>
        ))}
    </div>
);

// --- Main Component ---
export function Responses() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [survey, setSurvey] = useState<SurveyTemplate | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'list' | 'table' | 'analytics'>('list');
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [loadingAiAnalysis, setLoadingAiAnalysis] = useState(false);
  const [aiError, setAiError] = useState('');

  const loadData = useCallback(async () => {
    if (!id || !user) return;
    setLoading(true);

    try {
        const { data: surveyData, error: surveyError } = await supabase.from('survey_templates').select('*').eq('id', id).eq('company_id', user.id).single();
        if (surveyError) throw new Error("Опрос не найден или у вас нет к нему доступа.");
        setSurvey(surveyData);

        const { data: submissionsData, error: subsError } = await supabase.from('survey_submissions').select('*, recipient:survey_recipients(*)').eq('survey_template_id', id).order('submitted_at', { ascending: false });
        if (subsError) throw subsError;

        const { data: answersData, error: answersError } = await supabase.from('submission_answers').select('*').in('submission_id', submissionsData.map(s => s.id));
        if (answersError) throw answersError;

        const answersBySubmission = answersData.reduce((acc, answer) => {
            if (!acc[answer.submission_id]) acc[answer.submission_id] = [];
            acc[answer.submission_id].push(answer);
            return acc;
        }, {});

        const submissionsWithDetails = submissionsData.map(sub => ({
            ...sub,
            answers: answersBySubmission[sub.id] || [],
        }));

        setSubmissions(submissionsWithDetails);
        setExpandedIds(new Set(submissionsWithDetails.map(s => s.id)));
    } catch(err) {
        toast.error(err.message);
        navigate('/dashboard');
    } finally {
        setLoading(false);
    }
  }, [id, user, navigate]);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredSubmissions = useMemo(() => {
    if (!searchTerm.trim()) return submissions;
    return submissions.filter(sub => 
        (sub.recipient?.contact_person?.toLowerCase().includes(searchTerm.toLowerCase())) || 
        (sub.recipient?.email?.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [searchTerm, submissions]);

  const toggleExpanded = (submissionId: string) => setExpandedIds(prev => { const next = new Set(prev); next.has(submissionId) ? next.delete(submissionId) : next.add(submissionId); return next; });
  const toggleAllExpanded = () => expandedIds.size === filteredSubmissions.length ? setExpandedIds(new Set()) : setExpandedIds(new Set(filteredSubmissions.map(s => s.id)));

  const exportCSV = () => {
    if (submissions.length === 0) return;
    const allQuestions = Array.from(new Set(submissions.flatMap((sub) => sub.answers.map((a) => a.question_text))));
    const headers = ['Дата', 'Имя', 'Email', 'Код', ...allQuestions];
    const rows = submissions.map((sub) => {
      const row = [ new Date(sub.submitted_at).toLocaleString('ru-RU'), sub.recipient?.contact_person || '', sub.recipient?.email || '', sub.recipient?.recipient_code || '' ];
      allQuestions.forEach((q) => row.push(sub.answers.find((a) => a.question_text === q)?.answer_text || '-'));
      return row;
    });
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Ответы-${survey?.title.replace(/ /g, "_")}.csv`;
    link.click();
    toast.success("Экспорт начался");
  };

  const generateAiAnalysis = async () => {
    setLoadingAiAnalysis(true);
    setAiError('');
    try {
        const { data, error } = await supabase.functions.invoke('gemini-ai', { 
            body: { action: 'analyze-responses', data: { surveyTitle: survey?.title, submissions: submissions.map(s => ({...s, answers: s.answers.map(a => ({question: a.question_text, answer: a.answer_text}))})) } }
        });
        if (error || data.error) throw new Error(error?.message || data.error);
        setAiAnalysis(data.analysis);
    } catch (err: any) { setAiError(err.message); } 
    finally { setLoadingAiAnalysis(false); }
  };
  
  const getQuestionStats = useMemo(() => {
    const allQuestions = Array.from(new Set(submissions.flatMap(s => s.answers.map(a => a.question_text))));
    return allQuestions.map(question => {
      const qAnswers = submissions.flatMap(s => s.answers.filter(a => a.question_text === question));
      const isNumeric = qAnswers.every(a => a.answer_number !== null);
      if (isNumeric) {
          const nums = qAnswers.map(a => a.answer_number).filter(n => n !== null) as number[];
          return { question, type: 'numeric', total: nums.length, avg: nums.reduce((s, n) => s + n, 0) / nums.length, min: Math.min(...nums), max: Math.max(...nums) };
      } else {
          const textAnswers = qAnswers.map(a => a.answer_text || '').filter(t => t);
          const counts = textAnswers.reduce((acc, ans) => { acc[ans] = (acc[ans] || 0) + 1; return acc; }, {} as Record<string, number>);
          const sorted = Object.entries(counts).sort(([,a],[,b]) => b - a).map(([answer, count])=>({answer, count}));
          return { question, type: 'text', total: textAnswers.length, answers: sorted };
      }
    });
  }, [submissions]);


  if (loading) return <div className="flex justify-center items-center h-96"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;

  return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <header className="mb-8">
            <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-sm text-text-secondary hover:text-primary mb-5 transition-colors"><ArrowLeft size={16}/> Назад ко всем опросам</button>
            <h1 className="text-2xl font-semibold text-text-primary">{survey?.title}</h1>
            <p className="text-sm text-text-secondary mt-1">Просмотр и анализ полученных ответов.</p>
        </header>

        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <SegmentedControl value={viewMode} onChange={setViewMode} options={[{value: 'list', label: 'Список', icon: List}, {value: 'table', label: 'Таблица', icon: Table2}, {value: 'analytics', label: 'Аналитика', icon: BarChart3}]} />
            <div className="flex items-center gap-2">
                <ActionButton onClick={exportCSV} disabled={submissions.length === 0} variant="secondary"><Download className="w-4 h-4 mr-2" />Экспорт CSV</ActionButton>
                <ActionButton onClick={loadData} loading={loading} variant="secondary"><RefreshCw className="w-4 h-4" /></ActionButton>
            </div>
        </div>

        {submissions.length === 0 ? (
          <div className="py-20 text-center rounded-lg bg-surface border border-border"><p className="text-lg font-medium">Ответов пока нет</p><p className="text-text-secondary mt-1">Как только кто-то пройдет опрос, его ответы появятся здесь.</p></div>
        ) : (
          <>
            {viewMode === 'list' && (
                <div className="border border-border rounded-lg bg-surface">
                    <div className="p-4 border-b border-border-subtle"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" /><input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Поиск по имени или email" className="w-full h-9 pl-9 pr-4 bg-background border border-border rounded-md text-sm"/></div></div>
                    {filteredSubmissions.length > 0 && <div className="p-4 border-b border-border-subtle flex justify-end"><button onClick={toggleAllExpanded} className="text-xs font-medium text-primary hover:underline">{expandedIds.size === filteredSubmissions.length ? 'Свернуть все' : 'Развернуть все'}</button></div>}
                    <div className="divide-y divide-border-subtle">
                        {filteredSubmissions.map(sub => <SubmissionItem key={sub.id} submission={sub} isExpanded={expandedIds.has(sub.id)} onToggle={() => toggleExpanded(sub.id)} />)}
                    </div>
                </div>
            )}

            {viewMode === 'table' && (
                <div className="border border-border rounded-lg bg-surface overflow-x-auto">
                   <table className="w-full text-sm"><thead><tr className="bg-background">{['Имя', 'Email', 'Дата', ...getQuestionStats.map(q=>q.question)].map(h => <th key={h} className="p-3 text-left font-medium text-text-secondary border-b border-border-subtle">{h}</th>)}</tr></thead><tbody className="divide-y divide-border-subtle">{filteredSubmissions.map(sub => <tr key={sub.id} className="hover:bg-background">{[sub.recipient?.contact_person, sub.recipient?.email, new Date(sub.submitted_at).toLocaleDateString(), ...getQuestionStats.map(q => sub.answers.find(a => a.question_text === q.question)?.answer_text || '-')].map((cell, i) => <td key={i} className="p-3 whitespace-nowrap">{cell}</td>)}</tr>)}</tbody></table>
                </div>
            )}

            {viewMode === 'analytics' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6"><div className="p-6 text-center rounded-lg bg-primary/10 text-primary"><div className="text-4xl font-bold">{submissions.length}</div><div className="mt-1 font-medium">Всего ответов</div></div></div>
                    <AnalyticsSection title="AI Анализ" description="Краткая сводка, инсайты и рекомендации на основе всех ответов.">
                        <ActionButton onClick={generateAiAnalysis} loading={loadingAiAnalysis} disabled={submissions.length === 0} variant="special"><Sparkles className="w-4 h-4 mr-2"/>{loadingAiAnalysis ? 'Анализирую...' : 'Сгенерировать отчет'}</ActionButton>
                        {aiError && <div className="p-4 mt-4 bg-red-500/10 border border-red-500/20 text-red-600 rounded-md text-sm flex gap-2"><AlertCircle size={18}/>{aiError}</div>}
                        {aiAnalysis && <div className="mt-5 space-y-5 text-sm"><div><h4 className="font-semibold mb-2">Резюме</h4><p className="text-text-secondary leading-relaxed">{aiAnalysis.summary}</p></div><div><h4 className="font-semibold mb-2">Ключевые инсайты</h4><ul className="list-disc list-inside space-y-2 text-text-secondary">{aiAnalysis.insights.map((insight, i) => <li key={i}>{insight}</li>)}</ul></div><div><h4 className="font-semibold mb-2">Рекомендации</h4><ul className="list-disc list-inside space-y-2 text-text-secondary">{aiAnalysis.recommendations.map((rec, i) => <li key={i}>{rec}</li>)}</ul></div></div>}
                    </AnalyticsSection>
                    <AnalyticsSection title="Статистика по вопросам" description="Агрегированные данные для каждого вопроса.">
                        <div className="space-y-4">{getQuestionStats.map((stat, i) => <QuestionStat key={i} stat={stat} />)}</div>
                    </AnalyticsSection>
                </div>
            )}
          </>
        )}
      </div>
  );
}

// --- Child Components for Responses Page ---
const SubmissionItem = ({ submission, isExpanded, onToggle }) => (
    <div className="p-4">
        <div onClick={onToggle} className="flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-4 text-sm"><div className="flex flex-col"><p className="font-medium text-text-primary">{submission.recipient?.contact_person || 'Аноним'}</p><p className="text-text-secondary">{submission.recipient?.email || `Код: ${submission.recipient?.recipient_code}`}</p></div></div>
            <div className="flex items-center gap-6"><span className="text-xs text-text-secondary">{new Date(submission.submitted_at).toLocaleString('ru')}</span><ChevronDown className={`w-5 h-5 text-text-secondary transition-transform ${isExpanded ? 'rotate-180' : ''}`} /></div>
        </div>
        {isExpanded && <div className="mt-4 pt-4 border-t border-border-subtle space-y-3 text-sm">{submission.answers.map(a => <div key={a.id}><p className="font-medium">{a.question_text}</p><p className="text-text-secondary mt-1">{a.answer_text || a.answer_number || '-'}</p></div>)}</div>}
    </div>
);

const AnalyticsSection = ({ title, description, children }) => (
    <div className="border-t border-border-subtle pt-8">
        <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
        <p className="text-sm text-text-secondary mt-1 mb-5">{description}</p>
        {children}
    </div>
);

const QuestionStat = ({ stat }) => (
    <div className="p-5 rounded-lg bg-surface border border-border">
        <h3 className="font-semibold text-text-primary mb-3">{stat.question}</h3>
        {stat.type === 'numeric' ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">{Object.entries({Всего: stat.total, Среднее: stat.avg.toFixed(1), Мин: stat.min, Макс: stat.max}).map(([k,v])=><div key={k} className="px-2 py-3 bg-background rounded-md"><div className="text-2xl font-bold">{v}</div><div className="text-xs text-text-secondary mt-1">{k}</div></div>)}</div>
        ) : (
            <div className="space-y-3">{stat.answers.slice(0, 5).map((item, i) => <div key={i}><div className="flex justify-between text-sm mb-1"><span className="font-medium text-text-primary">{item.answer}</span><span className="text-text-secondary">{item.count} ({((item.count / stat.total) * 100).toFixed(0)}%)</span></div><div className="h-1.5 bg-background rounded-full"><div className="h-full bg-primary rounded-full" style={{ width: `${(item.count / stat.total) * 100}%` }} /></div></div>)}{stat.answers.length > 5 && <p className="text-xs text-text-secondary italic">+ ещё {stat.answers.length - 5} вариантов</p>}</div>
        )}
    </div>
);
