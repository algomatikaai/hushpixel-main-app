import { NextRequest, NextResponse } from 'next/server';
import { enhanceRouteHandler } from '@kit/next/routes';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
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
    }, 'Quiz submission received - LEAD CAPTURE ONLY (zero friction flow)');

    // Use admin client for quiz responses storage (no user creation)
    const supabase = getSupabaseServerAdminClient();

    // Store quiz responses for lead capture - NO USER CREATION
    const { data: quizData, error: quizError } = await supabase
      .from('quiz_responses')
      .insert({
        session_id: sessionId,
        email,
        character_type: responses.character_type,
        body_type: responses.body_type,
        personality: responses.personality,
        source: source || 'quiz',
        user_id: null // No user yet - will be linked after payment by webhook
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
      leadCaptured: true
    }, 'Quiz submission completed - LEAD CAPTURED (no user creation)');

    // Generate URL for anonymous generation (no auth required)
    const generateUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/generate?session=${sessionId}&email=${encodeURIComponent(email)}&character=${responses.character_type}&body=${responses.body_type}&source=${source || 'quiz'}`;

    return NextResponse.json({
      success: true,
      message: 'Quiz submitted successfully',
      generateUrl,
      sessionId,
      userId: null,        // No user created - happens after payment
      isNewUser: false,    // No user created
      leadCaptured: true
    });

  },
  {
    schema: QuizSubmissionSchema,
    auth: false, // No authentication required for quiz submission
  },
);