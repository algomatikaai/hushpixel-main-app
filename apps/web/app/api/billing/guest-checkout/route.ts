import { NextResponse } from 'next/server';
import { enhanceRouteHandler } from '@kit/next/routes';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { createBillingGatewayService } from '@kit/billing-gateway';
import { getLogger } from '@kit/shared/logger';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import billingConfig from '~/config/billing.config';

const CreateGuestCheckoutSchema = z.object({
  planId: z.string().min(1),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
  email: z.string().email(),
  sessionId: z.string().min(1),
  source: z.string().default('quiz'),
  metadata: z.object({
    character_type: z.string().optional().nullable(),
    body_type: z.string().optional().nullable(),
  }).optional()
});

/**
 * @description Handle guest checkout for unauthenticated users from Meta ads
 * Creates Stripe checkout session with metadata for post-payment user creation
 */
export const POST = enhanceRouteHandler(
  async function ({ body }) {
    const logger = await getLogger();
    const ctx = { name: 'billing.guest-checkout', email: body.email?.substring(0, 3) + '***' };

    logger.info(ctx, 'Creating guest checkout session');

    // Find the plan from billing configuration
    const allPlans = billingConfig.products.flatMap(product => product.plans);
    const selectedPlan = allPlans.find(plan => plan.id === body.planId);
    
    if (!selectedPlan) {
      logger.error({ ...ctx, availablePlans: allPlans.map(p => p.id) }, 'Invalid plan ID provided');
      return NextResponse.json({ error: 'Invalid plan ID' }, { status: 400 });
    }

    logger.info({ ...ctx, planId: body.planId, planName: selectedPlan.name }, 'Plan found successfully');

    // Create temporary user (MakerKit trigger will auto-create account)
    const supabase = getSupabaseServerAdminClient();

    // Helper function to get account for user with retry logic
    const getAccountForUser = async (userId: string, retries = 3) => {
      for (let i = 0; i < retries; i++) {
        const { data: account, error } = await supabase
          .from('accounts')
          .select('id')
          .eq('primary_owner_user_id', userId)
          .single();

        if (account && !error) {
          logger.info({ ...ctx, userId, accountId: account.id, attempt: i + 1 }, 'Account found for temp user');
          return account;
        }

        // Wait 100ms before retry (handle MakerKit trigger delay)
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      throw new Error(`Account not created by MakerKit trigger after ${retries} attempts`);
    };

    let tempUser = null;

    try {
      const tempEmail = `temp-${randomUUID()}@hushpixel-checkout.internal`;
      const guestUserName = body.email.split('@')[0] || 'Guest User';
      
      logger.info({ ...ctx, tempEmail, guestEmail: body.email }, 'Creating temporary user for guest checkout');
      
      const tempUserResponse = await supabase.auth.admin.createUser({
        email: tempEmail, // Guaranteed unique, won't conflict with real emails
        email_confirm: true, // Skip email verification for temp user
        user_metadata: {
          is_temporary: true,
          guest_email: body.email,
          guest_name: guestUserName,
          session_id: body.sessionId,
          created_for: 'guest_checkout',
          created_at: new Date().toISOString(),
          character_type: body.metadata?.character_type || 'unknown',
          body_type: body.metadata?.body_type || 'unknown'
        }
      });
      
      tempUser = tempUserResponse;
        
      if (!tempUser.data.user) {
        logger.error({ ...ctx, tempEmail }, 'Failed to create temporary user');
        return NextResponse.json({ 
          error: 'Failed to setup guest checkout',
          details: 'Could not create temporary user'
        }, { status: 500 });
      }
      
      logger.info({ 
        ...ctx, 
        tempUserId: tempUser.data.user.id, 
        tempEmail 
      }, 'Successfully created temporary user');

      // Get auto-created account (created by MakerKit trigger)
      const account = await getAccountForUser(tempUser.data.user.id);
      
      logger.info({ 
        ...ctx, 
        tempUserId: tempUser.data.user.id,
        accountId: account.id 
      }, 'Retrieved auto-created account from MakerKit trigger');

      const billingGateway = createBillingGatewayService('stripe');
      
      // Build variant quantities from line items
      const variantQuantities = selectedPlan.lineItems.map(item => ({
        variantId: item.id,
        quantity: 1
      }));
      
      logger.info({ 
        ...ctx, 
        planDetails: {
          planId: body.planId,
          planName: selectedPlan.name,
          lineItems: selectedPlan.lineItems,
          variantQuantities
        }
      }, 'Starting guest checkout session creation');
      
      // Create checkout session for guest user with valid account ID
      const result = await billingGateway.createCheckoutSession({
        accountId: account.id, // ✅ Valid UUID from MakerKit auto-created account
        customerId: undefined, // Will be created if doesn't exist
        plan: selectedPlan,
        returnUrl: body.successUrl,
        variantQuantities,
        metadata: {
          // Critical metadata for post-payment user creation
          source: body.source,
          email: body.email,
          session: body.sessionId, // Changed from sessionId to session for consistency
          planId: body.planId,
          character_type: body.metadata?.character_type || 'unknown',
          body_type: body.metadata?.body_type || 'unknown',
          // Flag this as guest checkout
          is_guest_checkout: 'true',
          // Store temp user info for webhook cleanup
          temp_user_id: tempUser.data.user.id,
          temp_email: tempEmail
        }
      });

      logger.info({
        ...ctx,
        tempUserId: tempUser.data.user.id,
        tempEmail,
        accountId: account.id,
        guestEmail: body.email,
        checkoutToken: result.checkoutToken ? 'created' : 'missing',
        metadataPassedToStripe: {
          source: body.source,
          email: body.email,
          session: body.sessionId,
          planId: body.planId,
          character_type: body.metadata?.character_type || 'unknown',
          body_type: body.metadata?.body_type || 'unknown',
          is_guest_checkout: 'true',
          temp_user_id: tempUser.data.user.id,
          temp_email: tempEmail
        }
      }, '🚨 GUEST CHECKOUT COMPLETED - Metadata sent to Stripe for webhook processing');

      return NextResponse.json({
        success: true,
        checkoutToken: result.checkoutToken
      });

    } catch (error) {
      // CRITICAL: Cleanup temp user if anything fails
      if (tempUser?.data?.user?.id) {
        logger.warn({ 
          ...ctx, 
          tempUserId: tempUser.data.user.id,
          tempEmail: tempUser.data.user.email
        }, 'Cleaning up temp user due to checkout failure');
        
        try {
          await supabase.auth.admin.deleteUser(tempUser.data.user.id);
          logger.info({ 
            ...ctx, 
            tempUserId: tempUser.data.user.id 
          }, 'Temp user cleaned up successfully after failure');
        } catch (cleanupError) {
          logger.error({ 
            ...ctx, 
            tempUserId: tempUser.data.user.id, 
            cleanupError: cleanupError instanceof Error ? cleanupError.message : cleanupError
          }, 'Failed to cleanup temp user after checkout failure');
        }
      }
      
      logger.error({ 
        ...ctx, 
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        planId: body.planId,
        planName: selectedPlan.name,
        selectedPlanDetails: selectedPlan,
        guestEmail: body.email,
        stripeError: error instanceof Error && 'type' in error ? error : undefined
      }, 'Failed to create guest checkout session');
      
      return NextResponse.json(
        { 
          error: 'Failed to create checkout session',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
  },
  {
    auth: false, // No authentication required for guest checkout
    schema: CreateGuestCheckoutSchema,
  }
);