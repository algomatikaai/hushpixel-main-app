import { NextResponse } from 'next/server';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { enhanceRouteHandler } from '@kit/next/routes';
import { getLogger } from '@kit/shared/logger';
import { z } from 'zod';

const PaymentSuccessSchema = z.object({
  sessionId: z.string().min(1)
});

export const POST = enhanceRouteHandler(
  async function ({ body }) {
    const logger = await getLogger();
    const supabase = getSupabaseServerAdminClient();

    const ctx = { name: 'payment-success', sessionId: body.sessionId };
    logger.info(ctx, '🔍 Looking up magic link for payment success with clean session ID');

    try {
      // Find user by Stripe session ID with proper filtering
      const { data: users } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 1000 // Reasonable limit
      });

      // 🔍 DEBUG: Log all users and their session IDs
      const userSessionDebug = users.users.map(u => ({
        email: u.email?.substring(0, 10) + '***',
        stripe_session_id: u.user_metadata?.stripe_session_id,
        has_magic_link: !!u.user_metadata?.magic_link_token,
        magic_link_created: u.user_metadata?.magic_link_created_at,
        created_at: u.created_at
      })).slice(0, 10); // Only log recent users

      logger.info({ 
        ...ctx, 
        lookingFor: body.sessionId,
        recentUsers: userSessionDebug 
      }, 'DEBUG: Session ID lookup');

      const user = users.users.find(u => {
        const sessionMatch = u.user_metadata?.stripe_session_id === body.sessionId;
        const hasValidMagicLink = u.user_metadata?.magic_link_token;
        
        // Check if magic link is recent (created within last 5 minutes)
        const isRecent = u.user_metadata?.magic_link_created_at &&
          (Date.now() - new Date(u.user_metadata.magic_link_created_at).getTime()) < 300000; // 5 minutes

        // 🔍 DEBUG: Log match details for this user
        if (u.user_metadata?.stripe_session_id) {
          logger.info({
            ...ctx,
            userEmail: u.email?.substring(0, 5) + '***',
            storedSessionId: u.user_metadata.stripe_session_id,
            searchSessionId: body.sessionId,
            sessionMatch,
            hasValidMagicLink,
            isRecent
          }, 'DEBUG: User session match check');
        }

        return sessionMatch && hasValidMagicLink && isRecent;
      });

      if (user?.user_metadata?.magic_link_token) {
        logger.info({ ...ctx, userId: user.id }, 'Magic link found for payment success');

        return NextResponse.json({
          magicLinkToken: user.user_metadata.magic_link_token
        });
      }

      // Don't log as error - this is expected during polling
      logger.debug(ctx, 'Magic link not ready yet');
      return NextResponse.json({ error: 'Magic link not ready' }, { status: 404 });

    } catch (error) {
      logger.error({ ...ctx, error }, 'Failed to retrieve magic link');
      return NextResponse.json({ error: 'Failed to retrieve authentication' }, { status: 500 });
    }
  },
  {
    schema: PaymentSuccessSchema,
    auth: false
  }
);