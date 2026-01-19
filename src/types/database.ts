
export interface Company {
  id: string;
  name: string;
  created_at: string;
}

export interface SystemSettings {
  id: string;
  setting_name: string;
  setting_value: string;
}

export interface SurveyTemplate {
  id: string;
  company_id: string;
  title: string;
  description: string | null;
  survey_basis: string | null;
  unique_code: string;
  is_active: boolean;
  is_ai_generated: boolean;
  is_interactive: boolean;
  ai_generation_topic: string | null;
  created_at: string;
  updated_at: string;
  completion_settings: {
      thank_you_message: string;
  } | null;
}

// UPDATED: Definition for a Survey Run to match the actual DB schema
export interface SurveyRun {
  id: string;
  survey_template_id: string;
  company_id: string;
  name: string; // User-friendly name for the run
  mode: 'public_link' | 'private_list' | 'mixed';
  status: 'draft' | 'active' | 'paused' | 'closed';
  target_n: number | null;
  min_n_for_analysis: number | null;
  open_at: string | null;
  close_at: string | null;
  public_token: string | null; // For public_link mode
  created_at: string;
  updated_at: string;
}

export type RatingOptions = {
    scale_max: 3 | 5 | 10;
    label_min: string;
    label_max: string;
}

export interface QuestionTemplate {
  id: string;
  survey_template_id: string;
  question_text: string;
  question_type: 'text' | 'number' | 'email' | 'rating' | 'choice' | 'multi_choice';
  is_required: boolean;
  question_order: number;
  options: string[] | RatingOptions | null;
}

export interface Contact {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
}

export interface SurveyRecipient {
  id: string;
  run_id: string | null; // Link to a specific run
  survey_template_id: string;
  company_id: string;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  contact_person: string | null;
  additional_info: string | null;
  recipient_code: string;
  sent_at: string | null;
  sent_via: string | null;
  opened_at: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface SurveySubmission {
  id: string;
  survey_template_id: string;
  run_id: string | null; // Link to a specific run
  recipient_id: string | null;
  respondent_email: string;
  survey_title: string;
  survey_description: string | null;
  submitted_at: string;
}

export interface SubmissionAnswer {
  id: string;
  submission_id: string;
  run_id: string | null; // Link to a specific run
  question_template_id: string | null;
  question_text: string;
  answer_text: string | null;
  answer_number: number | null;
}
