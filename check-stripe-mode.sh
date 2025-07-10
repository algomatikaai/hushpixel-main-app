#!/bin/bash

echo "🔍 Checking Stripe Configuration Mode..."
echo "========================================"

# Check billing config
echo "📡 Fetching billing configuration..."
BILLING_CONFIG=$(curl -s https://app.hushpixel.com/api/debug/billing-config)

echo "✅ Billing Config Response:"
echo "$BILLING_CONFIG" | jq '.'

# Extract price IDs
MONTHLY_PRICE=$(echo "$BILLING_CONFIG" | jq -r '.plans[] | select(.id=="premium-monthly") | .priceId')
ANNUAL_PRICE=$(echo "$BILLING_CONFIG" | jq -r '.plans[] | select(.id=="premium-annual") | .priceId')

echo ""
echo "🎯 Price ID Summary:"
echo "Monthly: $MONTHLY_PRICE"
echo "Annual: $ANNUAL_PRICE"

echo ""
echo "🔧 Environment Status:"
echo "Node Environment: $(echo "$BILLING_CONFIG" | jq -r '.environment.nodeEnv')"
echo "Has Stripe Keys: $(echo "$BILLING_CONFIG" | jq -r '.environment.hasStripePublishableKey')"

echo ""
echo "💡 Next Steps:"
echo "1. Update Vercel environment variables to test mode"
echo "2. Test checkout: https://app.hushpixel.com/checkout?plan=premium-monthly"
echo "3. Use test card: 4242 4242 4242 4242"
echo ""
echo "🚀 Once working in test mode, revenue funnel will be unblocked!"