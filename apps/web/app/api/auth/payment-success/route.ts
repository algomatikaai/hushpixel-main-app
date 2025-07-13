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

      // BULLETPROOF FALLBACK: If magic link not found, create it directly
      // This handles cases where webhook didn't fire or failed
      logger.info({ ...ctx, attemptingFallback: true }, '🚨 MAGIC LINK NOT FOUND - Attempting fallback creation');
      
      try {
        const fallbackResult = await createMagicLinkFallback(body.sessionId, supabase, logger, ctx);
        if (fallbackResult.success) {
          logger.info({ ...ctx, fallbackSuccess: true }, '✅ FALLBACK SUCCESS - Magic link created directly');
          return NextResponse.json({
            magicLinkToken: fallbackResult.magicLinkToken
          });
        }
      } catch (fallbackError) {
        logger.warn({ ...ctx, fallbackError }, 'Fallback magic link creation failed, returning 404');
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

/**
 * BULLETPROOF FALLBACK: Create magic link directly when webhook fails
 * This function verifies the payment with Stripe and creates the user + magic link
 */
async function createMagicLinkFallback(sessionId: string, supabase: any, logger: any, ctx: any) {
  try {
    // Import Stripe SDK for payment verification
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    
    logger.info({ ...ctx, sessionId }, '🔍 FALLBACK: Verifying payment with Stripe SDK');
    
    // Verify the checkout session with Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (!session || session.payment_status !== 'paid') {
      logger.warn({ ...ctx, sessionId, paymentStatus: session?.payment_status }, 'FALLBACK: Payment not completed, skipping magic link creation');
      return { success: false, reason: 'Payment not completed' };
    }
    
    // Extract metadata from the session
    const metadata = session.metadata || {};
    const email = metadata.email || session.customer_details?.email;
    const source = metadata.source;
    const quizSessionId = metadata.session || metadata.sessionId;
    
    if (!email || source !== 'quiz') {
      logger.warn({ ...ctx, email, source }, 'FALLBACK: Not a quiz checkout or missing email');
      return { success: false, reason: 'Not a quiz checkout or missing email' };
    }
    
    logger.info({ 
      ...ctx, 
      email: email.substring(0, 3) + '***', 
      sessionId, 
      quizSessionId,
      paymentStatus: session.payment_status 
    }, '🎯 FALLBACK: Payment verified, creating user and magic link');
    
    // Check if user already exists
    const { data: existingUser } = await supabase.auth.admin.listUsers();
    let user = existingUser.users.find(u => u.email === email);
    
    if (!user) {
      // Get quiz response for user creation
      const { data: quizResponse } = await supabase
        .from('quiz_responses')
        .select('*')
        .eq('session_id', quizSessionId)
        .eq('email', email)
        .single();
      
      const userName = quizResponse?.character_type 
        ? `${quizResponse.character_type}_lover`
        : email.split('@')[0];
      
      // Create new user
      const { data: newUser, error: userError } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          name: userName,
          source: 'quiz_checkout_fallback',
          character_type: quizResponse?.character_type,
          body_type: quizResponse?.body_type,
          session_id: quizSessionId,
        }
      });
      
      if (userError || !newUser.user) {
        logger.error({ ...ctx, error: userError }, 'FALLBACK: Failed to create user');
        return { success: false, reason: 'Failed to create user' };
      }
      
      user = newUser.user;
      logger.info({ ...ctx, userId: user.id }, '✅ FALLBACK: User created successfully');
    }
    
    // Generate magic link
    const { data: magicLink, error: magicLinkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: user.email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/home?welcome=premium`
      }
    });
    
    if (magicLinkError || !magicLink) {
      logger.error({ ...ctx, error: magicLinkError }, 'FALLBACK: Failed to generate magic link');
      return { success: false, reason: 'Failed to generate magic link' };
    }
    
    // Update user metadata with magic link and session ID
    await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        magic_link_token: magicLink.properties.action_link,
        stripe_session_id: sessionId, // Use the actual Stripe checkout session ID
        magic_link_created_at: new Date().toISOString(),
        created_via_fallback: true
      }
    });
    
    logger.info({ 
      ...ctx, 
      userId: user.id, 
      sessionId,
      magicLinkToken: magicLink.properties.action_link?.substring(0, 50) + '...'
    }, '🎉 FALLBACK SUCCESS: Magic link created and stored with correct session ID');
    
    return { 
      success: true, 
      magicLinkToken: magicLink.properties.action_link 
    };
    
  } catch (error) {
    logger.error({ ...ctx, error }, 'FALLBACK: Critical error during fallback magic link creation');
    return { success: false, reason: 'Critical error', error };
  }
}