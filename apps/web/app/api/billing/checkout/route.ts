import { NextResponse } from 'next/server';
import { enhanceRouteHandler } from '@kit/next/routes';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { createBillingGatewayService } from '@kit/billing-gateway';
import { getLogger } from '@kit/shared/logger';
import { z } from 'zod';
import billingConfig from '~/config/billing.config';

const CreateCheckoutSchema = z.object({
  planId: z.string().min(1),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
  metadata: z.object({
    source: z.string().optional(),
    email: z.string().optional(),
    plan: z.string().optional()
  }).optional()
});

export const POST = enhanceRouteHandler(
  async function ({ body, user }) {
    const logger = await getLogger();
    const ctx = { name: 'billing.checkout', userId: user.id };

    logger.info(ctx, 'Creating checkout session');

    const supabase = getSupabaseServerClient();
    
    // Get user's account
    let { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('id')
      .eq('primary_owner_user_id', user.id)
      .eq('is_personal_account', true)
      .single();

    // If account doesn't exist, auto-create it (handles quiz users and other edge cases)
    if (accountError || !account) {
      logger.info({ ...ctx, originalError: accountError }, 'Account not found, auto-creating for user');
      
      const { data: newAccount, error: createError } = await supabase
        .from('accounts')
        .insert({
          id: user.id,
          primary_owner_user_id: user.id,
          name: user.email?.split('@')[0] || 'User',
          is_personal_account: true,
          email: user.email
        })
        .select('id')
        .single();
        
      if (createError || !newAccount) {
        logger.error({ 
          ...ctx, 
          originalError: accountError,
          createError 
        }, 'Failed to auto-create account for user');
        return NextResponse.json({ 
          error: 'Account setup failed',
          details: createError?.message || 'Could not create account'
        }, { status: 500 });
      }
      
      account = newAccount;
      logger.info({ ...ctx, accountId: account.id }, 'Successfully auto-created account for user');
    }

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
      }, 'Starting checkout session creation');
      
      // Create checkout session with correct parameters
      const result = await billingGateway.createCheckoutSession({
        accountId: account.id,
        customerId: undefined, // Will be created if doesn't exist
        plan: selectedPlan,
        returnUrl: body.successUrl, // Use returnUrl instead of successUrl/cancelUrl
        variantQuantities,
        metadata: {
          accountId: account.id,
          userId: user.id,
          planId: body.planId,
          ...body.metadata
        }
      });

      logger.info({ ...ctx, checkoutToken: result.checkoutToken ? 'present' : 'missing' }, 'Checkout session created successfully');

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
      }, 'Failed to create checkout session');
      
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
    auth: true,
    schema: CreateCheckoutSchema,
  }
);