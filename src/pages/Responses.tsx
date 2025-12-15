import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { DashboardLayout } from '../components/DashboardLayout';
import { 
    Download, Search, ChevronDown, ChevronUp, Mail, Calendar, 
    Users
} from 'lucide-react';

// Типы данных, используемые на странице
interface SurveyTemplate {
    id: string;
    title: string;
}

interface QuestionTemplate {
    id: string;
    question_text: string;
}

interface SurveyResponse {
    id: string;
    response_value: string;
    question_templates: QuestionTemplate | null;
    invitation_id: string; // Добавлено для группировки
}

// ИСПРАВЛЕНИЕ: Убраны поля participant_label и type
interface CompletedInvitation {
    id: string;
    recipient_email: string | null;
    completed_at: string;
    responses: SurveyResponse[];
}

export function Responses() {
  const { id } = useParams<{ id: string }>();
  const [survey, setSurvey] = useState<SurveyTemplate | null>(null);
  const [completedInvitations, setCompletedInvitations] = useState<CompletedInvitation[]>([]);
  const [filteredInvitations, setFilteredInvitations] = useState<CompletedInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, [id]);

  useEffect(() => {
    if (!searchTerm) {
      setFilteredInvitations(completedInvitations);
      return;
    }
    const lowercasedTerm = searchTerm.toLowerCase();
    // ИСПРАВЛЕНИЕ: Поиск теперь только по email
    const filtered = completedInvitations.filter(inv => 
        (inv.recipient_email?.toLowerCase().includes(lowercasedTerm))
    );
    setFilteredInvitations(filtered);
  }, [searchTerm, completedInvitations]);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);

    // Шаг 1: Получаем информацию о самом опросе
    const { data: surveyData, error: surveyError } = await supabase
      .from('survey_templates')
      .select('id, title')
      .eq('id', id)
      .single();

    if (surveyError) {
      console.error("Ошибка загрузки информации об опросе:", surveyError);
      setLoading(false);
      return;
    }
    setSurvey(surveyData);

    // === ФИНАЛЬНОЕ ИСПРАВЛЕНИЕ: Запрашиваем только существующие колонки ===
    const { data: invitations, error: invError } = await supabase
        .from('survey_invitations')
        .select('id, recipient_email, completed_at') 
        .eq('survey_template_id', id)
        .eq('status', 'completed');

    if (invError) {
        console.error("Ошибка загрузки приглашений:", invError);
        setCompletedInvitations([]); 
        setFilteredInvitations([]);
        setLoading(false);
        return;
    }

    if (!invitations || invitations.length === 0) {
        setCompletedInvitations([]);
        setFilteredInvitations([]);
        setLoading(false);
        return;
    }

    const invitationIds = invitations.map(i => i.id);

    // Шаг 3: Получаем все ответы для этих приглашений
    const { data: allResponses, error: respError } = await supabase
        .from('survey_responses')
        .select('*, question_templates(id, question_text)')
        .in('invitation_id', invitationIds);

    if (respError) {
        console.error("Ошибка загрузки ответов:", respError);
        setLoading(false);
        return;
    }

    // Шаг 4: Группируем ответы по ID приглашения
    const responsesByInvitationId = new Map<string, SurveyResponse[]>();
    (allResponses || []).forEach(response => {
        if (!responsesByInvitationId.has(response.invitation_id)) {
            responsesByInvitationId.set(response.invitation_id, []);
        }
        responsesByInvitationId.get(response.invitation_id)!.push(response as SurveyResponse);
    });

    // Шаг 5: Соединяем приглашения с их ответами
    const finalData = (invitations as CompletedInvitation[]).map(inv => ({
        ...inv,
        responses: responsesByInvitationId.get(inv.id) || []
    })).sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime());

    setCompletedInvitations(finalData);
    setFilteredInvitations(finalData);
    setExpandedIds(new Set(finalData.map(i => i.id))); 
    setLoading(false);
  };

  const allQuestions = useMemo(() => {
      const questions = new Map<string, string>();
      completedInvitations.forEach(inv => {
          inv.responses.forEach(resp => {
              if(resp.question_templates) {
                  questions.set(resp.question_templates.id, resp.question_templates.question_text);
              }
          });
      });
      return Array.from(questions.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(entry => entry[1]);
  }, [completedInvitations]);

  const exportCSV = () => {
    // ИСПРАВЛЕНИЕ: Убрана колонка "Метка"
    const headers = ['Дата', 'Email', ...allQuestions];
    const rows = completedInvitations.map(inv => {
        const rowData: Record<string, string | null> = {
            'Дата': inv.completed_at ? new Date(inv.completed_at).toLocaleString('ru-RU') : null,
            'Email': inv.recipient_email,
        };
        allQuestions.forEach(q => rowData[q] = '');
        inv.responses.forEach(resp => {
            const qText = resp.question_templates?.question_text;
            if(qText) rowData[qText] = resp.response_value;
        });
        return headers.map(h => `"${(rowData[h] || '').replace(/"/g, '""')}"`).join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ответы_${survey?.title || 'опрос'}.csv`;
    link.click();
  };
  
  const toggleExpanded = (invitationId: string) => {
    const newSet = new Set(expandedIds);
    if (newSet.has(invitationId)) newSet.delete(invitationId); else newSet.add(invitationId);
    setExpandedIds(newSet);
  };

  const toggleAllExpanded = () => {
      if(expandedIds.size === filteredInvitations.length) setExpandedIds(new Set());
      else setExpandedIds(new Set(filteredInvitations.map(i => i.id)));
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' });
  };

  if (loading) {
    return <DashboardLayout><div className="p-8">Загрузка ответов...</div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-medium">{survey?.title}</h1>
          <p className="text-gray-500">Просмотр ответов</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Поиск по email..."
                className="w-full h-12 pl-12 pr-4 border rounded-lg bg-white focus:outline-none focus:border-blue-500"
              />
            </div>
             <button onClick={toggleAllExpanded} className="px-6 h-12 border rounded-full bg-white font-medium"> 
                {expandedIds.size === filteredInvitations.length ? 'Свернуть' : 'Развернуть'} все
             </button>
            <button onClick={exportCSV} disabled={completedInvitations.length === 0} className="px-6 h-12 bg-blue-600 text-white rounded-full font-medium hover:bg-blue-700 disabled:opacity-50">
                <Download className="w-5 h-5 inline-block mr-2"/> Экспорт CSV
            </button>
        </div>

        {filteredInvitations.length === 0 ? (
             <div className="bg-white rounded-2xl border p-12 text-center">
                <Users className="w-12 h-12 mx-auto text-gray-300 mb-4"/>
                <h3 className="text-lg font-medium">Ответов пока нет</h3>
                <p className="text-gray-500">Как только кто-нибудь заполнит опрос, ответы появятся здесь.</p>
            </div>
        ) : (
            <div className="space-y-4">
                {filteredInvitations.map(inv => {
                    const isExpanded = expandedIds.has(inv.id);
                    
                    // ИСПРАВЛЕНИЕ: Упрощенная логика отображения
                    let mainLabel = inv.recipient_email || `Ответ #${inv.id.substring(0, 5)}`;

                    return (
                        <div key={inv.id} className="bg-white rounded-2xl border">
                            <button onClick={() => toggleExpanded(inv.id)} className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50">
                                <div className="flex items-center gap-4 flex-wrap">
                                    <span className="font-medium">{mainLabel}</span>
                                    <span className="text-sm text-gray-500 flex items-center gap-2">
                                        <Calendar className="w-4 h-4"/> {formatDate(inv.completed_at)}
                                    </span>
                                </div>
                                <ChevronDown className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}/>
                            </button>
                            {isExpanded && (
                                <div className="px-6 pb-6 pt-4 border-t space-y-4">
                                    {inv.responses.length > 0 ? inv.responses.map(resp => (
                                        <div key={resp.id} className="bg-gray-50 rounded-lg p-3">
                                            <p className="text-sm font-medium mb-1">{resp.question_templates?.question_text || 'Неизвестный вопрос'}</p>
                                            <p className="text-gray-700 whitespace-pre-wrap">{resp.response_value}</p>
                                        </div>
                                    )) : <p className='text-gray-500'>На этот опрос не было дано ни одного ответа.</p>}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        )}

      </div>
    </DashboardLayout>
  );
}
