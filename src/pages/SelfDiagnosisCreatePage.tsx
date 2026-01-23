
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { ManualSurveyModal, SurveyItem, LocalQuestion } from '../components/ManualSurveyModal';
import { AIExpressModal } from '../components/AIExpressModal';
import { ImportExcelModal, ParsedSurveyData } from '../components/ImportExcelModal';
import StandardsCatalogModal from '../components/StandardsCatalogModal';
import { Wand2, Cog, Award, FileUp, FileSignature as ManualIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { generateCode } from '../utils/generateCode';
import { RatingOptions } from '../types/database';

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

const SelfDiagnosisCreatePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isStandardsModalOpen, setIsStandardsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [prefilledData, setPrefilledData] = useState<any | null>(null);

  useEffect(() => {
    setIsAiModalOpen(false);
    setIsStandardsModalOpen(false);
    setIsManualModalOpen(false);
    setIsImportModalOpen(false);
    setPrefilledData(null);
  }, [location]);

  const handleSaveSurvey = async (surveyData) => {
    const { title, description, finalMessage, items, survey_basis, canonical_blueprint, immutable_fields } = surveyData;
    if (!user) { toast.error('Ошибка: Пользователь не определен.'); return; }
    if (!title.trim()) { toast.error('Название опроса не может быть пустым.'); return; }
    if (!items || items.filter(i => i.itemType === 'question').length === 0) { toast.error('Добавьте хотя бы один вопрос.'); return; }

    setIsSaving(true);
    const toastId = toast.loading('Сохранение опроса...');
    let surveyId: string | null = null;
    
    try {
      const { data: survey, error: surveyError } = await supabase.from('survey_templates').insert([{
        title: title.trim(), 
        description, 
        company_id: user.id,
        is_active: true,
        unique_code: generateCode(),
        completion_settings: { thank_you_message: finalMessage || "Спасибо за участие!" },
        survey_basis: 'self_diagnosis',
      }]).select('id').single();

      if (surveyError) throw surveyError;
      surveyId = survey.id;

      const localQuestions = items.filter((item): item is LocalQuestion => item.itemType === 'question');
      const questionPayloads = localQuestions.map((item, index) => {
          let optionsPayload: string[] | RatingOptions | null = null;
          if (item.type === 'choice' || item.type === 'multi_choice') {
                optionsPayload = Array.isArray(item.options) ? item.options : [];
          } else if (item.type === 'rating') {
              optionsPayload = { scale_max: item.rating_max || 5, label_min: item.rating_labels?.[0] || '', label_max: item.rating_labels?.[1] || '' };
          }
          return { ...item, survey_template_id: surveyId, question_order: index, options: optionsPayload };
      });

      const { data: insertedQuestions, error: qError } = await supabase.from('question_templates').insert(
        questionPayloads.map(q => ({ 
          survey_template_id: q.survey_template_id, 
          question_text: q.text, 
          question_type: q.type, 
          is_required: q.required, 
          question_order: q.question_order, 
          options: q.options,
          is_standard: q.is_standard ?? false, // Ensure is_standard is set
        }))
      ).select('id');
      
      if (qError) throw qError;

      if (survey_basis === 'standard' && immutable_fields) {
        const { error: blueprintError } = await supabase.from('survey_blueprints').insert({ project_id: surveyId, immutable_fields: immutable_fields, canonical_blueprint });
        if (blueprintError) throw blueprintError;
            
        const { error: metaError } = await supabase.from('survey_meta_params').insert({ project_id: surveyId, standardization: 1.0, use_validated_scale: true });
        if (metaError) throw metaError;
      }

      toast.success('Опрос успешно сохранен!', { id: toastId });
      setIsManualModalOpen(false); setPrefilledData(null); navigate(`/surveys/${surveyId}/edit`);
    } catch (err: any) {
      if (surveyId) { await supabase.from('survey_templates').delete().eq('id', surveyId); }
      toast.error(`Ошибка сохранения: ${err.message}`, { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

 const handleSelectStandard = (standard, isStrictMode) => {
  try {
    const questions = standard.canonical_blueprint?.sections?.[0]?.questions || [];
    
    if (questions.length === 0) {
        toast.error('Ошибка: В этой методике не найдено вопросов.');
        return;
    }

    const generatedData = {
        title: standard.name,
        description: standard.description,
        finalMessage: 'Спасибо за ваше участие!',
        survey_basis: 'standard',
        canonical_blueprint: standard.canonical_blueprint,
        immutable_fields: isStrictMode ? [] : null, // Initialize immutable_fields
        items: questions.map((q: any): LocalQuestion => {
            const baseQuestion: any = {
                id: crypto.randomUUID(),
                itemType: 'question' as const,
                text: q.text,
                type: q.type,
                required: q.required !== undefined ? q.required : true,
                options: q.options || [],
                is_standard: true, 
            };
            if (q.type === 'rating') {
                const opts = (typeof q.options === 'object' && q.options !== null) ? q.options : {};
                baseQuestion.rating_max = opts.scale_max || 5;
                baseQuestion.rating_labels = [opts.label_min || '', opts.label_max || ''];
                baseQuestion.options = [];
            }
            return baseQuestion;
        }),
    };

    setPrefilledData(generatedData);
    setIsStandardsModalOpen(false);
    setTimeout(() => setIsManualModalOpen(true), 100);
    toast.info(`Применена методика «${standard.name}». Проверьте и сохраните опрос.`);
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

      const generatedData = {
        title: (aiResponse.title || topic).trim(),
        description: aiResponse.description || '',
        finalMessage: 'Спасибо за ваше участие!',
        survey_basis: 'ai_express',
        items: aiResponse.questions.map((q: any): LocalQuestion => {
            const baseQuestion: any = { id: crypto.randomUUID(), itemType: 'question' as const, text: q.question, type: q.type, required: q.required !== undefined ? q.required : true, options: q.options || [] };
            if (q.type === 'rating') {
                baseQuestion.rating_max = q.scale_max || 5;
                baseQuestion.rating_labels = (q.labels && q.labels.min && q.labels.max) ? [q.labels.min, q.labels.max] : ['', ''];
                baseQuestion.options = [];
            }
            return baseQuestion as LocalQuestion;
        }),
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
    setPrefilledData({ ...data, finalMessage: '', survey_basis: 'import_excel' });
    setIsImportModalOpen(false);
    setTimeout(() => setIsManualModalOpen(true), 100);
    toast.success(`Импортировано! Проверьте ${data.items.length} вопросов и сохраните опрос.`);
  };

  return (
    <>
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">СОЗДАНИЕ ИНСТРУМЕНТА САМОДИАГНОСТИКИ</h1>
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <CreationCard title="Manual Creation" description="Полный контроль над созданием опроса." subtext="(Ручной редактор)" onClick={() => { setPrefilledData(null); setIsManualModalOpen(true); }} icon={ManualIcon} loading={isSaving}/>
        <CreationCard title="Import from Excel" description="Загрузка готовой структуры из файла Excel." icon={FileUp} onClick={() => setIsImportModalOpen(true)} />
        <CreationCard title="AI Express" description="Быстрая генерация по одной фразе." onClick={() => setIsAiModalOpen(true)} icon={Wand2} loading={isGenerating}/>
        <CreationCard title="Expert Engine" description="Профессиональное проектирование." subtext="(В разработке)" disabled={true} icon={Cog} onClick={()=>{}}/>
        <CreationCard title="Standards" description="Готовые эталоны (NPS, 8D, SWOT)." onClick={() => setIsStandardsModalOpen(true)} icon={Award} loading={isSaving}/>
      </div>
      
      <AIExpressModal isOpen={isAiModalOpen} onClose={() => setIsAiModalOpen(false)} onGenerate={handleAiGenerate} isGenerating={isGenerating} />
      <ImportExcelModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} onImportSuccess={handleImportSuccess} />
      <ManualSurveyModal isOpen={isManualModalOpen} onClose={() => { setIsManualModalOpen(false); setPrefilledData(null); }} onSave={handleSaveSurvey} isSaving={isSaving} initialData={prefilledData} />
      <StandardsCatalogModal isOpen={isStandardsModalOpen} onClose={() => setIsStandardsModalOpen(false)} onSelectStandard={handleSelectStandard} />
    </>
  );
};

export default SelfDiagnosisCreatePage;
