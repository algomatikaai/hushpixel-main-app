-- Add ab_test_variant column to quiz_responses table
-- This tracks A/B test variants for the zero-friction money printer flow

alter table public.quiz_responses 
add column if not exists ab_test_variant varchar(50);

comment on column public.quiz_responses.ab_test_variant is 'A/B test variant for the conversion flow (free_trial or direct_paywall)';

-- Create index for analytics queries
create index if not exists ix_quiz_responses_ab_test_variant on public.quiz_responses (ab_test_variant);