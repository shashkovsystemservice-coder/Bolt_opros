import { SurveyMetaParams } from '../../types/survey-engine';

export async function calculateN(
  supabase: any,
  metaParams: SurveyMetaParams
): Promise<number> {
  // 1. Получить N_base из lookup table
  const { data: nbaseData } = await supabase
    .from('formula_lookup_tables')
    .select('value')
    .eq('table_name', 'nbase')
    .eq('key1', metaParams.purpose)
    .eq('key2', metaParams.knowledge_type || 'attitudes')
    .single();

  const Nbase = parseInt(nbaseData?.value || '10');
  const Ntheoretical = Math.ceil(Nbase * metaParams.depth);

  // 2. Получить time constraint
  const { data: modeTimeData } = await supabase
    .from('formula_lookup_tables')
    .select('value')
    .eq('table_name', 'modetime')
    .eq('key1', metaParams.mode)
    .single();

  const baseTime = parseInt(modeTimeData?.value || '15');
  const depthCoeff = metaParams.depth >= 2 ? 1.3 : metaParams.depth >= 1 ? 1.0 : 0.8;
  const avgTime = baseTime * depthCoeff;

  const Nmaxbytime = Math.floor((metaParams.time_constraint * 0.85) / avgTime);

  // 3. Вернуть минимум (но не больше 50)
  return Math.min(Ntheoretical, Nmaxbytime, 50);
}
