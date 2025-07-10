import { NextRequest, NextResponse } from 'next/server';
import { enhanceRouteHandler } from '@kit/next/routes';
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

export const POST = enhanceRouteHandler(
  async function ({ body, request }) {
    const logger = await getLogger();
    const ctx = { name: 'bridge-auth' };

    logger.info({
      ...ctx,
      body,
      timestamp: new Date().toISOString()
    }, 'Bridge auth request received');

    // Debug environment variables (without exposing sensitive data)
    logger.info({
      ...ctx,
      env_check: {
        NODE_ENV: process.env.NODE_ENV,
        SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
        SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
        ANON_KEY_SET: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        SERVICE_KEY_SET: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      }
    }, 'Bridge auth environment check');

    const { email, sessionId, source, redirectTo } = body;

    logger.info(ctx, `Bridge auth request for email: ${email.substring(0, 3)}***`);

    // Create Supabase clients
    const supabase = getSupabaseServerClient();
    const adminClient = getSupabaseServerAdminClient();

    // Check if user already exists using admin client
    logger.info(ctx, 'Checking existing user...');
    
    let existingUser = null;
    let userError = null;
    
    try {
      const result = await adminClient.auth.admin.getUserByEmail(email);
      existingUser = result.data;
      userError = result.error;
      logger.info(ctx, 'getUserByEmail executed successfully');
    } catch (error) {
      logger.error({ ...ctx, error }, 'getUserByEmail failed');
      userError = error;
    }

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
  },
  {
    auth: false, // Allow unauthenticated access for quiz users
    schema: BridgeAuthSchema,
  }
);