import { NextResponse } from 'next/server';
import { enhanceRouteHandler } from '@kit/next/routes';
import { createBillingGatewayService } from '@kit/billing-gateway';
import { getLogger } from '@kit/shared/logger';
import { z } from 'zod';
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

    try {
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
      
      // Create checkout session for guest user
      const result = await billingGateway.createCheckoutSession({
        // No accountId for guest checkout - will be created after payment
        accountId: '', // Empty string instead of undefined to satisfy type
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
          is_guest_checkout: 'true'
        }
      });

      logger.info({ ...ctx, checkoutToken: result.checkoutToken ? 'present' : 'missing' }, 'Guest checkout session created successfully');

      return NextResponse.json({
        success: true,
        checkoutToken: result.checkoutToken
      });

    } catch (error) {
      logger.error({ 
        ...ctx, 
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        planId: body.planId,
        planName: selectedPlan.name,
        selectedPlanDetails: selectedPlan,
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