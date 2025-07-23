import { NextResponse } from 'next/server';
import { enhanceRouteHandler } from '@kit/next/routes';
import { getLogger } from '@kit/shared/logger';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { z } from 'zod';

const PaymentSuccessSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
});

/**
 * @description API route to get auth token for automatic login after payment
 * This replaces the old magic link approach with proper Makerkit auth callback flow
 */
export const POST = enhanceRouteHandler(
  async ({ body }) => {
    const logger = await getLogger();
    const supabase = getSupabaseServerAdminClient();
    
    const ctx = {
      name: 'auth.payment-success',
      sessionId: body.sessionId,
    };

    logger.info(ctx, 'Processing payment success auto-login request...');

    try {
      // Find user by Stripe session ID (simple lookup)
      const { data: users } = await supabase.auth.admin.listUsers();
      const user = users.users.find(u => 
        u.user_metadata?.stripe_session_id === body.sessionId
      );

      if (!user) {
        logger.warn({ ...ctx, sessionId: body.sessionId }, 'User not found - webhook may not have processed yet');
        
        return NextResponse.json({
          success: false,
          error: 'User not found. Please wait a moment and try again.',
          retry: true
        }, { status: 404 });
      }

      // Get stored magic link token
      const magicLinkToken = user.user_metadata?.magic_link_token;
      
      if (!magicLinkToken) {
        logger.warn({ ...ctx, userId: user.id }, 'No magic link token found');
        return NextResponse.json({
          success: false,
          error: 'Authentication token not ready. Please try again.',
          retry: true
        }, { status: 404 });
      }

      logger.info({ 
        ...ctx, 
        userId: user.id,
        email: user.email?.substring(0, 3) + '***'
      }, 'Magic link token found - ready for authentication');

      return NextResponse.json({
        success: true,
        magicLinkToken: magicLinkToken,
        message: 'Ready for automatic authentication'
      });

    } catch (error) {
      logger.error({ ...ctx, error }, 'Failed to process payment success request');
      
      return NextResponse.json({
        success: false,
        error: 'Internal server error'
      }, { status: 500 });
    }
  },
  {
    auth: false,
    schema: PaymentSuccessSchema,
  },
);