import { getPlanTypesMap } from '@kit/billing';
import { getBillingEventHandlerService } from '@kit/billing-gateway';
import { createStripeClient } from '@kit/stripe';
import { enhanceRouteHandler } from '@kit/next/routes';
import { getLogger } from '@kit/shared/logger';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import billingConfig from '~/config/billing.config';

/**
 * @description Handle the webhooks from Stripe related to checkouts
 * Enhanced to support guest checkout flow for quiz users
 */
export const POST = enhanceRouteHandler(
  async ({ request }) => {
    const provider = billingConfig.provider;
    const logger = await getLogger();

    const ctx = {
      name: 'billing.webhook',
      provider,
    };

    // Parse the webhook event to extract session ID
    const body = await request.clone().text();
    const event = JSON.parse(body);

    // 🚨 CRITICAL DEBUG: Log ALL webhook events to verify they're firing
    logger.info({
      ...ctx,
      eventType: event.type,
      eventId: event.id,
      objectId: event.data?.object?.id,
      objectType: event.data?.object?.object,
      isCheckoutSessionCompleted: event.type === 'checkout.session.completed',
      timestamp: new Date().toISOString()
    }, `🚨 WEBHOOK RECEIVED - TYPE: ${event.type}`);

    logger.info(ctx, `Received billing webhook. Processing...`);

    const supabaseClientProvider = () => getSupabaseServerAdminClient();

    const service = await getBillingEventHandlerService(
      supabaseClientProvider,
      provider,
      getPlanTypesMap(billingConfig),
    );
    
    try {
      await service.handleWebhookEvent(request, {
        onCheckoutSessionCompleted: async (subscription, customerId) => {
          // Extract session ID from the original event
          const sessionId = event.type === 'checkout.session.completed' 
            ? event.data.object.id 
            : null;
          
          logger.info({
            ...ctx,
            sessionId,
            customerId,
            subscriptionId: 'id' in subscription ? subscription.id : 'unknown',
            eventType: event.type,
            objectId: event.data?.object?.id
          }, '🎯 CHECKOUT SESSION COMPLETED - Calling handleGuestCheckoutCompletion with FIXED variables');
          
          // Custom handler for guest checkout completion
          await handleGuestCheckoutCompletion(subscription, customerId, sessionId);
        },
      });

      logger.info(ctx, `Successfully processed billing webhook`);

      return new Response('OK', { status: 200 });
    } catch (error) {
      logger.error({ ...ctx, error }, `Failed to process billing webhook`);

      return new Response('Failed to process billing webhook', {
        status: 500,
      });
    }
  },
  {
    auth: false,
  },
);

/**
 * Health check endpoint to verify webhook URL is accessible
 */
export const GET = enhanceRouteHandler(
  async () => {
    const logger = await getLogger();
    
    logger.info({ 
      name: 'webhook-health-check',
      timestamp: new Date().toISOString(),
      endpoint: '/api/billing/webhook'
    }, '🟢 Webhook health check endpoint accessed via GET');

    return new Response(JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      endpoint: '/api/billing/webhook',
      message: 'Webhook endpoint is accessible and logging is working',
      deploymentId: process.env.VERCEL_DEPLOYMENT_ID || 'local'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  },
  {
    auth: false,
  },
);

/**
 * Handle checkout completion for ZERO FRICTION money printer
 * Creates user after payment and generates auto sign-in session
 */
async function handleGuestCheckoutCompletion(subscription: any, customerId: string, sessionId?: string) {
  const logger = await getLogger();
  const supabase = getSupabaseServerAdminClient();
  
  const ctx = {
    name: 'checkout-completion',
    customerId,
    sessionId,
  };

  logger.info(ctx, 'Processing checkout completion - MONEY PRINTER MODE');

  try {
    if (!sessionId) {
      logger.warn(ctx, 'No session ID provided, using standard completion');
      return;
    }

    // Get checkout session metadata from Stripe
    const stripe = await createStripeClient();
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);
    const metadata = checkoutSession.metadata || {};
    const customerEmail = checkoutSession.customer_details?.email;

    const source = metadata.source;
    const email = metadata.email || customerEmail;
    const quizSessionId = metadata.quiz_session_id;

    logger.info({ 
      ...ctx, 
      source, 
      email: email?.substring(0, 3) + '***',
      customerEmail: customerEmail?.substring(0, 3) + '***',
      quizSessionId,
      hasMetadata: !!Object.keys(metadata).length
    }, 'Retrieved checkout session metadata');

    if (!email) {
      logger.warn(ctx, 'No email found in checkout session, skipping user processing');
      return;
    }

    // Get quiz data for this user
    const { data: quizData } = await supabase
      .from('quiz_responses')
      .select('*')
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers.users.find(user => user.email === email);

    let userId: string;
    
    if (existingUser) {
      logger.info({ 
        ...ctx, 
        userId: existingUser.id,
        hasQuizData: !!quizData
      }, 'User already exists - updating with payment completion');
      userId = existingUser.id;
    } else {
      // Create new user after payment (MONEY PRINTER FLOW)
      logger.info({ ...ctx }, 'Creating new user after payment completion');
      
      const { data: newUser, error: userError } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          name: email.split('@')[0],
          character_type: quizData?.character_type,
          body_type: quizData?.body_type,
          ab_test_variant: quizData?.ab_test_variant,
          source: 'payment_webhook',
          stripe_session_id: sessionId,
          quiz_session_id: quizSessionId,
          payment_completed_at: new Date().toISOString(),
          created_via: 'zero_friction_payment'
        }
      });

      if (userError || !newUser.user) {
        logger.error({ ...ctx, error: userError }, 'Failed to create user after payment');
        throw new Error('Failed to create user account');
      }

      logger.info({ ...ctx, userId: newUser.user.id }, 'Created new user after payment');
      userId = newUser.user.id;
    }

    // Link quiz response to user
    if (quizData) {
      await supabase
        .from('quiz_responses')
        .update({ user_id: userId })
        .eq('id', quizData.id);
      
      logger.info({ ...ctx, userId, quizId: quizData.id }, 'Linked quiz response to user');
    }

    // Generate auto sign-in session (NO AUTH WALL)
    const { data: authLink, error: authLinkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/home?welcome=premium&auto_signin=true`
      }
    });

    if (authLinkError || !authLink) {
      logger.error({ ...ctx, error: authLinkError }, 'Failed to generate auto sign-in link');
      // Don't throw error - payment succeeded, just log the issue
      logger.warn({ ...ctx, userId }, 'Payment processed but auto sign-in failed');
      return;
    }

    // Store auto sign-in URL for immediate redirect
    const autoSignInUrl = authLink.properties.action_link;
    await supabase.auth.admin.updateUserById(userId, {
      user_metadata: {
        ...existingUser?.user_metadata, // Preserve existing metadata
        auto_signin_url: autoSignInUrl,
        stripe_session_id: sessionId,
        payment_completed_at: new Date().toISOString(),
        auth_method: 'auto_signin_post_payment'
      }
    });

    logger.info({ 
      ...ctx, 
      userId,
      hasAutoSignIn: !!autoSignInUrl
    }, '✅ MONEY PRINTER: User created with auto sign-in after payment');

  } catch (error) {
    logger.error({ ...ctx, error }, 'Failed to process checkout completion');
    throw error;
  }
}

