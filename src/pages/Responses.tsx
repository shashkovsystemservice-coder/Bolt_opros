import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { DashboardLayout } from '../components/DashboardLayout';
import { SurveyTemplate, SurveySubmission, SubmissionAnswer, SurveyRecipient } from '../types/database';
import { Download, Search, ChevronDown, ChevronUp, Building2, Mail, Calendar } from 'lucide-react';

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

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-[#5F6368]">Загрузка...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-medium text-[#1F1F1F] tracking-tight mb-2">{survey?.title}</h1>
          <p className="text-[#5F6368]">Просмотр ответов респондентов</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
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

        {filteredSubmissions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E8EAED] p-12 text-center">
            <div className="text-lg font-medium text-[#1F1F1F] mb-2">
              {searchTerm ? 'Ничего не найдено' : 'Нет ответов'}
            </div>
            <p className="text-[#5F6368]">
              {searchTerm
                ? 'Попробуйте изменить параметры поиска'
                : 'Ответы появятся здесь после заполнения опроса'}
            </p>
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
      </div>
    </DashboardLayout>
  );
}
