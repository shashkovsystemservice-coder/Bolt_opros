import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { ManualSurveyModal, SurveyItem } from '../components/ManualSurveyModal';
import { AIExpressModal } from '../components/AIExpressModal';
import { ImportExcelModal, ParsedSurveyData } from '../components/ImportExcelModal';
import { Zap, Cog, Award, FileUp, FileSignature as ManualIcon, Loader2, FileText } from 'lucide-react';
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
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [prefilledData, setPrefilledData] = useState<ParsedSurveyData | null>(null);

  const handleSaveSurvey = async ({ title, description, finalMessage, items }: { title: string, description: string, finalMessage: string, items: SurveyItem[] }) => {
    if (!user) { toast.error('Ошибка: Пользователь не определен.'); return; }
    const cleanedTitle = title.trim().replace(/^\$/, '');
    if (!cleanedTitle) { toast.error('Название опроса не может быть пустым.'); return; }
    if (!items || items.length === 0) { toast.error('Добавьте хотя бы один вопрос или секцию.'); return; }

    setIsSaving(true);
    const toastId = toast.loading('Сохранение опроса...');
    let surveyId: string | null = null;
    
    try {
      const { data: company } = await supabase.from('companies').select('id').eq('id', user.id).single();
      let finalCompanyId = company?.id;

      if (!finalCompanyId) {
        toast.info('Создаем профиль компании...');
        const { data: newComp, error: newCompError } = await supabase.from('companies').insert([{ id: user.id, name: 'Моя компания' }]).select('id').single();
        if (newCompError) throw newCompError;
        finalCompanyId = newComp!.id;
      }

      const { data: survey, error: surveyError } = await supabase.from('survey_templates').insert([{
        title: cleanedTitle, 
        description, 
        company_id: finalCompanyId, 
        is_interactive: false, 
        is_active: true,
        unique_code: Math.random().toString(36).substring(2, 10).toUpperCase(),
        completion_settings: { thank_you_message: finalMessage || "Спасибо за участие!" }
      }]).select('id').single();

      if (surveyError) throw surveyError;
      surveyId = survey.id;

      const questionsToInsert = items.filter(item => item.itemType === 'question').map((item: any, index) => ({
          survey_template_id: surveyId, 
          question_text: item.text, 
          question_type: item.type, 
          is_required: item.required, 
          question_order: index, 
          options: (item.type === 'choice' || item.type === 'multi_choice') 
              ? (typeof item.options === 'string' ? item.options.split(',').map(o => o.trim()) : item.options) 
              : null 
      }));
      
      const sectionsToInsert = items.filter(item => item.itemType === 'section').map((item, index) => ({ survey_template_id: surveyId, title: item.text, order: index }));

      const insertPromises = [];
      if (questionsToInsert.length > 0) insertPromises.push(supabase.from('question_templates').insert(questionsToInsert));
      if (sectionsToInsert.length > 0) insertPromises.push(supabase.from('survey_sections').insert(sectionsToInsert));

      const results = await Promise.all(insertPromises);
      const anError = results.find(res => res.error);
      if (anError) throw anError.error;

      toast.success('Опрос успешно сохранен!', { id: toastId });
      setIsManualModalOpen(false); setPrefilledData(null); navigate('/dashboard/surveys');
    } catch (err: any) {
      if (surveyId) { await supabase.from('survey_templates').delete().eq('id', surveyId); }
      toast.error(`Ошибка сохранения: ${err.message}`, { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAiGenerate = async (topic: string, questionsCount: number) => {
    setIsGenerating(true);
    const toastId = toast.loading('AI генерирует вопросы...');

    try {
      const { data, error } = await supabase.functions.invoke('gemini-ai', {
        body: {
          action: 'generate-survey',
          prompt: topic,
          numQuestions: questionsCount
        },
      });

      if (error) throw new Error(`Ошибка при вызове функции: ${error.message}`);
      if (!data || data.error) throw new Error(`Ошибка генерации от AI: ${data?.error || 'Ответ не получен'}`);
      
      if (!data.generated_survey) throw new Error('Ответ от AI не содержит поля generated_survey');
      
      const aiResponse = JSON.parse(data.generated_survey);

      if (!aiResponse.questions || !Array.isArray(aiResponse.questions)) {
        throw new Error('Структура ответа AI некорректна (отсутствует массив questions)');
      }

      const generatedData: ParsedSurveyData = {
        title: aiResponse.title ? aiResponse.title.replace(/^\$/, '') : topic.replace(/^\$/, ''),
        description: '',
        items: aiResponse.questions.map((q: any) => ({
          itemType: 'question',
          text: q.question,
          type: q.type || 'choice',
          required: true,
          options: q.options || [],
          id: Math.random().toString(),
        })),
        finalMessage: aiResponse.finalMessage || 'Спасибо за ваше участие!',
      };
      
      setPrefilledData(generatedData);
      setIsAiModalOpen(false);
      setIsManualModalOpen(true);
      toast.success(`AI сгенерировал ${generatedData.items.length} вопросов!`, { id: toastId, duration: 6000 });

    } catch (err: any) {
      console.error("AI Generation Error:", err);
      let errorMessage = err.message;
      if (err.message.includes('Unexpected token')) {
          errorMessage = 'Не удалось распознать ответ от AI. Возможно, он имеет неверный JSON формат.';
      }
      toast.error(errorMessage, { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  };
  
  const handleImportSuccess = (data: ParsedSurveyData) => {
    setPrefilledData({ ...data, finalMessage: '' });
    setIsImportModalOpen(false);
    setIsManualModalOpen(true);
    toast.success(`Импортировано! Проверьте ${data.items.length} вопросов и сохраните опрос.`);
  };

  const openAiExpress = () => setIsAiModalOpen(true);
  const openManualEditor = () => { setPrefilledData(null); setIsManualModalOpen(true); };
  const openImportModal = () => setIsImportModalOpen(true);

  return (
    <>
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">ВЫБЕРИТЕ СПОСОБ СОЗДАНИЯ АРТЕФАКТА</h1>
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <CreationCard title="Manual Creation" description="Полный контроль над созданием опроса, от вопросов до настроек." subtext="(Ручной редактор)" onClick={openManualEditor} icon={ManualIcon} loading={isSaving}/>
        <CreationCard title="Import from Excel" description="Загрузка готовой структуры из файла Excel." icon={FileUp} onClick={openImportModal} />
        <CreationCard title="AI Express" description="Быстрая генерация по одной фразе." onClick={openAiExpress} icon={Zap} loading={isGenerating}/>
        <CreationCard title="AI Express (Internal Source)" description="Создание опроса на основе вашего документа (PDF, Word, TXT)." subtext="(В разработке)" disabled={true} icon={FileText} onClick={()=>{}}/>
        <CreationCard title="Expert Engine" description="Профессиональное проектирование." subtext="(В разработке)" disabled={true} icon={Cog} onClick={()=>{}}/>
        <CreationCard title="Standards" description="Готовые эталоны (NPS, 8D, SWOT)." subtext="(В разработке)" disabled={true} icon={Award} onClick={()=>{}}/>
      </div>
      
      {isAiModalOpen && <AIExpressModal onClose={() => setIsAiModalOpen(false)} onGenerate={handleAiGenerate} isGenerating={isGenerating} />}
      <ImportExcelModal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)} 
        onImportSuccess={handleImportSuccess} 
      />
      {isManualModalOpen && <ManualSurveyModal 
        isOpen={isManualModalOpen} 
        onClose={() => { setIsManualModalOpen(false); setPrefilledData(null); }} 
        onSave={handleSaveSurvey} 
        isSaving={isSaving} 
        initialData={prefilledData} 
      />}

    </>
  );
};

export default CreateInstrumentPage;
