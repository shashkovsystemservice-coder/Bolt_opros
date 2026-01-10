import { SupabaseClient } from '@supabase/supabase-js';
import { SurveyBlueprint, TopicContext } from '../../types/survey-engine';

// ... (interface GeneratedQuestion)

function buildPromptForSection(
  // ... (function implementation)
): string {
  // ... (function implementation)
}

export async function generateQuestionsFromBlueprint(
  supabase: SupabaseClient,
  projectId: string
): Promise<any[]> {
  try {
    console.log('🤖 Начинаем генерацию вопросов для projectId:', projectId);

    // ... (ШАГ 1, 2, 3 - Загрузка данных)
    const { data: blueprint, error: blueprintError } = await supabase
      .from('survey_blueprints')
      .select('*')
      .eq('project_id', projectId)
      .single();

    if (blueprintError || !blueprint) {
      throw new Error(`Blueprint не найден: ${blueprintError?.message}`);
    }

    const { data: topicContext } = await supabase
      .from('topic_context')
      .select('*')
      .eq('project_id', projectId)
      .single();

    const { data: metaPromptData } = await supabase
      .from('meta_prompts')
      .select('prompt_text')
      .eq('generation_mode', 'blueprint')
      .eq('is_active', true)
      .order('version', { ascending: false })
      .limit(1)
      .single();

    const allQuestions: any[] = [];
    let currentOrderIndex = 1;

    for (const section of blueprint.sections) {
      const prompt = buildPromptForSection(
        section, 
        blueprint, 
        topicContext, 
        metaPromptData?.prompt_text
      );

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini-ai`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'generate-blueprint-questions',
          data: {
            prompt: prompt,
            numQuestions: section.num_questions
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.statusText}`);
      }

      const result = await response.json();

      for (const q of result.questions) {
        allQuestions.push({
          section_id: section.section_id,
          text: q.text || q.question,
          type: q.type,
          options: q.options,
          scale: q.scale,
          order_index: currentOrderIndex++
        });
      }
    }

    // ШАГ 5: Создать survey_template и сохранить вопросы
    const { data: surveyTemplate, error: surveyError } = await supabase
      .from('survey_templates')
      .insert({
        company_id: (await supabase.auth.getUser()).data.user?.id,
        title: topicContext?.topic_name || 'Новый опрос',
        description: topicContext?.research_question || '',
        is_active: true,
        is_ai_generated: true,
        status: 'draft'
      })
      .select()
      .single();

    if (surveyError) {
      throw new Error(`Ошибка создания опроса: ${surveyError.message}`);
    }

    console.log('✅ Survey Template создан:', surveyTemplate.id);

    const questionsToSave = allQuestions.map(q => ({
      survey_template_id: surveyTemplate.id,
      question_text: q.text,
      question_type: q.type,
      question_order: q.order_index,
      options: q.type === 'closed' ? { choices: q.options } : q.scale,
      is_required: true,
      created_at: new Date().toISOString()
    }));

    const { error: saveError } = await supabase
      .from('question_templates')
      .insert(questionsToSave);

    if (saveError) {
      throw new Error(`Ошибка сохранения вопросов: ${saveError.message}`);
    }

    console.log('✅ Вопросы сохранены в question_templates');

    await supabase
      .from('survey_blueprints')
      .update({ 
        sources: { survey_template_id: surveyTemplate.id },
        updated_at: new Date().toISOString()
      })
      .eq('id', blueprint.id);

    return allQuestions;

  } catch (error) {
    console.error('❌ Ошибка в generateQuestionsFromBlueprint:', error);
    throw error;
  }
}
