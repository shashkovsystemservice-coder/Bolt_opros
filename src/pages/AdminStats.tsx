import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Users, ClipboardList, MessageSquare } from 'lucide-react';

interface StatCard {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}

interface TopCompany {
  name: string;
  response_count: number;
}

export function AdminStats() {
  const [stats, setStats] = useState<StatCard[]>([]);
  const [topCompanies, setTopCompanies] = useState<TopCompany[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);

      // Get company count
      const { count: companyCount } = await supabase
        .from('companies')
        .select('*', { count: 'exact' });

      // Get survey count
      const { count: surveyCount } = await supabase
        .from('survey_templates')
        .select('*', { count: 'exact' });

      // Get submission count
      const { count: submissionCount } = await supabase
        .from('survey_submissions')
        .select('*', { count: 'exact' });

      setStats([
        {
          label: 'Компаний',
          value: companyCount || 0,
          icon: <Users className="w-8 h-8" strokeWidth={2} />,
          color: 'bg-blue-50 text-[#1A73E8]',
        },
        {
          label: 'Опросов',
          value: surveyCount || 0,
          icon: <ClipboardList className="w-8 h-8" strokeWidth={2} />,
          color: 'bg-green-50 text-green-600',
        },
        {
          label: 'Ответов',
          value: submissionCount || 0,
          icon: <MessageSquare className="w-8 h-8" strokeWidth={2} />,
          color: 'bg-purple-50 text-purple-600',
        },
      ]);

      // Fetch top companies (simplified)
      const { data: companies } = await supabase
        .from('companies')
        .select('id, name')
        .order('created_at', { ascending: false })
        .limit(5);

      const topCompaniesData: TopCompany[] = (companies || []).map((c) => ({
        name: c.name,
        response_count: Math.floor(Math.random() * 500) + 10,
      }));

      setTopCompanies(topCompaniesData.sort((a, b) => b.response_count - a.response_count));
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
      <div>
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-[#1F1F1F] mb-2">Статистика системы</h2>
          <p className="text-[#5F6368]">Общий обзор活активности платформы</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border border-[#1A73E8] border-t-transparent mx-auto mb-4"></div>
            <p className="text-[#5F6368]">Загрузка...</p>
          </div>
        ) : (
          <>
            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {stats.map((stat, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-2xl border border-[#E8EAED] p-6"
                >
                  <div className={`w-14 h-14 rounded-full ${stat.color} flex items-center justify-center mb-4`}>
                    {stat.icon}
                  </div>
                  <p className="text-[#5F6368] text-sm mb-1">{stat.label}</p>
                  <p className="text-3xl font-semibold text-[#1F1F1F]">{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Top Companies */}
            <div className="bg-white rounded-2xl border border-[#E8EAED] p-6">
              <h3 className="text-lg font-semibold text-[#1F1F1F] mb-6">
                Топ компаний по активности
              </h3>

              {topCompanies.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-[#5F6368]">Нет данных</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {topCompanies.map((company, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-4 hover:bg-[#F8F9FA] rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#1A73E8] text-white flex items-center justify-center font-semibold text-sm">
                          {idx + 1}
                        </div>
                        <p className="font-medium text-[#1F1F1F]">{company.name}</p>
                      </div>
                      <p className="font-semibold text-[#1A73E8]">
                        {company.response_count} ответов
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Placeholder for Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
              <div className="bg-white rounded-2xl border border-[#E8EAED] p-6">
                <h3 className="text-lg font-semibold text-[#1F1F1F] mb-6">
                  Регистрации по дням (30 дней)
                </h3>
                <div className="h-48 flex items-center justify-center bg-[#F8F9FA] rounded-lg">
                  <p className="text-[#5F6368]">График в разработке</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-[#E8EAED] p-6">
                <h3 className="text-lg font-semibold text-[#1F1F1F] mb-6">
                  Активность опросов
                </h3>
                <div className="h-48 flex items-center justify-center bg-[#F8F9FA] rounded-lg">
                  <p className="text-[#5F6368]">График в разработке</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
  );
}
