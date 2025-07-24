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
 * Handle checkout completion using simplified Makerkit patterns
 * Supports both authenticated users (new flow) and guest checkout (backwards compatibility)
 */
async function handleGuestCheckoutCompletion(subscription: any, customerId: string, sessionId?: string) {
  const logger = await getLogger();
  const supabase = getSupabaseServerAdminClient();
  
  const ctx = {
    name: 'checkout-completion',
    customerId,
    sessionId,
  };

  logger.info(ctx, 'Processing checkout completion...');

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

    logger.info({ 
      ...ctx, 
      source, 
      email: email?.substring(0, 3) + '***',
      customerEmail: customerEmail?.substring(0, 3) + '***',
      hasMetadata: !!Object.keys(metadata).length,
      isGuestCheckout: metadata.is_guest_checkout === 'true'
    }, 'Retrieved checkout session metadata');

    if (!email) {
      logger.warn(ctx, 'No email found in checkout session, skipping user processing');
      return;
    }

    // Check if user already exists (most users should exist due to auto-creation)
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers.users.find(user => user.email === email);

    let userId: string;
    
    if (existingUser) {
      logger.info({ 
        ...ctx, 
        userId: existingUser.id,
        hasQuizData: !!(existingUser.user_metadata?.character_type && existingUser.user_metadata?.body_type),
        autoCreated: !!existingUser.user_metadata?.auto_created
      }, 'User already exists (likely auto-created from quiz)');
      userId = existingUser.id;

      // For existing auto-created users, we don't need magic links - they're already signed in
      if (existingUser.user_metadata?.auto_created) {
        logger.info({ ...ctx, userId }, 'Auto-created user completed payment - no additional auth needed');
        return;
      }
    } else {
      // Fallback: Create new user for legacy guest checkout
      logger.info({ ...ctx }, 'Creating new user for legacy guest checkout');
      
      const { data: newUser, error: userError } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          name: email.split('@')[0],
          source: 'legacy_guest_checkout',
          stripe_session_id: sessionId,
          created_at: new Date().toISOString()
        }
      });

      if (userError || !newUser.user) {
        logger.error({ ...ctx, error: userError }, 'Failed to create user');
        throw new Error('Failed to create user account');
      }

      logger.info({ ...ctx, userId: newUser.user.id }, 'Created new user for legacy checkout');
      userId = newUser.user.id;
    }

    // Generate magic link for authentication (only for users who need it)
    const { data: authLink, error: authLinkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/home?welcome=premium`
      }
    });

    if (authLinkError || !authLink) {
      logger.error({ ...ctx, error: authLinkError }, 'Failed to generate magic link');
      // Don't throw error - payment succeeded, just log the issue
      logger.warn({ ...ctx, userId }, 'Payment processed but magic link generation failed');
      return;
    }

    // Store magic link token in user metadata for API lookup
    const magicLinkToken = authLink.properties.action_link;
    await supabase.auth.admin.updateUserById(userId, {
      user_metadata: {
        ...existingUser?.user_metadata, // Preserve existing metadata
        magic_link_token: magicLinkToken,
        stripe_session_id: sessionId,
        payment_completed_at: new Date().toISOString()
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

