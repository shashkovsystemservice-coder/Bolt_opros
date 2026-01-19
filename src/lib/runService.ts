
import { supabase } from './supabase';
import { SurveyRun } from '../types/database';
import { v4 as uuidv4 } from 'uuid';

// 1. Create a new Survey Run (MODIFIED as per feedback)
export const createRun = async (payload: {
  survey_template_id: string;
  name: string;
  mode: 'public_link'; // Simplified for now
  target_n?: number;
  min_n_for_analysis?: number;
  close_at?: string;
}) => {
  // Get user and company_id directly from the session
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error(userError?.message || 'User not found');
  const companyId = user.user_metadata.company_id;
  if (!companyId) throw new Error('Company ID not found in user metadata.');

  const { data, error } = await supabase
    .from('survey_runs')
    .insert({
      ...payload,
      company_id: companyId, // Set securely
      status: 'active',
      open_at: new Date().toISOString(),
      public_token: payload.mode === 'public_link' ? uuidv4() : null,
    })
    .select()
    .single(); // IMPORTANT: ensures a single object is returned

  if (error) throw new Error(error.message);
  return data as SurveyRun;
};

// 2. List all runs for a company (no change)
export const listRuns = async (companyId: string) => {
  const { data, error } = await supabase
    .from('survey_runs')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data as SurveyRun[];
};

// 3. Get a single run by its ID (no change)
export const getRun = async (id: string) => {
  const { data, error } = await supabase
    .from('survey_runs')
    .select('*, survey_templates (*)')
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);
  return data;
};

// 4. Get a run by its public token (no change)
export const getRunByPublicToken = async (publicToken: string) => {
  const { data, error } = await supabase
    .from('survey_runs')
    .select('*, survey_templates (*)')
    .eq('public_token', publicToken)
    .single();

  if (error) throw new Error(error.message);
  return data;
};

// 5. Update a run's status (MODIFIED as per feedback)
export const updateRunStatus = async (id: string, status: 'active' | 'paused' | 'closed') => {
  const { data, error } = await supabase
    .from('survey_runs')
    .update({ status })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as SurveyRun;
};

// 6. Get statistics for a run (no change)
export const getRunStats = async (runId: string) => {
  const { count, error } = await supabase
    .from('survey_submissions')
    .select('id', { count: 'exact' })
    .eq('run_id', runId);

  if (error) {
    console.error('Error fetching run stats:', error);
    return { collected_n: 0 };
  }

  return { collected_n: count ?? 0 };
};
