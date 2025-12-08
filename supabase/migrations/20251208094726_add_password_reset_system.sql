/*
  # Password Reset System

  1. New Tables
    - `password_resets`
      - `id` (uuid, primary key) - Unique identifier for reset request
      - `user_id` (uuid) - User requesting password reset
      - `email` (text) - User's email address
      - `reset_token` (uuid) - Unique token for password reset
      - `expires_at` (timestamptz) - Token expiration time
      - `used_at` (timestamptz, nullable) - When token was used
      - `created_at` (timestamptz) - When reset was requested

  2. Security
    - Enable RLS on `password_resets` table
    - Add policies for service role access only
    - Add index on reset_token for fast lookups
    - Add index on expires_at for cleanup

  3. Functions
    - Auto-cleanup expired tokens (older than 24 hours)
*/

-- Create password_resets table
CREATE TABLE IF NOT EXISTS password_resets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text NOT NULL,
  reset_token uuid NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE password_resets ENABLE ROW LEVEL SECURITY;

-- Only service role can access this table (for security)
CREATE POLICY "Service role can manage password resets"
  ON password_resets
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(reset_token);
CREATE INDEX IF NOT EXISTS idx_password_resets_expires ON password_resets(expires_at);
CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets(user_id);

-- Function to cleanup old reset tokens
CREATE OR REPLACE FUNCTION cleanup_expired_password_resets()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM password_resets
  WHERE expires_at < now() - interval '24 hours';
END;
$$;

-- Comment on table
COMMENT ON TABLE password_resets IS 'Stores password reset tokens with expiration';
