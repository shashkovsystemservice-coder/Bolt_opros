
-- Add new columns to meta_prompts table
ALTER TABLE public.meta_prompts
ADD COLUMN generation_mode TEXT NOT NULL DEFAULT 'survey',
ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN version INT DEFAULT 1,
ADD COLUMN notes TEXT;

-- Add a unique index to ensure only one prompt can be active for a given generation_mode.
-- This is a key part of the logic to prevent conflicts.
CREATE UNIQUE INDEX one_active_prompt_per_mode_idx
ON public.meta_prompts(generation_mode)
WHERE is_active = true;

-- Create an RPC function to handle activating a prompt atomically.
-- This is better than running two separate queries from the client.
CREATE OR REPLACE FUNCTION set_active_meta_prompt(p_id BIGINT, p_mode TEXT)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- First, deactivate any currently active prompt for the given mode
  UPDATE public.meta_prompts
  SET is_active = false
  WHERE generation_mode = p_mode
    AND is_active = true;

  -- Then, activate the new prompt
  UPDATE public.meta_prompts
  SET is_active = true
  WHERE id = p_id;
END;
$$;
