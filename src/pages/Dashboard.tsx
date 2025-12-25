
import { useEffect, useState, useCallback, Fragment } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { DashboardLayout } from '../components/DashboardLayout';
import { toast } from 'sonner';
import { Plus, Search, Users, Edit, Trash2, Archive, ArrowLeft, Loader2, MoreHorizontal, FileText, Clock, ChevronDown, CheckCircle, GripVertical } from 'lucide-react';
import { Menu, Transition } from '@headlessui/react';

// --- Reusable & Styled Components (Aligned with new design system) --- //

const ActionButton = ({ onClick, children, variant = 'primary', size = 'md' }) => {
    const baseClasses = "inline-flex items-center justify-center font-semibold text-sm rounded-lg transition-colors duration-200 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background-contrast";
    const sizeClasses = { md: "h-9 px-4", sm: "h-8 px-3 text-xs" };
    const variantClasses = {
        primary: "bg-primary text-on-primary hover:bg-primary/90 focus-visible:ring-primary",
        secondary: "bg-surface-contrast border border-border-contrast hover:bg-background-contrast text-text-primary focus-visible:ring-primary",
    };
    return <button onClick={onClick} className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]}`}>{children}</button>
};

const SearchInput = ({ value, onChange }) => (
    <div className="relative w-full max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
        <input
            type="text"
            placeholder="Искать опросы..."
            value={value}
            onChange={onChange}
            className="w-full h-9 pl-9 pr-3 bg-surface-contrast border border-border-contrast rounded-lg text-sm placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
        />
    </div>
);


const SurveyCard = ({ survey, onNavigate, onArchive, onRestore, onDelete }) => {
    return (
        <div className="group relative flex items-center justify-between p-3 pr-4 rounded-lg hover:bg-surface-soft transition-colors">
            <div className="flex items-center gap-4">
                 <div className="hidden sm:flex items-center justify-center w-8 h-8 bg-surface-contrast rounded-lg">
                    <FileText size={16} className="text-text-secondary" />
                </div>
                <div>
                    <h3 className="font-medium text-text-primary text-sm truncate">{survey.title}</h3>
                    <p className="text-xs text-text-secondary mt-1">
                        Создан: {new Date(survey.created_at).toLocaleDateString('ru-RU')}
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <span className={`hidden md:inline-block text-xs font-medium px-2 py-1 rounded-md ${survey.is_active ? 'bg-green-100/10 text-green-400' : 'bg-gray-100/10 text-gray-400'}`}>
                  {survey.is_active ? 'Активен' : 'В архиве'}
                </span>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                    {survey.is_active ? (
                        <>
                            <ActionIcon onClick={() => onNavigate(`/dashboard/survey/${survey.id}/edit`)} title="Редактор"><Edit size={16}/></ActionIcon>
                            <ActionIcon onClick={() => onNavigate(`/dashboard/survey/${survey.id}/recipients`)} title="Ссылки"><Users size={16}/></ActionIcon>
                            <ActionIcon onClick={() => onArchive(survey.id)} title="Архивировать"><Archive size={16}/></ActionIcon>
                        </>
                    ) : (
                        <>
                            <ActionIcon onClick={() => onRestore(survey.id)} title="Восстановить"><ArrowLeft size={16}/></ActionIcon>
                            <ActionIcon onClick={() => onDelete(survey)} title="Удалить"><Trash2 size={16}/></ActionIcon>
                        </>
                    )}
                </div>
                <SurveyDropdownMenu survey={survey} onNavigate={onNavigate} onArchive={onArchive} onRestore={onRestore} onDelete={onDelete} />
            </div>
        </div>
    );
};

const ActionIcon = ({ onClick, children, title }) => (
    <button onClick={onClick} title={title} className="p-1.5 text-text-secondary hover:text-primary rounded-md hover:bg-primary/10 transition-colors">
        {children}
    </button>
);


const SurveyDropdownMenu = ({ survey, onNavigate, onArchive, onRestore, onDelete }) => (
  <Menu as="div" className="relative">
    <Menu.Button className="p-1.5 text-text-secondary hover:text-primary rounded-md hover:bg-primary/10 transition-colors">
      <MoreHorizontal size={16} />
    </Menu.Button>
    <Transition
      as={Fragment}
      enter="transition ease-out duration-100"
      enterFrom="transform opacity-0 scale-95"
      enterTo="transform opacity-100 scale-100"
      leave="transition ease-in duration-75"
      leaveFrom="transform opacity-100 scale-100"
      leaveTo="transform opacity-0 scale-95"
    >
      <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right bg-surface-contrast border border-border-contrast rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
        <div className="py-1">
          {survey.is_active ? (
            <>
              <Menu.Item>
                {({ active }) => (
                  <button onClick={() => onNavigate(`/dashboard/survey/${survey.id}/edit`)} className={`${active ? 'bg-background-contrast text-text-primary' : 'text-text-secondary'} group flex w-full items-center rounded-md px-3 py-2 text-sm`}>
                    <Edit className="mr-3 h-4 w-4" /> Редактор
                  </button>
                )}
              </Menu.Item>
              <Menu.Item>
                {({ active }) => (
                  <button onClick={() => onNavigate(`/dashboard/survey/${survey.id}/recipients`)} className={`${active ? 'bg-background-contrast text-text-primary' : 'text-text-secondary'} group flex w-full items-center rounded-md px-3 py-2 text-sm`}>
                    <Users className="mr-3 h-4 w-4" /> Ссылки
                  </button>
                )}
              </Menu.Item>
               <Menu.Item>
                {({ active }) => (
                  <button onClick={() => onArchive(survey.id)} className={`${active ? 'bg-background-contrast text-text-primary' : 'text-text-secondary'} group flex w-full items-center rounded-md px-3 py-2 text-sm`}>
                    <Archive className="mr-3 h-4 w-4" /> Архивировать
                  </button>
                )}
              </Menu.Item>
            </>
          ) : (
             <>
              <Menu.Item>
                {({ active }) => (
                  <button onClick={() => onRestore(survey.id)} className={`${active ? 'bg-background-contrast text-text-primary' : 'text-text-secondary'} group flex w-full items-center rounded-md px-3 py-2 text-sm`}>
                    <ArrowLeft className="mr-3 h-4 w-4" /> Восстановить
                  </button>
                )}
              </Menu.Item>
              <Menu.Item>
                 {({ active }) => (
                  <button onClick={() => onDelete(survey)} className={`${active ? 'bg-red-500/10 text-red-500' : 'text-red-500'} group flex w-full items-center rounded-md px-3 py-2 text-sm`}>
                    <Trash2 className="mr-3 h-4 w-4" /> Удалить
                  </button>
                )}
              </Menu.Item>
            </>
          )}
        </div>
      </Menu.Items>
    </Transition>
  </Menu>
);

const EmptyState = ({ onClearSearch, hasSearch, message }) => (
    <div className="text-center py-12">
        <div className="mx-auto mb-4 bg-surface-contrast w-12 h-12 flex items-center justify-center rounded-full">
            <FileText size={24} className="text-text-secondary"/>
        </div>
        <h3 className="text-md font-semibold text-text-primary mb-1">{message.title}</h3>
        <p className="text-text-secondary mb-5 text-sm">{message.description}</p>
        {hasSearch && <ActionButton onClick={onClearSearch} variant="secondary" size="sm">Очистить поиск</ActionButton>}
    </div>
);

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
  const [activeTab, setActiveTab] = useState('active'); // 'active' or 'archived'
  const [searchTerm, setSearchTerm] = useState('');

  const loadSurveys = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
        let query = supabase.from('survey_templates').select('*');
        query = query.eq('company_id', user.id);
        if (searchTerm) {
          query = query.ilike('title', `%${searchTerm}%`);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;
        setSurveys(data || []);
    } catch (err) {
        toast.error('Ошибка загрузки опросов: ' + err.message)
        setSurveys([]);
    } finally {
        setLoading(false);
    }
  }, [user, searchTerm]);

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
    })
  }

  const filteredSurveys = surveys.filter(survey => {
      return activeTab === 'active' ? survey.is_active : !survey.is_active;
  });

  const emptyStateMessages = {
      active: {
          title: "Активных опросов нет",
          description: "Создайте новый опрос, чтобы начать собирать данные."
      },
      archived: {
          title: "Архив пуст",
          description: "Здесь будут отображаться опросы, которые вы архивировали."
      },
      search: {
          title: "Ничего не найдено",
          description: "По вашему запросу ничего не найдено."
      }
  };

  const getEmptyStateMessage = () => {
      if (searchTerm) return emptyStateMessages.search;
      return activeTab === 'active' ? emptyStateMessages.active : emptyStateMessages.archived;
  }

  return (
    <div>
      <header className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
        <h1 className="text-xl font-semibold text-text-primary">Мои опросы</h1>
        <div className="flex items-center gap-3">
          <SearchInput value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          <ActionButton onClick={() => navigate('/survey/create')} variant="secondary"><Plus size={16} className="mr-1.5"/>Новый опрос</ActionButton>
        </div>
      </header>

      <div className="flex items-center gap-1 mb-4 border-b border-border-contrast">
        <TabButton text="Активные" isActive={activeTab === 'active'} onClick={() => setActiveTab('active')} />
        <TabButton text="Архивные" isActive={activeTab === 'archived'} onClick={() => setActiveTab('archived')} />
      </div>

      {loading ? (
        <div className="text-center py-20"><Loader2 className="h-7 w-7 text-primary animate-spin mx-auto"/></div>
      ) : filteredSurveys.length === 0 ? (
        <EmptyState onClearSearch={() => setSearchTerm('')} hasSearch={!!searchTerm} message={getEmptyStateMessage()}/>
      ) : (
        <div className="border border-border-contrast rounded-xl">
           <div className="divide-y divide-border-contrast">
              {filteredSurveys.map(survey => (
                <SurveyCard 
                  key={survey.id} 
                  survey={survey} 
                  onNavigate={navigate} 
                  onArchive={handleArchive} 
                  onRestore={handleRestore} 
                  onDelete={handleDelete} 
                />
              ))}
           </div>
        </div>
      )}
    </div>
  );
}

const TabButton = ({ text, isActive, onClick }) => (
  <button 
    onClick={onClick} 
    className={`px-3 py-1.5 text-sm font-medium transition-colors border-b-2 ${ 
      isActive 
        ? 'border-primary text-text-primary' 
        : 'border-transparent text-text-secondary hover:border-border-contrast hover:text-text-primary'
    }`}
  >
    {text}
  </button>
)
