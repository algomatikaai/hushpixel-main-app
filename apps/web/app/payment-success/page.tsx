'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSupabase } from '@kit/supabase/hooks/use-supabase';
import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { CheckCircle, ArrowRight } from 'lucide-react';

export default function PaymentSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useSupabase();
  const email = searchParams.get('email');
  const sessionId = searchParams.get('session_id');
  
  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        router.push('/home?welcome=premium');
      }
    };
    checkAuth();
  }, [router, supabase]);

  const displayEmail = email ? decodeURIComponent(email) : null;

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
          
          {displayEmail && (
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-2">Your email:</p>
              <p className="font-medium">{displayEmail}</p>
            </div>
          )}

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
            Sign In to Access Premium
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>

          <div className="space-y-2 text-xs text-muted-foreground text-center">
            <p>Your account has been created and payment confirmed.</p>
            <p>Check your email for a sign-in link, or sign in with your email above.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}