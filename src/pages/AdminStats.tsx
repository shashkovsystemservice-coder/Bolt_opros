
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Users, ClipboardList, MessageSquare, Loader2, Building } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}

interface TopCompany {
  name: string;
  response_count: number;
}

const StatCard = ({ label, value, icon }: StatCardProps) => (
  <div className="bg-surface border border-border-subtle rounded-2xl p-6 shadow-ambient">
    <div className="flex justify-between items-start">
      <div className="space-y-1">
        <p className="text-text-secondary text-sm">{label}</p>
        <p className="text-3xl font-bold text-text-primary">{value}</p>
      </div>
      <div className="bg-primary/10 p-3 rounded-full">
        {icon}
      </div>
    </div>
  </div>
);

export function AdminStats() {
  const [stats, setStats] = useState<Omit<StatCardProps, 'icon'>[]>([]);
  const [topCompanies, setTopCompanies] = useState<TopCompany[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);

      const { count: companyCount } = await supabase.from('companies').select('*', { count: 'exact' });
      const { count: surveyCount } = await supabase.from('survey_templates').select('*', { count: 'exact' });
      const { count: submissionCount } = await supabase.from('survey_submissions').select('*', { count: 'exact' });

      setStats([
        { label: 'Компаний', value: companyCount || 0 },
        { label: 'Опросов', value: surveyCount || 0 },
        { label: 'Ответов', value: submissionCount || 0 },
      ]);

      const { data: companies } = await supabase
        .from('companies')
        .select('id, name')
        .order('created_at', { ascending: false })
        .limit(5);

      const topCompaniesData: TopCompany[] = (companies || []).map((c) => ({
        name: c.name,
        response_count: Math.floor(Math.random() * 500) + 10, // Placeholder
      }));

      setTopCompanies(topCompaniesData.sort((a, b) => b.response_count - a.response_count));
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const statIcons = [
    <Users className="w-6 h-6 text-primary" strokeWidth={1.5} />,
    <ClipboardList className="w-6 h-6 text-primary" strokeWidth={1.5} />,
    <MessageSquare className="w-6 h-6 text-primary" strokeWidth={1.5} />,
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-text-primary">Статистика системы</h1>
        <p className="text-text-secondary mt-2">Общий обзор активности на платформе.</p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="animate-spin h-10 w-10 text-primary" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {stats.map((stat, idx) => (
              <StatCard key={idx} {...stat} icon={statIcons[idx]} />
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <div className="bg-surface border border-border-subtle rounded-2xl p-6 shadow-ambient">
              <h3 className="text-lg font-semibold text-text-primary mb-4">Топ компаний по активности</h3>
              {topCompanies.length > 0 ? (
                <ul className="space-y-2">
                  {topCompanies.map((company, idx) => (
                    <li key={idx} className="flex items-center justify-between p-3 rounded-lg hover:bg-background">
                      <div className="flex items-center gap-4">
                        <div className="w-9 h-9 flex items-center justify-center rounded-full bg-background font-semibold text-text-secondary text-sm">
                           {idx + 1}
                        </div>
                        <p className="font-medium text-text-primary flex items-center gap-2">
                          <Building className="w-4 h-4 text-text-secondary" />
                          {company.name}
                        </p>
                      </div>
                      <p className="font-semibold text-primary text-sm">
                        {company.response_count} <span className="text-text-secondary font-normal">ответов</span>
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-10 text-text-secondary">Нет данных для отображения</div>
              )}
            </div>

            <div className="bg-surface border border-border-subtle rounded-2xl p-6 shadow-ambient flex flex-col">
              <h3 className="text-lg font-semibold text-text-primary mb-4">Регистрации за 30 дней</h3>
               <div className="flex-grow flex items-center justify-center bg-background rounded-lg">
                  <p className="text-text-secondary">График в разработке</p>
                </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
