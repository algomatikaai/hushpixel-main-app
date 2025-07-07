/*
 * -------------------------------------------------------
 * Fix RLS permission error for quiz_responses table
 * Remove auth.users table access that causes permission denied error
 * -------------------------------------------------------
 */

-- Drop the problematic policy that tries to access auth.users table
drop policy if exists "users_read_own_quiz_responses" on public.quiz_responses;

-- Create new policy that avoids auth.users table access
create policy "users_read_own_quiz_responses" on public.quiz_responses
  for select
  to authenticated
  using (
    -- Users can read quiz responses where they are the user_id
    user_id = auth.uid()
    -- Note: Removed email check that accessed auth.users table
    -- Email matching will be handled at application level if needed
  );

-- Ensure anonymous users can still insert quiz responses  
-- (this policy should already exist but let's make sure)
drop policy if exists "anonymous_insert_quiz_responses" on public.quiz_responses;
create policy "anonymous_insert_quiz_responses" on public.quiz_responses
  for insert
  to anon
  with check (true); -- Allow all anonymous insertions

-- Ensure authenticated users can insert quiz responses
drop policy if exists "users_insert_quiz_responses" on public.quiz_responses;
create policy "users_insert_quiz_responses" on public.quiz_responses
  for insert
  to authenticated
  with check (true); -- Allow all authenticated insertions