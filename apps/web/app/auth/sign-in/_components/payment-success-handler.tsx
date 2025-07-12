'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Alert, AlertDescription } from '@kit/ui/alert';
import { CheckCircle, Mail } from 'lucide-react';

export function PaymentSuccessHandler() {
  const searchParams = useSearchParams();
  const message = searchParams.get('message');
  const email = searchParams.get('email');

  // Handle payment success messaging
  if (message === 'magic-link-sent' && email) {
    return (
      <Alert className="mb-6 border-green-200 bg-green-50">
        <Mail className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          <strong>Check your email!</strong> We've sent you an instant sign-in link at{' '}
          <span className="font-medium">{email}</span>
        </AlertDescription>
      </Alert>
    );
  }

  if (message === 'payment-success') {
    return (
      <Alert className="mb-6 border-blue-200 bg-blue-50">
        <CheckCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>Payment successful!</strong> {email ? (
            <>Sign in with <span className="font-medium">{email}</span> to access your premium features.</>
          ) : (
            'Sign in with your email to access your premium features.'
          )}
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}