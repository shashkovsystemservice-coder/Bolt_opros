
CREATE TABLE IF NOT EXISTS contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text,
  last_name text,
  company_name text,
  email text,
  phone text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, first_name, last_name, company_name)
);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.companies
    WHERE id = auth.uid() AND is_super_admin = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE POLICY "Users can view contacts"
  ON public.contacts
  FOR SELECT
  TO authenticated
  USING (
    (user_id = auth.uid()) OR (is_super_admin())
  );

CREATE POLICY "Users can manage their own contacts"
  ON public.contacts
  FOR ALL -- Исправлено на ALL
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
  );


CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
