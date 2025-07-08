# 💳 Stripe Production Setup Guide

## Current Status: Test Mode ⚠️
Currently using Stripe test keys. Need to activate production for real payments.

## 1. Create Stripe Products (Do this in Stripe Dashboard)

### Product: "HushPixel Premium"
```
Product Name: HushPixel Premium
Description: Unlimited AI companions - Less than a cup of coffee per day!
```

### Price 1: Monthly Plan
```
Amount: $24.99
Currency: USD
Billing Period: Monthly
Price ID: Will generate → copy to HUSHPIXEL_PREMIUM_PRICE_ID
```

### Price 2: Annual Plan  
```
Amount: $199.99
Currency: USD
Billing Period: Yearly
Price ID: Will generate → copy to HUSHPIXEL_PREMIUM_ANNUAL_PRICE_ID
```

## 2. Get Production Keys from Stripe Dashboard

### Publishable Key (Public)
```
Format: pk_live_xxxxxxxxxxxxx
Environment Variable: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
```

### Secret Key (Private)
```
Format: sk_live_xxxxxxxxxxxxx  
Environment Variable: STRIPE_SECRET_KEY
```

## 3. Configure Webhook in Stripe Dashboard

### Webhook Endpoint URL
```
https://app.hushpixel.com/api/billing/webhook
```

### Events to Subscribe To
```
✅ checkout.session.completed
✅ customer.subscription.created  
✅ customer.subscription.updated
✅ customer.subscription.deleted
✅ invoice.payment_succeeded
✅ invoice.payment_failed
```

### Webhook Signing Secret
```
Format: whsec_xxxxxxxxxxxxx
Environment Variable: STRIPE_WEBHOOK_SECRET
```

## 4. Update Vercel Environment Variables

Replace these in Vercel production environment:

```bash
# Stripe Configuration
NEXT_PUBLIC_BILLING_PROVIDER="stripe"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_your_key_here"
STRIPE_SECRET_KEY="sk_live_your_key_here"  
STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret_here"

# Product Price IDs (from step 1)
HUSHPIXEL_PREMIUM_PRICE_ID="price_live_monthly_id_here"
HUSHPIXEL_PREMIUM_ANNUAL_PRICE_ID="price_live_annual_id_here"
```

## 5. Test Production Payment Flow

### Test Sequence:
1. **Generate first free image** (WOW factor)
2. **Click "Unlock Premium"** 
3. **Complete Stripe checkout** with real card
4. **Verify subscription activated** in database
5. **Test unlimited generations** work

### Test Cards (Use these even in production for testing):
```
Success: 4242 4242 4242 4242 (any future date, any CVC)
Decline: 4000 0000 0000 0002
```

## 6. Revenue Flow Verification

### Expected User Journey:
```
Quiz → Email → INSTANT NSFW WOW → Want More → 
Paywall → $24.99/month → Unlimited Access → MONEY! 💰
```

### Success Metrics:
- [ ] Users complete checkout successfully
- [ ] Subscriptions appear in Stripe Dashboard
- [ ] Database updates with subscription status  
- [ ] Premium features unlock immediately
- [ ] Webhooks process correctly

## 7. Go-Live Checklist

- [ ] Stripe products created with correct pricing
- [ ] Production keys added to Vercel  
- [ ] Webhook configured and tested
- [ ] Test payment flow end-to-end
- [ ] Database subscription checks working
- [ ] Premium features unlock properly

## 🚀 Expected Results

**First paying customer within hours of going live!**

The WOW factor NSFW generation + immediate paywall + professional checkout = instant revenue.

## Emergency Rollback

If issues arise:
```bash
# Revert to test mode in Vercel:
STRIPE_PUBLISHABLE_KEY="pk_test_TYooMQauvdEDq54NiTphI7jx"
STRIPE_SECRET_KEY="sk_test_4eC39HqLyjWDarjtT1zdp7dc"
```

## Support

- Stripe Dashboard: https://dashboard.stripe.com
- Webhook testing: Use Stripe CLI for local testing
- Payment testing: Always test with real amounts before launch