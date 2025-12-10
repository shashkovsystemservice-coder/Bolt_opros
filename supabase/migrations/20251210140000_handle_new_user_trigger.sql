-- Function to create a company profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert a new row into the public.companies table, taking company_name from metadata
  INSERT INTO public.companies (id, company_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'company_name');
  RETURN NEW;
END;
$$;

-- Drop the trigger if it exists, then create it
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();
