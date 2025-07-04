/*
 * -------------------------------------------------------
 * Section: Analytics & Tracking
 * Comprehensive analytics system for HushPixel monitoring
 * -------------------------------------------------------
 */

-- User Journey Events Table
create table if not exists
  public.user_journey_events (
    id uuid unique not null default extensions.uuid_generate_v4(),
    user_id uuid references public.accounts(id) on delete cascade,
    session_id varchar(255) not null,
    event_type varchar(50) not null,
    event_name varchar(100) not null,
    event_data jsonb default '{}'::jsonb not null,
    page_url text,
    referrer text,
    user_agent text,
    ip_address inet,
    country varchar(2),
    city varchar(100),
    device_type varchar(20),
    browser varchar(50),
    os varchar(50),
    created_at timestamp with time zone default current_timestamp not null,
    primary key (id)
  );

comment on table public.user_journey_events is 'Track user journey events across quiz and app';
comment on column public.user_journey_events.event_type is 'Event category: quiz, app, generation, payment, error';
comment on column public.user_journey_events.event_name is 'Specific event name';
comment on column public.user_journey_events.event_data is 'Additional event data as JSON';

-- Conversion Funnel Table
create table if not exists
  public.conversion_funnel (
    id uuid unique not null default extensions.uuid_generate_v4(),
    user_id uuid references public.accounts(id) on delete cascade,
    session_id varchar(255) not null,
    funnel_stage varchar(50) not null,
    entered_at timestamp with time zone default current_timestamp not null,
    completed_at timestamp with time zone,
    time_spent_seconds integer,
    exit_reason varchar(100),
    conversion_data jsonb default '{}'::jsonb not null,
    primary key (id)
  );

comment on table public.conversion_funnel is 'Track conversion funnel progression';
comment on column public.conversion_funnel.funnel_stage is 'Stage: quiz_start, quiz_complete, app_register, first_generation, payment';

-- System Metrics Table
create table if not exists
  public.system_metrics (
    id uuid unique not null default extensions.uuid_generate_v4(),
    metric_name varchar(100) not null,
    metric_value numeric not null,
    metric_type varchar(50) not null,
    tags jsonb default '{}'::jsonb not null,
    recorded_at timestamp with time zone default current_timestamp not null,
    primary key (id)
  );

comment on table public.system_metrics is 'System performance and business metrics';
comment on column public.system_metrics.metric_type is 'Type: counter, gauge, histogram, timer';

-- Error Tracking Table
create table if not exists
  public.error_tracking (
    id uuid unique not null default extensions.uuid_generate_v4(),
    user_id uuid references public.accounts(id) on delete cascade,
    session_id varchar(255),
    error_type varchar(50) not null,
    error_message text not null,
    error_stack text,
    error_context jsonb default '{}'::jsonb not null,
    severity varchar(20) not null default 'error',
    resolved boolean default false not null,
    resolved_at timestamp with time zone,
    resolved_by uuid references public.accounts(id),
    created_at timestamp with time zone default current_timestamp not null,
    primary key (id)
  );

comment on table public.error_tracking is 'Track and monitor application errors';
comment on column public.error_tracking.severity is 'Severity: info, warning, error, critical';

-- Revenue Analytics Table
create table if not exists
  public.revenue_analytics (
    id uuid unique not null default extensions.uuid_generate_v4(),
    user_id uuid references public.accounts(id) on delete cascade not null,
    subscription_id text references public.subscriptions(id) on delete cascade,
    revenue_type varchar(50) not null,
    amount_cents integer not null,
    currency varchar(3) not null default 'USD',
    mrr_impact_cents integer not null default 0,
    arr_impact_cents integer not null default 0,
    churn_risk_score numeric(3,2) default 0,
    cohort_month varchar(7),
    ltv_cents integer,
    cac_cents integer,
    recorded_at timestamp with time zone default current_timestamp not null,
    primary key (id)
  );

comment on table public.revenue_analytics is 'Revenue analytics and financial metrics';
comment on column public.revenue_analytics.revenue_type is 'Type: subscription, one_time, refund, churn';
comment on column public.revenue_analytics.cohort_month is 'YYYY-MM format for cohort analysis';

-- User Behavior Analytics Table
create table if not exists
  public.user_behavior_analytics (
    id uuid unique not null default extensions.uuid_generate_v4(),
    user_id uuid references public.accounts(id) on delete cascade not null,
    session_id varchar(255) not null,
    behavior_type varchar(50) not null,
    behavior_data jsonb default '{}'::jsonb not null,
    page_views integer default 0,
    time_on_page integer default 0,
    scroll_depth numeric(3,2) default 0,
    click_events jsonb default '[]'::jsonb not null,
    form_interactions jsonb default '[]'::jsonb not null,
    search_queries text[],
    feature_usage jsonb default '{}'::jsonb not null,
    engagement_score numeric(3,2) default 0,
    recorded_at timestamp with time zone default current_timestamp not null,
    primary key (id)
  );

comment on table public.user_behavior_analytics is 'Detailed user behavior and engagement tracking';

-- Business Intelligence Materialized View
create materialized view public.business_intelligence_summary as
select 
  date_trunc('day', created_at) as date,
  count(distinct user_id) as daily_active_users,
  count(distinct session_id) as unique_sessions,
  count(*) filter (where event_type = 'quiz' and event_name = 'quiz_started') as quiz_starts,
  count(*) filter (where event_type = 'quiz' and event_name = 'quiz_completed') as quiz_completions,
  count(*) filter (where event_type = 'app' and event_name = 'user_registered') as app_registrations,
  count(*) filter (where event_type = 'generation' and event_name = 'image_generated') as image_generations,
  count(*) filter (where event_type = 'payment' and event_name = 'subscription_created') as new_subscriptions,
  round(
    count(*) filter (where event_type = 'quiz' and event_name = 'quiz_completed')::numeric / 
    nullif(count(*) filter (where event_type = 'quiz' and event_name = 'quiz_started'), 0) * 100, 2
  ) as quiz_conversion_rate,
  round(
    count(*) filter (where event_type = 'app' and event_name = 'user_registered')::numeric / 
    nullif(count(*) filter (where event_type = 'quiz' and event_name = 'quiz_completed'), 0) * 100, 2
  ) as quiz_to_app_conversion_rate,
  round(
    count(*) filter (where event_type = 'payment' and event_name = 'subscription_created')::numeric / 
    nullif(count(*) filter (where event_type = 'app' and event_name = 'user_registered'), 0) * 100, 2
  ) as app_to_payment_conversion_rate
from public.user_journey_events
where created_at >= current_date - interval '90 days'
group by date_trunc('day', created_at)
order by date desc;

-- Create indexes for performance
create index if not exists ix_user_journey_events_user_id on public.user_journey_events (user_id);
create index if not exists ix_user_journey_events_session_id on public.user_journey_events (session_id);
create index if not exists ix_user_journey_events_event_type on public.user_journey_events (event_type);
create index if not exists ix_user_journey_events_created_at on public.user_journey_events (created_at desc);
create index if not exists ix_user_journey_events_event_name on public.user_journey_events (event_name);

create index if not exists ix_conversion_funnel_user_id on public.conversion_funnel (user_id);
create index if not exists ix_conversion_funnel_session_id on public.conversion_funnel (session_id);
create index if not exists ix_conversion_funnel_stage on public.conversion_funnel (funnel_stage);
create index if not exists ix_conversion_funnel_entered_at on public.conversion_funnel (entered_at desc);

create index if not exists ix_system_metrics_name on public.system_metrics (metric_name);
create index if not exists ix_system_metrics_recorded_at on public.system_metrics (recorded_at desc);
create index if not exists ix_system_metrics_type on public.system_metrics (metric_type);

create index if not exists ix_error_tracking_user_id on public.error_tracking (user_id);
create index if not exists ix_error_tracking_type on public.error_tracking (error_type);
create index if not exists ix_error_tracking_severity on public.error_tracking (severity);
create index if not exists ix_error_tracking_created_at on public.error_tracking (created_at desc);
create index if not exists ix_error_tracking_resolved on public.error_tracking (resolved);

create index if not exists ix_revenue_analytics_user_id on public.revenue_analytics (user_id);
create index if not exists ix_revenue_analytics_type on public.revenue_analytics (revenue_type);
create index if not exists ix_revenue_analytics_recorded_at on public.revenue_analytics (recorded_at desc);
create index if not exists ix_revenue_analytics_cohort on public.revenue_analytics (cohort_month);

create index if not exists ix_user_behavior_user_id on public.user_behavior_analytics (user_id);
create index if not exists ix_user_behavior_session_id on public.user_behavior_analytics (session_id);
create index if not exists ix_user_behavior_type on public.user_behavior_analytics (behavior_type);
create index if not exists ix_user_behavior_recorded_at on public.user_behavior_analytics (recorded_at desc);

-- Enable RLS on all tables
alter table public.user_journey_events enable row level security;
alter table public.conversion_funnel enable row level security;
alter table public.system_metrics enable row level security;
alter table public.error_tracking enable row level security;
alter table public.revenue_analytics enable row level security;
alter table public.user_behavior_analytics enable row level security;

-- Permissions
revoke all on public.user_journey_events from authenticated, service_role;
grant select, insert, update on table public.user_journey_events to authenticated, service_role;

revoke all on public.conversion_funnel from authenticated, service_role;
grant select, insert, update on table public.conversion_funnel to authenticated, service_role;

revoke all on public.system_metrics from authenticated, service_role;
grant select, insert on table public.system_metrics to authenticated, service_role;

revoke all on public.error_tracking from authenticated, service_role;
grant select, insert, update on table public.error_tracking to authenticated, service_role;

revoke all on public.revenue_analytics from authenticated, service_role;
grant select, insert on table public.revenue_analytics to authenticated, service_role;

revoke all on public.user_behavior_analytics from authenticated, service_role;
grant select, insert on table public.user_behavior_analytics to authenticated, service_role;

-- Super admin policies for analytics tables
create policy super_admins_access_user_journey_events
    on public.user_journey_events
    as permissive
    for select
    to authenticated
    using (public.is_super_admin());

create policy super_admins_access_conversion_funnel
    on public.conversion_funnel
    as permissive
    for select
    to authenticated
    using (public.is_super_admin());

create policy super_admins_access_system_metrics
    on public.system_metrics
    as permissive
    for select
    to authenticated
    using (public.is_super_admin());

create policy super_admins_access_error_tracking
    on public.error_tracking
    as permissive
    for all
    to authenticated
    using (public.is_super_admin());

create policy super_admins_access_revenue_analytics
    on public.revenue_analytics
    as permissive
    for select
    to authenticated
    using (public.is_super_admin());

create policy super_admins_access_user_behavior_analytics
    on public.user_behavior_analytics
    as permissive
    for select
    to authenticated
    using (public.is_super_admin());

-- Super admin access to generations table for analytics
create policy super_admins_access_generations
    on public.generations
    as permissive
    for select
    to authenticated
    using (public.is_super_admin());

-- Functions for analytics
create or replace function public.track_user_event(
  p_user_id uuid,
  p_session_id varchar(255),
  p_event_type varchar(50),
  p_event_name varchar(100),
  p_event_data jsonb default '{}'::jsonb,
  p_page_url text default null,
  p_referrer text default null,
  p_user_agent text default null,
  p_ip_address inet default null,
  p_country varchar(2) default null,
  p_city varchar(100) default null,
  p_device_type varchar(20) default null,
  p_browser varchar(50) default null,
  p_os varchar(50) default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  event_id uuid;
begin
  insert into public.user_journey_events (
    user_id, session_id, event_type, event_name, event_data,
    page_url, referrer, user_agent, ip_address, country,
    city, device_type, browser, os
  ) values (
    p_user_id, p_session_id, p_event_type, p_event_name, p_event_data,
    p_page_url, p_referrer, p_user_agent, p_ip_address, p_country,
    p_city, p_device_type, p_browser, p_os
  ) returning id into event_id;
  
  return event_id;
end;
$$;

grant execute on function public.track_user_event to authenticated, service_role;

-- Function to calculate churn risk
create or replace function public.calculate_churn_risk(target_user_id uuid)
returns numeric(3,2)
language plpgsql
security definer
set search_path = ''
as $$
declare
  days_since_last_generation integer;
  generation_count integer;
  subscription_age_days integer;
  churn_score numeric(3,2) := 0;
begin
  -- Get days since last generation
  select extract(day from current_timestamp - max(created_at))
  into days_since_last_generation
  from public.generations
  where user_id = target_user_id;
  
  -- Get total generation count
  select count(*)
  into generation_count
  from public.generations
  where user_id = target_user_id;
  
  -- Get subscription age
  select extract(day from current_timestamp - min(created_at))
  into subscription_age_days
  from public.subscriptions
  where account_id = target_user_id and status = 'active';
  
  -- Calculate churn risk score (0-1)
  if days_since_last_generation is null then
    churn_score := 0.8; -- No generations yet
  elsif days_since_last_generation > 30 then
    churn_score := 0.9; -- Highly inactive
  elsif days_since_last_generation > 14 then
    churn_score := 0.6; -- Moderately inactive
  elsif days_since_last_generation > 7 then
    churn_score := 0.3; -- Slightly inactive
  else
    churn_score := 0.1; -- Active user
  end if;
  
  -- Adjust based on generation count
  if generation_count < 3 then
    churn_score := churn_score + 0.2;
  end if;
  
  -- Adjust based on subscription age
  if subscription_age_days < 7 then
    churn_score := churn_score + 0.1; -- New users have higher churn
  end if;
  
  -- Cap at 1.0
  return least(churn_score, 1.0);
end;
$$;

grant execute on function public.calculate_churn_risk to authenticated, service_role;

-- Function to refresh materialized view
create or replace function public.refresh_business_intelligence()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  refresh materialized view public.business_intelligence_summary;
end;
$$;

grant execute on function public.refresh_business_intelligence to service_role;

-- Create scheduled job to refresh materialized view every hour
-- This would typically be done with pg_cron extension