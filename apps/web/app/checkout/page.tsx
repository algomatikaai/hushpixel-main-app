import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { Spinner } from '@kit/ui/spinner';
import { PremiumCheckout } from './_components/premium-checkout';
import { QuizAuthBridge } from './_components/quiz-auth-bridge';

interface CheckoutPageProps {
  searchParams: Promise<{ 
    plan?: string;
    source?: string;
    intent?: string;
    email?: string;
    session?: string; // Changed from sessionId to session
  }>;
}

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const params = await searchParams;
  const { plan, source, intent, email, session } = params;
  
  // Check if user is authenticated
  const supabase = getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  // If not authenticated but we have quiz session data, allow guest checkout
  // User will be created after payment via Stripe webhook
  if (!user && email && source === 'quiz' && session) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="container mx-auto py-8">
          <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen">
              <Spinner className="h-12 w-12" />
            </div>
          }>
            <PremiumCheckout 
              userId={null} // Guest checkout
              email={email}
              source={source}
              sessionId={session}
              isGuestCheckout={true}
            />
          </Suspense>
        </div>
      </div>
    );
  }
  
  // If not authenticated and no quiz session, redirect to signup with checkout intent
  if (!user) {
    const signupUrl = new URL('/auth/sign-up', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000');
    signupUrl.searchParams.set('next', '/checkout');
    if (plan) signupUrl.searchParams.set('plan', plan);
    if (source) signupUrl.searchParams.set('source', source);
    if (intent) signupUrl.searchParams.set('intent', intent);
    
    redirect(signupUrl.toString());
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto py-8">
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-screen">
            <Spinner className="h-12 w-12" />
          </div>
        }>
          <PremiumCheckout 
            userId={user.id}
            email={user.email}
            source={source}
          />
        </Suspense>
      </div>
    </div>
  );
}