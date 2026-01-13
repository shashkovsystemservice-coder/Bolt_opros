
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { DashboardLayout } from '../components/DashboardLayout';
import { ManualSurveyModal, SurveyItem } from '../components/ManualSurveyModal';
import { AIExpressModal } from '../components/AIExpressModal';
import { generateSurveyWithAI } from '../lib/aiService';
import { Zap, Cog, Award, FileUp, FileSignature as ManualIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const CreationCard = ({ title, description, subtext, onClick, disabled = false, icon: Icon, loading = false }) => {
  const cardClasses = `bg-white border border-gray-200 rounded-lg p-6 flex flex-col items-start text-left h-full transition-all duration-200 ${
    disabled || loading ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-400 hover:shadow-md'
  }`;
  return (
    <button onClick={() => !(disabled || loading) && onClick()} disabled={disabled || loading} className={cardClasses}>
        <div className="flex items-center w-full mb-3">{loading ? <Loader2 className="w-8 h-8 text-gray-600 animate-spin" /> : <Icon className="w-8 h-8 text-gray-600" />}</div>
        <h3 className="text-base font-semibold text-gray-900 mb-1.5">{title}</h3>
        <p className="text-sm text-gray-500 flex-grow">{description}</p>
        {subtext && <p className="text-xs text-gray-400 mt-2">{subtext}</p>}
    </button>
  );
};

const CreateInstrumentPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [prefilledData, setPrefilledData] = useState(null);

  // --- ФИНАЛЬНАЯ ВЕРСИЯ ФУНКЦИИ СОХРАНЕНИЯ ---

  const handleSaveSurvey = async ({ title, description, finalMessage, items }: { title: string, description: string, finalMessage: string, items: SurveyItem[] }) => {
    if (!user) { toast.error('Ошибка: Пользователь не определен.'); return; }
    if (!title.trim()) { toast.error('Название опроса не может быть пустым.'); return; }
    if (!items || items.length === 0) { toast.error('Добавьте хотя бы один вопрос или секцию.'); return; }

    setIsSaving(true);
    const toastId = toast.loading('Сохранение опроса...');

    let surveyId: string | null = null;
    
    try {
      // 1. Логика идентификации компании
      const { data: company } = await supabase
        .from('companies')
        .select('id')
        .eq('id', user.id) // Ищем по 'id' пользователя
        .single();

      let finalCompanyId = company?.id;

      if (!finalCompanyId) {
        toast.info('Создаем профиль компании...');
        const { data: newComp, error: newCompError } = await supabase
          .from('companies')
          .insert([{ id: user.id, name: 'Моя компания' }]) // Создаем с 'id' пользователя
          .select('id')
          .single();
        if (newCompError) throw newCompError;
        finalCompanyId = newComp!.id;
      }

      // 2. Сохранение в survey_templates
      const { data: survey, error: surveyError } = await supabase.from('survey_templates').insert([{

        title,

        description,

        company_id: finalCompanyId, // <-- Используем ID компании (равный ID юзера)
        is_interactive: false, 

        is_active: true,

        unique_code: Math.random().toString(36).substring(2, 10).toUpperCase(),
        completion_settings: { thank_you_message: finalMessage || "Спасибо за участие!" }
      }]).select('id').single();

      if (surveyError) throw surveyError;
      surveyId = survey.id;

      // 3. Сохранение в question_templates
      const questionsToInsert = items
        .filter(item => item.itemType === 'question')
        .map((item, index) => ({

          survey_template_id: surveyId,

          question_text: item.text,      // <-- ИСПРАВЛЕНО
          question_type: item.type,      // <-- ИСПРАВЛЕНО
          is_required: item.required,

          question_order: index,         // <-- ИСПРАВЛЕНО
          options: item.type === 'choice' ? item.options : null
        }));

      // 4. Сохранение в survey_sections (используем правильные имена 'title' и 'order')
      const sectionsToInsert = items
        .filter(item => item.itemType === 'section')
        .map((item, index) => ({
          survey_template_id: surveyId,
          title: item.text,
          order: index,
        }));

      const insertPromises = [];
      if (questionsToInsert.length > 0) {
        insertPromises.push(supabase.from('question_templates').insert(questionsToInsert));
      }
      if (sectionsToInsert.length > 0) {
        insertPromises.push(supabase.from('survey_sections').insert(sectionsToInsert));
      }

      if (insertPromises.length > 0) {
        const results = await Promise.all(insertPromises);
        const anError = results.find(res => res.error);
        if (anError) throw anError.error;
      }

      toast.success('Опрос успешно сохранен!', { id: toastId });
      setIsManualModalOpen(false);
      setPrefilledData(null);
      navigate('/dashboard/surveys');

    } catch (err: any) {
      if (surveyId) {
        await supabase.from('survey_templates').delete().eq('id', surveyId);
        console.error('Rollback: Deleted survey template due to error.');
      }
      toast.error(`Ошибка сохранения: ${err.message}`, { id: toastId });
      console.error("SUPABASE ERROR DETAILS:", JSON.stringify(err, null, 2));
    } finally {
      setIsSaving(false);
    }
  };

  const handleAiGenerate = async (topic: string, questionsCount: number) => {
    setIsGenerating(true);
    const toastId = toast.loading('AI генерирует опрос...');
    try {
      const generatedData = await generateSurveyWithAI(topic, questionsCount);
      const items: SurveyItem[] = generatedData.questions.map((q, index) => ({
        id: crypto.randomUUID(),
        itemType: 'question',
        text: q.text,
        type: q.type,
        required: q.required !== undefined ? q.required : true,
        options: q.options || [],
        order: index
      }));
      setPrefilledData({
        title: generatedData.title,
        description: generatedData.description,
        finalMessage: 'Спасибо за участие в опросе!',
        items: items,
      });
      setIsAiModalOpen(false);
      setIsManualModalOpen(true);
      toast.success('Опрос сгенерирован! Теперь вы можете его отредактировать.', { id: toastId });
    } catch (err: any) {
      console.error('AI Generation Error:', err);
      toast.error(`Ошибка генерации: ${err.message}`, { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  };

  const openAiExpress = () => setIsAiModalOpen(true);
  const openManualEditor = () => {
    setPrefilledData(null);
    setIsManualModalOpen(true);
  };

  return (
    <DashboardLayout>
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">ВЫБЕРИТЕ СПОСОБ СОЗДАНИЯ АРТЕФАКТА</h1>
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <CreationCard title="AI Express" description="Быстрая генерация по одной фразе." onClick={openAiExpress} icon={Zap} loading={isGenerating}/>
        <CreationCard title="Manual Creation" description="Полный контроль над созданием опроса, от вопросов до настроек." subtext="(Ручной редактор)" onClick={openManualEditor} icon={ManualIcon} loading={isSaving}/>
        <CreationCard title="Expert Engine" description="Профессиональное проектирование." subtext="(В разработке)" disabled={true} icon={Cog} onClick={()=>{}}/>
        <CreationCard title="Standards" description="Готовые эталоны (NPS, 8D, SWOT)." subtext="(В разработке)" disabled={true} icon={Award} onClick={()=>{}}/>
        <CreationCard title="Import from Excel" description="Загрузка готовой структуры." subtext="(В разработке)" disabled={true} icon={FileUp} onClick={()=>{}}/>
      </div>
      
      {isAiModalOpen && (
        <AIExpressModal 
          onClose={() => setIsAiModalOpen(false)}
          onGenerate={handleAiGenerate}
          isGenerating={isGenerating}
        />
      )}

      {isManualModalOpen && (
        <ManualSurveyModal 
          isOpen={isManualModalOpen}
          onClose={() => {
            setIsManualModalOpen(false);
            setPrefilledData(null); 
          }}
          onSave={handleSaveSurvey}
          isSaving={isSaving}
          initialData={prefilledData} 
        />
      )}

    </DashboardLayout>
  );
};

export default CreateInstrumentPage;
