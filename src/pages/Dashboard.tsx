import { useEffect, useState, useCallback } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { DashboardLayout } from '../components/DashboardLayout';
import { toast } from 'sonner';
import { Plus, Users, Edit3, Archive, Trash2, Inbox, ArrowLeft, Loader2, BarChart2 } from 'lucide-react';

// --- Reusable & Styled Components (Aligned with new design system) --- //

const ActionButton = ({ onClick, children, variant = 'primary', size = 'md' }) => {
    const baseClasses = "inline-flex items-center justify-center font-medium text-sm rounded-md transition-colors duration-200 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background";
    const sizeClasses = { md: "h-9 px-4", sm: "h-8 px-3" };
    const variantClasses = {
        primary: "bg-primary text-on-primary hover:bg-primary/90 focus:ring-primary",
        secondary: "bg-surface border border-border hover:bg-background text-text-primary focus:ring-primary",
    };
    return <button onClick={onClick} className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]}`}>{children}</button>
};

const ActionIcon = ({ onClick, children, title }) => (
    <button onClick={onClick} title={title} className="p-1.5 text-text-secondary hover:text-primary rounded-md hover:bg-primary/10 transition-colors">
        {children}
    </button>
);

const SurveyRow = ({ survey, onNavigate, onArchive, onRestore, onDelete }) => (
  <div className="flex justify-between items-center group py-4 border-b border-border-subtle">
    <div className="flex-grow pr-4">
      <h3 className="font-medium text-text-primary text-sm truncate">{survey.title}</h3>
      <p className="text-sm text-text-secondary mt-1">
        Создан: {new Date(survey.created_at).toLocaleDateString('ru-RU')}
      </p>
    </div>

    <div className="flex items-center gap-4 flex-shrink-0">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${survey.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
          {survey.is_active ? 'Активен' : 'В архиве'}
        </span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {survey.is_active ? (
            <>
              <ActionIcon onClick={() => onNavigate(`/dashboard/survey/${survey.id}/edit`)} title="Редактор"><Edit3 size={16}/></ActionIcon>
              <ActionIcon onClick={() => onNavigate(`/dashboard/survey/${survey.id}/recipients`)} title="Ссылки"><Users size={16}/></ActionIcon>
              <ActionIcon onClick={() => onNavigate(`/dashboard/survey/${survey.id}/responses`)} title="Ответы"><BarChart2 size={16}/></ActionIcon>
              <ActionIcon onClick={() => onArchive(survey.id)} title="Архивировать"><Archive size={16}/></ActionIcon>
            </>
          ) : (
            <>
              <ActionIcon onClick={() => onRestore(survey.id)} title="Восстановить"><ArrowLeft size={16}/></ActionIcon>
              <ActionIcon onClick={() => onDelete(survey)} title="Удалить"><Trash2 size={16}/></ActionIcon>
            </>
          )}
        </div>
    </div>
  </div>
);

const EmptyState = ({ view, onCreate }) => (
    <div className="text-center py-16">
        <Inbox size={40} className="text-text-secondary/70 mx-auto mb-4"/>
        <h3 className="text-lg font-semibold text-text-primary mb-1.5">
            {view === 'active' ? 'У вас пока нет опросов' : 'Архив пуст'}
        </h3>
        <p className="text-text-secondary mb-6 max-w-sm mx-auto text-sm">
            {view === 'active' ? 'Начните с создания вашего первого опроса.' : 'Здесь будут храниться опросы, которые вы архивировали.'}
        </p>
        {view === 'active' && <ActionButton onClick={onCreate}><Plus className="w-4 h-4 mr-1.5"/>Создать опрос</ActionButton>}
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
    try {
        const { data, error } = await supabase.from('survey_templates').select('*').eq('company_id', user.id).eq('is_active', view === 'active').order('created_at', { ascending: false });
        if (error) throw error;
        setSurveys(data || []);
    } catch (err) {
        toast.error('Ошибка загрузки опросов: ' + err.message)
    } finally {
        setLoading(false);
    }
  }, [user, view]);

  useEffect(() => { loadSurveys(); }, [loadSurveys]);

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
        cancel: { label: 'Отмена' },
        style: { background: 'var(--surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' },
    })
  }

  return (
    <div>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Мои опросы</h1>
          <p className="text-text-secondary mt-1 text-sm">Управляйте своими опросами и просматривайте ответы.</p>
        </div>
        <ActionButton onClick={() => navigate('/survey/create')}><Plus size={16} className="mr-1.5"/>Создать опрос</ActionButton>
      </div>

      {/* Tabs */}
      <div className="border-b border-border-subtle">
        <div className="flex gap-4">
          <button onClick={() => setView('active')} className={`pb-2 px-1 text-sm font-medium transition-colors ${view === 'active' ? 'border-b-2 border-primary text-primary' : 'text-text-secondary hover:text-text-primary'}`}>Активные</button>
          <button onClick={() => setView('archived')} className={`pb-2 px-1 text-sm font-medium transition-colors ${view === 'archived' ? 'border-b-2 border-primary text-primary' : 'text-text-secondary hover:text-text-primary'}`}>Архив</button>
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="text-center py-20"><Loader2 className="h-8 w-8 text-primary animate-spin mx-auto"/></div>
      ) : surveys.length === 0 ? (
        <EmptyState view={view} onCreate={() => navigate('/survey/create')} />
      ) : (
        <div>
          {surveys.map(survey => (
            <SurveyRow 
              key={survey.id} 
              survey={survey} 
              onNavigate={navigate} 
              onArchive={handleArchive} 
              onRestore={handleRestore} 
              onDelete={handleDelete} 
            />
          ))}
        </div>
      )}
    </div>
  );
}
