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
      name: 'HushPixel Premium',
      description: 'Unlimited AI companions - Less than a cup of coffee per day!',
      currency: 'USD',
      badge: 'Best Value',
      highlighted: true,
      plans: [
        {
          name: 'Premium Monthly - Only $0.83/day!',
          id: 'premium-monthly',
          paymentType: 'recurring',
          interval: 'month',
          lineItems: [
            {
              id: process.env.HUSHPIXEL_PREMIUM_PRICE_ID || 'price_test_mock_monthly',
              name: 'Premium Monthly',
              cost: 24.99,
              type: 'flat' as const,
            },
          ],
        },
        {
          name: 'Premium Annual - Only $0.55/day! Save 33%',
          id: 'premium-annual',
          paymentType: 'recurring',
          interval: 'year',
          lineItems: [
            {
              id: process.env.HUSHPIXEL_PREMIUM_ANNUAL_PRICE_ID || 'price_test_mock_annual',
              name: 'Premium Annual (Save 33%)',
              cost: 199.99, // $0.55/day when billed annually (33% savings vs monthly)
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
