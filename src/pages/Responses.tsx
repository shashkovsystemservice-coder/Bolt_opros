import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { SurveyTemplate, SurveySubmission, SubmissionAnswer, SurveyRecipient } from '../types/database';
import { Download, Search, ChevronDown, ChevronUp, Building2, Mail, Calendar, Maximize2, Minimize2, List, Table2, BarChart3, Sparkles, Loader2 } from 'lucide-react';

interface SubmissionWithDetails extends SurveySubmission {
  answers: SubmissionAnswer[];
  recipient?: SurveyRecipient | null;
}

export function Responses() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [survey, setSurvey] = useState<SurveyTemplate | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionWithDetails[]>([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState<SubmissionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'list' | 'table' | 'analytics'>('list');
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [loadingAiAnalysis, setLoadingAiAnalysis] = useState(false);
  const [aiError, setAiError] = useState('');

  useEffect(() => {
    loadData();
  }, [id]);

  useEffect(() => {
    if (searchTerm.trim()) {
      const filtered = submissions.filter(
        (sub) =>
          sub.respondent_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          sub.recipient?.company_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredSubmissions(filtered);
    } else {
      setFilteredSubmissions(submissions);
    }
  }, [searchTerm, submissions]);

  const loadData = async () => {
    if (!id) return;

    const { data: surveyData } = await supabase
      .from('survey_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (surveyData) setSurvey(surveyData);

    const { data: submissionsData } = await supabase
      .from('survey_submissions')
      .select('*')
      .eq('survey_template_id', id)
      .order('submitted_at', { ascending: false });

    if (submissionsData) {
      const submissionsWithDetails = await Promise.all(
        submissionsData.map(async (submission) => {
          const { data: answers } = await supabase
            .from('submission_answers')
            .select('*')
            .eq('submission_id', submission.id);

          let recipient = null;
          if (submission.recipient_id) {
            const { data: recipientData } = await supabase
              .from('survey_recipients')
              .select('*')
              .eq('id', submission.recipient_id)
              .maybeSingle();
            recipient = recipientData;
          }

          return {
            ...submission,
            answers: answers || [],
            recipient,
          };
        })
      );

      setSubmissions(submissionsWithDetails);
      setFilteredSubmissions(submissionsWithDetails);

      setExpandedIds(new Set(submissionsWithDetails.map(s => s.id)));
    }

    setLoading(false);
  };

  const toggleExpanded = (submissionId: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(submissionId)) {
      newExpanded.delete(submissionId);
    } else {
      newExpanded.add(submissionId);
    }
    setExpandedIds(newExpanded);
  };

  const toggleAllExpanded = () => {
    if (expandedIds.size === filteredSubmissions.length) {
      setExpandedIds(new Set());
    } else {
      setExpandedIds(new Set(filteredSubmissions.map(s => s.id)));
    }
  };

  const exportCSV = () => {
    if (submissions.length === 0) return;

    const allQuestions = Array.from(
      new Set(submissions.flatMap((sub) => sub.answers.map((a) => a.question_text)))
    );

    const headers = ['Дата', 'Email', 'Компания', ...allQuestions];
    const rows = submissions.map((sub) => {
      const row = [
        new Date(sub.submitted_at).toLocaleString('ru-RU'),
        sub.respondent_email,
        sub.recipient?.company_name || '',
      ];

      allQuestions.forEach((question) => {
        const answer = sub.answers.find((a) => a.question_text === question);
        row.push(answer?.answer_text || answer?.answer_number?.toString() || '');
      });

      return row;
    });

    const csvContent = [
      headers.map((h) => `"${h}"`).join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ответы_${survey?.title || 'опрос'}_${Date.now()}.csv`;
    link.click();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const generateAiAnalysis = async () => {
    if (submissions.length === 0) return;

    setLoadingAiAnalysis(true);
    setAiError('');

    try {
      const allQuestions = Array.from(
        new Set(submissions.flatMap((sub) => sub.answers.map((a) => a.question_text)))
      );

      const responses = submissions.map((sub) => ({
        email: sub.respondent_email,
        company: sub.recipient?.company_name || 'Не указано',
        date: sub.submitted_at,
        answers: sub.answers.map((a) => ({
          question: a.question_text,
          answer: a.answer_text || a.answer_number?.toString() || '',
        })),
      }));

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini-ai`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'analyze-responses',
          data: {
            surveyTitle: survey?.title || 'Опрос',
            questions: allQuestions,
            responses,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Ошибка при анализе данных');
      }

      const result = await response.json();
      setAiAnalysis(result.analysis);
    } catch (error: any) {
      setAiError(error.message || 'Ошибка при анализе данных');
    } finally {
      setLoadingAiAnalysis(false);
    }
  };

  const getQuestionStats = () => {
    const allQuestions = Array.from(
      new Set(submissions.flatMap((sub) => sub.answers.map((a) => a.question_text)))
    );

    return allQuestions.map((question) => {
      const answers = submissions.flatMap((sub) =>
        sub.answers.filter((a) => a.question_text === question)
      );

      const isNumeric = answers.every((a) => a.answer_number !== null);

      if (isNumeric) {
        const numbers = answers.map((a) => a.answer_number!).filter((n) => n !== null);
        const avg = numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
        const min = Math.min(...numbers);
        const max = Math.max(...numbers);

        return { question, type: 'numeric', avg, min, max, total: numbers.length };
      } else {
        const textAnswers = answers.map((a) => a.answer_text || '').filter((t) => t);
        const uniqueAnswers = Array.from(new Set(textAnswers));
        const counts = uniqueAnswers.map((answer) => ({
          answer,
          count: textAnswers.filter((a) => a === answer).length,
        })).sort((a, b) => b.count - a.count);

        return { question, type: 'text', answers: counts, total: textAnswers.length };
      }
    });
  };

  if (loading) {
    return (
        <div className="flex items-center justify-center h-96">
          <div className="text-[#5F6368]">Загрузка...</div>
        </div>
    );
  }

  return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-medium text-[#1F1F1F] tracking-tight mb-2">{survey?.title}</h1>
          <p className="text-[#5F6368]">Просмотр ответов респондентов</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E8EAED] p-2 mb-6 inline-flex gap-1">
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'list'
                ? 'bg-[#E8F0FE] text-[#1A73E8]'
                : 'text-[#5F6368] hover:bg-[#F8F9FA]'
            }`}
          >
            <List className="w-5 h-5" strokeWidth={2} />
            Список
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'table'
                ? 'bg-[#E8F0FE] text-[#1A73E8]'
                : 'text-[#5F6368] hover:bg-[#F8F9FA]'
            }`}
          >
            <Table2 className="w-5 h-5" strokeWidth={2} />
            Таблица
          </button>
          <button
            onClick={() => setViewMode('analytics')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'analytics'
                ? 'bg-[#E8F0FE] text-[#1A73E8]'
                : 'text-[#5F6368] hover:bg-[#F8F9FA]'
            }`}
          >
            <BarChart3 className="w-5 h-5" strokeWidth={2} />
            Аналитика
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {viewMode !== 'analytics' && (
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5F6368]" strokeWidth={2} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Поиск по email или компании"
                className="w-full h-12 pl-12 pr-4 border border-[#E8EAED] rounded-lg focus:outline-none focus:border-[#1A73E8] transition-colors bg-white"
              />
            </div>
          )}
          {viewMode === 'list' && (
            <button
              onClick={toggleAllExpanded}
              disabled={filteredSubmissions.length === 0}
              className="flex items-center justify-center gap-2 px-6 h-12 border border-[#E8EAED] bg-white text-[#1F1F1F] rounded-full font-medium hover:bg-[#F8F9FA] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {expandedIds.size === filteredSubmissions.length ? (
                <>
                  <Minimize2 className="w-5 h-5" strokeWidth={2} />
                  Свернуть все
                </>
              ) : (
                <>
                  <Maximize2 className="w-5 h-5" strokeWidth={2} />
                  Развернуть все
                </>
              )}
            </button>
          )}
          <button
            onClick={exportCSV}
            disabled={submissions.length === 0}
            className="flex items-center justify-center gap-2 px-6 h-12 bg-[#1A73E8] text-white rounded-full font-medium hover:bg-[#1557B0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-5 h-5" strokeWidth={2} />
            Экспорт CSV
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-[#E8EAED] p-6 mb-6">
          <div className="text-center">
            <div className="text-4xl font-medium text-[#1F1F1F] mb-2">{submissions.length}</div>
            <div className="text-sm text-[#5F6368]">Всего ответов</div>
          </div>
        </div>

        {submissions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E8EAED] p-12 text-center">
            <div className="text-lg font-medium text-[#1F1F1F] mb-2">Нет ответов</div>
            <p className="text-[#5F6368]">Ответы появятся здесь после заполнения опроса</p>
          </div>
        ) : (
          <>
            {viewMode === 'list' && (
              <>
                {filteredSubmissions.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-[#E8EAED] p-12 text-center">
                    <div className="text-lg font-medium text-[#1F1F1F] mb-2">Ничего не найдено</div>
                    <p className="text-[#5F6368]">Попробуйте изменить параметры поиска</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredSubmissions.map((submission) => {
                      const isExpanded = expandedIds.has(submission.id);

                      return (
                        <div key={submission.id} className="bg-white rounded-2xl border border-[#E8EAED] overflow-hidden">
                          <button
                            onClick={() => toggleExpanded(submission.id)}
                            className="w-full p-6 flex items-center justify-between hover:bg-[#F8F9FA] transition-colors"
                          >
                            <div className="flex items-center gap-4 flex-1 text-left">
                              {submission.recipient?.company_name && (
                                <div className="flex items-center gap-2">
                                  <Building2 className="w-5 h-5 text-[#5F6368]" strokeWidth={2} />
                                  <span className="font-medium text-[#1F1F1F]">
                                    {submission.recipient.company_name}
                                  </span>
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                <Mail className="w-5 h-5 text-[#5F6368]" strokeWidth={2} />
                                <span className="text-[#5F6368]">{submission.respondent_email}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-[#5F6368]" strokeWidth={2} />
                                <span className="text-sm text-[#5F6368]">
                                  {formatDate(submission.submitted_at)}
                                </span>
                              </div>
                            </div>
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5 text-[#5F6368]" strokeWidth={2} />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-[#5F6368]" strokeWidth={2} />
                            )}
                          </button>

                          {isExpanded && (
                            <div className="px-6 pb-6 space-y-4 border-t border-[#E8EAED] pt-6">
                              {submission.answers.map((answer) => (
                                <div key={answer.id} className="bg-[#F8F9FA] rounded-xl p-4">
                                  <div className="text-sm font-medium text-[#1F1F1F] mb-2">
                                    {answer.question_text}
                                  </div>
                                  <div className="text-[#5F6368]">
                                    {answer.answer_text || answer.answer_number || '—'}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {viewMode === 'table' && (
              <div className="bg-white rounded-2xl border border-[#E8EAED] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[#F8F9FA] border-b border-[#E8EAED]">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-medium text-[#5F6368]">Дата</th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-[#5F6368]">Email</th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-[#5F6368]">Компания</th>
                        {Array.from(new Set(submissions.flatMap(s => s.answers.map(a => a.question_text)))).map((question, idx) => (
                          <th key={idx} className="px-6 py-4 text-left text-sm font-medium text-[#5F6368] min-w-[200px]">
                            {question}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E8EAED]">
                      {filteredSubmissions.map((submission) => (
                        <tr key={submission.id} className="hover:bg-[#F8F9FA] transition-colors">
                          <td className="px-6 py-4 text-sm text-[#5F6368] whitespace-nowrap">
                            {formatDate(submission.submitted_at)}
                          </td>
                          <td className="px-6 py-4 text-sm text-[#1F1F1F]">
                            {submission.respondent_email}
                          </td>
                          <td className="px-6 py-4 text-sm text-[#5F6368]">
                            {submission.recipient?.company_name || '—'}
                          </td>
                          {Array.from(new Set(submissions.flatMap(s => s.answers.map(a => a.question_text)))).map((question, idx) => {
                            const answer = submission.answers.find(a => a.question_text === question);
                            return (
                              <td key={idx} className="px-6 py-4 text-sm text-[#1F1F1F]">
                                {answer?.answer_text || answer?.answer_number || '—'}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {viewMode === 'analytics' && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-[#E8EAED] p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-medium text-[#1F1F1F] mb-1">AI Анализ</h3>
                      <p className="text-sm text-[#5F6368]">Получите детальный анализ ответов с помощью искусственного интеллекта</p>
                    </div>
                    <button
                      onClick={generateAiAnalysis}
                      disabled={loadingAiAnalysis || submissions.length === 0}
                      className="flex items-center gap-2 px-6 h-12 bg-gradient-to-r from-[#1A73E8] to-[#4285F4] text-white rounded-full font-medium hover:shadow-lg transition-all disabled:opacity-50"
                    >
                      {loadingAiAnalysis ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" strokeWidth={2} />
                          Анализирую...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5" strokeWidth={2} />
                          Анализировать с AI
                        </>
                      )}
                    </button>
                  </div>

                  {aiError && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                      {aiError}
                    </div>
                  )}

                  {aiAnalysis && (
                    <div className="space-y-6 mt-6">
                      <div className="bg-gradient-to-r from-[#E8F0FE] to-[#F8F9FA] rounded-xl p-6">
                        <h4 className="text-sm font-medium text-[#1A73E8] mb-3">Краткое резюме</h4>
                        <p className="text-[#1F1F1F] leading-relaxed">{aiAnalysis.summary}</p>
                      </div>

                      {aiAnalysis.insights && aiAnalysis.insights.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-[#1F1F1F] mb-3">Ключевые инсайты</h4>
                          <div className="space-y-3">
                            {aiAnalysis.insights.map((insight: string, idx: number) => (
                              <div key={idx} className="flex gap-3 p-4 bg-[#F8F9FA] rounded-xl">
                                <div className="flex-shrink-0 w-6 h-6 bg-[#1A73E8] text-white rounded-full flex items-center justify-center text-sm font-medium">
                                  {idx + 1}
                                </div>
                                <p className="text-[#1F1F1F] flex-1">{insight}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {aiAnalysis.recommendations && aiAnalysis.recommendations.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-[#1F1F1F] mb-3">Рекомендации</h4>
                          <div className="space-y-2">
                            {aiAnalysis.recommendations.map((rec: string, idx: number) => (
                              <div key={idx} className="flex gap-3 p-4 bg-green-50 rounded-xl">
                                <Sparkles className="w-5 h-5 text-green-600 flex-shrink-0" strokeWidth={2} />
                                <p className="text-[#1F1F1F] flex-1">{rec}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="border-t border-[#E8EAED] pt-6">
                  <h3 className="text-lg font-medium text-[#1F1F1F] mb-6">Статистика по вопросам</h3>
                </div>

                {getQuestionStats().map((stat, idx) => (
                  <div key={idx} className="bg-white rounded-2xl border border-[#E8EAED] p-6">
                    <h3 className="text-lg font-medium text-[#1F1F1F] mb-4">{stat.question}</h3>

                    {stat.type === 'numeric' ? (
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-[#E8F0FE] rounded-xl p-4">
                          <div className="text-sm text-[#1A73E8] mb-1">Всего ответов</div>
                          <div className="text-2xl font-medium text-[#1F1F1F]">{stat.total}</div>
                        </div>
                        <div className="bg-[#E8F0FE] rounded-xl p-4">
                          <div className="text-sm text-[#1A73E8] mb-1">Среднее</div>
                          <div className="text-2xl font-medium text-[#1F1F1F]">{stat.avg.toFixed(1)}</div>
                        </div>
                        <div className="bg-[#E8F0FE] rounded-xl p-4">
                          <div className="text-sm text-[#1A73E8] mb-1">Минимум</div>
                          <div className="text-2xl font-medium text-[#1F1F1F]">{stat.min}</div>
                        </div>
                        <div className="bg-[#E8F0FE] rounded-xl p-4">
                          <div className="text-sm text-[#1A73E8] mb-1">Максимум</div>
                          <div className="text-2xl font-medium text-[#1F1F1F]">{stat.max}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="text-sm text-[#5F6368] mb-2">Всего ответов: {stat.total}</div>
                        {stat.answers.slice(0, 10).map((item, i) => {
                          const percentage = (item.count / stat.total) * 100;
                          return (
                            <div key={i}>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-[#1F1F1F] font-medium">{item.answer}</span>
                                <span className="text-[#5F6368]">{item.count} ({percentage.toFixed(0)}%)</span>
                              </div>
                              <div className="h-2 bg-[#E8EAED] rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-[#1A73E8] rounded-full transition-all"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                        {stat.answers.length > 10 && (
                          <div className="text-sm text-[#5F6368] italic">
                            И еще {stat.answers.length - 10} вариантов ответа...
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
  );
}
