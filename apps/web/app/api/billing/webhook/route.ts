import { getPlanTypesMap } from '@kit/billing';
import { getBillingEventHandlerService } from '@kit/billing-gateway';
import { createStripeClient } from '@kit/billing-stripe';
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
 * Handle guest checkout completion - create user accounts for quiz users who paid
 */
async function handleGuestCheckoutCompletion(subscription: any, customerId: string, sessionId?: string) {
  const logger = await getLogger();
  const supabase = getSupabaseServerAdminClient();
  
  const ctx = {
    name: 'guest-checkout-completion',
    customerId,
    subscriptionId: 'target_subscription_id' in subscription ? subscription.target_subscription_id : null,
  };

  logger.info(ctx, 'Processing guest checkout completion...');

  try {
    // Check if this is a guest checkout by looking for quiz session in metadata
    let metadata = subscription.metadata || {};
    
    // 🚨 CRITICAL FIX: For guest checkouts, metadata is on the checkout session, NOT subscription
    if ((!metadata.source || !metadata.email) && sessionId) {
      try {
        logger.info({ ...ctx, sessionId }, 'Subscription metadata empty/incomplete, retrieving from Stripe checkout session...');
        const stripe = await createStripeClient();
        const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);
        
        // Merge checkout session metadata with subscription metadata (checkout takes priority)
        metadata = { ...metadata, ...checkoutSession.metadata };
        
        logger.info({ 
          ...ctx, 
          checkoutMetadata: checkoutSession.metadata,
          mergedMetadata: metadata 
        }, '✅ Successfully retrieved metadata from Stripe checkout session');
        
      } catch (stripeError) {
        logger.warn({ 
          ...ctx, 
          error: stripeError,
          sessionId 
        }, 'Failed to retrieve checkout session metadata from Stripe');
        // Continue with subscription metadata only
      }
    }

    const quizSessionId = metadata.session || metadata.sessionId;
    const source = metadata.source;
    const email = metadata.email;

    // 🔍 DEBUG: Log comprehensive metadata analysis
    logger.info({ 
      ...ctx, 
      stripeSessionId: sessionId, // The Stripe checkout session ID from webhook parameter
      quizSessionId, // The quiz session ID from metadata
      source, 
      email: email?.substring(0, 3) + '***',
      subscriptionId: subscription.id,
      latestInvoice: subscription.latest_invoice,
      subscriptionMetadata: subscription.metadata,
      finalMetadata: metadata,
      metadataSource: metadata.source ? 'found' : 'missing'
    }, '🔍 METADATA ANALYSIS: Checkout session + subscription metadata merged');

    // If this looks like a guest checkout from quiz
    if (source === 'quiz' && quizSessionId && email) {
      logger.info({ ...ctx, stripeSessionId: sessionId, quizSessionId }, 'Detected guest checkout from quiz, creating user account...');

      // Get quiz responses for context
      const { data: quizResponse, error: quizError } = await supabase
        .from('quiz_responses')
        .select('*')
        .eq('session_id', quizSessionId)
        .eq('email', email)
        .single();

      if (quizError || !quizResponse) {
        logger.warn({ ...ctx, error: quizError }, 'Could not find quiz response for guest checkout');
        // Continue anyway - we can still create the user
      }

      // Check if user already exists (handle duplicate webhooks)
      const { data: existingUser } = await supabase.auth.admin.listUsers();
      const userExists = existingUser.users.find(user => user.email === email);
      
      if (userExists) {
        logger.info({ ...ctx, userId: userExists.id }, 'User already exists, generating auth link for existing user...');
        
        // Generate proper auth link using Makerkit pattern
        const { data: authLink, error: authLinkError } = await supabase.auth.admin.generateLink({
          type: 'signup', // Use signup type for new sessions
          email: userExists.email,
          options: {
            redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/home?welcome=premium&message=payment-success`
          }
        });

        if (!authLinkError && authLink) {
          logger.info({ 
            ...ctx, 
            userId: userExists.id,
            stripeSessionId: sessionId,
            authUrl: authLink.properties.action_link?.substring(0, 50) + '...'
          }, '✅ Auth link generated for existing user - will update Stripe success URL');
          
          // Store auth token in user metadata temporarily for lookup
          const tokenHash = authLink.properties.hashed_token;
          await supabase.auth.admin.updateUserById(userExists.id, {
            user_metadata: {
              ...userExists.user_metadata,
              auth_token_hash: tokenHash,
              stripe_session_id: sessionId,
              auth_link_created_at: new Date().toISOString()
            }
          });
          
        } else {
          logger.warn({ ...ctx, error: authLinkError }, 'Failed to generate auth link for existing user');
        }
        
        // Update subscription to point to existing user's account
        if ('target_subscription_id' in subscription) {
          const { error: updateError } = await supabase
            .from('subscriptions')
            .update({ account_id: userExists.id })
            .eq('id', subscription.target_subscription_id);

          if (updateError) {
            logger.error({ ...ctx, error: updateError }, 'Failed to update subscription account mapping');
            throw updateError;
          }
        }

        return;
      }

      // Create new user account
      const userName = quizResponse?.character_type 
        ? `${quizResponse.character_type}_lover`
        : email.split('@')[0];

      const { data: newUser, error: userError } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true, // Skip email confirmation for paid users
        user_metadata: {
          name: userName,
          source: 'quiz_checkout',
          character_type: quizResponse?.character_type,
          body_type: quizResponse?.body_type,
          session_id: quizSessionId, // Use quiz session ID for tracking
        }
      });

      if (userError || !newUser.user) {
        logger.error({ ...ctx, error: userError }, 'Failed to create user account');
        throw new Error('Failed to create user account');
      }

      logger.info({ ...ctx, userId: newUser.user.id }, 'Successfully created user account');

      // Generate proper auth link using Makerkit pattern
      const { data: authLink, error: authLinkError } = await supabase.auth.admin.generateLink({
        type: 'signup', // Use signup type for new user authentication
        email: newUser.user.email,
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/home?welcome=premium&message=payment-success`
        }
      });

      if (!authLinkError && authLink) {
        logger.info({ 
          ...ctx, 
          userId: newUser.user.id,
          stripeSessionId: sessionId,
          authUrl: authLink.properties.action_link?.substring(0, 50) + '...'
        }, '✅ Auth link generated for new user - ready for automatic login');
        
        // Store auth token hash in user metadata for lookup
        const tokenHash = authLink.properties.hashed_token;
        await supabase.auth.admin.updateUserById(newUser.user.id, {
          user_metadata: {
            ...newUser.user.user_metadata,
            auth_token_hash: tokenHash,
            stripe_session_id: sessionId,
            auth_link_created_at: new Date().toISOString()
          }
        });
        
      } else {
        logger.warn({ ...ctx, error: authLinkError }, 'Failed to generate auth link for new user');
      }

      // Update subscription to point to new user's account (the account is created automatically by trigger)
      if ('target_subscription_id' in subscription) {
        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({ account_id: newUser.user.id })
          .eq('id', subscription.target_subscription_id);

        if (updateError) {
          logger.error({ ...ctx, error: updateError }, 'Failed to update subscription account mapping');
          throw updateError;
        }
      }

      // Clean up temporary user if it exists
      const tempUserId = metadata.temp_user_id;
      const tempEmail = metadata.temp_email;
      
      if (tempUserId && tempUserId !== newUser.user.id) {
        await cleanupTempUser(tempUserId, tempEmail, ctx, supabase);
      }

      // Update quiz response with user ID for tracking
      if (quizResponse) {
        const { error: updateQuizError } = await supabase
          .from('quiz_responses')
          .update({ 
            user_id: newUser.user.id,
            status: 'converted'
          })
          .eq('id', quizResponse.id);

        if (updateQuizError) {
          logger.warn({ ...ctx, error: updateQuizError }, 'Failed to update quiz response with user ID');
        }
      }

      logger.info({ ...ctx, userId: newUser.user.id }, 'Guest checkout completion processed successfully');
    } else {
      logger.info(ctx, 'Regular checkout (not guest), skipping user creation');
    }

  } catch (error) {
    logger.error({ ...ctx, error }, 'Failed to process guest checkout completion');
    throw error;
  }
}

/**
 * Enhanced temp user cleanup function with comprehensive error handling
 */
async function cleanupTempUser(tempUserId: string, tempEmail: string | undefined, ctx: any, supabase: any) {
  const logger = await getLogger();
  
  try {
    logger.info({ 
      ...ctx, 
      tempUserId, 
      tempEmail: tempEmail?.substring(0, 10) + '***' 
    }, 'Starting temp user cleanup');
    
    // Delete temp user (cascades to account deletion via MakerKit)
    const { error: deleteUserError } = await supabase.auth.admin.deleteUser(tempUserId);
    
    if (deleteUserError) {
      logger.warn({ 
        ...ctx, 
        tempUserId, 
        error: deleteUserError 
      }, 'Failed to delete temp user via admin API');
    } else {
      logger.info({ 
        ...ctx, 
        tempUserId 
      }, 'Temp user cleaned up successfully');
    }
    
  } catch (error) {
    // Log but don't fail - real user conversion is more important
    logger.warn({ 
      ...ctx, 
      tempUserId, 
      error: error instanceof Error ? error.message : error
    }, 'Failed to cleanup temp user (non-critical)');
  }
}