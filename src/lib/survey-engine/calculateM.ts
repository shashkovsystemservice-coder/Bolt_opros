import { SurveyMetaParams, QuestionMix } from '../../types/survey-engine';

export async function calculateM(
  supabase: any,
  metaParams: SurveyMetaParams
): Promise<QuestionMix> {
  // 1. Получить base mix по purpose
  const { data: baseMixData } = await supabase
    .from('formula_lookup_tables')
    .select('value')
    .eq('table_name', 'basemix')
    .eq('key1', metaParams.purpose)
    .single();

  let mix = baseMixData?.value || { closed: 30, scaled: 60, open: 10, numeric: 0 };

  // 2. Корректировки по knowledge_type
  if (metaParams.knowledge_type.includes('causes') || metaParams.knowledge_type.includes('experiences')) {
    mix.open += 20;
    mix.closed -= 10;
    mix.scaled -= 10;
  }
  if (metaParams.knowledge_type.includes('facts')) {
    mix.closed += 15;
    mix.open -= 15;
  }

  // 3. Корректировки по response_format
  if (metaParams.response_format === 'scale') {
    mix = { closed: 10, scaled: 80, open: 10, numeric: 0 };
  } else if (metaParams.response_format === 'text') {
    mix = { closed: 0, scaled: 0, open: 100, numeric: 0 };
  } else if (metaParams.response_format === 'choice') {
    mix = { closed: 90, scaled: 0, open: 10, numeric: 0 };
  }

  // 4. Нормализация до 100%
  const total = mix.closed + mix.scaled + mix.open + (mix.numeric || 0);
  return {
    closed: Math.round((mix.closed / total) * 100),
    scaled: Math.round((mix.scaled / total) * 100),
    open: Math.round((mix.open / total) * 100),
    numeric: Math.round(((mix.numeric || 0) / total) * 100)
  };
}
