
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { DashboardLayout } from '../components/DashboardLayout';
import { ManualSurveyModal, SurveyItem } from '../components/ManualSurveyModal';
import { Zap, Cog, Award, FileUp, FileSignature as ManualIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// --- Компоненты ---
const CreationCard = ({ title, description, subtext, onClick, disabled = false, icon: Icon, loading = false }) => {
  const cardClasses = `bg-white border border-gray-200 rounded-lg p-6 flex flex-col items-start text-left h-full transition-all duration-200 ${
    disabled || loading ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-400 hover:shadow-md'
  }`;
  return (
    <button onClick={() => !(disabled || loading) && onClick()} disabled={disabled || loading} className={cardClasses}>
        <div className="flex items-center w-full mb-3">{loading ? <Loader2 className="w-8 h-8 text-gray-600 animate-spin" /> : <Icon className="w-8 h-8 text-gray-600" />}</div>
        <h3 className="text-base font-semibold text-gray-900 mb-1.5">{title}</h3>
        <p className="text-sm text-gray-500 flex-grow">{description}</p>
        <p className="text-xs text-gray-400 mt-2">{subtext}</p>
    </button>
  );
};

// --- Главная страница ---
const CreateInstrumentPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // ОСНОВНАЯ ОБНОВЛЕННАЯ ЛОГИКА СОХРАНЕНИЯ
  const handleSaveSurvey = async ({ title, description, finalMessage, items }: { title: string, description: string, finalMessage: string, items: SurveyItem[] }) => {
    if (!user) { toast.error('Ошибка: Пользователь не определен.'); return; }
    if (!title.trim()) { toast.error('Название опроса не может быть пустым.'); return; }
    if (!items || items.length === 0) { toast.error('Добавьте хотя бы один вопрос или секцию.'); return; }

    setIsSaving(true);
    const toastId = toast.loading('Сохранение опроса...');

    let surveyId: string | null = null;

    try {
      // 1. Создаем основную запись опроса с finalMessage
      const { data: survey, error: surveyError } = await supabase.from('survey_templates').insert([{
        title,
        description,
        company_id: user.id,
        is_interactive: false, 
        is_active: true,
        unique_code: Math.random().toString(36).substring(2, 10).toUpperCase(),
        completion_settings: finalMessage ? { thank_you_message: finalMessage } : null // Упаковываем finalMessage
      }]).select().single();

      if (surveyError) throw surveyError;
      surveyId = survey.id;

      // 2. Готовим массивы для вопросов и секций, сохраняя порядок
      const questionsToInsert: any[] = [];
      const sectionsToInsert: any[] = [];

      items.forEach((item, index) => {
        if (item.itemType === 'question') {
          questionsToInsert.push({
            survey_template_id: surveyId,
            question_text: item.text,
            question_type: item.type,
            is_required: item.required,
            question_order: index, // Сохраняем порядковый номер
            options: item.type === 'choice' ? item.options : null
          });
        } else if (item.itemType === 'section') {
          sectionsToInsert.push({
            survey_template_id: surveyId,
            title: item.text,
            order: index // Сохраняем порядковый номер
          });
        }
      });

      // 3. Выполняем вставку вопросов и секций
      const insertPromises = [];
      if (questionsToInsert.length > 0) {
        insertPromises.push(supabase.from('question_templates').insert(questionsToInsert));
      }
      if (sectionsToInsert.length > 0) {
        insertPromises.push(supabase.from('survey_sections').insert(sectionsToInsert));
      }

      await Promise.all(insertPromises.map(p => p.then(res => res.error ? Promise.reject(res.error) : res)));

      toast.success('Опрос успешно сохранен!', { id: toastId });
      setIsManualModalOpen(false);
      navigate('/dashboard/surveys');

    } catch (err: any) {
      // 4. Логика отката в случае ошибки
      if (surveyId) {
        await supabase.from('survey_templates').delete().eq('id', surveyId);
        console.error('Rollback: Deleted survey template due to error.');
      }
      toast.error(`Ошибка сохранения: ${err.message}`, { id: toastId });
      console.error("Save Survey Error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">ВЫБЕРИТЕ СПОСОБ СОЗДАНИЯ АРТЕФАКТА</h1>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <CreationCard title="AI Express" description="Быстрая генерация по одной фразе." subtext="(Временно отключено)" onClick={() => {}} icon={Zap} disabled={true}/>
        <CreationCard 
          title="Manual Creation"
          description="Полный контроль над созданием опроса, от вопросов до настроек."
          subtext="(Ручной редактор)"
          onClick={() => setIsManualModalOpen(true)}
          icon={ManualIcon}
          loading={isSaving}
        />
        <CreationCard title="Expert Engine" description="Профессиональное проектирование." subtext="(В разработке)" disabled={true} icon={Cog} onClick={()=>{}}/>
        <CreationCard title="Standards" description="Готовые эталоны (NPS, 8D, SWOT)." subtext="(В разработке)" disabled={true} icon={Award} onClick={()=>{}}/>
        <CreationCard title="Import from Excel" description="Загрузка готовой структуры." subtext="(В разработке)" disabled={true} icon={FileUp} onClick={()=>{}}/>
      </div>
      
      {isManualModalOpen && (
        <ManualSurveyModal 
          isOpen={isManualModalOpen}
          onClose={() => setIsManualModalOpen(false)}
          onSave={handleSaveSurvey}
          isSaving={isSaving}
        />
      )}

    </DashboardLayout>
  );};

export default CreateInstrumentPage;
