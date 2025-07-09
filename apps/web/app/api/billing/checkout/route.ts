import { NextResponse } from 'next/server';
import { enhanceRouteHandler } from '@kit/next/routes';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { createBillingGatewayService } from '@kit/billing-gateway';
import { getLogger } from '@kit/shared/logger';
import { z } from 'zod';

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
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('id')
      .eq('primary_owner_user_id', user.id)
      .eq('is_personal_account', true)
      .single();

    if (accountError || !account) {
      logger.error({ ...ctx, error: accountError }, 'Failed to get user account');
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Map plan IDs to actual Stripe price IDs
    const planIdMap = {
      'premium-monthly': process.env.HUSHPIXEL_PREMIUM_MONTHLY_PRICE_ID || 'price_test_mock_monthly',
      'premium-annual': process.env.HUSHPIXEL_PREMIUM_ANNUAL_PRICE_ID || 'price_test_mock_annual'
    };

    const stripePriceId = planIdMap[body.planId as keyof typeof planIdMap];
    
    logger.info({ ...ctx, planId: body.planId, stripePriceId }, 'Stripe price ID mapping');
    
    if (!stripePriceId) {
      logger.error({ ...ctx, availablePlans: Object.keys(planIdMap) }, 'Invalid plan ID provided');
      return NextResponse.json({ error: 'Invalid plan ID' }, { status: 400 });
    }

    try {
      const billingGateway = createBillingGatewayService('stripe');
      
      // Create checkout session
      const session = await billingGateway.createCheckoutSession({
        accountId: account.id,
        customerId: undefined, // Will be created if doesn't exist
        priceId: stripePriceId,
        successUrl: body.successUrl,
        cancelUrl: body.cancelUrl,
        metadata: {
          accountId: account.id,
          userId: user.id,
          planId: body.planId,
          ...body.metadata
        }
      });

      logger.info({ ...ctx, sessionId: session.id }, 'Checkout session created successfully');

      return NextResponse.json({
        success: true,
        checkoutUrl: session.url,
        sessionId: session.id
      });

    } catch (error) {
      logger.error({ 
        ...ctx, 
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        stripePriceId,
        planId: body.planId
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