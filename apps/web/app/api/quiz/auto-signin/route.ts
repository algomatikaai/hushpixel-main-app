import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getLogger } from '@kit/shared/logger';
import { z } from 'zod';

const AutoSigninSchema = z.object({
  userId: z.string().uuid('Valid user ID required'),
});

/**
 * Auto-signin endpoint for quiz users
 * Creates a session for the user to enable seamless authentication
 */
export async function POST(request: NextRequest) {
  const logger = await getLogger();
  const ctx = { name: 'quiz-auto-signin' };

  try {
    const body = await request.json();
    const { userId } = AutoSigninSchema.parse(body);

    logger.info({ ...ctx, userId }, 'Auto-signin request received');

    const adminSupabase = getSupabaseServerAdminClient();

    // Get user to verify they exist and have auto-signin capability
    const { data: user, error: userError } = await adminSupabase.auth.admin.getUserById(userId);

    if (userError || !user) {
      logger.error({ ...ctx, userId, error: userError }, 'User not found for auto-signin');
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify this is an auto-created quiz user
    if (!user.user_metadata?.auto_created || !user.user_metadata?.auto_password) {
      logger.error({ ...ctx, userId }, 'User not eligible for auto-signin');
      return NextResponse.json({ error: 'Auto-signin not available for this user' }, { status: 403 });
    }

    // Generate a magic link for instant authentication
    const { data: authLink, error: authLinkError } = await adminSupabase.auth.admin.generateLink({
      type: 'magiclink',
      email: user.email!,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/generate?auth=success&user=${userId}`
      }
    });

    if (authLinkError || !authLink) {
      logger.error({ ...ctx, userId, error: authLinkError }, 'Failed to generate auth link');
      return NextResponse.json({ error: 'Failed to generate auth link' }, { status: 500 });
    }

    logger.info({ ...ctx, userId }, 'Auto-signin link generated successfully');

    return NextResponse.json({
      success: true,
      authUrl: authLink.properties.action_link,
      message: 'Auto-signin link ready'
    });

  } catch (error) {
    logger.error({ 
      ...ctx, 
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    }, 'Auto-signin failed');
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        success: false,
        error: 'Invalid request data', 
        details: error.errors
      }, { status: 400 });
    }

    return NextResponse.json({ 
      success: false,
      error: 'Auto-signin failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}