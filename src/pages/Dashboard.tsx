import { useEffect, useState } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { DashboardLayout } from '../components/DashboardLayout';
import { SurveyTemplate } from '../types/database';
import { Plus, Users, FileText, Calendar, Edit3, Archive, Trash2, Inbox, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';

// Новый компонент-обертка для навигации
export function Dashboard() {
  return (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  );
}

// Старый компонент Dashboard, переименованный в SurveyList
export function SurveyList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [surveys, setSurveys] = useState<SurveyTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'active' | 'archived'>('active');

  useEffect(() => {
    if (user) {
      loadSurveys();
    }
  }, [user, view]);

  const loadSurveys = async () => {
    setLoading(true);
    const filterValue = view === 'active';
    const { data, error } = await supabase
      .from('survey_templates')
      .select('*')
      .eq('company_id', user!.id)
      .eq('is_active', filterValue)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Не удалось загрузить опросы: ' + error.message);
    } else {
      setSurveys(data || []);
    }
    setLoading(false);
  };

  const handleArchive = async (surveyId: string) => {
    const { error } = await supabase
      .from('survey_templates')
      .update({ is_active: false })
      .eq('id', surveyId);

    if (error) {
      toast.error('Не удалось архивировать опрос: ' + error.message);
    } else {
      toast.success('Опрос успешно перенесен в архив.');
      loadSurveys();
    }
  };
  
  const handleRestore = async (surveyId: string) => {
    const { error } = await supabase
      .from('survey_templates')
      .update({ is_active: true })
      .eq('id', surveyId);

    if (error) {
      toast.error('Не удалось восстановить опрос: ' + error.message);
    } else {
      toast.success('Опрос успешно восстановлен.');
      loadSurveys();
    }
  };

  const handleDelete = async (survey: SurveyTemplate) => {
    const { count, error: countError } = await supabase
      .from('survey_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('survey_template_id', survey.id);

    if (countError) {
      toast.error('Ошибка при проверке ответов: ' + countError.message);
      return;
    }

    if (count > 0 && survey.is_active) {
      const isConfirmed = window.confirm(
        'У этого опроса есть ответы, поэтому его нельзя удалить. Хотите вместо этого перенести его в архив?'
      );
      if (isConfirmed) {
        await handleArchive(survey.id);
      }
      return;
    }

    if (!survey.is_active) {
       const promptResponse = window.prompt(
        `ВНИМАНИЕ! Вы собираетесь навсегда удалить опрос "${survey.title}" и все его данные (включая ${count || 0} ответов). Это действие АБСОЛЮТНО необратимо. Для подтверждения введите УДАЛИТЬ НАВСЕГДА`
      );
      if (promptResponse === 'УДАЛИТЬ НАВСЕГДА') {
        const { error: deleteError } = await supabase.from('survey_templates').delete().eq('id', survey.id);
        if (deleteError) {
          toast.error('Не удалось удалить опрос: ' + deleteError.message);
        } else {
          toast.success('Опрос и все его данные были навсегда удалены.');
          loadSurveys();
        }
      } else {
        toast.info('Действие отменено.');
      }
      return;
    }
    
    const isConfirmed = window.confirm('Вы уверены, что хотите удалить этот опрос? У него нет ответов, поэтому действие необратимо.');
    if (isConfirmed) {
      const { error: deleteError } = await supabase.from('survey_templates').delete().eq('id', survey.id);
      if (deleteError) {
        toast.error('Не удалось удалить опрос: ' + deleteError.message);
      } else {
        toast.success('Опрос успешно удален.');
        loadSurveys();
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
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

      <div className="mb-6">
        <div className="flex border-b">
          <button onClick={() => setView('active')} className={`px-4 py-2 text-sm font-medium ${view === 'active' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}>Активные</button>
          <button onClick={() => setView('archived')} className={`px-4 py-2 text-sm font-medium ${view === 'archived' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}>Архив</button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-[#5F6368]">Загрузка...</div>
      ) : surveys.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-[#E8F0FE] rounded-2xl flex items-center justify-center mx-auto mb-6">
            {view === 'active' ? <FileText className="w-8 h-8 text-[#1A73E8]" /> : <Inbox className="w-8 h-8 text-[#1A73E8]" />}
          </div>
          <h2 className="text-xl font-medium text-[#1F1F1F] mb-2">{view === 'active' ? 'Нет активных опросов' : 'Архив пуст'}</h2>
          <p className="text-[#5F6368] mb-6">{view === 'active' ? 'Создайте свой первый опрос для начала работы' : 'Здесь будут храниться опросы, которые вы архивировали'}</p>
          {view === 'active' && (
            <button
              onClick={() => navigate('/survey/create')}
              className="inline-flex items-center gap-2 bg-[#1A73E8] text-white px-6 py-3 rounded-full font-medium hover:bg-[#1557B0] transition-all"
            >
              <Plus className="w-5 h-5" strokeWidth={2} />
              Создать опрос
            </button>
          )}
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
                  <div className={`ml-3 px-2 py-1 rounded-md text-xs font-medium ${survey.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {survey.is_active ? 'Активен' : 'В архиве'}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-[#5F6368] mb-4">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {formatDate(survey.created_at)}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-4 border-t border-[#E8EAED]">
                {view === 'active' ? (
                  <>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/dashboard/survey/${survey.id}/edit`)}><Edit3 className="w-4 h-4 mr-2" />Редактор</Button>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/dashboard/survey/${survey.id}/recipients`)}><Users className="w-4 h-4 mr-2" />Получатели</Button>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/dashboard/survey/${survey.id}/responses`)}><FileText className="w-4 h-4 mr-2" />Ответы</Button>
                    <Button variant="outline" size="sm" onClick={() => handleArchive(survey.id)}><Archive className="w-4 h-4 mr-2" />В архив</Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(survey)}><Trash2 className="w-4 h-4 text-gray-500 hover:text-red-600" /></Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" size="sm" onClick={() => handleRestore(survey.id)}><ArrowLeft className="w-4 h-4 mr-2" />Восстановить</Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(survey)}><Trash2 className="w-4 h-4 mr-2" />Удалить навсегда</Button>
                  </>
                )}
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
  );
}