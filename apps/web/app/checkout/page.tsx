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
  try {
    const params = await searchParams;
    const { plan, source, intent, email, session } = params;
  
    // Check if user is authenticated - NEW SIMPLIFIED APPROACH
    const supabase = getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    console.log('💰 Simplified Checkout:', {
      userAuthenticated: !!user,
      userId: user?.id || 'none',
      userEmail: user?.email?.substring(0, 3) + '***' || 'none',
      source: source || 'missing',
      plan: plan || 'premium-monthly',
      intent: intent || 'missing',
      hasQuizData: !!(user?.user_metadata?.character_type && user?.user_metadata?.body_type),
      timestamp: new Date().toISOString()
    });
    
    // AUTHENTICATED USER FLOW - Standard Makerkit checkout
    if (user) {
      console.log('✅ Authenticated user - proceeding with standard checkout');
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
                plan={plan}
                intent={intent}
              />
            </Suspense>
          </div>
        </div>
      );
    }
    
    // UNAUTHENTICATED USER - Handle gracefully with backwards compatibility
    if (!user && email && source === 'quiz' && session) {
      console.log('⚠️ Anonymous user detected - using backwards compatibility guest checkout');
      return (
        <div className="min-h-screen bg-background p-4">
          <div className="container mx-auto py-8">
            <Suspense fallback={
              <div className="flex items-center justify-center min-h-screen">
                <Spinner className="h-12 w-12" />
              </div>
            }>
              <PremiumCheckout 
                userId={null}
                email={email}
                source={source}
                sessionId={session}
                isGuestCheckout={true}
                plan={plan}
                intent={intent}
              />
            </Suspense>
          </div>
        </div>
      );
    }
    
    // NO VALID AUTHENTICATION - Redirect to quiz to start proper flow
    console.log('❌ No valid auth state - redirecting to quiz for proper flow');
    const redirectUrl = new URL('/quiz', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000');
    if (plan) redirectUrl.searchParams.set('plan', plan);
    if (source) redirectUrl.searchParams.set('source', source);
    redirect(redirectUrl.toString());

  return null; // Never reached
  } catch (error) {
    console.error('Checkout page error:', error);
    // Return a simple error page
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
          <p className="text-muted-foreground mb-4">Please try again or contact support.</p>
          <a href="/quiz" className="text-primary hover:underline">Go back to quiz</a>
        </div>
      </div>
    );
  }
}