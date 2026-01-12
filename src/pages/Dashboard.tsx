
import { useEffect, useState, useCallback, Fragment } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { DashboardLayout } from '../components/DashboardLayout';
import { toast } from 'sonner';
import { Plus, Search, Users, Edit, Trash2, Archive, ArrowLeft, Loader2, MoreHorizontal, FileText } from 'lucide-react';
import { Menu, Transition } from '@headlessui/react';

// ... (Components like SurveyDropdownMenu, SurveyCard, EmptyState remain unchanged) ...
const SurveyDropdownMenu = ({ survey, onNavigate, onArchive, onRestore, onDelete }) => (
  <Menu as="div" className="relative z-10">
    <Menu.Button className="p-1.5 text-gray-500 hover:text-gray-800 rounded-md hover:bg-gray-100 transition-colors">
      <MoreHorizontal size={16} />
    </Menu.Button>
    <Transition as={Fragment} enter="transition ease-out duration-100" enterFrom="transform opacity-0 scale-95" enterTo="transform opacity-100 scale-100" leave="transition ease-in duration-75" leaveFrom="transform opacity-100 scale-100" leaveTo="transform opacity-0 scale-95">
      <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right bg-white border border-gray-200 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
        <div className="py-1">
          {survey.is_active ? (
            <>
              <Menu.Item>{({ active }) => (<button onClick={() => onNavigate(`/dashboard/survey/${survey.id}/edit`)} className={`${active ? 'bg-gray-100' : ''} group flex w-full items-center rounded-md px-3 py-2 text-sm text-gray-700`}><Edit className="mr-3 h-4 w-4" /> Редактор</button>)}</Menu.Item>
              <Menu.Item>{({ active }) => (<button onClick={() => onNavigate(`/dashboard/survey/${survey.id}/recipients`)} className={`${active ? 'bg-gray-100' : ''} group flex w-full items-center rounded-md px-3 py-2 text-sm text-gray-700`}><Users className="mr-3 h-4 w-4" /> Ссылки</button>)}</Menu.Item>
              <Menu.Item>{({ active }) => (<button onClick={() => onArchive(survey.id)} className={`${active ? 'bg-gray-100' : ''} group flex w-full items-center rounded-md px-3 py-2 text-sm text-gray-700`}><Archive className="mr-3 h-4 w-4" /> Архивировать</button>)}</Menu.Item>
            </>
          ) : (
            <>
              <Menu.Item>{({ active }) => (<button onClick={() => onRestore(survey.id)} className={`${active ? 'bg-gray-100' : ''} group flex w-full items-center rounded-md px-3 py-2 text-sm text-gray-700`}><ArrowLeft className="mr-3 h-4 w-4" /> Восстановить</button>)}</Menu.Item>
              <Menu.Item>{({ active }) => (<button onClick={() => onDelete(survey)} className={`${active ? 'bg-red-100 text-red-600' : 'text-red-600'} group flex w-full items-center rounded-md px-3 py-2 text-sm`}><Trash2 className="mr-3 h-4 w-4" /> Удалить</button>)}</Menu.Item>
            </>
          )}
        </div>
      </Menu.Items>
    </Transition>
  </Menu>
);

const SurveyCard = ({ survey, onNavigate, onArchive, onRestore, onDelete }) => {
    return (
        <div className="bg-surface-primary border border-border-subtle rounded-lg p-4">
            <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold mb-1 break-words pr-2">{survey.title}</h3>
                    <p className="text-sm text-text-secondary">Создан: {new Date(survey.created_at).toLocaleDateString('ru-RU')}</p>
                </div>
                <SurveyDropdownMenu survey={survey} onNavigate={onNavigate} onArchive={onArchive} onRestore={onRestore} onDelete={onDelete} />
            </div>
        </div>
    );
};

const EmptyState = ({ onClearSearch, hasSearch, message, onCreate }) => (
    <div className="text-center py-16 bg-white border border-gray-200 rounded-lg">
        <div className="mx-auto mb-4 bg-gray-100 w-12 h-12 flex items-center justify-center rounded-full">
            <FileText size={24} className="text-gray-500"/>
        </div>
        <h3 className="text-md font-semibold text-gray-800 mb-1">{message.title}</h3>
        <p className="text-gray-500 mb-5 text-sm">{message.description}</p>
        {hasSearch ? 
            <button onClick={onClearSearch} className="text-sm font-medium text-primary hover:underline">Очистить поиск</button> : 
            (message.title === "Активных опросов нет" && <button onClick={onCreate} className="inline-flex items-center justify-center h-9 px-4 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90"><Plus size={16} className="mr-1.5"/>Создать опрос</button>)
        }
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
  const [activeTab, setActiveTab] = useState('active');
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
    else { toast.success(successMsg); loadSurveys(); }
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

  const filteredSurveys = surveys.filter(survey => activeTab === 'active' ? survey.is_active : !survey.is_active);

  const emptyStateMessages = {
      active: { title: "Активных опросов нет", description: "Создайте новый опрос, чтобы начать собирать данные." },
      archived: { title: "Архив пуст", description: "Здесь будут отображаться опросы, которые вы архивировали." },
      search: { title: "Ничего не найдено", description: "По вашему запросу ничего не найдено." }
  };

  const getEmptyStateMessage = () => {
      if (searchTerm) return emptyStateMessages.search;
      return activeTab === 'active' ? emptyStateMessages.active : emptyStateMessages.archived;
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Мои опросы</h1>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                      type="text"
                      placeholder="Искать опросы..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full h-9 pl-9 pr-3 bg-white border border-gray-300 rounded-lg text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400"
                  />
              </div>
              <button onClick={() => navigate('/survey/create')} className="w-full sm:w-auto inline-flex items-center justify-center h-9 px-4 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600">
                  <Plus size={16} className="mr-1.5"/>Контрольная кнопка
              </button>
          </div>
      </div>

      <div className="border-b border-gray-200">
          <div className="overflow-x-auto pb-2">
              <nav className="-mb-px flex gap-2">
                  <TabButton text="Активные" isActive={activeTab === 'active'} onClick={() => setActiveTab('active')} />
                  <TabButton text="Архивные" isActive={activeTab === 'archived'} onClick={() => setActiveTab('archived')} />
              </nav>
          </div>
      </div>

      <div className="mt-6">
      {loading ? (
        <div className="text-center py-20"><Loader2 className="h-7 w-7 text-gray-400 animate-spin mx-auto"/></div>
      ) : filteredSurveys.length === 0 ? (
        <EmptyState onClearSearch={() => setSearchTerm('')} hasSearch={!!searchTerm} message={getEmptyStateMessage()} onCreate={() => navigate('/survey/create')}/>
      ) : (
        <div className="space-y-4">
           {filteredSurveys.map(survey => (
             <SurveyCard key={survey.id} survey={survey} onNavigate={navigate} onArchive={handleArchive} onRestore={handleRestore} onDelete={handleDelete} />
           ))}
        </div>
      )}
      </div>
    </div>
  );
}

const TabButton = ({ text, isActive, onClick }) => (
  <button 
    onClick={onClick} 
    className={`whitespace-nowrap py-2 px-4 border-b-2 font-medium text-sm transition-colors ${ 
      isActive 
        ? 'border-primary text-primary' 
        : 'border-transparent text-text-secondary hover:border-gray-300 hover:text-text-primary'
    }`}
  >
    {text}
  </button>
)
