import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { DashboardLayout } from '../components/DashboardLayout';
import { SurveyTemplate } from '../types/database';
import { Plus, Users, FileText, Calendar, Edit3 } from 'lucide-react';

export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [surveys, setSurveys] = useState<SurveyTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSurveys();
  }, [user]);

  const loadSurveys = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('survey_templates')
      .select('*')
      .eq('company_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading surveys:', error);
    } else {
      setSurveys(data || []);
    }
    setLoading(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-medium text-[#1F1F1F] tracking-tight">Мои опросы</h1>
            <p className="text-[#5F6368] mt-1">Управляйте своими опросами и просматривайте ответы</p>
          </div>
          <button
            onClick={() => navigate('/survey/create')}
            className="hidden md:flex items-center gap-2 bg-[#1A73E8] text-white px-6 py-3 rounded-full font-medium hover:bg-[#1557B0] transition-all shadow-sm hover:shadow-md"
          >
            <Plus className="w-5 h-5" strokeWidth={2} />
            Создать опрос
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-[#5F6368]">Загрузка...</div>
          </div>
        ) : surveys.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-[#E8F0FE] rounded-2xl flex items-center justify-center mx-auto mb-6">
              <FileText className="w-8 h-8 text-[#1A73E8]" strokeWidth={2} />
            </div>
            <h2 className="text-xl font-medium text-[#1F1F1F] mb-2">Нет опросов</h2>
            <p className="text-[#5F6368] mb-6">Создайте свой первый опрос для начала работы</p>
            <button
              onClick={() => navigate('/survey/create')}
              className="inline-flex items-center gap-2 bg-[#1A73E8] text-white px-6 py-3 rounded-full font-medium hover:bg-[#1557B0] transition-all"
            >
              <Plus className="w-5 h-5" strokeWidth={2} />
              Создать опрос
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {surveys.map((survey) => (
              <div
                key={survey.id}
                className="bg-white rounded-2xl border border-[#E8EAED] p-6 flex flex-col justify-between hover:shadow-lg transition-shadow"
              >
                <div>
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                        <h3 className="font-medium text-[#1F1F1F] mb-1 line-clamp-2">{survey.title}</h3>
                        {survey.description && (
                            <p className="text-sm text-[#5F6368] line-clamp-2">{survey.description}</p>
                        )}
                        </div>
                        <div className={`ml-3 px-2 py-1 rounded-md text-xs font-medium ${
                        survey.is_active
                            ? 'bg-green-50 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                        {survey.is_active ? 'Активен' : 'Архив'}
                        </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-[#5F6368] mb-4">
                        <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" strokeWidth={2} />
                        {formatDate(survey.created_at)}
                        </div>
                    </div>
                </div>

                <div className="flex gap-2 pt-4 border-t border-[#E8EAED]">
                   <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/survey/${survey.id}/edit`);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                  >
                    <Edit3 className="w-4 h-4" strokeWidth={2} />
                    Редактор
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/survey/${survey.id}/recipients`);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[#F8F9FA] rounded-lg text-sm font-medium text-[#1F1F1F] hover:bg-[#E8EAED] transition-colors"
                  >
                    <Users className="w-4 h-4" strokeWidth={2} />
                    Получатели
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/survey/${survey.id}/responses`);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[#F8F9FA] rounded-lg text-sm font-medium text-[#1F1F1F] hover:bg-[#E8EAED] transition-colors"
                  >
                    <FileText className="w-4 h-4" strokeWidth={2} />
                    Ответы
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => navigate('/survey/create')}
          className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-[#1A73E8] text-white rounded-full shadow-lg hover:bg-[#1557B0] transition-all flex items-center justify-center"
        >
          <Plus className="w-6 h-6" strokeWidth={2} />
        </button>
      </div>
    </DashboardLayout>
  );
}
