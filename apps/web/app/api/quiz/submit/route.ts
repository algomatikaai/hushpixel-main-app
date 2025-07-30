import { NextRequest, NextResponse } from 'next/server';
import { enhanceRouteHandler } from '@kit/next/routes';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { getLogger } from '@kit/shared/logger';
import { z } from 'zod';

const QuizSubmissionSchema = z.object({
  email: z.string().email(),
  sessionId: z.string(),
  responses: z.object({
    character_type: z.string(),
    body_type: z.string(),
    personality: z.string().optional(),
  }),
  source: z.string().optional()
});

export const POST = enhanceRouteHandler(
  async ({ body }) => {
    const logger = await getLogger();
    const ctx = { name: 'quiz-submit' };

    const { email, sessionId, responses, source } = body;

    logger.info({
      ...ctx,
      email: email.substring(0, 3) + '***',
      sessionId,
      source,
      timestamp: new Date().toISOString()
    }, 'Quiz submission received - LEAD CAPTURE ONLY (no user creation)');

    // Use service role client for quiz responses storage
    const supabase = getSupabaseServerClient();

    // Generate A/B test variant (50/50 split)
    const abTestVariant = Math.random() < 0.5 ? 'free_trial' : 'direct_paywall';

    // Store quiz responses for lead capture (NO user creation)
    const { data: quizData, error: quizError } = await supabase
      .from('quiz_responses')
      .insert({
        session_id: sessionId,
        email,
        character_type: responses.character_type,
        body_type: responses.body_type,
        personality: responses.personality,
        source: source || 'quiz',
        // ab_test_variant: abTestVariant, // TEMPORARILY DISABLED - column doesn't exist in production
        user_id: null // No user created yet - will be linked after payment
      })
      .select()
      .single();

    if (quizError) {
      logger.error({ ...ctx, error: quizError }, 'Failed to store quiz responses');
      return NextResponse.json({ 
        success: false,
        error: 'Failed to store quiz data' 
      }, { status: 500 });
    }

    logger.info({ 
      ...ctx, 
      quizId: quizData?.id,
      abTestVariant,
      leadCaptured: true
    }, 'Quiz submission completed - LEAD CAPTURED (no user creation)');

    // Generate URL for static image display (no auth required)
    const generateUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/generate?session=${sessionId}&variant=${abTestVariant}`;

    return NextResponse.json({
      success: true,
      message: 'Quiz submitted successfully',
      generateUrl,
      sessionId,
      abTestVariant,
      leadCaptured: true,
      userId: null,        // Add this to match client expectations
      isNewUser: false     // Add this to match client expectations
    });
  },
  {
    schema: QuizSubmissionSchema,
    auth: false, // No authentication required for quiz submission
  },
);