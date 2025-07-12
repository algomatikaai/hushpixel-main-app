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
    logger.info(ctx, 'Looking up magic link for payment success');

    try {
      // Find user by Stripe session ID with proper filtering
      const { data: users } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 1000 // Reasonable limit
      });

      const user = users.users.find(u => {
        const sessionMatch = u.user_metadata?.stripe_session_id === body.sessionId;
        const hasValidMagicLink = u.user_metadata?.magic_link_token;
        
        // Check if magic link is recent (created within last 5 minutes)
        const isRecent = u.user_metadata?.magic_link_created_at &&
          (Date.now() - new Date(u.user_metadata.magic_link_created_at).getTime()) < 300000; // 5 minutes

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