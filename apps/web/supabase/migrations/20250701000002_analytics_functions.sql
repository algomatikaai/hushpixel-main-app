/*
 * -------------------------------------------------------
 * Additional Analytics Functions and Views
 * Advanced analytics functionality for HushPixel
 * -------------------------------------------------------
 */

-- Function to get daily user metrics
create or replace function public.get_daily_metrics(
  start_date timestamptz,
  end_date timestamptz
)
returns table (
  date date,
  new_users bigint,
  active_users bigint,
  revenue numeric,
  generations bigint,
  quiz_starts bigint,
  quiz_completions bigint,
  app_registrations bigint,
  subscriptions bigint
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  with daily_stats as (
    select 
      date_trunc('day', created_at)::date as stat_date,
      count(distinct id) filter (where is_personal_account = true) as new_users
    from public.accounts
    where created_at >= start_date and created_at <= end_date
    group by date_trunc('day', created_at)::date
  ),
  daily_events as (
    select
      date_trunc('day', created_at)::date as stat_date,
      count(distinct user_id) as active_users,
      count(*) filter (where event_name = 'quiz_started') as quiz_starts,
      count(*) filter (where event_name = 'quiz_completed') as quiz_completions,
      count(*) filter (where event_name = 'user_registered') as app_registrations
    from public.user_journey_events
    where created_at >= start_date and created_at <= end_date
    group by date_trunc('day', created_at)::date
  ),
  daily_generations as (
    select
      date_trunc('day', created_at)::date as stat_date,
      count(*) as generations
    from public.generations
    where created_at >= start_date and created_at <= end_date
    group by date_trunc('day', created_at)::date
  ),
  daily_subscriptions as (
    select
      date_trunc('day', created_at)::date as stat_date,
      count(*) as subscriptions
    from public.subscriptions
    where created_at >= start_date and created_at <= end_date
    group by date_trunc('day', created_at)::date
  ),
  daily_revenue as (
    select
      date_trunc('day', recorded_at)::date as stat_date,
      sum(amount_cents::numeric / 100) as revenue
    from public.revenue_analytics
    where recorded_at >= start_date and recorded_at <= end_date
    group by date_trunc('day', recorded_at)::date
  ),
  date_series as (
    select generate_series(start_date::date, end_date::date, interval '1 day')::date as stat_date
  )
  select
    ds.stat_date as date,
    coalesce(dstats.new_users, 0) as new_users,
    coalesce(de.active_users, 0) as active_users,
    coalesce(dr.revenue, 0) as revenue,
    coalesce(dg.generations, 0) as generations,
    coalesce(de.quiz_starts, 0) as quiz_starts,
    coalesce(de.quiz_completions, 0) as quiz_completions,
    coalesce(de.app_registrations, 0) as app_registrations,
    coalesce(ds_sub.subscriptions, 0) as subscriptions
  from date_series ds
  left join daily_stats dstats on ds.stat_date = dstats.stat_date
  left join daily_events de on ds.stat_date = de.stat_date
  left join daily_generations dg on ds.stat_date = dg.stat_date
  left join daily_subscriptions ds_sub on ds.stat_date = ds_sub.stat_date
  left join daily_revenue dr on ds.stat_date = dr.stat_date
  order by ds.stat_date;
end;
$$;

grant execute on function public.get_daily_metrics to authenticated, service_role;

-- Function for cohort analysis
create or replace function public.get_cohort_analysis()
returns table (
  cohort_month text,
  month_0_retention numeric,
  month_1_retention numeric,
  month_2_retention numeric,
  month_3_retention numeric
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  with cohorts as (
    select
      to_char(created_at, 'YYYY-MM') as cohort_month,
      id as user_id,
      created_at::date as signup_date
    from public.accounts
    where is_personal_account = true
      and created_at >= current_date - interval '6 months'
  ),
  user_activity as (
    select
      user_id,
      date_trunc('month', created_at) as activity_month
    from public.user_journey_events
    where user_id is not null
    group by user_id, date_trunc('month', created_at)
  ),
  cohort_retention as (
    select
      c.cohort_month,
      count(distinct c.user_id) as cohort_size,
      count(distinct case when ua.activity_month = date_trunc('month', c.signup_date) then c.user_id end) as month_0,
      count(distinct case when ua.activity_month = date_trunc('month', c.signup_date) + interval '1 month' then c.user_id end) as month_1,
      count(distinct case when ua.activity_month = date_trunc('month', c.signup_date) + interval '2 months' then c.user_id end) as month_2,
      count(distinct case when ua.activity_month = date_trunc('month', c.signup_date) + interval '3 months' then c.user_id end) as month_3
    from cohorts c
    left join user_activity ua on c.user_id = ua.user_id
    group by c.cohort_month
  )
  select
    cr.cohort_month,
    case when cr.cohort_size > 0 then round((cr.month_0::numeric / cr.cohort_size * 100), 2) else 0 end as month_0_retention,
    case when cr.cohort_size > 0 then round((cr.month_1::numeric / cr.cohort_size * 100), 2) else 0 end as month_1_retention,
    case when cr.cohort_size > 0 then round((cr.month_2::numeric / cr.cohort_size * 100), 2) else 0 end as month_2_retention,
    case when cr.cohort_size > 0 then round((cr.month_3::numeric / cr.cohort_size * 100), 2) else 0 end as month_3_retention
  from cohort_retention cr
  order by cr.cohort_month;
end;
$$;

grant execute on function public.get_cohort_analysis to authenticated, service_role;

-- Function to get conversion funnel metrics
create or replace function public.get_conversion_funnel_metrics(
  start_date timestamptz default current_date - interval '30 days',
  end_date timestamptz default current_date
)
returns table (
  stage text,
  users bigint,
  conversion_rate numeric
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  quiz_starts bigint;
  quiz_completions bigint;
  app_registrations bigint;
  first_generations bigint;
  payments bigint;
begin
  -- Get unique user counts for each stage
  select count(distinct session_id) into quiz_starts
  from public.conversion_funnel
  where funnel_stage = 'quiz_start'
    and entered_at >= start_date and entered_at <= end_date;

  select count(distinct session_id) into quiz_completions
  from public.conversion_funnel
  where funnel_stage = 'quiz_complete'
    and entered_at >= start_date and entered_at <= end_date;

  select count(distinct session_id) into app_registrations
  from public.conversion_funnel
  where funnel_stage = 'app_register'
    and entered_at >= start_date and entered_at <= end_date;

  select count(distinct session_id) into first_generations
  from public.conversion_funnel
  where funnel_stage = 'first_generation'
    and entered_at >= start_date and entered_at <= end_date;

  select count(distinct session_id) into payments
  from public.conversion_funnel
  where funnel_stage = 'payment'
    and entered_at >= start_date and entered_at <= end_date;

  -- Return funnel data with conversion rates
  return query
  select 'Quiz Start'::text, quiz_starts, 100.0::numeric
  union all
  select 'Quiz Complete'::text, quiz_completions, 
    case when quiz_starts > 0 then round((quiz_completions::numeric / quiz_starts * 100), 2) else 0 end
  union all
  select 'App Registration'::text, app_registrations,
    case when quiz_completions > 0 then round((app_registrations::numeric / quiz_completions * 100), 2) else 0 end
  union all
  select 'First Generation'::text, first_generations,
    case when app_registrations > 0 then round((first_generations::numeric / app_registrations * 100), 2) else 0 end
  union all
  select 'Payment'::text, payments,
    case when first_generations > 0 then round((payments::numeric / first_generations * 100), 2) else 0 end;
end;
$$;

grant execute on function public.get_conversion_funnel_metrics to authenticated, service_role;

-- Function to calculate user lifetime value
create or replace function public.calculate_user_ltv(target_user_id uuid)
returns numeric
language plpgsql
security definer
set search_path = ''
as $$
declare
  total_revenue numeric := 0;
  subscription_months integer := 0;
  avg_monthly_revenue numeric := 0;
  churn_rate numeric := 0.05; -- Default 5% monthly churn
  ltv numeric := 0;
begin
  -- Get total revenue from this user
  select coalesce(sum(amount_cents::numeric / 100), 0)
  into total_revenue
  from public.revenue_analytics
  where user_id = target_user_id;

  -- Get subscription duration in months
  select coalesce(
    extract(month from age(
      coalesce(max(period_ends_at), current_timestamp),
      min(created_at)
    )), 0
  )
  into subscription_months
  from public.subscriptions
  where account_id = target_user_id;

  -- Calculate average monthly revenue
  if subscription_months > 0 then
    avg_monthly_revenue := total_revenue / subscription_months;
  else
    avg_monthly_revenue := 0;
  end if;

  -- Calculate LTV using formula: ARPU / Churn Rate
  if churn_rate > 0 then
    ltv := avg_monthly_revenue / churn_rate;
  else
    ltv := total_revenue; -- Fallback to total revenue if no churn data
  end if;

  return ltv;
end;
$$;

grant execute on function public.calculate_user_ltv to authenticated, service_role;

-- Function to get error statistics
create or replace function public.get_error_statistics(
  start_date timestamptz default current_date - interval '24 hours',
  end_date timestamptz default current_date
)
returns table (
  error_type text,
  error_count bigint,
  severity text,
  affected_users bigint,
  latest_occurrence timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  select
    et.error_type::text,
    count(*)::bigint as error_count,
    et.severity::text,
    count(distinct et.user_id)::bigint as affected_users,
    max(et.created_at) as latest_occurrence
  from public.error_tracking et
  where et.created_at >= start_date and et.created_at <= end_date
  group by et.error_type, et.severity
  order by error_count desc, latest_occurrence desc;
end;
$$;

grant execute on function public.get_error_statistics to authenticated, service_role;

-- Function to get real-time metrics
create or replace function public.get_real_time_metrics()
returns table (
  active_users_24h bigint,
  active_users_1h bigint,
  generations_today bigint,
  generations_1h bigint,
  revenue_today numeric,
  errors_today bigint,
  critical_errors_24h bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  today_start timestamptz := date_trunc('day', current_timestamp);
  hour_ago timestamptz := current_timestamp - interval '1 hour';
  day_ago timestamptz := current_timestamp - interval '24 hours';
begin
  return query
  select
    -- Active users in last 24 hours
    (select count(distinct user_id)
     from public.user_journey_events 
     where created_at >= day_ago and user_id is not null)::bigint,
    
    -- Active users in last hour
    (select count(distinct user_id)
     from public.user_journey_events 
     where created_at >= hour_ago and user_id is not null)::bigint,
    
    -- Generations today
    (select count(*)
     from public.generations 
     where created_at >= today_start)::bigint,
    
    -- Generations in last hour
    (select count(*)
     from public.generations 
     where created_at >= hour_ago)::bigint,
    
    -- Revenue today
    (select coalesce(sum(amount_cents::numeric / 100), 0)
     from public.revenue_analytics 
     where recorded_at >= today_start)::numeric,
    
    -- Errors today
    (select count(*)
     from public.error_tracking 
     where created_at >= today_start)::bigint,
    
    -- Critical errors in last 24 hours
    (select count(*)
     from public.error_tracking 
     where created_at >= day_ago and severity = 'critical')::bigint;
end;
$$;

grant execute on function public.get_real_time_metrics to authenticated, service_role;

-- Create a view for admin dashboard summary
create or replace view public.admin_dashboard_summary
with (security_invoker=true) as
select
  -- Basic counts
  (select count(*) from public.accounts where is_personal_account = true) as total_users,
  (select count(*) from public.accounts where is_personal_account = false) as team_accounts,
  (select count(*) from public.subscriptions where status = 'active') as active_subscriptions,
  (select count(*) from public.subscriptions where status = 'trialing') as trial_subscriptions,
  (select count(*) from public.generations) as total_generations,
  
  -- Revenue metrics
  (select coalesce(sum(amount_cents::numeric / 100), 0) 
   from public.revenue_analytics 
   where recorded_at >= date_trunc('month', current_date)) as monthly_revenue,
  
  -- Activity metrics
  (select count(distinct user_id)
   from public.user_journey_events 
   where created_at >= current_date - interval '24 hours') as daily_active_users,
  
  -- Error metrics
  (select count(*) 
   from public.error_tracking 
   where created_at >= current_date - interval '24 hours') as errors_24h,
  (select count(*) 
   from public.error_tracking 
   where created_at >= current_date - interval '24 hours' 
   and severity = 'critical') as critical_errors_24h;

grant select on public.admin_dashboard_summary to authenticated, service_role;

-- Trigger to automatically refresh materialized view
create or replace function public.refresh_bi_summary()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Refresh the materialized view asynchronously
  perform pg_notify('refresh_bi_summary', '');
  return null;
end;
$$;

-- Create triggers to refresh BI summary on data changes
create trigger refresh_bi_on_events
  after insert on public.user_journey_events
  for each statement
  execute function public.refresh_bi_summary();

create trigger refresh_bi_on_subscriptions
  after insert or update on public.subscriptions
  for each statement
  execute function public.refresh_bi_summary();

create trigger refresh_bi_on_generations
  after insert on public.generations
  for each statement
  execute function public.refresh_bi_summary();

-- Function to track revenue events automatically
create or replace function public.track_revenue_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Track subscription revenue
  if TG_OP = 'INSERT' and NEW.status = 'active' then
    insert into public.revenue_analytics (
      user_id,
      subscription_id,
      revenue_type,
      amount_cents,
      currency,
      mrr_impact_cents,
      arr_impact_cents,
      cohort_month
    ) values (
      NEW.account_id,
      NEW.id,
      'subscription',
      2000, -- Default $20 subscription (would get from pricing table in production)
      NEW.currency,
      2000,
      24000,
      to_char(NEW.created_at, 'YYYY-MM')
    );
  elsif TG_OP = 'UPDATE' and OLD.status = 'active' and NEW.status in ('canceled', 'past_due') then
    -- Track churn
    insert into public.revenue_analytics (
      user_id,
      subscription_id,
      revenue_type,
      amount_cents,
      currency,
      mrr_impact_cents,
      arr_impact_cents
    ) values (
      NEW.account_id,
      NEW.id,
      'churn',
      -2000,
      NEW.currency,
      -2000,
      -24000
    );
  end if;
  
  return NEW;
end;
$$;

-- Create trigger for automatic revenue tracking
create trigger track_subscription_revenue
  after insert or update on public.subscriptions
  for each row
  execute function public.track_revenue_event();