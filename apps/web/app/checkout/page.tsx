import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { Spinner } from '@kit/ui/spinner';
import { PremiumCheckout } from './_components/premium-checkout';

interface CheckoutPageProps {
  searchParams: Promise<{ 
    plan?: string;
    source?: string;
    intent?: string;
  }>;
}

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const params = await searchParams;
  const { plan, source, intent } = params;
  
  // Check if user is authenticated
  const supabase = getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  // If not authenticated, redirect to signup with checkout intent
  if (!user) {
    const signupUrl = new URL('/auth/sign-up', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000');
    signupUrl.searchParams.set('next', '/checkout');
    if (plan) signupUrl.searchParams.set('plan', plan);
    if (source) signupUrl.searchParams.set('source', source);
    if (intent) signupUrl.searchParams.set('intent', intent);
    
    redirect(signupUrl.toString());
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-gray-900 p-4">
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