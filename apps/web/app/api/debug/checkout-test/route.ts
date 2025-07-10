import { NextResponse } from 'next/server';
import { enhanceRouteHandler } from '@kit/next/routes';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { createBillingGatewayService } from '@kit/billing-gateway';
import { getLogger } from '@kit/shared/logger';
import billingConfig from '~/config/billing.config';

export const POST = enhanceRouteHandler(
  async function ({ body, user }) {
    const logger = await getLogger();
    const ctx = { name: 'checkout-test', userId: user.id };

    logger.info(ctx, 'Testing checkout creation for debugging');

    const supabase = getSupabaseServerClient();
    
    // Get or create user's account
    let { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('id')
      .eq('primary_owner_user_id', user.id)
      .eq('is_personal_account', true)
      .single();

    if (accountError || !account) {
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
        return NextResponse.json({ 
          error: 'Account setup failed',
          details: createError?.message 
        }, { status: 500 });
      }
      
      account = newAccount;
    }

    // Test both plans
    const results = {};
    
    for (const planId of ['premium-monthly', 'premium-annual']) {
      try {
        const allPlans = billingConfig.products.flatMap(product => product.plans);
        const selectedPlan = allPlans.find(plan => plan.id === planId);
        
        if (!selectedPlan) {
          results[planId] = { error: 'Plan not found' };
          continue;
        }

        const billingGateway = createBillingGatewayService('stripe');
        
        const variantQuantities = selectedPlan.lineItems.map(item => ({
          variantId: item.id,
          quantity: 1
        }));
        
        logger.info({ 
          ...ctx, 
          planId,
          planDetails: {
            planName: selectedPlan.name,
            lineItems: selectedPlan.lineItems,
            variantQuantities
          }
        }, `Testing ${planId} checkout creation`);
        
        const result = await billingGateway.createCheckoutSession({
          accountId: account.id,
          customerId: undefined,
          plan: selectedPlan,
          returnUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/home?welcome=premium`,
          variantQuantities,
          metadata: {
            accountId: account.id,
            userId: user.id,
            planId: planId,
            source: 'debug-test'
          }
        });

        results[planId] = {
          success: true,
          hasCheckoutToken: !!result.checkoutToken,
          planName: selectedPlan.name,
          priceId: selectedPlan.lineItems[0]?.id
        };
        
      } catch (error) {
        logger.error({ 
          ...ctx, 
          planId,
          error: error instanceof Error ? error.message : error,
          stack: error instanceof Error ? error.stack : undefined
        }, `Failed to create checkout for ${planId}`);
        
        results[planId] = {
          error: error instanceof Error ? error.message : 'Unknown error',
          planId
        };
      }
    }

    return NextResponse.json({
      success: true,
      accountId: account.id,
      userId: user.id,
      results
    });
  },
  {
    auth: true,
  }
);