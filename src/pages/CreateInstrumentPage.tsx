
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { ManualSurveyModal, SurveyItem } from '../components/ManualSurveyModal'; // Using the unified SurveyItem type
import { AIExpressModal } from '../components/AIExpressModal';
import { ImportExcelModal, ParsedSurveyData } from '../components/ImportExcelModal';
import StandardsCatalogModal from '../components/StandardsCatalogModal';
import { Wand2, Cog, Award, FileUp, FileSignature as ManualIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { generateCode } from '../utils/generateCode';
import { normalizeSurveyItems } from '../utils/surveyNormalizer'; // The new universal normalizer

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
  const location = useLocation();
  
  const isSelfDiagnosisCreation = location.pathname.startsWith('/self-diagnosis');
  const pageTitle = isSelfDiagnosisCreation ? "СОЗДАНИЕ НОВОЙ САМОДИАГНОСТИКИ" : "ВЫБЕРИТЕ СПОСОБ СОЗДАНИЯ ОПРОСА";
  const manualCreationTitle = isSelfDiagnosisCreation ? "Ручное создание диагностики" : "Ручное создание опроса";

  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isStandardsModalOpen, setIsStandardsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [prefilledData, setPrefilledData] = useState<any | null>(null);

  useEffect(() => {
    // Reset state on location change
    setIsAiModalOpen(false);
    setIsStandardsModalOpen(false);
    setIsManualModalOpen(false);
    setIsImportModalOpen(false);
    setPrefilledData(null);
  }, [location]);

  const handleSaveSurvey = async (surveyData) => {
    const { title, description, finalMessage, items, survey_basis, canonical_blueprint } = surveyData;
    if (!user) { toast.error('Ошибка: Пользователь не определен.'); return; }
    if (!title.trim()) { toast.error('Название не может быть пустым.'); return; }
    if (!items || items.filter(i => i.itemType === 'question').length === 0) { toast.error('Добавьте хотя бы один вопрос.'); return; }

    setIsSaving(true);
    const toastId = toast.loading('Сохранение шаблона...');
    let surveyId: string | null = null;
    
    try {
      const { data: survey, error: surveyError } = await supabase.from('survey_templates').insert([{
        title: title.trim(), 
        description, 
        company_id: user.id,
        is_active: true,
        unique_code: generateCode(),
        completion_settings: { thank_you_message: finalMessage || "Спасибо за участие!" },
        survey_basis: survey_basis || (isSelfDiagnosisCreation ? 'self_diagnosis' : 'manual'),
      }]).select('id').single();

      if (surveyError) throw surveyError;
      surveyId = survey.id;

      const questionItems = items.filter((item): item is SurveyItem => item.itemType === 'question');
      const questionPayloads = questionItems.map((item, index) => ({
          survey_template_id: surveyId,
          question_text: item.text,
          question_type: item.type,
          is_required: item.required,
          question_order: index, // Simplified order
          options: item.options, // Options are now standardized
          is_standard: item.is_standard ?? false,
      }));

      const { data: insertedQuestions, error: qError } = await supabase.from('question_templates').insert(questionPayloads).select('id');
      if (qError) throw qError;

      const isStandardBased = survey_basis === 'standard' || survey_basis === 'self_diagnosis';
      if (isStandardBased && canonical_blueprint) {
        const questionIds = insertedQuestions.map(q => q.id);
        const { error: blueprintError } = await supabase.from('survey_blueprints').insert({ project_id: surveyId, immutable_fields: questionIds, canonical_blueprint });
        if (blueprintError) throw blueprintError;
      }

      toast.success('Шаблон успешно сохранен!', { id: toastId });
      setIsManualModalOpen(false); 
      setPrefilledData(null); 
      navigate(`/surveys/${surveyId}`); // Navigate to the clean URL

    } catch (err: any) {
      console.error("Save Survey Error:", err);
      if (surveyId) { 
        await supabase.from('survey_templates').delete().eq('id', surveyId); 
      }
      toast.error(`Ошибка сохранения: ${err.message}`, { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectStandard = (standard) => {
    try {
      const rawData = standard.canonical_blueprint;
      if (!rawData) {
        toast.error('Ошибка: В этой методике отсутствует структура (canonical_blueprint).');
        return;
      }

      const normalizedItems = normalizeSurveyItems(rawData);

      if (normalizedItems.filter(i => i.itemType === 'question').length === 0) {
        toast.error('Ошибка: В данной методике не найдено ни одного вопроса после обработки.');
        return;
      }

      const generatedData = {
        title: standard.name,
        description: standard.description,
        finalMessage: 'Спасибо за ваше участие!',
        survey_basis: standard.category === 'self_diagnosis' ? 'self_diagnosis' : 'standard',
        canonical_blueprint: standard.canonical_blueprint,
        items: normalizedItems,
      };

      setPrefilledData(generatedData);
      setIsStandardsModalOpen(false);
      setTimeout(() => setIsManualModalOpen(true), 100);
      toast.info(`Применена методика «${standard.name}». Проверьте и сохраните.`);

    } catch (error) {
      toast.error('Произошла ошибка при обработке стандарта.');
      console.error(error);
    }
  };

  const handleAiGenerate = async (topic: string, questionsCount: number) => {
    setIsGenerating(true);
    const toastId = toast.loading('AI генерирует вопросы...');

    try {
      const { data, error } = await supabase.functions.invoke('gemini-ai', { body: { action: 'generate-survey', prompt: topic, numQuestions: questionsCount }, });
      if (error) throw new Error(`Ошибка при вызове функции: ${error.message}`);
      if (data.error) throw new Error(`Ошибка генерации от AI: ${data.error}`);
      
      const aiResponse = data.generated_survey;
      if (!aiResponse || !aiResponse.questions || !Array.isArray(aiResponse.questions)) { throw new Error('Структура ответа AI некорректна'); }

      const rawQuestions = aiResponse.questions.map(q => ({ question_text: q.question, question_type: q.type, is_required: q.required, options: q.options }));
      const normalizedItems = normalizeSurveyItems(rawQuestions);

      const generatedData = {
        title: (aiResponse.title || topic).trim(),
        description: aiResponse.description || '',
        finalMessage: 'Спасибо за ваше участие!',
        survey_basis: 'ai_express',
        items: normalizedItems,
      };
      
      setPrefilledData(generatedData);
      setIsAiModalOpen(false);
      setTimeout(() => setIsManualModalOpen(true), 100);
      toast.success(`AI сгенерировал ${generatedData.items.length} вопросов!`, { id: toastId, duration: 6000 });

    } catch (err: any) {
      console.error("AI Generation Error:", err);
      toast.error(err.message.includes('Unexpected token') ? 'Не удалось распознать ответ от AI.' : err.message, { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  };
  
  const handleImportSuccess = (data: ParsedSurveyData) => {
    const normalizedItems = normalizeSurveyItems(data.items as any[]);
    setPrefilledData({ ...data, items: normalizedItems, finalMessage: 'Спасибо за участие!', survey_basis: 'import_excel' });
    setIsImportModalOpen(false);
    setTimeout(() => setIsManualModalOpen(true), 100);
    toast.success(`Импортировано! Проверьте ${normalizedItems.length} элементов и сохраните опрос.`);
  };

  return (
    <>
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">{pageTitle}</h1>
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <CreationCard title={manualCreationTitle} description="Полный контроль над созданием." subtext="(Ручной редактор)" onClick={() => { setPrefilledData(null); setIsManualModalOpen(true); }} icon={ManualIcon} loading={isSaving}/>
        {!isSelfDiagnosisCreation && <CreationCard title="Import from Excel" description="Загрузка готовой структуры из файла Excel." icon={FileUp} onClick={() => setIsImportModalOpen(true)} />}
        {!isSelfDiagnosisCreation && <CreationCard title="AI Express" description="Быстрая генерация по одной фразе." onClick={() => setIsAiModalOpen(true)} icon={Wand2} loading={isGenerating}/>}
        <CreationCard title="Методики и стандарты" description="Готовые шаблоны (NPS, ПП РФ 2023)." onClick={() => setIsStandardsModalOpen(true)} icon={Award} loading={isSaving}/>
        
        {isSelfDiagnosisCreation && <CreationCard title="Expert Engine" description="Профессиональное проектирование." subtext="(В разработке)" disabled={true} icon={Cog} onClick={()=>{}}/>}
      </div>
      
      <AIExpressModal isOpen={isAiModalOpen} onClose={() => setIsAiModalOpen(false)} onGenerate={handleAiGenerate} isGenerating={isGenerating} />
      <ImportExcelModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} onImportSuccess={handleImportSuccess} />
      <ManualSurveyModal isOpen={isManualModalOpen} onClose={() => { setIsManualModalOpen(false); setPrefilledData(null); }} onSave={handleSaveSurvey} isSaving={isSaving} initialData={prefilledData} />
      <StandardsCatalogModal 
        isOpen={isStandardsModalOpen} 
        onClose={() => setIsStandardsModalOpen(false)} 
        onSelectStandard={handleSelectStandard} 
        filterCategory={isSelfDiagnosisCreation ? 'self_diagnosis' : 'other'}
      />
    </>
  );
};

export default CreateInstrumentPage;
