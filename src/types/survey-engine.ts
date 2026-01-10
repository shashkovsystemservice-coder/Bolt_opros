export interface SurveyMetaParams {
  purpose: string;
  depth: number;
  mode: string;
  target_audience: string;
  time_constraint: number;
  knowledge_type: string[];
  structure: string;
  response_format: string;
  sensitivity: string;
  tone: string;
  scope?: string;
  granularity?: string;
  temporality?: string;
  standardization?: number;
  use_validated_scale?: string;
}

export interface TopicSignals {
  sensitivity: 'low' | 'medium' | 'high';
  domain_complexity: 'low' | 'medium' | 'high';
  methodological_affinity?: string;
  allowed_formats: string[];
  disallowed_formats: string[];
  mandatory_sections?: string[];
  default_depth_bias?: string;
}

export interface QuestionMix {
  closed: number;
  scaled: number;
  open: number;
  ranking?: number;
  numeric?: number;
}

export interface QuestionsPerType {
  closed: number;
  scaled: number;
  open: number;
  ranking?: number;
  numeric?: number;
}

export interface SurveyBlueprint {
  id?: string;
  project_id: string;
  total_questions: number;
  estimated_duration: number;
  question_mix: QuestionMix;
  questions_per_type: QuestionsPerType;
  sections: any[];
  logic_type: string;
  style_config?: any;
  conflicts?: any[];
  warnings?: any[];
  sources?: {
    meta_params: boolean;
    topic_signals: boolean;
    standard?: string;
    admin_notes: boolean;
  };
  applied_constraints?: any[];
  conflict_resolutions?: any[];
  immutable_fields?: string[];
  editable_fields?: string[];
}

export interface Conflict {
  type: 'Block' | 'Transform' | 'Warn';
  source: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  suggested_resolution?: string;
}
