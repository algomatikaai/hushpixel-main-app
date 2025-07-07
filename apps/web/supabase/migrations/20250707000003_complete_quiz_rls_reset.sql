/*
 * -------------------------------------------------------
 * Complete RLS and Permission Reset for quiz_responses
 * Clean slate approach to fix persistent RLS violations
 * -------------------------------------------------------
 */

-- Drop ALL existing RLS policies on quiz_responses table to start fresh
DROP POLICY IF EXISTS "anonymous_insert_quiz_responses" ON public.quiz_responses;
DROP POLICY IF EXISTS "users_insert_quiz_responses" ON public.quiz_responses;  
DROP POLICY IF EXISTS "users_read_own_quiz_responses" ON public.quiz_responses;
DROP POLICY IF EXISTS "service_role_all_access" ON public.quiz_responses;
DROP POLICY IF EXISTS "allow_all_quiz_inserts" ON public.quiz_responses;

-- Revoke ALL permissions and start fresh
REVOKE ALL ON public.quiz_responses FROM anon, authenticated, service_role;

-- Grant explicit permissions
GRANT INSERT ON public.quiz_responses TO anon, authenticated;
GRANT SELECT, UPDATE ON public.quiz_responses TO authenticated, service_role;
GRANT ALL ON public.quiz_responses TO service_role;

-- Create single, simple policy for quiz inserts (no conflicts)
CREATE POLICY "allow_all_quiz_inserts" ON public.quiz_responses
  FOR INSERT 
  TO anon, authenticated
  WITH CHECK (true); -- Allow all inserts regardless of user context

-- Create simple read policy for authenticated users
CREATE POLICY "users_read_own_quiz_responses" ON public.quiz_responses
  FOR SELECT
  TO authenticated
  using (user_id = auth.uid());

-- Service role has all access (bypasses RLS anyway)
CREATE POLICY "service_role_all_access" ON public.quiz_responses
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Ensure RLS is enabled
ALTER TABLE public.quiz_responses ENABLE ROW LEVEL SECURITY;