
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { SurveyTemplate, SurveySubmission, SubmissionAnswer, SurveyRecipient } from '../types/database';
import { toast } from 'sonner';
import { Download, Search, ChevronDown, ChevronUp, Mail, Calendar, Maximize2, Minimize2, List, Table2, BarChart3, Sparkles, Loader2, ArrowLeft, RefreshCw, AlertCircle, FileText, ChevronRight } from 'lucide-react';
import { generateResponsesPdf } from '../lib/pdfExport';

// --- Type Definitions ---
interface SubmissionWithDetails extends SurveySubmission {
  answers: SubmissionAnswer[];
  recipient?: SurveyRecipient | null;
}

// --- Main Component ---
export function Responses() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [survey, setSurvey] = useState<SurveyTemplate | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ surveyId: 'all', timeRange: 'all' });

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
    } catch(err: any) {
        toast.error(err.message);
        navigate('/dashboard');
    } finally {
        setLoading(false);
    }
  }, [id, user, navigate]);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredSubmissions = useMemo(() => {
    const lowercasedTerm = searchTerm.toLowerCase();
    return submissions.filter(sub => 
        (sub.recipient?.contact_person?.toLowerCase().includes(lowercasedTerm)) || 
        (sub.recipient?.email?.toLowerCase().includes(lowercasedTerm))
    );
  }, [searchTerm, submissions]);

  const getQuestionStats = useMemo(() => {
    if (submissions.length === 0) return [];
    const allQuestions = Array.from(new Set(submissions.flatMap(s => s.answers.map(a => a.question_text))));
    return allQuestions.map(question => {
      const qAnswers = submissions.flatMap(s => s.answers.filter(a => a.question_text === question));
      return { question, total: qAnswers.length };
    });
  }, [submissions]);


  if (loading) return <div className="flex justify-center items-center h-96"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;

  return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
          <header className="mb-6">
              <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-sm text-text-secondary hover:text-primary mb-4 transition-colors"><ArrowLeft size={16}/> Назад ко всем опросам</button>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                  <div className="min-w-0">
                      <h1 className="text-xl sm:text-2xl font-semibold text-text-primary truncate">{survey?.title}</h1>
                      <p className="text-sm text-text-secondary mt-1">Просмотр и анализ полученных ответов.</p>
                  </div>
                  <div className="relative flex-shrink-0">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                          type="text"
                          placeholder="Поиск по имени, email..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full sm:w-64 h-9 pl-9 pr-4 text-sm border border-border rounded-lg bg-background"
                      />
                  </div>
              </div>
          </header>

          <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <select disabled className="w-full sm:w-48 px-4 h-9 border border-border rounded-lg bg-background text-sm"><option>{survey?.title || 'Текущий опрос'}</option></select>
              <select disabled className="w-full sm:w-48 px-4 h-9 border border-border rounded-lg bg-background text-sm"><option>За всё время</option></select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <div className="bg-surface border border-border rounded-lg p-4"><p className="text-sm text-text-secondary mb-1">Всего ответов</p><p className="text-2xl font-semibold">{submissions.length}</p></div>
              <div className="bg-surface border border-border rounded-lg p-4"><p className="text-sm text-text-secondary mb-1">Уникальных респондентов</p><p className="text-2xl font-semibold">{new Set(submissions.map(s => s.recipient?.email || s.recipient_id)).size}</p></div>
              <div className="bg-surface border border-border rounded-lg p-4"><p className="text-sm text-text-secondary mb-1">Среднее время</p><p className="text-2xl font-semibold">-</p></div>
          </div>

        {submissions.length === 0 ? (
          <div className="py-20 text-center rounded-lg bg-surface border border-border">
              <FileText className="h-12 w-12 text-text-tertiary mx-auto mb-3" />
              <p className="text-lg font-medium">Ответов пока нет</p>
              <p className="text-text-secondary mt-1">Как только кто-то пройдет опрос, его ответы появятся здесь.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block border border-border rounded-lg bg-surface">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[700px]">
                        <thead>
                            <tr className="bg-background">
                                {['Респондент', 'Дата', ...getQuestionStats.map(q=>q.question)].map(h => <th key={h} className="p-3 text-left font-medium text-text-secondary border-b border-border-subtle whitespace-nowrap">{h}</th>)}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-subtle">
                            {filteredSubmissions.map(sub => (
                                <tr key={sub.id} className="hover:bg-background">
                                    <td className="p-3">
                                        <div className="font-medium truncate">{sub.recipient?.contact_person || 'Аноним'}</div>
                                        <div className="text-text-secondary truncate">{sub.recipient?.email}</div>
                                    </td>
                                    <td className="p-3 text-text-secondary">{new Date(sub.submitted_at).toLocaleDateString()}</td>
                                    {getQuestionStats.map(q => (
                                        <td key={q.question} className="p-3 text-text-secondary max-w-xs truncate">{sub.answers.find(a => a.question_text === q.question)?.answer_text || '-'}</td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
                {filteredSubmissions.map(sub => (
                    <div key={sub.id} className="bg-surface-primary border border-border-subtle rounded-lg p-4 text-sm active:bg-background" onClick={() => navigate(`/dashboard/survey/${id}/submission/${sub.id}`)}>
                         <div className="flex justify-between items-start">
                            <div className="min-w-0 flex-1">
                                <p className="font-semibold text-sm break-words truncate">{sub.recipient?.contact_person || 'Аноним'}</p>
                                <p className="text-sm text-text-secondary truncate">{sub.recipient?.email}</p>
                            </div>
                            <div className="ml-2 flex-shrink-0 text-text-tertiary flex items-center gap-1">
                                <span className="text-xs">{new Date(sub.submitted_at).toLocaleDateString('ru')}</span>
                                <ChevronRight size={18} />
                            </div>
                         </div>
                    </div>
                ))}
            </div>
          </>
        )}
      </div>
  );
}
