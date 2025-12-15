
import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { DashboardLayout } from '../components/DashboardLayout';
import { getBaseUrl } from '../utils/urls';
import {
  Plus,
  Copy,
  Mail,
  Clock,
  CheckCircle2,
  X,
  Link as LinkIcon,
  Users,
  ExternalLink,
  AlertTriangle
} from 'lucide-react';

// Обновленные типы данных
interface SurveyTemplate {
  id: string;
  title: string;
}

interface SurveyInvitation {
  id: string;
  status: 'pending' | 'completed';
  recipient_email: string | null;
  participant_label: string | null;
  unique_token: string;
  created_at: string;
}

export function Recipients() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [survey, setSurvey] = useState<SurveyTemplate | null>(null);
  const [invitations, setInvitations] = useState<SurveyInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Состояния для модальных окон
  const [showAddEmailModal, setShowAddEmailModal] = useState(false);
  const [showGenerateLinksModal, setShowGenerateLinksModal] = useState(false);

  // Состояния для форм
  const [newEmail, setNewEmail] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [numLinksToGenerate, setNumLinksToGenerate] = useState(1);
  const [generatedLinks, setGeneratedLinks] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    const [surveyRes, invitationsRes] = await Promise.all([
      supabase.from('survey_templates').select('id, title').eq('id', id).single(),
      supabase.from('survey_invitations').select('*').eq('survey_template_id', id).order('created_at', { ascending: false }),
    ]);

    if (surveyRes.data) setSurvey(surveyRes.data);
    if (invitationsRes.data) setInvitations(invitationsRes.data);
    setLoading(false);
  };

  // Статистика на основе новых данных
  const stats = useMemo(() => ({
    total: invitations.length,
    completed: invitations.filter(inv => inv.status === 'completed').length,
  }), [invitations]);

  const handleAddByEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) {
        alert("Введите корректный email.");
        return;
    }

    const { error } = await supabase.from('survey_invitations').insert({
        survey_template_id: id!,
        recipient_email: newEmail,
        participant_label: newLabel || newEmail, // Если метка пуста, используем email
    });

    if (error) {
        alert('Ошибка при добавлении получателя: ' + error.message);
        return;
    }

    setShowAddEmailModal(false);
    setNewEmail('');
    setNewLabel('');
    loadData(); // Перезагружаем данные
  };

  const handleGenerateLinks = async (e: React.FormEvent) => {
    e.preventDefault();
    if (numLinksToGenerate < 1) return;

    const invitationsToCreate = Array.from({ length: numLinksToGenerate }, () => ({
        survey_template_id: id!,
        participant_label: newLabel || 'Сгенерированная ссылка', // Общая метка
    }));

    const { data, error } = await supabase.from('survey_invitations').insert(invitationsToCreate).select('unique_token');

    if (error) {
        alert('Ошибка при генерации ссылок: ' + error.message);
        return;
    }
    
    const links = data.map(item => `${getBaseUrl()}/take-survey/${item.unique_token}`);
    setGeneratedLinks(links);
    loadData(); // Перезагружаем список приглашений
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => alert('Ссылка скопирована в буфер обмена!'));
  };

  const getStatusInfo = (status: 'pending' | 'completed') => {
    if (status === 'completed') {
      return { Icon: CheckCircle2, text: 'Завершено', color: 'text-green-600' };
    }
    return { Icon: Clock, text: 'Ожидает', color: 'text-gray-500' };
  };

  if (loading) {
    return <DashboardLayout><div className="p-8">Загрузка...</div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-medium text-[#1F1F1F] tracking-tight mb-2">{survey?.title}</h1>
          <p className="text-[#5F6368]">Управление приглашениями и ссылками</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl border border-[#E8EAED] p-6">
            <div className="text-sm text-[#5F6368] mb-2">Всего приглашений</div>
            <div className="text-3xl font-medium text-[#1F1F1F]">{stats.total}</div>
          </div>
          <div className="bg-white rounded-2xl border border-[#E8EAED] p-6">
            <div className="text-sm text-[#5F6368] mb-2">Завершено</div>
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-medium text-[#1F1F1F]">{stats.completed}</div>
              {stats.total > 0 && <div className="text-sm text-[#5F6368]">{Math.round((stats.completed / stats.total) * 100)}%</div>}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h2 className="text-xl font-medium text-[#1F1F1F]">Приглашения</h2>
          <div className="flex gap-2">
            <button onClick={() => setShowGenerateLinksModal(true)} className="flex items-center gap-2 bg-white border border-[#E8EAED] text-[#1F1F1F] px-4 py-2 rounded-full font-medium hover:bg-[#F8F9FA] transition-all">
              <LinkIcon className="w-4 h-4" /> Сгенерировать ссылки
            </button>
            <button onClick={() => setShowAddEmailModal(true)} className="flex items-center gap-2 bg-[#1A73E8] text-white px-4 py-2 rounded-full font-medium hover:bg-[#1557B0] transition-all">
              <Mail className="w-4 h-4" /> Добавить по Email
            </button>
          </div>
        </div>

        {invitations.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E8EAED] p-12 text-center">
            <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-[#1F1F1F] mb-2">Приглашений еще нет</h3>
            <p className="text-[#5F6368]">Создайте ссылки для распространения или добавьте участников по email.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#E8EAED]">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-[#E8EAED]">
                            <th className="p-4 text-sm font-medium text-[#5F6368]">Участник</th>
                            <th className="p-4 text-sm font-medium text-[#5F6368]">Статус</th>
                            <th className="p-4 text-sm font-medium text-[#5F6368]">Дата создания</th>
                            <th className="p-4 text-sm font-medium text-[#5F6368]">Действия</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invitations.map(inv => {
                            const { Icon, text, color } = getStatusInfo(inv.status);
                            const link = `${getBaseUrl()}/take-survey/${inv.unique_token}`;
                            return (
                                <tr key={inv.id} className="border-b border-[#E8EAED] last:border-0">
                                    <td className="p-4 align-top">
                                        <div className="font-medium text-[#1F1F1F]">{inv.participant_label || 'Без метки'}</div>
                                        {inv.recipient_email && <div className="text-sm text-[#5F6368]">{inv.recipient_email}</div>}
                                    </td>
                                    <td className="p-4 align-top">
                                        <div className={`flex items-center gap-2 text-sm ${color}`}><Icon className="w-4 h-4" /> {text}</div>
                                    </td>
                                    <td className="p-4 text-sm text-[#5F6368] align-top">
                                        {new Date(inv.created_at).toLocaleString('ru-RU')}
                                    </td>
                                    <td className="p-4 align-top">
                                        <div className="flex gap-2">
                                            <button onClick={() => copyToClipboard(link)} title="Копировать ссылку" className="p-2 hover:bg-gray-100 rounded-md"><Copy className="w-4 h-4"/></button>
                                            <a href={link} target="_blank" rel="noopener noreferrer" title="Открыть ссылку" className="p-2 hover:bg-gray-100 rounded-md"><ExternalLink className="w-4 h-4"/></a>
                                            {inv.recipient_email && 
                                                <a href={`mailto:${inv.recipient_email}?subject=Опрос: ${survey?.title}&body=Здравствуйте! Пожалуйста, пройдите опрос по ссылке: ${link}`}
                                                   title="Отправить по Email" className="p-2 hover:bg-gray-100 rounded-md"><Mail className="w-4 h-4"/></a>
                                            }
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
          </div>
        )}
      </div>

      {/* Модальное окно для добавления по Email */}
      {showAddEmailModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-xl">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-xl font-medium">Добавить по Email</h3>
              <button onClick={() => setShowAddEmailModal(false)} className="p-1"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleAddByEmail} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email получателя *</label>
                <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} required className="w-full h-12 px-4 border rounded-lg focus:outline-none focus:border-[#1A73E8]" placeholder="participant@example.com"/>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Метка (имя или название компании)</label>
                <input type="text" value={newLabel} onChange={e => setNewLabel(e.target.value)} className="w-full h-12 px-4 border rounded-lg focus:outline-none focus:border-[#1A73E8]" placeholder="Например, Иван Петров"/>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddEmailModal(false)} className="flex-1 h-12 border rounded-full font-medium hover:bg-gray-50">Отмена</button>
                <button type="submit" className="flex-1 h-12 bg-[#1A73E8] text-white rounded-full font-medium hover:bg-[#1557B0]">Добавить</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно для генерации ссылок */}
      {showGenerateLinksModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-xl">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-xl font-medium">Сгенерировать ссылки</h3>
              <button onClick={() => {setShowGenerateLinksModal(false); setGeneratedLinks([]);}} className="p-1"><X className="w-5 h-5"/></button>
            </div>
            {generatedLinks.length === 0 ? (
                <form onSubmit={handleGenerateLinks} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Количество ссылок</label>
                        <input type="number" value={numLinksToGenerate} onChange={e => setNumLinksToGenerate(Number(e.target.value))} min="1" max="100" className="w-full h-12 px-4 border rounded-lg focus:outline-none focus:border-[#1A73E8]" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Общая метка (необязательно)</label>
                        <input type="text" value={newLabel} onChange={e => setNewLabel(e.target.value)} className="w-full h-12 px-4 border rounded-lg focus:outline-none focus:border-[#1A73E8]" placeholder="Например, Участники конференции"/>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => setShowGenerateLinksModal(false)} className="flex-1 h-12 border rounded-full font-medium hover:bg-gray-50">Отмена</button>
                        <button type="submit" className="flex-1 h-12 bg-[#1A73E8] text-white rounded-full font-medium hover:bg-[#1557B0]">Сгенерировать</button>
                    </div>
                </form>
            ) : (
                <div className="p-6">
                    <h4 className="font-medium mb-3">Ваши уникальные ссылки:</h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                        {generatedLinks.map((link, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <input type="text" readOnly value={link} className="w-full h-10 px-3 border rounded-lg bg-gray-50 text-sm"/>
                                <button onClick={() => copyToClipboard(link)} className="p-2 hover:bg-gray-100 rounded-md"><Copy className="w-4 h-4"/></button>
                            </div>
                        ))}
                    </div>
                     <button type="button" onClick={() => {setShowGenerateLinksModal(false); setGeneratedLinks([]); setNewLabel('')}} className="mt-4 w-full h-12 border rounded-full font-medium hover:bg-gray-50">Закрыть</button>
                </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
