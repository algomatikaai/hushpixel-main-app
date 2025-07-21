'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@kit/ui/button';
import { Spinner } from '@kit/ui/spinner';
import { Trans } from '@kit/ui/trans';

export default function PaymentSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'manual'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!sessionId) {
      setStatus('error');
      setMessage('No session ID provided');
      return;
    }

    // Automatically attempt login after a short delay for webhook processing
    const attemptAutoLogin = async () => {
      try {
        setMessage('Processing your payment and setting up your account...');
        
        // Wait for webhook processing
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const response = await fetch('/api/auth/payment-success', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            session_id: sessionId,
          }),
        });

        const data = await response.json();

        if (data.success && data.authUrl) {
          setMessage('Logging you in automatically...');
          
          // Redirect to auth callback URL for automatic login
          window.location.href = data.authUrl;
        } else {
          // Auto-login failed, show manual options
          setStatus('manual');
          setMessage(data.error || 'Auto-login failed. Please sign in manually.');
        }
      } catch (error) {
        console.error('Auto-login error:', error);
        setStatus('manual');
        setMessage('Unable to log in automatically. Please sign in manually.');
      }
    };

    attemptAutoLogin();
  }, [sessionId]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50">
        <div className="max-w-md w-full mx-auto text-center p-8">
          <div className="mb-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              <Trans i18nKey="billing:paymentSuccess.title" />
            </h1>
            <p className="text-gray-600 mb-6">
              Welcome to HushPixel Premium! 🎉
            </p>
          </div>
          
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Spinner className="h-5 w-5" />
            <span className="text-sm text-gray-600">{message}</span>
          </div>
          
          <div className="text-xs text-gray-500">
            This should only take a moment...
          </div>
        </div>
      </div>
    );
  }

  if (status === 'manual') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50">
        <div className="max-w-md w-full mx-auto text-center p-8">
          <div className="mb-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Payment Successful! 🎉
            </h1>
            <p className="text-gray-600 mb-6">
              Your payment has been processed successfully.
            </p>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-yellow-800 mb-3">
              {message}
            </p>
          </div>
          
          <div className="space-y-3">
            <Button 
              onClick={() => router.push('/auth/sign-in?message=payment-success')}
              className="w-full"
            >
              <Trans i18nKey="auth:signIn" />
            </Button>
            
            <p className="text-xs text-gray-500">
              Your account has been created and payment confirmed.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}