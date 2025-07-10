/*
 * -------------------------------------------------------
 * Section: Generations
 * AI image generations and user content for HushPixel
 * -------------------------------------------------------
 */

-- Create generations table
create table if not exists
  public.generations (
    id uuid unique not null default extensions.uuid_generate_v4(),
    user_id uuid references public.accounts(id) on delete cascade not null,
    prompt text not null,
    image_url text not null,
    character_name varchar(100) not null,
    is_first_generation boolean default false not null,
    quality varchar(20) default 'standard' not null check (quality in ('standard', 'hd')),
    processing_time integer, -- in milliseconds
    metadata jsonb default '{}'::jsonb not null,
    created_at timestamp with time zone default current_timestamp not null,
    updated_at timestamp with time zone default current_timestamp not null,
    primary key (id)
  );

comment on table public.generations is 'AI image generations created by users';
comment on column public.generations.user_id is 'The account ID of the user who created this generation';
comment on column public.generations.prompt is 'The text prompt used for generation';
comment on column public.generations.image_url is 'URL to the generated image';
comment on column public.generations.character_name is 'Generated character name';
comment on column public.generations.is_first_generation is 'Whether this was the users first generation (higher quality)';
comment on column public.generations.quality is 'Generation quality level';
comment on column public.generations.processing_time is 'Time taken to generate in milliseconds';
comment on column public.generations.metadata is 'Additional metadata from the AI service';

-- Enable RLS on the generations table
alter table public.generations enable row level security;

-- Create indexes for performance
create index if not exists ix_generations_user_id on public.generations (user_id);
create index if not exists ix_generations_created_at on public.generations (created_at desc);
create index if not exists ix_generations_character_name on public.generations (character_name);

-- Revoke all permissions and grant specific ones
revoke all on public.generations from authenticated, service_role;
grant select, insert, update, delete on table public.generations to authenticated, service_role;

-- RLS Policies

-- Users can read their own generations
create policy "users_read_own_generations" on public.generations
  for select
  to authenticated
  using (
    user_id = (select auth.uid()) or
    exists (
      select 1 from public.accounts
      where id = user_id 
      and primary_owner_user_id = auth.uid()
    )
  );

-- Users can insert their own generations
create policy "users_insert_own_generations" on public.generations
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid()) or
    exists (
      select 1 from public.accounts
      where id = user_id 
      and primary_owner_user_id = auth.uid()
    )
  );

-- Users can update their own generations (for favorites, etc.)
create policy "users_update_own_generations" on public.generations
  for update
  to authenticated
  using (
    user_id = (select auth.uid()) or
    exists (
      select 1 from public.accounts
      where id = user_id 
      and primary_owner_user_id = auth.uid()
    )
  )
  with check (
    user_id = (select auth.uid()) or
    exists (
      select 1 from public.accounts
      where id = user_id 
      and primary_owner_user_id = auth.uid()
    )
  );

-- Users can delete their own generations
create policy "users_delete_own_generations" on public.generations
  for delete
  to authenticated
  using (
    user_id = (select auth.uid()) or
    exists (
      select 1 from public.accounts
      where id = user_id 
      and primary_owner_user_id = auth.uid()
    )
  );

-- Create a view for user generations with account info
create or replace view public.user_generations_view
with (security_invoker=true) as
select 
  g.id,
  g.user_id,
  g.prompt,
  g.image_url,
  g.character_name,
  g.is_first_generation,
  g.quality,
  g.processing_time,
  g.metadata,
  g.created_at,
  g.updated_at,
  a.name as account_name,
  a.email as account_email
from public.generations g
join public.accounts a on a.id = g.user_id;

-- Grant access to the view
grant select on public.user_generations_view to authenticated, service_role;

-- Function to get user generation count
create or replace function public.get_user_generation_count(target_user_id uuid)
returns integer
language sql
security definer
set search_path = ''
as $$
  select count(*)::integer
  from public.generations
  where user_id = target_user_id;
$$;

grant execute on function public.get_user_generation_count(uuid) to authenticated, service_role;

-- Function to check if user can generate (based on limits)
create or replace function public.can_user_generate(target_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  generation_count integer;
  has_subscription boolean;
  free_limit integer := 1;
begin
  -- Get generation count
  select public.get_user_generation_count(target_user_id) into generation_count;
  
  -- Check for active subscription
  select exists(
    select 1 from public.subscriptions
    where account_id = target_user_id
    and status = 'active'
  ) into has_subscription;
  
  -- If user has subscription, they can generate unlimited
  if has_subscription then
    return true;
  end if;
  
  -- If no subscription, check free limit
  return generation_count < free_limit;
end;
$$;

grant execute on function public.can_user_generate(uuid) to authenticated, service_role;

/*
 * -------------------------------------------------------
 * Section: Quiz Responses
 * Quiz responses and lead capture for HushPixel
 * -------------------------------------------------------
 */

-- Create quiz_responses table for lead capture
create table if not exists
  public.quiz_responses (
    id uuid unique not null default extensions.uuid_generate_v4(),
    session_id varchar(255) unique not null,
    email varchar(320) not null,
    character_type varchar(50) not null,
    body_type varchar(50) not null,
    personality varchar(50),
    source varchar(50) default 'quiz' not null,
    status varchar(20) default 'completed' not null check (status in ('completed', 'pending', 'converted')),
    user_id uuid references auth.users on delete set null,
    submitted_at timestamp with time zone default current_timestamp not null,
    created_at timestamp with time zone default current_timestamp not null,
    updated_at timestamp with time zone default current_timestamp not null,
    primary key (id)
  );

comment on table public.quiz_responses is 'Quiz responses for lead capture and user preferences';
comment on column public.quiz_responses.session_id is 'Unique session identifier for tracking quiz completion';
comment on column public.quiz_responses.email is 'User email captured during quiz';
comment on column public.quiz_responses.character_type is 'Selected character type preference';
comment on column public.quiz_responses.body_type is 'Selected body type preference';
comment on column public.quiz_responses.personality is 'Optional personality preference';
comment on column public.quiz_responses.source is 'Source of the quiz completion (quiz, campaign, etc.)';
comment on column public.quiz_responses.status is 'Status of the quiz response (completed, pending, converted)';
comment on column public.quiz_responses.user_id is 'User ID if converted to a paying customer (nullable for leads)';

-- Enable RLS on the quiz_responses table
alter table public.quiz_responses enable row level security;

-- Create indexes for performance
create index if not exists ix_quiz_responses_session_id on public.quiz_responses (session_id);
create index if not exists ix_quiz_responses_email on public.quiz_responses (email);
create index if not exists ix_quiz_responses_submitted_at on public.quiz_responses (submitted_at desc);
create index if not exists ix_quiz_responses_source on public.quiz_responses (source);
create index if not exists ix_quiz_responses_user_id on public.quiz_responses (user_id);
create index if not exists ix_quiz_responses_status on public.quiz_responses (status);

-- Revoke all permissions and grant specific ones
revoke all on public.quiz_responses from authenticated, service_role;
grant select, insert, update, delete on table public.quiz_responses to authenticated, service_role;

-- RLS Policies for quiz_responses

-- Allow anonymous users to insert quiz responses (for lead capture)
create policy "anonymous_insert_quiz_responses" on public.quiz_responses
  for insert
  to anon, authenticated
  with check (true);

-- Allow anonymous users to read their own quiz responses by session_id
create policy "anonymous_read_own_quiz_responses" on public.quiz_responses
  for select
  to anon, authenticated
  using (true);

-- Authenticated users can update quiz responses (admin purposes)
create policy "authenticated_update_quiz_responses" on public.quiz_responses
  for update
  to authenticated
  using (true)
  with check (true);

-- Function to get quiz response by session
create or replace function public.get_quiz_response_by_session(target_session_id varchar)
returns public.quiz_responses
language sql
security definer
set search_path = ''
as $$
  select *
  from public.quiz_responses
  where session_id = target_session_id
  limit 1;
$$;

grant execute on function public.get_quiz_response_by_session(varchar) to anon, authenticated, service_role;