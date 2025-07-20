import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { Spinner } from '@kit/ui/spinner';
import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { CheckCircle, ArrowRight } from 'lucide-react';

interface PaymentSuccessPageProps {
  searchParams: Promise<{ 
    session_id?: string;
    email?: string;
  }>;
}

async function PaymentSuccessContent({ searchParams }: PaymentSuccessPageProps) {
  const params = await searchParams;
  const { session_id, email } = params;
  
  // Check if user is already authenticated
  const supabase = getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    // User already authenticated, redirect to home
    redirect('/home?welcome=premium');
  }

  // If we have email from query params, show sign-in prompt
  if (email) {
    return (
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
          
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-2">Your email:</p>
            <p className="font-medium">{decodeURIComponent(email)}</p>
          </div>

          <Button 
            onClick={() => {
              window.location.href = `/auth/sign-in?email=${email}&next=/home?welcome=premium&message=payment-success`;
            }}
            className="w-full"
            size="lg"
          >
            Sign In to Access Premium
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Check your email for a magic link to sign in instantly, or use your password.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Fallback if no email provided
  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-600">
          <CheckCircle className="h-6 w-6" />
          Payment Successful!
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-muted-foreground">
          Your payment has been processed. Please sign in to access your premium features.
        </p>
        
        <Button 
          onClick={() => {
            window.location.href = '/auth/sign-in?next=/home?welcome=premium&message=payment-success';
          }}
          className="w-full"
          size="lg"
        >
          Sign In
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

export default async function PaymentSuccessPage(props: PaymentSuccessPageProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Suspense fallback={
        <Card className="max-w-md mx-auto">
          <CardContent className="p-8">
            <div className="flex items-center justify-center">
              <Spinner className="h-8 w-8" />
            </div>
          </CardContent>
        </Card>
      }>
        <PaymentSuccessContent {...props} />
      </Suspense>
    </div>
  );
}