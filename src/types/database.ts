export interface Company {
  id: string;
  name: string;
  created_at: string;
}

export interface SurveyTemplate {
  id: string;
  company_id: string;
  title: string;
  description: string | null;
  unique_code: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface QuestionTemplate {
  id: string;
  survey_template_id: string;
  question_text: string;
  question_type: 'text' | 'number' | 'email' | 'rating' | 'choice';
  is_required: boolean;
  question_order: number;
  choice_options: string[] | null;
}

export interface SurveyRecipient {
  id: string;
  survey_template_id: string;
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
}

export interface SurveySubmission {
  id: string;
  survey_template_id: string;
  recipient_id: string | null;
  respondent_email: string;
  survey_title: string;
  survey_description: string | null;
  submitted_at: string;
}

export interface SubmissionAnswer {
  id: string;
  submission_id: string;
  question_template_id: string | null;
  question_text: string;
  answer_text: string | null;
  answer_number: number | null;
}
