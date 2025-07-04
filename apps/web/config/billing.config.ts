/**
 * HushPixel Billing Configuration
 * Simple two-tier pricing model optimized for conversion
 */
import { BillingProviderSchema, createBillingSchema } from '@kit/billing';

// The billing provider to use
const provider = BillingProviderSchema.parse('stripe');

export default createBillingSchema({
  provider,
  products: [
    {
      id: 'premium',
      name: 'Premium',
      description: 'Unlimited AI companions and conversations',
      currency: 'USD',
      badge: 'Most Popular',
      highlighted: true,
      plans: [
        {
          name: 'Premium Monthly',
          id: 'premium-monthly',
          paymentType: 'recurring',
          interval: 'month',
          lineItems: [
            {
              id: process.env.HUSHPIXEL_PREMIUM_PRICE_ID || 'price_test_mock_monthly',
              name: 'Premium',
              cost: 24.99,
              type: 'flat' as const,
            },
          ],
        },
        {
          name: 'Premium Annual',
          id: 'premium-annual',
          paymentType: 'recurring',
          interval: 'year',
          lineItems: [
            {
              id: process.env.HUSHPIXEL_PREMIUM_ANNUAL_PRICE_ID || 'price_test_mock_annual',
              name: 'Premium Annual',
              cost: 199.99, // $16.67/month when billed annually (33% savings)
              type: 'flat' as const,
            },
          ],
        },
      ],
      features: [
        '✨ Unlimited HD generations',
        '💬 Unlimited conversations', 
        '🎨 Character consistency',
        '💾 Private gallery',
        '⚡ Priority generation',
        '🔒 No content restrictions',
        '❌ No ads',
        '📱 Mobile & desktop access'
      ],
    },
  ],
});
