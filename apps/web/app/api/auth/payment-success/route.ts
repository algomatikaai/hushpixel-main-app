import { NextRequest, NextResponse } from 'next/server';
import { enhanceRouteHandler } from '@kit/next/routes';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getLogger } from '@kit/shared/logger';

/**
 * Handle payment success redirect for ZERO FRICTION money printer
 * Auto signs in users and redirects to dashboard
 */
export const GET = enhanceRouteHandler(
  async ({ request }) => {
    const logger = await getLogger();
    const supabase = getSupabaseServerAdminClient();
    
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('session_id');
    const email = url.searchParams.get('email');
    
    const ctx = {
      name: 'payment-success',
      sessionId,
      email: email?.substring(0, 3) + '***'
    };

    logger.info(ctx, 'Payment success - handling auto sign-in redirect');

    try {
      if (!email) {
        logger.warn(ctx, 'No email provided in payment success URL');
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/auth/sign-in?message=payment-success`);
      }

      // Find user by email
      const { data: users } = await supabase.auth.admin.listUsers();
      const user = users.users.find(u => u.email === email);

      if (!user) {
        logger.error(ctx, 'User not found after payment completion');
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/auth/sign-in?message=payment-success&email=${encodeURIComponent(email)}`);
      }

      // Get auto sign-in URL from user metadata
      const autoSignInUrl = user.user_metadata?.auto_signin_url;

      if (autoSignInUrl) {
        logger.info({ ...ctx, userId: user.id }, 'Redirecting to auto sign-in URL');
        return NextResponse.redirect(autoSignInUrl);
      } else {
        // Fallback: Generate new magic link
        logger.warn({ ...ctx, userId: user.id }, 'No auto sign-in URL found, generating new one');
        
        const { data: authLink, error: authLinkError } = await supabase.auth.admin.generateLink({
          type: 'magiclink',
          email: email,
          options: {
            redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/home?welcome=premium`
          }
        });

        if (authLinkError || !authLink) {
          logger.error({ ...ctx, error: authLinkError }, 'Failed to generate fallback magic link');
          return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/auth/sign-in?message=payment-success&email=${encodeURIComponent(email)}`);
        }

        return NextResponse.redirect(authLink.properties.action_link);
      }

    } catch (error) {
      logger.error({ ...ctx, error }, 'Failed to process payment success redirect');
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/auth/sign-in?message=payment-success&email=${encodeURIComponent(email || '')}`);
    }
  },
  {
    auth: false,
  },
);