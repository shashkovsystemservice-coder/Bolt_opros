/*
  # Создание системы опросов Survey Pro

  ## Создаваемые таблицы
  
  1. **companies** - Компании (пользователи системы)
     - `id` (uuid, PK) - ID компании (совпадает с auth.users.id)
     - `name` (text) - Название компании
     - `created_at` (timestamptz) - Дата регистрации
  
  2. **survey_templates** - Шаблоны опросов
     - `id` (uuid, PK) - ID опроса
     - `company_id` (uuid, FK) - ID компании-владельца
     - `title` (text) - Название опроса
     - `description` (text) - Описание опроса
     - `unique_code` (text, unique) - Уникальный код для общего доступа
     - `is_active` (boolean) - Активен ли опрос
     - `created_at` (timestamptz) - Дата создания
     - `updated_at` (timestamptz) - Дата обновления
  
  3. **question_templates** - Вопросы в опросах
     - `id` (uuid, PK) - ID вопроса
     - `survey_template_id` (uuid, FK) - ID опроса
     - `question_text` (text) - Текст вопроса
     - `question_type` (text) - Тип вопроса (text/number/email/rating/choice)
     - `is_required` (boolean) - Обязательный ли вопрос
     - `question_order` (integer) - Порядковый номер
     - `choice_options` (jsonb) - Варианты ответа для типа choice
  
  4. **survey_recipients** - Получатели опросов
     - `id` (uuid, PK) - ID получателя
     - `survey_template_id` (uuid, FK) - ID опроса
     - `company_name` (text) - Название компании получателя
     - `email` (text) - Email получателя
     - `phone` (text) - Телефон получателя
     - `contact_person` (text) - Контактное лицо
     - `additional_info` (text) - Дополнительная информация
     - `recipient_code` (text, unique) - Уникальный код получателя
     - `sent_at` (timestamptz) - Дата отправки
     - `sent_via` (text) - Способ отправки (email/whatsapp/manual)
     - `opened_at` (timestamptz) - Дата открытия
     - `submitted_at` (timestamptz) - Дата заполнения
     - `created_at` (timestamptz) - Дата создания
  
  5. **survey_submissions** - Заполненные опросы
     - `id` (uuid, PK) - ID заполнения
     - `survey_template_id` (uuid, FK) - ID опроса
     - `recipient_id` (uuid, FK) - ID получателя (может быть null)
     - `respondent_email` (text) - Email респондента
     - `survey_title` (text) - Название опроса (снимок)
     - `survey_description` (text) - Описание опроса (снимок)
     - `submitted_at` (timestamptz) - Дата заполнения
  
  6. **submission_answers** - Ответы на вопросы
     - `id` (uuid, PK) - ID ответа
     - `submission_id` (uuid, FK) - ID заполнения
     - `question_template_id` (uuid, FK) - ID вопроса (может быть null)
     - `question_text` (text) - Текст вопроса (снимок)
     - `answer_text` (text) - Текстовый ответ
     - `answer_number` (numeric) - Числовой ответ

  ## Безопасность
  - RLS включен на всех таблицах
  - Компании видят только свои данные
  - Опросы доступны публично по коду для заполнения
  - Ответы видны только владельцам опросов
*/

-- Создание таблицы companies
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company"
  ON companies FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own company"
  ON companies FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own company"
  ON companies FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Создание таблицы survey_templates
CREATE TABLE IF NOT EXISTS survey_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  unique_code text UNIQUE NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE survey_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Companies can view own surveys"
  ON survey_templates FOR SELECT
  TO authenticated
  USING (company_id = auth.uid());

CREATE POLICY "Companies can insert own surveys"
  ON survey_templates FOR INSERT
  TO authenticated
  WITH CHECK (company_id = auth.uid());

CREATE POLICY "Companies can update own surveys"
  ON survey_templates FOR UPDATE
  TO authenticated
  USING (company_id = auth.uid())
  WITH CHECK (company_id = auth.uid());

CREATE POLICY "Companies can delete own surveys"
  ON survey_templates FOR DELETE
  TO authenticated
  USING (company_id = auth.uid());

CREATE POLICY "Public can view active surveys by code"
  ON survey_templates FOR SELECT
  TO anon
  USING (is_active = true);

-- Создание таблицы question_templates
CREATE TABLE IF NOT EXISTS question_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_template_id uuid NOT NULL REFERENCES survey_templates(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  question_type text NOT NULL CHECK (question_type IN ('text', 'number', 'email', 'rating', 'choice')),
  is_required boolean DEFAULT false,
  question_order integer NOT NULL DEFAULT 0,
  choice_options jsonb
);

ALTER TABLE question_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Companies can view questions of own surveys"
  ON question_templates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM survey_templates
      WHERE survey_templates.id = question_templates.survey_template_id
      AND survey_templates.company_id = auth.uid()
    )
  );

CREATE POLICY "Companies can insert questions to own surveys"
  ON question_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM survey_templates
      WHERE survey_templates.id = question_templates.survey_template_id
      AND survey_templates.company_id = auth.uid()
    )
  );

CREATE POLICY "Companies can update questions of own surveys"
  ON question_templates FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM survey_templates
      WHERE survey_templates.id = question_templates.survey_template_id
      AND survey_templates.company_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM survey_templates
      WHERE survey_templates.id = question_templates.survey_template_id
      AND survey_templates.company_id = auth.uid()
    )
  );

CREATE POLICY "Companies can delete questions of own surveys"
  ON question_templates FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM survey_templates
      WHERE survey_templates.id = question_templates.survey_template_id
      AND survey_templates.company_id = auth.uid()
    )
  );

CREATE POLICY "Public can view questions of active surveys"
  ON question_templates FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM survey_templates
      WHERE survey_templates.id = question_templates.survey_template_id
      AND survey_templates.is_active = true
    )
  );

-- Создание таблицы survey_recipients
CREATE TABLE IF NOT EXISTS survey_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_template_id uuid NOT NULL REFERENCES survey_templates(id) ON DELETE CASCADE,
  company_name text,
  email text,
  phone text,
  contact_person text,
  additional_info text,
  recipient_code text UNIQUE NOT NULL,
  sent_at timestamptz,
  sent_via text,
  opened_at timestamptz,
  submitted_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE survey_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Companies can view recipients of own surveys"
  ON survey_recipients FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM survey_templates
      WHERE survey_templates.id = survey_recipients.survey_template_id
      AND survey_templates.company_id = auth.uid()
    )
  );

CREATE POLICY "Companies can insert recipients to own surveys"
  ON survey_recipients FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM survey_templates
      WHERE survey_templates.id = survey_recipients.survey_template_id
      AND survey_templates.company_id = auth.uid()
    )
  );

CREATE POLICY "Companies can update recipients of own surveys"
  ON survey_recipients FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM survey_templates
      WHERE survey_templates.id = survey_recipients.survey_template_id
      AND survey_templates.company_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM survey_templates
      WHERE survey_templates.id = survey_recipients.survey_template_id
      AND survey_templates.company_id = auth.uid()
    )
  );

CREATE POLICY "Companies can delete recipients of own surveys"
  ON survey_recipients FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM survey_templates
      WHERE survey_templates.id = survey_recipients.survey_template_id
      AND survey_templates.company_id = auth.uid()
    )
  );

CREATE POLICY "Public can view recipients by code"
  ON survey_recipients FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Public can update recipient tracking"
  ON survey_recipients FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Создание таблицы survey_submissions
CREATE TABLE IF NOT EXISTS survey_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_template_id uuid NOT NULL REFERENCES survey_templates(id) ON DELETE CASCADE,
  recipient_id uuid REFERENCES survey_recipients(id) ON DELETE SET NULL,
  respondent_email text NOT NULL,
  survey_title text NOT NULL,
  survey_description text,
  submitted_at timestamptz DEFAULT now()
);

ALTER TABLE survey_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Companies can view submissions of own surveys"
  ON survey_submissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM survey_templates
      WHERE survey_templates.id = survey_submissions.survey_template_id
      AND survey_templates.company_id = auth.uid()
    )
  );

CREATE POLICY "Public can insert submissions"
  ON survey_submissions FOR INSERT
  TO anon
  WITH CHECK (true);

-- Создание таблицы submission_answers
CREATE TABLE IF NOT EXISTS submission_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES survey_submissions(id) ON DELETE CASCADE,
  question_template_id uuid REFERENCES question_templates(id) ON DELETE SET NULL,
  question_text text NOT NULL,
  answer_text text,
  answer_number numeric
);

ALTER TABLE submission_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Companies can view answers of own survey submissions"
  ON submission_answers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM survey_submissions
      JOIN survey_templates ON survey_templates.id = survey_submissions.survey_template_id
      WHERE survey_submissions.id = submission_answers.submission_id
      AND survey_templates.company_id = auth.uid()
    )
  );

CREATE POLICY "Public can insert answers"
  ON submission_answers FOR INSERT
  TO anon
  WITH CHECK (true);

-- Создание индексов для производительности
CREATE INDEX IF NOT EXISTS idx_survey_templates_company_id ON survey_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_survey_templates_unique_code ON survey_templates(unique_code);
CREATE INDEX IF NOT EXISTS idx_question_templates_survey_id ON question_templates(survey_template_id);
CREATE INDEX IF NOT EXISTS idx_survey_recipients_survey_id ON survey_recipients(survey_template_id);
CREATE INDEX IF NOT EXISTS idx_survey_recipients_code ON survey_recipients(recipient_code);
CREATE INDEX IF NOT EXISTS idx_survey_submissions_survey_id ON survey_submissions(survey_template_id);
CREATE INDEX IF NOT EXISTS idx_submission_answers_submission_id ON submission_answers(submission_id);
