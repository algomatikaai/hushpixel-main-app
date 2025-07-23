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
            subscriptionId: subscription.id,
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
 * Handle guest checkout completion using Makerkit's standard patterns
 */
async function handleGuestCheckoutCompletion(subscription: any, customerId: string, sessionId?: string) {
  const logger = await getLogger();
  const supabase = getSupabaseServerAdminClient();
  
  const ctx = {
    name: 'guest-checkout-completion',
    customerId,
    sessionId,
  };

  logger.info(ctx, 'Processing guest checkout completion...');

  try {
    if (!sessionId) {
      logger.warn(ctx, 'No session ID provided, skipping guest checkout processing');
      return;
    }

    // Get checkout session metadata from Stripe
    const stripe = await createStripeClient();
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);
    const metadata = checkoutSession.metadata || {};

    const source = metadata.source;
    const email = metadata.email;

    logger.info({ 
      ...ctx, 
      source, 
      email: email?.substring(0, 3) + '***',
      hasMetadata: !!Object.keys(metadata).length
    }, 'Retrieved checkout session metadata');

    // Only process quiz guest checkouts
    if (source !== 'quiz' || !email) {
      logger.info(ctx, 'Not a quiz guest checkout, skipping user creation');
      return;
    }

    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers.users.find(user => user.email === email);

    let userId: string;
    
    if (existingUser) {
      logger.info({ ...ctx, userId: existingUser.id }, 'User already exists');
      userId = existingUser.id;
    } else {
      // Create new user
      const { data: newUser, error: userError } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          name: email.split('@')[0],
          source: 'quiz_checkout',
        }
      });

      if (userError || !newUser.user) {
        logger.error({ ...ctx, error: userError }, 'Failed to create user');
        throw new Error('Failed to create user account');
      }

      logger.info({ ...ctx, userId: newUser.user.id }, 'Created new user');
      userId = newUser.user.id;
    }

    // Generate magic link using Makerkit's standard approach
    const { data: authLink, error: authLinkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/home?welcome=premium`
      }
    });

    if (authLinkError || !authLink) {
      logger.error({ ...ctx, error: authLinkError }, 'Failed to generate magic link');
      throw new Error('Failed to generate authentication link');
    }

    // Store magic link token in user metadata for API lookup
    const magicLinkToken = authLink.properties.action_link;
    await supabase.auth.admin.updateUserById(userId, {
      user_metadata: {
        magic_link_token: magicLinkToken,
        stripe_session_id: sessionId,
        created_at: new Date().toISOString()
      }
    });

    logger.info({ 
      ...ctx, 
      userId,
      magicLinkExists: !!magicLinkToken
    }, '✅ Magic link generated and stored successfully');

  } catch (error) {
    logger.error({ ...ctx, error }, 'Failed to process guest checkout completion');
    throw error;
  }
}

