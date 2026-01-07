
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { Loader2, FileText, User, Calendar, ChevronsRight } from 'lucide-react';

// Define the type for our submissions
type SubmissionWithRecipient = {
  id: string;
  survey_title: string;
  created_at: string;
  survey_recipients: {
    contact_person: string;
    email: string;
    submitted_at: string;
  } | null;
};

const LoadingState = () => (
    <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
    </div>
);

const EmptyState = () => (
    <div className="text-center py-16 px-4 bg-surface rounded-lg border border-border">
        <FileText className="mx-auto h-12 w-12 text-text-secondary" />
        <h3 className="mt-4 text-lg font-medium text-text-primary">Ответов пока нет</h3>
        <p className="mt-1 text-sm text-text-secondary">
            Как только пользователи начнут проходить ваши опросы, их ответы появятся здесь.
        </p>
    </div>
);

export function SubmissionsList() {
  const [submissions, setSubmissions] = useState<SubmissionWithRecipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSubmissions = async () => {
      setLoading(true);
      const { data, error } = await supabase
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
        .not('survey_recipients', 'is', null)
        .order('created_at', { ascending: false });

      if (error) {
        setError('Не удалось загрузить ответы: ' + error.message);
        console.error(error);
      } else {
        const validSubmissions = data.filter(sub => sub.survey_recipients && !Array.isArray(sub.survey_recipients));
        setSubmissions(validSubmissions as SubmissionWithRecipient[]);
      }
      setLoading(false);
    };

    fetchSubmissions();
  }, []);

  return (
    <div>
        <div className="mb-6">
            <h1 className="text-2xl font-semibold text-text-primary">Хронология ответов</h1>
            <p className="text-text-secondary mt-1">Все полученные ответы на ваши опросы в одном месте.</p>
        </div>

        {loading ? (
            <LoadingState />
        ) : error ? (
            <div className="text-center text-red-500">{error}</div>
        ) : submissions.length === 0 ? (
            <EmptyState />
        ) : (
          <div className="bg-surface border border-border rounded-lg shadow-sm">
             <ul role="list" className="divide-y divide-border">
                {submissions.map((submission) => (
                    <li key={submission.id}>
                        {/* CORRECTED LINK PATH */}
                        <Link to={`/dashboard/submission/${submission.id}`} className="block hover:bg-background-contrast transition-colors duration-150 group">
                            <div className="p-4 sm:p-6">
                                <div className="flex items-center justify-between">
                                    <p className="text-base font-semibold text-primary truncate" title={submission.survey_title}>
                                        {submission.survey_title}
                                    </p>
                                    <div className="ml-2 flex-shrink-0 flex">
                                        <ChevronsRight className="h-5 w-5 text-text-secondary group-hover:text-text-primary" />
                                    </div>
                                </div>
                                <div className="mt-2 sm:flex sm:justify-between">
                                    <div className="sm:flex">
                                        <p className="flex items-center text-sm text-text-secondary">
                                            <User className="flex-shrink-0 mr-1.5 h-4 w-4 text-text-tertiary" />
                                            {submission.survey_recipients?.contact_person || submission.survey_recipients?.email || 'Аноним'}
                                        </p>
                                        <p className="mt-2 flex items-center text-sm text-text-secondary sm:mt-0 sm:ml-4">
                                            <Calendar className="flex-shrink-0 mr-1.5 h-4 w-4 text-text-tertiary" />
                                            {new Date(submission.survey_recipients?.submitted_at || submission.created_at).toLocaleString('ru-RU')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    </li>
                ))}
            </ul>
          </div>
        )}
    </div>
  );
}
