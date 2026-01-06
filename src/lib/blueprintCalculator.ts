
// This file will contain the logic for transforming MetaParams into a SurveyBlueprint.

// Define types for clarity
type MetaParams = {
  time_constraint?: number; // in seconds
  mode?: 'Web_Visual' | 'Mobile_Visual' | 'Conversational_Text' | 'Conversational_Voice' | 'Face_to_Face';
  granularity?: 'Low' | 'Medium' | 'High' | 'Very_High';
  purpose?: 'Exploratory' | 'Descriptive' | 'Analytical' | 'Confirmatory' | 'Evaluative' | 'Monitoring';
  data_types?: string[];
  response_format?: 'Closed_Choice' | 'Scale' | 'Open_Text' | 'Mixed' | 'Ranking';
  scope?: 'Narrow' | 'Moderate' | 'Broad' | 'Comprehensive';
};

type SurveyBlueprint = {
  max_questions: number;
  question_mix: Record<string, number>;
  // ... other fields
};

/**
 * Rule 1: Calculate the maximum number of questions based on time, mode, and granularity.
 */
const calculateMaxQuestions = (
  time_constraint: number = 600,
  mode: MetaParams['mode'] = 'Web_Visual',
  granularity: MetaParams['granularity'] = 'Medium'
): number => {
  const base_time_per_q: Record<NonNullable<MetaParams['mode']>, number> = {
    'Web_Visual': 15,
    'Mobile_Visual': 20,
    'Conversational_Text': 25,
    'Conversational_Voice': 40,
    'Face_to_Face': 30,
  };

  const depth_multiplier: Record<NonNullable<MetaParams['granularity']>, number> = {
    'Low': 0.8,
    'Medium': 1.0,
    'High': 1.3,
    'Very_High': 1.5,
  };

  const avg_time = (base_time_per_q[mode] || 20) * (depth_multiplier[granularity] || 1.0);
  const usable_time = time_constraint * 0.85; // 15% buffer for intro/outro
  
  if (avg_time === 0) return 0;

  return Math.floor(usable_time / avg_time);
};

/**
 * Rule 2: Determine the mix of question types (closed, scaled, open).
 */
const determineQuestionMix = (
    purpose: MetaParams['purpose'] = 'Descriptive',
    data_types: MetaParams['data_types'] = [],
    response_format: MetaParams['response_format'] = 'Mixed'
): Record<string, number> => {
    let mix = { closed: 0, scaled: 0, open: 0, ranking: 0 };

    const base_mix: Record<NonNullable<MetaParams['purpose']>, typeof mix> = {
        'Exploratory': { closed: 20, scaled: 20, open: 60, ranking: 0 },
        'Descriptive': { closed: 30, scaled: 60, open: 10, ranking: 0 },
        'Analytical': { closed: 40, scaled: 30, open: 30, ranking: 0 },
        'Confirmatory': { closed: 50, scaled: 40, open: 10, ranking: 0 },
        'Evaluative': { closed: 30, scaled: 60, open: 10, ranking: 0 },
        'Monitoring': { closed: 30, scaled: 60, open: 10, ranking: 0 },
    };

    mix = { ...(base_mix[purpose] || base_mix['Descriptive']) };

    if (data_types.includes('Causes') || data_types.includes('Experiences')) {
        mix.open += 20;
        mix.closed = Math.max(0, mix.closed - 10);
        mix.scaled = Math.max(0, mix.scaled - 10);
    }

    // ... more rules would go here ...

    // Normalize to 100%
    const total = Object.values(mix).reduce((a, b) => a + b, 0);
    if (total === 0) return { closed: 100, scaled: 0, open: 0, ranking: 0 };

    return {
        closed: Math.round((mix.closed / total) * 100),
        scaled: Math.round((mix.scaled / total) * 100),
        open: Math.round((mix.open / total) * 100),
        ranking: Math.round((mix.ranking / total) * 100),
    };
}

/**
 * Main function to calculate the full survey blueprint.
 */
export const calculateBlueprint = (params: MetaParams): SurveyBlueprint => {
  const max_questions = calculateMaxQuestions(
    params.time_constraint,
    params.mode,
    params.granularity
  );

  const question_mix = determineQuestionMix(
      params.purpose,
      params.data_types,
      params.response_format
  );

  // TODO: Add logic for calculating sections, logic, tone, etc.

  return {
    max_questions,
    question_mix,
    sections: [], // Placeholder
  };
};
