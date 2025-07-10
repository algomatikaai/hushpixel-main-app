import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { createClient } from '@supabase/supabase-js';
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

export async function POST(request: NextRequest) {
  const logger = await getLogger();
  const ctx = { name: 'quiz-submit' };

  try {
    // Parse and validate request body
    const body = await request.json();
    const { email, sessionId, responses, source } = QuizSubmissionSchema.parse(body);

    logger.info({
      ...ctx,
      email: email.substring(0, 3) + '***',
      sessionId,
      source,
      timestamp: new Date().toISOString()
    }, 'Quiz submission received');

    // Use service role for quiz submissions (bypasses RLS)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Store quiz responses and lead data
    const { data: quizData, error: quizError } = await supabase
      .from('quiz_responses')
      .insert({
        session_id: sessionId,
        email,
        character_type: responses.character_type,
        body_type: responses.body_type,
        personality: responses.personality,
        source: source || 'quiz'
      })
      .select()
      .single();

    if (quizError) {
      logger.error({ ...ctx, error: quizError }, 'Failed to store quiz responses');
      return NextResponse.json({ error: 'Failed to store quiz data' }, { status: 500 });
    }

    logger.info({ ...ctx, quizId: quizData.id }, 'Quiz responses stored successfully');

    // Generate checkout URL that will create user after payment
    const checkoutUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/checkout?session=${sessionId}&email=${encodeURIComponent(email)}&source=${source || 'quiz'}`;

    return NextResponse.json({
      success: true,
      message: 'Quiz submitted successfully',
      checkoutUrl,
      sessionId,
      leadCaptured: true
    });

  } catch (error) {
    logger.error({ 
      ...ctx, 
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, 'Quiz submission failed');
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        success: false,
        error: 'Invalid request data', 
        details: error.errors
      }, { status: 400 });
    }

    return NextResponse.json({ 
      success: false,
      error: 'Failed to submit quiz',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}