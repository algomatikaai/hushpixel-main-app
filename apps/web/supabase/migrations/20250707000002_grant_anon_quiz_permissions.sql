/*
 * -------------------------------------------------------
 * Grant anonymous users permission to insert quiz responses
 * Fix "permission denied for schema public" error
 * -------------------------------------------------------
 */

-- Grant INSERT permission on quiz_responses table to anonymous users
-- This allows anonymous users to submit quiz data
grant insert on table public.quiz_responses to anon;

-- Also grant USAGE on the schema to make sure anon can access it
-- (This might already be granted but let's be explicit)
grant usage on schema public to anon;

-- Grant access to extensions schema for UUID generation
-- (This is needed for the extensions.uuid_generate_v4() function)
grant usage on schema extensions to anon;