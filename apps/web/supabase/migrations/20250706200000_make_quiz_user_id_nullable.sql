/*
 * -------------------------------------------------------
 * Make user_id nullable in quiz_responses table
 * This allows saving quiz responses before user creation
 * -------------------------------------------------------
 */

-- Make user_id nullable to allow quiz responses without users
ALTER TABLE quiz_responses ALTER COLUMN user_id DROP NOT NULL;

-- Add index for efficient email lookups where user_id is null
CREATE INDEX IF NOT EXISTS idx_quiz_responses_email_null_user 
ON quiz_responses (email) WHERE user_id IS NULL;

-- Add index for linking quiz responses to users later
CREATE INDEX IF NOT EXISTS idx_quiz_responses_user_id_null 
ON quiz_responses (user_id) WHERE user_id IS NULL;