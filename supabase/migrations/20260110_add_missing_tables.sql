-- 1. pending_standards (для новых стандартов, которых нет в базе)
CREATE TABLE IF NOT EXISTS pending_standards (
  id BIGSERIAL PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  generated_blueprint JSONB NOT NULL,
  generated_constraints JSONB,
  detected_confidence NUMERIC,
  first_detected_at TIMESTAMPTZ DEFAULT NOW(),
  usage_count INTEGER DEFAULT 1,
  used_by_companies UUID[] DEFAULT ARRAY[]::UUID[],
  status TEXT DEFAULT 'pending',
  reviewed_by UUID REFERENCES companies(id),
  reviewed_at TIMESTAMPTZ,
  superadmin_notes TEXT,
  modified_blueprint JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pending_standards_status ON pending_standards(status);
CREATE INDEX IF NOT EXISTS idx_pending_standards_code ON pending_standards(code);

-- 2. admin_notes (свободный текст админа)
CREATE TABLE IF NOT EXISTS admin_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES survey_templates(id) ON DELETE CASCADE,
  raw_notes TEXT,
  parsed_notes JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_admin_notes_project ON admin_notes(project_id);

-- 3. standard_templates (готовые шаблоны: NPS, CSAT, SUS, 8D, SWOT)
CREATE TABLE IF NOT EXISTS standard_templates (
  id BIGSERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  canonical_blueprint JSONB NOT NULL,
  hard_constraints JSONB,
  soft_constraints JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Заполнение standard_templates базовыми шаблонами
INSERT INTO standard_templates (code, name, category, canonical_blueprint, hard_constraints) VALUES
('NPS', 'Net Promoter Score', 'customer_experience', 
 '''{"total_questions": 2, "sections": [{"section_id": 1, "questions": [{"type": "scaled", "scale": {"min": 0, "max": 10}}, {"type": "open"}]}]}''',
 '''{"immutable_fields": ["total_questions", "question_types"], "min_questions": 2, "max_questions": 3}''')
ON CONFLICT (code) DO NOTHING;

INSERT INTO standard_templates (code, name, category, canonical_blueprint, hard_constraints) VALUES
('CSAT', 'Customer Satisfaction Score', 'customer_experience',
 '''{"total_questions": 1, "sections": [{"section_id": 1, "questions": [{"type": "scaled", "scale": {"min": 1, "max": 5}}]}]}''',
 '''{"immutable_fields": ["total_questions"], "min_questions": 1, "max_questions": 1}''')
ON CONFLICT (code) DO NOTHING;

-- 4. Расширение topic_context (добавить topic_signals)
ALTER TABLE topic_context 
ADD COLUMN IF NOT EXISTS topic_signals JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS detected_standard TEXT,
ADD COLUMN IF NOT EXISTS standard_confidence NUMERIC;

-- 5. Расширение survey_blueprints (добавить источники и конфликты)
ALTER TABLE survey_blueprints
ADD COLUMN IF NOT EXISTS sources JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS applied_constraints JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS conflict_resolutions JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS immutable_fields TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS editable_fields TEXT[] DEFAULT '{}';
