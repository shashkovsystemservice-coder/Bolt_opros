import { useEffect, useState, useCallback } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { DashboardLayout } from '../components/DashboardLayout';
import { toast } from 'sonner';
import { Plus, Users, FileText, Calendar, Edit3, Archive, Trash2, Inbox, ArrowLeft, Loader2, BarChart2 } from 'lucide-react';

// --- Reusable Components --- //

const ActionButton = ({ onClick, children, variant = 'primary', size = 'md' }) => {
    const baseClasses = "inline-flex items-center justify-center font-semibold text-sm rounded-lg shadow-sm transition-colors duration-200 disabled:opacity-50";
    const sizeClasses = { md: "h-10 px-4", sm: "h-9 px-3 text-xs" };
    const variantClasses = {
        primary: "bg-primary text-on-primary hover:bg-primary/90",
        secondary: "bg-surface border border-border-subtle hover:bg-background text-text-primary",
        ghost: "hover:bg-surface text-text-secondary"
    };
    return <button onClick={onClick} className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]}`}>{children}</button>
};

const SurveyCard = ({ survey, onNavigate, onArchive, onRestore, onDelete }) => (
    <div className="bg-surface border border-border-subtle rounded-2xl shadow-ambient hover:shadow-lg transition-shadow duration-300 flex flex-col">
        <div className="p-6 flex-grow">
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-semibold text-text-primary line-clamp-2 leading-snug">{survey.title}</h3>
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${survey.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{survey.is_active ? 'Активен' : 'В архиве'}</span>
            </div>
            <p className="text-sm text-text-secondary line-clamp-2 mb-4">{survey.description || 'Нет описания'}</p>
            <div className="flex items-center gap-2 text-xs text-text-secondary"><Calendar size={14}/><span>{new Date(survey.created_at).toLocaleDateString('ru-RU')}</span></div>
        </div>
        <div className="p-4 bg-background/50 border-t border-border-subtle flex flex-wrap gap-2">
            {survey.is_active ? (
                <>
                    <ActionButton size="sm" variant="secondary" onClick={() => onNavigate(`/dashboard/survey/${survey.id}/edit`)}><Edit3 size={14} className="mr-1.5"/>Редактор</ActionButton>
                    <ActionButton size="sm" variant="secondary" onClick={() => onNavigate(`/dashboard/survey/${survey.id}/recipients`)}><Users size={14} className="mr-1.5"/>Ссылки</ActionButton>
                    <ActionButton size="sm" variant="secondary" onClick={() => onNavigate(`/dashboard/survey/${survey.id}/responses`)}><BarChart2 size={14} className="mr-1.5"/>Ответы</ActionButton>
                    <ActionButton size="sm" variant="ghost" onClick={() => onArchive(survey.id)}><Archive size={14} className="mr-1.5"/>В архив</ActionButton>
                </>
            ) : (
                <>
                    <ActionButton size="sm" variant="secondary" onClick={() => onRestore(survey.id)}><ArrowLeft size={14} className="mr-1.5"/>Восстановить</ActionButton>
                    <ActionButton size="sm" variant="ghost" onClick={() => onDelete(survey)}><Trash2 size={14} className="mr-1.5"/>Удалить</ActionButton>
                </>
            )}
        </div>
    </div>
);

const EmptyState = ({ view, onCreate }) => (
    <div className="text-center py-20 bg-surface border-2 border-dashed border-border-subtle rounded-2xl">
        <div className="w-16 h-16 bg-background rounded-2xl flex items-center justify-center mx-auto mb-6"><Inbox size={32} className="text-text-secondary"/></div>
        <h3 className="text-xl font-semibold text-text-primary mb-2">{view === 'active' ? 'Нет активных опросов' : 'Архив пуст'}</h3>
        <p className="text-text-secondary mb-6">{view === 'active' ? 'Начните с создания вашего первого опроса.' : 'Здесь будут храниться опросы, которые вы архивировали.'}</p>
        {view === 'active' && <ActionButton onClick={onCreate}><Plus size={16} className="mr-2"/>Создать опрос</ActionButton>}
    </div>
);

// --- Main Components --- //

export function Dashboard() {
  return (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  );
}

export function SurveyList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('active');

  const loadSurveys = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase.from('survey_templates').select('*').eq('company_id', user.id).eq('is_active', view === 'active').order('created_at', { ascending: false });
    if (error) toast.error('Ошибка загрузки опросов: ' + error.message);
    else setSurveys(data || []);
    setLoading(false);
  }, [user, view]);

  useEffect(() => {
    loadSurveys();
  }, [loadSurveys]);

  const handleAction = async (action, surveyId, successMsg) => {
    const { error } = await action(surveyId);
    if (error) toast.error('Ошибка: ' + error.message);
    else {
      toast.success(successMsg);
      loadSurveys();
    }
  };

  const handleArchive = (id) => handleAction((surveyId) => supabase.from('survey_templates').update({ is_active: false }).eq('id', surveyId), id, 'Опрос перенесен в архив.');
  const handleRestore = (id) => handleAction((surveyId) => supabase.from('survey_templates').update({ is_active: true }).eq('id', surveyId), id, 'Опрос восстановлен.');
  
  const handleDelete = async (survey) => {
    toast(`Вы уверены, что хотите удалить опрос "${survey.title}"?`, {
        action: { label: 'Удалить', onClick: async () => {
            const { error } = await supabase.from('survey_templates').delete().eq('id', survey.id);
            if (error) toast.error('Ошибка удаления: ' + error.message);
            else { toast.success('Опрос удален.'); loadSurveys(); }
        }},
        cancel: { label: 'Отмена' }
    })
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
          <div>
              <h1 className="text-3xl font-bold text-text-primary">Мои опросы</h1>
              <p className="text-text-secondary mt-2">Управляйте своими опросами и просматривайте ответы.</p>
          </div>
          <ActionButton onClick={() => navigate('/survey/create')}><Plus size={16} className="mr-2"/>Создать опрос</ActionButton>
      </div>

      <div className="border-b border-border-subtle">
        <div className="flex gap-4">
          <button onClick={() => setView('active')} className={`pb-2 text-sm font-medium transition-colors ${view === 'active' ? 'border-b-2 border-primary text-primary' : 'text-text-secondary hover:text-text-primary'}`}>Активные</button>
          <button onClick={() => setView('archived')} className={`pb-2 text-sm font-medium transition-colors ${view === 'archived' ? 'border-b-2 border-primary text-primary' : 'text-text-secondary hover:text-text-primary'}`}>Архив</button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20"><Loader2 className="h-8 w-8 text-primary animate-spin mx-auto"/></div>
      ) : surveys.length === 0 ? (
        <EmptyState view={view} onCreate={() => navigate('/survey/create')} />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {surveys.map(survey => (
            <SurveyCard key={survey.id} survey={survey} onNavigate={navigate} onArchive={handleArchive} onRestore={handleRestore} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
