#!/usr/bin/env node

/**
 * Test script to verify guest checkout API is deployed and working
 * Run with: node test-guest-checkout.js
 */

const testGuestCheckout = async () => {
  const testData = {
    planId: 'premium-monthly',
    successUrl: 'https://app.hushpixel.com/home?welcome=premium',
    cancelUrl: 'https://app.hushpixel.com/checkout',
    email: 'test@example.com',
    sessionId: 'test_session_123',
    source: 'quiz',
    metadata: {
      character_type: 'brunette-beauty',
      body_type: 'fit'
    }
  };

  console.log('🧪 Testing guest checkout API...');
  console.log('📤 Test payload:', JSON.stringify(testData, null, 2));

  try {
    const response = await fetch('https://app.hushpixel.com/api/billing/guest-checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    console.log('📥 Response status:', response.status);
    console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));

    if (response.status === 404) {
      console.log('❌ API endpoint not found - deployment issue likely');
      return;
    }

    const responseData = await response.json();
    console.log('📥 Response data:', JSON.stringify(responseData, null, 2));

    if (response.ok && responseData.checkoutToken) {
      console.log('✅ Guest checkout API is working!');
    } else {
      console.log('❌ Guest checkout API error:', responseData.error);
    }

  } catch (error) {
    console.error('💥 Request failed:', error.message);
    
    if (error.message.includes('fetch is not defined')) {
      console.log('📝 Note: Run this script in Node.js 18+ or install node-fetch');
    }
  }
};

// Run test
testGuestCheckout();