import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getLogger } from '@kit/shared/logger';
import { z } from 'zod';

const BridgeAuthSchema = z.object({
  email: z.string().email(),
  sessionId: z.string().optional(),
  source: z.string().optional(),
  redirectTo: z.string().optional()
});

export async function POST(request: NextRequest) {
  const logger = await getLogger();
  const ctx = { name: 'auth.bridge' };

  try {
    const body = await request.json();
    const { email, sessionId, source, redirectTo } = BridgeAuthSchema.parse(body);

    logger.info(ctx, `Bridge auth request for email: ${email.substring(0, 3)}***`);

    const supabase = getSupabaseServerClient();
    const adminClient = getSupabaseServerAdminClient();

    // Check if user already exists using admin client
    const { data: existingUser, error: userError } = await adminClient.auth.admin.getUserByEmail(email);

    if (userError && userError.code !== 'user_not_found') {
      logger.error({ ...ctx, error: userError }, 'Error checking existing user');
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    let userId = existingUser?.user?.id;

    // If user doesn't exist, create them with a temporary password
    if (!existingUser?.user) {
      logger.info(ctx, 'Creating new user via bridge auth');
      
      // Generate a secure temporary password
      const tempPassword = `temp_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`;
      
      const { data: newUser, error: signUpError } = await adminClient.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true, // Auto-confirm email for bridge users
        user_metadata: {
          created_via: 'quiz_bridge',
          session_id: sessionId,
          source: source || 'quiz'
        }
      });

      if (signUpError || !newUser.user) {
        logger.error({ ...ctx, error: signUpError }, 'Failed to create bridge user');
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
      }

      userId = newUser.user.id;

      // Create personal account for the new user
      const { error: accountError } = await supabase
        .from('accounts')
        .insert([{
          name: 'Personal',
          slug: `user-${userId}`,
          primary_owner_user_id: userId,
          is_personal_account: true
        }]);

      if (accountError) {
        logger.error({ ...ctx, error: accountError }, 'Failed to create personal account');
      }
    }

    // Generate a temporary auth token that can be used for checkout
    const { data: session, error: sessionError } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: redirectTo || `${process.env.NEXT_PUBLIC_SITE_URL}/checkout?source=${source || 'quiz'}`
      }
    });

    if (sessionError || !session) {
      logger.error({ ...ctx, error: sessionError }, 'Failed to generate auth link');
      return NextResponse.json({ error: 'Failed to generate auth session' }, { status: 500 });
    }

    // Update quiz session with user ID if provided
    if (sessionId && userId) {
      const { error: updateError } = await supabase
        .from('quiz_responses')
        .update({ user_id: userId })
        .eq('session_id', sessionId);

      if (updateError) {
        logger.warn({ ...ctx, error: updateError }, 'Failed to link quiz session to user');
      }
    }

    logger.info({ ...ctx, userId }, 'Bridge auth successful');

    return NextResponse.json({
      success: true,
      authUrl: session.properties.action_link,
      userId,
      message: 'Authentication bridge created successfully'
    });

  } catch (error) {
    logger.error({ ...ctx, error }, 'Bridge auth failed');
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 });
    }

    return NextResponse.json({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}