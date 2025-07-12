'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSupabase } from '@kit/supabase/hooks/use-supabase';

export default function PaymentSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useSupabase();
  const [attempts, setAttempts] = useState(0);
  const [status, setStatus] = useState<'loading' | 'fallback' | 'success'>('loading');

  useEffect(() => {
    const retrieveMagicLink = async () => {
      const sessionId = searchParams.get('session_id');
      const email = searchParams.get('email') || '';

      // 🔍 DEBUG: Log session details
      console.log('🔍 Success page session ID:', sessionId);
      console.log('🔍 Success page email:', email);
      console.log('🔍 All URL params:', Object.fromEntries(searchParams.entries()));

      if (!sessionId) {
        // No session ID, fallback immediately
        console.log('❌ No session ID found in URL, falling back to sign-in');
        setStatus('fallback');
        router.push('/auth/sign-in?message=payment-success');
        return;
      }

      // ROBUST POLLING: Try for 15 seconds (15 attempts, 1 second apart)
      for (let attempt = 1; attempt <= 15; attempt++) {
        setAttempts(attempt);

        try {
          console.log(`🔍 Polling attempt ${attempt}/15 for session ID: ${sessionId}`);
          
          const response = await fetch('/api/auth/payment-success', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId })
          });

          const responseData = await response.json();
          console.log(`🔍 API response status: ${response.status}`, responseData);

          if (response.ok) {
            const { magicLinkToken } = responseData;
            if (magicLinkToken) {
              console.log('✅ Magic link found! Redirecting to:', magicLinkToken);
              setStatus('success');
              // Auto sign-in with magic link - ZERO FRICTION!
              window.location.href = magicLinkToken;
              return;
            } else {
              console.log('⚠️ API response OK but no magic link token found');
            }
          } else {
            console.log(`❌ API returned ${response.status}:`, responseData);
          }
        } catch (error) {
          console.warn(`❌ Attempt ${attempt} failed:`, error);
        }

        // Wait 1 second between attempts
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // BULLETPROOF FALLBACK: Auto-send magic link after 15 seconds
      setStatus('fallback');

      if (email) {
        try {
          // Automatically send magic link
          const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
              emailRedirectTo: `${window.location.origin}/home?welcome=premium`
            }
          });

          if (!error) {
            router.push(`/auth/sign-in?message=magic-link-sent&email=${encodeURIComponent(email)}`);
          } else {
            console.warn('Failed to send magic link:', error);
            router.push(`/auth/sign-in?message=payment-success&email=${encodeURIComponent(email)}`);
          }
        } catch (error) {
          console.warn('Error sending fallback magic link:', error);
          router.push(`/auth/sign-in?message=payment-success&email=${encodeURIComponent(email)}`);
        }
      } else {
        router.push('/auth/sign-in?message=payment-success');
      }
    };

    // Start polling immediately (no artificial delay needed)
    retrieveMagicLink();
  }, [router, searchParams, supabase.auth]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center p-8 max-w-md mx-auto">
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Payment Successful!</h1>
          <p className="text-muted-foreground text-lg mb-6">
            {status === 'loading' && 'Setting up your premium access...'}
            {status === 'fallback' && 'Sending you a sign-in link...'}
            {status === 'success' && 'Redirecting to your dashboard...'}
          </p>
        </div>

        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
          {status === 'loading' && (
            <p className="text-sm text-muted-foreground">
              Checking authentication... (Attempt {attempts}/15)
            </p>
          )}
          {status === 'fallback' && (
            <p className="text-sm text-muted-foreground">
              Please wait while we send you a sign-in link
            </p>
          )}
          {status === 'success' && (
            <p className="text-sm text-muted-foreground">
              Success! Redirecting you now...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}