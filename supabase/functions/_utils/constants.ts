function getEnv(key: string): string {
  const value = Deno.env.get(key);
  if (!value) {
    throw new Error(`FATAL: Environment variable "${key}" is not set!`);
  }
  return value;
}

export const GOOGLE_GEMINI_API_KEY = getEnv("GOOGLE_GEMINI_API_KEY");
export const SUPABASE_URL = getEnv("SUPABASE_URL");
export const SUPABASE_ANON_KEY = getEnv("SUPABASE_ANON_KEY");
export const SUPABASE_SERVICE_ROLE_KEY = getEnv("SUPABASE_SERVICE_ROLE_KEY");
