'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSupabase } from '@kit/supabase/hooks/use-supabase';
import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { Spinner } from '@kit/ui/spinner';

export default function PaymentSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useSupabase();
  const sessionId = searchParams.get('session_id');
  const [displayEmail, setDisplayEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoLoginStatus, setAutoLoginStatus] = useState<'attempting' | 'success' | 'failed' | null>(null);
  const [autoLoginError, setAutoLoginError] = useState<string | null>(null);

  // Auto-login flow
  useEffect(() => {
    const autoLogin = async () => {
      if (!sessionId) {
        setLoading(false);
        return;
      }

      // Clean the session ID first
      const cleanSessionId = sessionId.split('?')[0];
      
      try {
        // First fetch session details
        const detailsResponse = await fetch(`/api/billing/session-details?session_id=${cleanSessionId}`);
        const detailsData = await detailsResponse.json();
        
        if (detailsData.success && detailsData.email) {
          setDisplayEmail(detailsData.email);
        }
        
        // Wait a moment for webhook to process
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Attempt auto-login
        setAutoLoginStatus('attempting');
        const loginResponse = await fetch('/api/auth/auto-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: cleanSessionId })
        });
        
        const loginData = await loginResponse.json();
        
        if (loginResponse.ok && loginData.success) {
          setAutoLoginStatus('success');
          // Give Supabase a moment to set cookies
          await new Promise(resolve => setTimeout(resolve, 500));
          // Redirect to dashboard
          window.location.href = '/home?welcome=premium';
        } else {
          setAutoLoginStatus('failed');
          setAutoLoginError(loginData.error || 'Auto-login failed');
        }
      } catch (error) {
        console.error('Auto-login error:', error);
        setAutoLoginStatus('failed');
        setAutoLoginError('Network error during auto-login');
      } finally {
        setLoading(false);
      }
    };

    autoLogin();
  }, [sessionId]);
  
  // Remove the old auth check - we're handling it in auto-login now

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-6 w-6" />
            Payment Successful!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <p className="text-lg font-medium">
              Welcome to HushPixel Premium! 🎉
            </p>
            <p className="text-muted-foreground">
              Your payment has been processed successfully. Sign in with your email to access your premium features.
            </p>
          </div>
          
          {loading || autoLoginStatus === 'attempting' ? (
            <div className="bg-muted/50 rounded-lg p-4 flex flex-col items-center justify-center space-y-2">
              <div className="flex items-center">
                <Spinner className="h-5 w-5 mr-2" />
                <span className="text-sm text-muted-foreground">
                  {autoLoginStatus === 'attempting' ? 'Logging you in automatically...' : 'Processing payment...'}
                </span>
              </div>
              {autoLoginStatus === 'attempting' && (
                <p className="text-xs text-muted-foreground">You'll be redirected to your dashboard shortly</p>
              )}
            </div>
          ) : autoLoginStatus === 'failed' ? (
            <>
              {displayEmail && (
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground mb-2">Your email:</p>
                  <p className="font-medium">{displayEmail}</p>
                </div>
              )}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-800">
                  Auto-login is processing. Click below to complete sign-in:
                </p>
              </div>
            </>
          ) : displayEmail ? (
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-2">Your email:</p>
              <p className="font-medium">{displayEmail}</p>
            </div>
          ) : null}

          {autoLoginStatus === 'failed' && (
            <Button 
              onClick={() => {
                const signInUrl = displayEmail 
                  ? `/auth/sign-in?email=${encodeURIComponent(displayEmail)}&next=/home?welcome=premium&message=payment-success`
                  : '/auth/sign-in?next=/home?welcome=premium&message=payment-success';
                router.push(signInUrl);
              }}
              className="w-full"
              size="lg"
            >
              Complete Sign In
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}

          {autoLoginStatus !== 'attempting' && (
            <div className="space-y-2 text-xs text-muted-foreground text-center">
              <p>Your account has been created and payment confirmed.</p>
              {autoLoginStatus === 'failed' && (
                <p>Check your email for a sign-in link, or click the button above.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}