import { NextResponse } from 'next/server';
import { enhanceRouteHandler } from '@kit/next/routes';
import { getLogger } from '@kit/shared/logger';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { z } from 'zod';

const PaymentSuccessSchema = z.object({
  session_id: z.string().min(1, 'Session ID is required'),
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
      sessionId: body.session_id,
    };

    logger.info(ctx, 'Processing payment success auto-login request...');

    try {
      // Clean session ID (remove any duplicate parameters)
      const cleanSessionId = body.session_id.split('?')[0];
      
      // Find user by Stripe session ID
      const { data: users } = await supabase.auth.admin.listUsers();
      const user = users.users.find(u => 
        u.user_metadata?.stripe_session_id === cleanSessionId
      );

      if (!user) {
        logger.warn({ ...ctx, cleanSessionId }, 'User not found for session ID - webhook may not have processed yet');
        
        return NextResponse.json({
          success: false,
          error: 'User not found. Please wait a moment and try again.',
          retry: true
        }, { status: 404 });
      }

      logger.info({ 
        ...ctx, 
        userId: user.id,
        email: user.email?.substring(0, 3) + '***',
        cleanSessionId 
      }, 'User found for payment success - retrieving auth token...');

      // Get stored auth token hash from user metadata
      const authTokenHash = user.user_metadata?.auth_token_hash;
      
      if (!authTokenHash) {
        logger.warn({ ...ctx, userId: user.id }, 'No auth token found - generating new one...');
        
        // Generate new auth link if none exists
        const { data: authLink, error: authLinkError } = await supabase.auth.admin.generateLink({
          type: 'signup',
          email: user.email!,
          options: {
            redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/home?welcome=premium&message=payment-success`
          }
        });

        if (authLinkError || !authLink) {
          logger.error({ ...ctx, error: authLinkError }, 'Failed to generate auth link');
          return NextResponse.json({
            success: false,
            error: 'Failed to generate authentication link'
          }, { status: 500 });
        }

        // Update user metadata with new auth token
        await supabase.auth.admin.updateUserById(user.id, {
          user_metadata: {
            ...user.user_metadata,
            auth_token_hash: authLink.properties.hashed_token,
            auth_link_created_at: new Date().toISOString()
          }
        });

        logger.info({ ...ctx, userId: user.id }, 'New auth link generated successfully');
        
        return NextResponse.json({
          success: true,
          authUrl: authLink.properties.action_link,
          message: 'Authentication link generated successfully'
        });
      }

      // Auth token exists - we need to reconstruct the auth callback URL
      // The auth callback URL format is: /auth/callback?token_hash=...&type=signup&next=...
      const authCallbackUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback` +
        `?token_hash=${authTokenHash}` +
        `&type=signup` +
        `&next=${encodeURIComponent('/home?welcome=premium&message=payment-success')}`;

      logger.info({ 
        ...ctx, 
        userId: user.id,
        authCallbackUrl: authCallbackUrl.substring(0, 100) + '...'
      }, 'Auth callback URL constructed successfully');

      return NextResponse.json({
        success: true,
        authUrl: authCallbackUrl,
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