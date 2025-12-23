
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Users, ClipboardList, MessageSquare, Loader2, Building, ArrowRight } from 'lucide-react';

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
  <div className="bg-surface border border-border rounded-lg p-5">
    <div className="flex justify-between items-start">
      <div className="space-y-1">
        <p className="text-text-secondary text-sm font-medium">{label}</p>
        <p className="text-2xl font-semibold text-text-primary">{value}</p>
      </div>
      <div className="text-primary">
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
        // Placeholder for actual response count logic
        response_count: Math.floor(Math.random() * 500) + 10, 
      }));

      setTopCompanies(topCompaniesData.sort((a, b) => b.response_count - a.response_count));
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const statIcons = [
    <Users className="w-5 h-5" strokeWidth={2} />,
    <ClipboardList className="w-5 h-5" strokeWidth={2} />,
    <MessageSquare className="w-5 h-5" strokeWidth={2} />,
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Статистика системы</h1>
        <p className="text-text-secondary mt-1 text-sm">Общий обзор активности на платформе.</p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {stats.map((stat, idx) => (
              <StatCard key={idx} {...stat} icon={statIcons[idx]} />
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <div className="border border-border rounded-lg bg-surface">
                <div className="p-5 border-b border-border-subtle">
                    <h3 className="text-base font-semibold text-text-primary">Топ компаний по активности</h3>
                </div>
                <div className="p-3">
                  {topCompanies.length > 0 ? (
                    <ul className="space-y-1">
                      {topCompanies.map((company, idx) => (
                        <li key={idx} className="flex items-center justify-between p-3 rounded-md hover:bg-background">
                          <div className="flex items-center gap-3">
                             <span className="text-xs font-medium text-text-secondary w-5 text-center">{idx + 1}.</span>
                            <p className="font-medium text-text-primary text-sm flex items-center gap-2">
                              <Building className="w-4 h-4 text-text-secondary" />
                              {company.name}
                            </p>
                          </div>
                          <p className="font-semibold text-primary text-sm">
                            {company.response_count} <span className="text-text-secondary font-normal text-xs">ответов</span>
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-center py-10 text-text-secondary text-sm">Нет данных для отображения</div>
                  )}
                </div>
                 <div className="p-4 border-t border-border-subtle text-center">
                    <a href="#" className="text-primary font-medium text-sm hover:underline flex items-center justify-center gap-1.5">
                        Смотреть все <ArrowRight className="w-4 h-4" />
                    </a>
                </div>
            </div>

            <div className="border border-border rounded-lg bg-surface flex flex-col">
                <div className="p-5 border-b border-border-subtle">
                    <h3 className="text-base font-semibold text-text-primary">Регистрации за 30 дней</h3>
                </div>
               <div className="flex-grow flex items-center justify-center bg-background/50 rounded-b-lg">
                  <p className="text-text-secondary text-sm">График в разработке</p>
                </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
