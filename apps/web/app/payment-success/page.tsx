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

  // Fetch session details to get email from metadata
  useEffect(() => {
    const fetchSessionDetails = async () => {
      if (!sessionId) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/billing/session-details?session_id=${sessionId}`);
        const data = await response.json();
        
        if (data.success && data.email) {
          setDisplayEmail(data.email);
        }
      } catch (error) {
        console.error('Failed to fetch session details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSessionDetails();
  }, [sessionId]);
  
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
          
          {loading ? (
            <div className="bg-muted/50 rounded-lg p-4 flex items-center justify-center">
              <Spinner className="h-5 w-5 mr-2" />
              <span className="text-sm text-muted-foreground">Loading payment details...</span>
            </div>
          ) : displayEmail ? (
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-2">Your email:</p>
              <p className="font-medium">{displayEmail}</p>
            </div>
          ) : null}

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