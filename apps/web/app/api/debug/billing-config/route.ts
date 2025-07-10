import { NextResponse } from 'next/server';
import billingConfig from '~/config/billing.config';

export async function GET() {
  try {
    // Return safe configuration data for debugging
    const debugInfo = {
      provider: billingConfig.provider,
      productCount: billingConfig.products.length,
      plans: billingConfig.products.flatMap(product => 
        product.plans.map(plan => ({
          id: plan.id,
          name: plan.name,
          paymentType: plan.paymentType,
          interval: plan.interval,
          lineItemsCount: plan.lineItems.length,
          priceId: plan.lineItems[0]?.id || 'missing'
        }))
      ),
      environment: {
        hasStripePublishableKey: !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
        hasStripeSecretKey: !!process.env.STRIPE_SECRET_KEY,
        hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'missing',
        nodeEnv: process.env.NODE_ENV
      }
    };

    return NextResponse.json(debugInfo);
  } catch (error) {
    return NextResponse.json({ 
      error: 'Configuration error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}