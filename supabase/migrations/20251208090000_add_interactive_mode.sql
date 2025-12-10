ALTER TABLE public.survey_templates
ADD COLUMN is_interactive boolean DEFAULT false;

-- No policies needed for the column itself, as it's covered by table-level security.
-- It will be readable/writable by anyone who can read/write the survey template.
