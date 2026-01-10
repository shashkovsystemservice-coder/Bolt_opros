import { SurveyBlueprint, Conflict } from '../../types/survey-engine';
import { calculateN } from './calculateN';
import { calculateM } from './calculateM';
import { calculateSections } from './calculateSections';

export async function calculateBlueprint(
  supabase: any,
  projectId: string
): Promise<SurveyBlueprint> {
  
  // ═══════════════════════════════════════════════════════════
  // ШАГI: ЗАГРУЗКА 4 ИСТОЧНИКОВ ВЛИЯНИЯ
  // ═══════════════════════════════════════════════════════════
  
  // 1. MetaParams (из wizard)
  const { data: metaParams } = await supabase
    .from('survey_meta_params')
    .select('*')
    .eq('project_id', projectId)
    .single();

  // 2. TopicContext + TopicSignals (AI анализ темы)
  const { data: topicContext } = await supabase
    .from('topic_context')
    .select('*')
    .eq('project_id', projectId)
    .single();

  // 3. StandardTemplate (если распознан стандарт)
  let standardTemplate = null;
  if (topicContext?.detected_standard) {
    const { data: template } = await supabase
      .from('standard_templates')
      .select('*')
      .eq('code', topicContext.detected_standard)
      .maybeSingle();

    if (!template) {
      // Если стандарт НЕ в базе → проверяем pending_standards
      const { data: pending } = await supabase
        .from('pending_standards')
        .select('*')
        .eq('code', topicContext.detected_standard)
        .eq('status', 'pending')
        .maybeSingle();

      if (pending) {
        standardTemplate = { canonical_blueprint: pending.generated_blueprint };
        // Увеличиваем usage_count
        await supabase
          .from('pending_standards')
          .update({ usage_count: pending.usage_count + 1 })
          .eq('id', pending.id);
      }
    } else {
      standardTemplate = template;
    }
  }

  // 4. AdminNotes (свободный текст админа)
  const { data: adminNotes } = await supabase
    .from('admin_notes')
    .select('*')
    .eq('project_id', projectId)
    .maybeSingle();

  // ═══════════════════════════════════════════════════════════
  // ШАГ 2: CONSTRAINT ENGINE (ПРИОРИТЕТЫ)
  // ═══════════════════════════════════════════════════════════

  const conflicts: Conflict[] = [];
  const appliedConstraints: any[] = [];
  let immutableFields: string[] = [];
  let editableFields: string[] = [];

  // ПРИОРИТЕТ 1: Hard Standard Constraints
  let blueprint: any = {};
  if (standardTemplate?.hard_constraints) {
    blueprint = { ...standardTemplate.canonical_blueprint };
    immutableFields = standardTemplate.hard_constraints.immutable_fields || [];
    appliedConstraints.push({
      source: 'StandardTemplate',
      type: 'Hard',
      standard: topicContext.detected_standard
    });
  } else {
    // ПРИОРИТЕТ 4: Расчёт по MetaParams (если нет стандарта)
    const N = await calculateN(supabase, metaParams);
    const M = await calculateM(supabase, metaParams);
    const sections = calculateSections(metaParams, N, topicContext);
    const D = N * 20; // Упрощённо: 20 сек на вопрос

    blueprint = {
      total_questions: N,
      estimated_duration: D,
      question_mix: M,
      sections,
      logic_type: metaParams.structure || 'linear'
    };
  }

  // ПРИОРИТЕТ 2: Topic Constraints (чувствительность, формат)
  if (topicContext?.topic_signals) {
    const signals = topicContext.topic_signals;
    
    if (signals.disallowed_formats?.includes('open')) {
      blueprint.question_mix.open = 0;
      conflicts.push({
        type: 'Block',
        source: 'TopicSignals',
        severity: 'error',
        message: 'Открытые вопросы запрещены для чувствительных тем'
      });
    }

    if (signals.mandatory_sections) {
      blueprint.sections.unshift({ section_id: 0, topic: 'Согласие на обработку данных', num_questions: 1 });
    }

    appliedConstraints.push({
      source: 'TopicSignals',
      type: 'Topic',
      signals: signals
    });
  }

  // ПРИОРИТЕТ 3: Admin Constraints (переопределения из notes)
  if (adminNotes?.parsed_notes) {
    const notes = adminNotes.parsed_notes;

    if (notes.constraints?.includes('no_open_questions')) {
      blueprint.question_mix.open = 0;
      appliedConstraints.push({
        source: 'AdminNotes',
        type: 'Constraint',
        constraint: 'no_open_questions'
      });
    }

    if (notes.overrides?.depth) {
      // Override depth (если не immutable)
      if (!immutableFields.includes('depth')) {
        metaParams.depth = notes.overrides.depth;
      }
    }
  }

  // ═══════════════════════════════════════════════════════════
  // ШАГ 3: РАСЧЁТ questions_per_type
  // ═══════════════════════════════════════════════════════════

  const questionsPerType = {
    closed: Math.floor(blueprint.total_questions * (blueprint.question_mix.closed / 100)),
    scaled: Math.floor(blueprint.total_questions * (blueprint.question_mix.scaled / 100)),
    open: Math.floor(blueprint.total_questions * (blueprint.question_mix.open / 100))
  };

  // Корректировка суммы (если не сошлось)
  const sum = questionsPerType.closed + questionsPerType.scaled + questionsPerType.open;
  if (sum < blueprint.total_questions) {
    questionsPerType.scaled += (blueprint.total_questions - sum);
  }

  // ═══════════════════════════════════════════════════════════
  // ШАГ 4: СОХРАНЕНИЕ В БД
  // ═══════════════════════════════════════════════════════════

  const finalBlueprint: SurveyBlueprint = {
    project_id: projectId,
    total_questions: blueprint.total_questions,
    estimated_duration: blueprint.estimated_duration,
    question_mix: blueprint.question_mix,
    questions_per_type: questionsPerType,
    sections: blueprint.sections,
    logic_type: blueprint.logic_type,
    conflicts,
    sources: {
      meta_params: true,
      topic_signals: !!topicContext?.topic_signals,
      standard: topicContext?.detected_standard,
      admin_notes: !!adminNotes
    },
    applied_constraints: appliedConstraints,
    immutable_fields: immutableFields,
    editable_fields: editableFields
  };

  const { data } = await supabase
    .from('survey_blueprints')
    .upsert(finalBlueprint, { onConflict: 'project_id' })
    .select()
    .single();

  return data;
}
