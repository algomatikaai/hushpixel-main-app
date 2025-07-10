import { getPlanTypesMap } from '@kit/billing';
import { getBillingEventHandlerService } from '@kit/billing-gateway';
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
          // Custom handler for guest checkout completion
          await handleGuestCheckoutCompletion(subscription, customerId);
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
 * Handle guest checkout completion - create user accounts for quiz users who paid
 */
async function handleGuestCheckoutCompletion(subscription: any, customerId: string) {
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
    const metadata = subscription.metadata || {};
    const sessionId = metadata.session || metadata.sessionId;
    const source = metadata.source;
    const email = metadata.email;

    logger.info({ ...ctx, sessionId, source, email: email?.substring(0, 3) + '***' }, 'Checkout metadata extracted');

    // If this looks like a guest checkout from quiz
    if (source === 'quiz' && sessionId && email) {
      logger.info({ ...ctx, sessionId }, 'Detected guest checkout from quiz, creating user account...');

      // Get quiz responses for context
      const { data: quizResponse, error: quizError } = await supabase
        .from('quiz_responses')
        .select('*')
        .eq('session_id', sessionId)
        .eq('email', email)
        .single();

      if (quizError || !quizResponse) {
        logger.warn({ ...ctx, error: quizError }, 'Could not find quiz response for guest checkout');
        // Continue anyway - we can still create the user
      }

      // Check if user already exists
      const { data: existingUser } = await supabase.auth.admin.getUserByEmail(email);
      
      if (existingUser.user) {
        logger.info({ ...ctx, userId: existingUser.user.id }, 'User already exists, updating subscription account mapping...');
        
        // Update subscription to point to existing user's account
        if ('target_subscription_id' in subscription) {
          const { error: updateError } = await supabase
            .from('subscriptions')
            .update({ account_id: existingUser.user.id })
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
          session_id: sessionId,
        }
      });

      if (userError || !newUser.user) {
        logger.error({ ...ctx, error: userError }, 'Failed to create user account');
        throw new Error('Failed to create user account');
      }

      logger.info({ ...ctx, userId: newUser.user.id }, 'Successfully created user account');

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