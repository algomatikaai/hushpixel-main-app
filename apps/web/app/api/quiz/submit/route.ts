import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { createClient } from '@supabase/supabase-js';
import { getLogger } from '@kit/shared/logger';
import { z } from 'zod';
import { randomBytes } from 'crypto';

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
    }, 'Quiz submission received - starting auto-user creation');

    // Use admin client for user creation (bypasses email confirmation)
    const adminSupabase = getSupabaseServerAdminClient();
    
    // Use service role for quiz responses storage
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check if user already exists
    const { data: existingUsers } = await adminSupabase.auth.admin.listUsers();
    const existingUser = existingUsers.users.find(u => u.email === email);

    let userId: string;
    let isNewUser = false;

    if (existingUser) {
      logger.info({ ...ctx, userId: existingUser.id }, 'User already exists, updating preferences');
      userId = existingUser.id;
      
      // Update existing user's quiz preferences
      await adminSupabase.auth.admin.updateUserById(existingUser.id, {
        user_metadata: {
          ...existingUser.user_metadata,
          character_type: responses.character_type,
          body_type: responses.body_type,
          quiz_session_id: sessionId,
          quiz_source: source || 'quiz',
          quiz_completed_at: new Date().toISOString()
        }
      });
    } else {
      logger.info({ ...ctx }, 'Creating new user following Makerkit patterns');
      
      // Create new user following Makerkit admin patterns (no password required)
      const { data: newUser, error: userError } = await adminSupabase.auth.admin.createUser({
        email,
        email_confirm: true, // Skip email confirmation for seamless experience
        user_metadata: {
          name: email.split('@')[0], // Default name from email
          character_type: responses.character_type,
          body_type: responses.body_type,
          quiz_session_id: sessionId,
          quiz_source: source || 'quiz',
          quiz_completed_at: new Date().toISOString(),
          auto_created: true
        }
      });

      if (userError || !newUser.user) {
        logger.error({ ...ctx, error: userError }, 'Failed to create user');
        return NextResponse.json({ error: 'Failed to create user account' }, { status: 500 });
      }

      userId = newUser.user.id;
      isNewUser = true;
      
      logger.info({ ...ctx, userId }, 'User created successfully');
    }

    // Store quiz responses for analytics (preserve existing functionality)
    const { data: quizData, error: quizError } = await supabase
      .from('quiz_responses')
      .insert({
        session_id: sessionId,
        email,
        character_type: responses.character_type,
        body_type: responses.body_type,
        personality: responses.personality,
        source: source || 'quiz',
        user_id: userId // Link to created user
      })
      .select()
      .single();

    if (quizError) {
      logger.error({ ...ctx, error: quizError }, 'Failed to store quiz responses');
      // Don't fail if analytics storage fails, user creation succeeded
    }

    logger.info({ 
      ...ctx, 
      userId,
      quizId: quizData?.id,
      isNewUser 
    }, 'Quiz submission completed with user creation');

    // Generate auth URL for authenticated flow (user has account now)
    const generateUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/generate?auth=quiz&user=${userId}&source=${source || 'quiz'}`;

    return NextResponse.json({
      success: true,
      message: 'Quiz submitted and account created successfully',
      generateUrl,
      sessionId,
      userId,
      isNewUser,
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