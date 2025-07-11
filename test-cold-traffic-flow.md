# 🧪 Test Cold Traffic Checkout Flow

## Quick Test Steps (2 minutes)

### 1. **Open Incognito/Private Browser**
- Simulates cold traffic from Meta ads
- No existing authentication

### 2. **Complete Quiz Flow**
- Go to: https://app.hushpixel.com/quiz
- Select character type
- Select body type  
- Enter email

### 3. **Verify Generation Page**
URL should look like:
```
https://app.hushpixel.com/generate?character=brunette-beauty&body=fit&email=test@gmail.com&session=quiz_[timestamp]_[random]&source=quiz
```

### 4. **Click "Unlock Everything"**
- Should NOT redirect to sign-up
- Should go directly to checkout

### 5. **Verify Checkout URL**
URL should preserve email and session:
```
https://app.hushpixel.com/checkout?plan=premium-monthly&source=quiz&intent=premium&email=test@gmail.com&session=quiz_[timestamp]_[random]
```

## ✅ Success Criteria
- [ ] No forced signup redirect
- [ ] Email preserved in checkout URL
- [ ] Session preserved in checkout URL
- [ ] Can proceed to Stripe payment without creating account
- [ ] No 500 errors in console

## 🚀 Expected Flow
```
Quiz → AI Generation → Unlock Everything → Checkout → Payment
                                           ↑
                                      NO SIGNUP HERE!
```

## 🎯 Business Impact
- **Conversion**: Removing signup friction = higher conversion
- **Cold Traffic**: Meta ads users can pay immediately  
- **Revenue**: Direct path to payment = more money 💰