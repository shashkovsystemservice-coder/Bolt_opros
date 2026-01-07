
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { Loader2, AlertTriangle, Printer, Download, FileSpreadsheet, ArrowLeft, User, Calendar } from 'lucide-react';

// Types
type Submission = {
  id: string;
  survey_title: string;
  created_at: string;
  survey_recipients: {
    contact_person: string;
    email: string;
    submitted_at: string;
  } | null;
};

type SubmissionAnswer = {
  id: string;
  question_text: string;
  answer_text: string;
};

const LoadingState = () => <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
const ErrorState = ({ message }: { message: string }) => (
    <div className="text-center py-16 px-4 bg-surface rounded-lg border border-border">
        <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
        <h3 className="mt-4 text-lg font-medium text-text-primary">Ошибка</h3>
        <p className="mt-1 text-sm text-text-secondary">{message}</p>
        <Link to="/dashboard/submissions" className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
            Вернуться к списку
        </Link>
    </div>
);

export function SubmissionDetail() {
  const { id } = useParams<{ id: string }>();
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [answers, setAnswers] = useState<SubmissionAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSubmissionDetails = async () => {
      if (!id) {
        setError('ID ответа не найден.');
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Fetch submission details including recipient info
        const { data: subData, error: subError } = await supabase
          .from('survey_submissions')
          .select(`
            id,
            survey_title,
            created_at,
            survey_recipients (
              contact_person,
              email,
              submitted_at
            )
          `)
          .eq('id', id)
          .single();

        if (subError || !subData) {
          throw new Error('Не удалось найти информацию об ответе.');
        }
        // The recipient can be an array or object, normalize to object
        const normalizedSubData = {
            ...subData,
            survey_recipients: Array.isArray(subData.survey_recipients) ? subData.survey_recipients[0] : subData.survey_recipients
        };
        setSubmission(normalizedSubData as Submission);

        // Fetch answers for this submission
        const { data: ansData, error: ansError } = await supabase
          .from('submission_answers')
          .select('id, question_text, answer_text')
          .eq('submission_id', id);

        if (ansError) {
          throw new Error('Не удалось загрузить ответы на вопросы.');
        }
        setAnswers(ansData || []);

      } catch (err: any) {
        setError(err.message);
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissionDetails();
  }, [id]);

  // --- Export Logic ---
  const getHtmlContent = () => {
      if (!submission || !answers) return '';
      const recipient = submission.survey_recipients;
      const respondentIdentifier = recipient?.contact_person || recipient?.email || 'Аноним';
      const submissionDate = new Date(recipient?.submitted_at || submission.created_at).toLocaleString('ru-RU');

      return `
          <!DOCTYPE html>
          <html lang="ru">
          <head>
              <meta charset="UTF-8">
              <title>Результаты опроса: ${submission.survey_title}</title>
              <style>
                  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; line-height: 1.6; color: #333; background-color: #fff; margin: 0; padding: 0; }
                  .container { max-width: 800px; margin: 2rem auto; padding: 1rem; }
                  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; border-bottom: 1px solid #eee; padding-bottom: 1rem; }
                  .logo { font-size: 1.5rem; font-weight: bold; color: #333; }
                  h1 { color: #111; font-size: 1.8rem; margin: 0; }
                  .meta-info { background-color: #f7f7f7; border: 1px solid #ddd; border-radius: 8px; padding: 1rem; margin-bottom: 2rem; font-size: 0.9rem; }
                  table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
                  th, td { border: 1px solid #ddd; padding: 12px; text-align: left; vertical-align: top; }
                  th { background-color: #f7f7f7; font-weight: bold; }
                  .footer { text-align: center; margin-top: 3rem; font-size: 0.8rem; color: #888; }
              </style>
          </head>
          <body>
              <div class="container">
                  <div class="header">
                      <h1>${submission.survey_title}</h1>
                      <div class="logo">Survey Pro</div>
                  </div>
                  <div class="meta-info">
                      <div><strong>Респондент:</strong> ${respondentIdentifier}</div>
                      <div><strong>Дата:</strong> ${submissionDate}</div>
                  </div>
                  <h2>Ответы:</h2>
                  <table>
                      <thead><tr><th>Вопрос</th><th>Ответ</th></tr></thead>
                      <tbody>
                          ${answers.map(a => `
                              <tr>
                                  <td>${a.question_text}</td>
                                  <td>${a.answer_text || 'Не отвечен'}</td>
                              </tr>
                          `).join('')}
                      </tbody>
                  </table>
                  <div class="footer">Создано с помощью Survey Pro</div>
              </div>
          </body>
          </html>`;
  };

    const handleDownloadAction = (type: 'html' | 'csv' | 'print') => {
        const content = getHtmlContent();
        
        if (type === 'print') {
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(content);
                printWindow.document.close();
                printWindow.focus();
                setTimeout(() => {
                    printWindow.print();
                    printWindow.close();
                }, 250);
            } else {
                toast.error('Не удалось открыть окно для печати. Разрешите всплывающие окна.');
            }
            return;
        }

        if (type === 'html') {
            const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `survey_results_${submission?.id}.html`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success("Загрузка HTML началась");
            return;
        }

        if (type === 'csv') {
            const escapeCsvCell = (cell: any) => {
                const str = String(cell ?? '');
                return `"${str.replace(/"/g, '""')}"`;
            };

            const headers = ['"Вопрос"', '"Ответ"'].join(';');
            const dataRows = answers.map(a => 
                [escapeCsvCell(a.question_text), escapeCsvCell(a.answer_text)].join(';')
            );
            
            const csvContent = '﻿' + headers + '
' + dataRows.join('
');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `survey_results_${submission?.id}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success("Загрузка CSV началась");
        }
    };


  if (loading) return <div className="p-8"><LoadingState /></div>;
  if (error) return <div className="p-8"><ErrorState message={error} /></div>;
  if (!submission) return <div className="p-8"><ErrorState message="Ответ не найден." /></div>;

  const recipient = submission.survey_recipients;
  const respondentIdentifier = recipient?.contact_person || recipient?.email || 'Аноним';
  const submissionDate = new Date(recipient?.submitted_at || submission.created_at).toLocaleString('ru-RU');


  return (
    <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
            <div className="mb-6">
                <Link to="/dashboard/answers" className="inline-flex items-center text-sm font-medium text-text-secondary hover:text-primary mb-4">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Назад к хронологии
                </Link>
                <h1 className="text-2xl font-semibold text-text-primary">{submission.survey_title}</h1>
                
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-secondary">
                     <p className="flex items-center">
                        <User className="flex-shrink-0 mr-1.5 h-4 w-4 text-text-tertiary" />
                        {respondentIdentifier}
                    </p>
                    <p className="flex items-center">
                        <Calendar className="flex-shrink-0 mr-1.5 h-4 w-4 text-text-tertiary" />
                        {submissionDate}
                    </p>
                </div>
            </div>

            <div className="flex justify-end gap-2 mb-4">
                <button onClick={() => handleDownloadAction('html')} className="inline-flex items-center justify-center font-semibold text-sm rounded-md transition-colors duration-200 h-9 px-3 bg-surface border border-border hover:bg-background-contrast text-text-primary">
                    <Download className="w-4 h-4 mr-2" /> HTML
                </button>
                 <button onClick={() => handleDownloadAction('csv')} className="inline-flex items-center justify-center font-semibold text-sm rounded-md transition-colors duration-200 h-9 px-3 bg-surface border border-border hover:bg-background-contrast text-text-primary">
                    <FileSpreadsheet className="w-4 h-4 mr-2" /> CSV
                </button>
                <button onClick={() => handleDownloadAction('print')} className="inline-flex items-center justify-center font-semibold text-sm rounded-md transition-colors duration-200 h-9 px-3 bg-surface border border-border hover:bg-background-contrast text-text-primary">
                    <Printer className="w-4 h-4 mr-2" /> Печать/PDF
                </button>
            </div>

            <div className="bg-surface border border-border rounded-lg shadow-sm">
                <div className="p-6">
                    <h2 className="text-lg font-medium text-text-primary">Ответы респондента</h2>
                </div>
                <div className="border-t border-border">
                    <dl className="divide-y divide-border">
                        {answers.map(answer => (
                            <div key={answer.id} className="px-6 py-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                                <dt className="text-sm font-medium text-text-primary">{answer.question_text}</dt>
                                <dd className="text-sm text-text-secondary md:col-span-2">{answer.answer_text || <span className="italic">Нет ответа</span>}</dd>
                            </div>
                        ))}
                         {answers.length === 0 && (
                            <div className="px-6 py-10 text-center text-sm text-text-secondary">
                                Не найдено ни одного ответа для этого респондента.
                            </div>
                         )}
                    </dl>
                </div>
            </div>
        </div>
    </div>
  );
}
