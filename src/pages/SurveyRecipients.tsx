import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

// Тип для получателей, соответствующий схеме базы данных
type Recipient = {
  id: number | string;
  name: string | null; // participant_label может быть null
  email: string;
  status: string;
};

// --- Компонент страницы (финальная, исправленная версия) ---
export function SurveyRecipients() {
  // Используем `id` из URL, так как это стандарт для react-router
  const { id: surveyId } = useParams<{ id: string }>();
  const { user } = useAuth();

  // Состояния для данных, загрузки и ошибок
  const [surveyName, setSurveyName] = useState("");
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [massLink, setMassLink] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!surveyId || !user) {
      setLoading(false);
      return;
    }

    const fetchSurveyData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Запрос 1: Получаем название опроса из 'survey_templates'
        const { data: surveyData, error: surveyError } = await supabase
          .from("survey_templates")
          .select("title")
          .eq("id", surveyId)
          .eq("company_id", user.id)
          .single();

        if (surveyError) throw new Error("Опрос не найден или у вас нет доступа.");
        
        setSurveyName(surveyData.title);

        // Запрос 2: Получаем список получателей из 'survey_invitations'
        const { data: invitationsData, error: invitationsError } = await supabase
          .from("survey_invitations")
          .select("id, participant_label, recipient_email, status")
          .eq("survey_template_id", surveyId);

        if (invitationsError) throw new Error("Не удалось загрузить список получателей.");

        // Преобразуем полученные данные в нужный формат
        const fetchedRecipients: Recipient[] = invitationsData.map(invitation => ({
          id: invitation.id,
          name: invitation.participant_label ?? 'Имя не указано',
          email: invitation.recipient_email,
          status: invitation.status,
        }));

        setRecipients(fetchedRecipients);

        // Генерируем массовую ссылку
        // TODO: Заменить на реальный механизм генерации массовой ссылки, если он есть
        setMassLink(`${window.location.origin}/s/${surveyId}`);

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSurveyData();
  }, [surveyId, user]);

  if (loading) {
    return <div className="p-8 text-center">Загрузка данных опроса...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-red-600">Ошибка: {error}</div>;
  }

  return (
    <>
      <div className="p-6 lg:p-8 max-w-5xl mx-auto">
        <div className="mb-6">
          <Link to="/dashboard" className="inline-flex items-center text-sm font-medium text-[#5F6368] hover:text-gray-900">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад к опросам
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-medium text-[#1F1F1F] tracking-tight mb-2">Ссылки и получатели</h1>
          <p className="text-[#5F6368]">Опрос: {surveyName}</p>
        </div>

        <div className="space-y-6">
          {/* Массовая ссылка */}
          <div className="p-6 bg-white border border-gray-200 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Массовая ссылка (для всех)</h3>
            <p className="text-sm text-[#5F6368] mb-4">
              Каждый, кто перейдет по ней, сначала укажет свои данные, а затем сможет пройти опрос.
            </p>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                readOnly
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={massLink}
              />
              <Button onClick={() => navigator.clipboard.writeText(massLink)}>Копировать</Button>
            </div>
          </div>

          {/* Персональные получатели */}
          <div className="p-6 bg-white border border-gray-200 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Персональные получатели</h3>
            <div className="divide-y divide-gray-200">
              {recipients.length > 0 ? (
                recipients.map((recipient) => (
                  <div key={recipient.id} className="py-4 flex justify-between items-center">
                    <div>
                      <p className="font-medium">{recipient.name}</p>
                      <p className="text-sm text-[#5F6368]">{recipient.email}</p>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                      {recipient.status}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">Для этого опроса еще нет персональных ссылок.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
