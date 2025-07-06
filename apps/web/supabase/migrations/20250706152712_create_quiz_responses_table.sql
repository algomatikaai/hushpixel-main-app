/*
 * -------------------------------------------------------
 * Section: Quiz Responses
 * Store quiz completion data from the funnel
 * -------------------------------------------------------
 */

-- Create quiz responses table
create table if not exists
  public.quiz_responses (
    id uuid unique not null default extensions.uuid_generate_v4(),
    user_id uuid references public.accounts(id) on delete cascade,
    email varchar(320) not null,
    character_type varchar(100) not null,
    body_type varchar(100) not null,
    personality varchar(100),
    scene varchar(100),
    session_id varchar(255),
    ip_address inet,
    user_agent text,
    source varchar(100) default 'quiz',
    completed_at timestamp with time zone default current_timestamp not null,
    created_at timestamp with time zone default current_timestamp not null,
    primary key (id)
  );

comment on table public.quiz_responses is 'Store quiz completion data from the funnel';
comment on column public.quiz_responses.user_id is 'Associated user account (nullable for anonymous completions)';
comment on column public.quiz_responses.email is 'Email captured from quiz';
comment on column public.quiz_responses.character_type is 'Selected character type';
comment on column public.quiz_responses.body_type is 'Selected body type';
comment on column public.quiz_responses.personality is 'Selected personality type';
comment on column public.quiz_responses.scene is 'Selected scene preference';
comment on column public.quiz_responses.session_id is 'Session identifier for tracking';
comment on column public.quiz_responses.source is 'Source of the quiz completion';

-- Enable RLS on the quiz_responses table
alter table public.quiz_responses enable row level security;

-- Create indexes for performance
create index if not exists ix_quiz_responses_user_id on public.quiz_responses (user_id);
create index if not exists ix_quiz_responses_email on public.quiz_responses (email);
create index if not exists ix_quiz_responses_completed_at on public.quiz_responses (completed_at desc);
create index if not exists ix_quiz_responses_session_id on public.quiz_responses (session_id);

-- Revoke all permissions and grant specific ones
revoke all on public.quiz_responses from authenticated, service_role;
grant select, insert, update on table public.quiz_responses to authenticated, service_role;

-- RLS Policies

-- Users can read their own quiz responses
create policy "users_read_own_quiz_responses" on public.quiz_responses
  for select
  to authenticated
  using (
    user_id = (select auth.uid()) or
    email = (select email from auth.users where id = auth.uid())
  );

-- Users can insert quiz responses (for authenticated users)
create policy "users_insert_quiz_responses" on public.quiz_responses
  for insert
  to authenticated
  with check (true); -- Allow all authenticated users to insert

-- Service role can manage all quiz responses (for bridge authentication)
create policy "service_role_all_access" on public.quiz_responses
  for all
  to service_role
  using (true)
  with check (true);

-- Anonymous users can insert quiz responses (for funnel)
create policy "anonymous_insert_quiz_responses" on public.quiz_responses
  for insert
  to anon
  with check (true);