'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@kit/ui/card';
import { Button } from '@kit/ui/button';
import { Spinner } from '@kit/ui/spinner';
import { toast } from '@kit/ui/sonner';

interface QuizAuthBridgeProps {
  email: string;
  sessionId?: string;
  plan?: string;
  source?: string;
  intent?: string;
}

export function QuizAuthBridge({ 
  email, 
  sessionId, 
  plan, 
  source, 
  intent 
}: QuizAuthBridgeProps) {
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const handleBridgeAuth = async () => {
      try {
        setIsProcessing(true);
        setError(null);

        // Build redirect URL for after authentication
        const redirectParams = new URLSearchParams();
        if (plan) redirectParams.set('plan', plan);
        if (source) redirectParams.set('source', source);
        if (intent) redirectParams.set('intent', intent);
        
        const redirectTo = `/checkout${redirectParams.toString() ? `?${redirectParams.toString()}` : ''}`;

        const response = await fetch('/api/auth/bridge', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            sessionId,
            source,
            redirectTo,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to create authentication bridge');
        }

        const result = await response.json();

        if (result.success && result.authUrl) {
          setAuthUrl(result.authUrl);
          // Automatically redirect to the auth URL
          window.location.href = result.authUrl;
        } else {
          throw new Error(result.message || 'Authentication bridge failed');
        }
      } catch (err) {
        console.error('Bridge auth error:', err);
        setError(err instanceof Error ? err.message : 'Authentication failed');
        setIsProcessing(false);
      }
    };

    // Only run if we have an email
    if (email) {
      handleBridgeAuth();
    } else {
      setError('Missing email for authentication');
      setIsProcessing(false);
    }
  }, [email, sessionId, plan, source, intent]);

  const handleManualAuth = () => {
    if (authUrl) {
      window.location.href = authUrl;
    }
  };

  const handleFallbackSignup = () => {
    const signupUrl = new URL('/auth/sign-up', window.location.origin);
    signupUrl.searchParams.set('next', '/checkout');
    if (plan) signupUrl.searchParams.set('plan', plan);
    if (source) signupUrl.searchParams.set('source', source);
    if (intent) signupUrl.searchParams.set('intent', intent);
    
    router.push(signupUrl.toString());
  };

  if (isProcessing) {
    return (
      <div className="max-w-md mx-auto">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="relative mb-6">
              <Spinner className="h-16 w-16 mx-auto text-primary" />
              <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-3">
              Setting Up Your Account
            </h2>
            <p className="text-muted-foreground mb-4">
              We're creating your account using the email you provided in the quiz...
            </p>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p className="animate-pulse">✨ Linking your quiz responses...</p>
              <p className="animate-pulse" style={{animationDelay: '0.5s'}}>
                💖 Preparing your perfect companion...
              </p>
              <p className="animate-pulse" style={{animationDelay: '1s'}}>
                🔒 Securing your account...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="mb-6">
              <div className="w-16 h-16 mx-auto bg-destructive/10 rounded-full flex items-center justify-center">
                <span className="text-2xl">⚠️</span>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-3">
              Authentication Issue
            </h2>
            <p className="text-muted-foreground mb-6">
              There was a problem setting up your account automatically. 
              You can try again or proceed with manual signup.
            </p>
            <div className="space-y-3">
              {authUrl && (
                <Button 
                  onClick={handleManualAuth}
                  className="w-full"
                  size="lg"
                >
                  Continue with Authentication
                </Button>
              )}
              <Button 
                onClick={handleFallbackSignup}
                variant="outline"
                className="w-full"
                size="lg"
              >
                Sign Up Manually
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Your quiz responses are saved and will be linked to your account
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // This should rarely be reached as we auto-redirect
  return (
    <div className="max-w-md mx-auto">
      <Card>
        <CardContent className="p-8 text-center">
          <h2 className="text-2xl font-bold text-foreground mb-3">
            Almost There!
          </h2>
          <p className="text-muted-foreground mb-6">
            Click the button below to complete your authentication and access premium features.
          </p>
          <Button 
            onClick={handleManualAuth}
            className="w-full"
            size="lg"
          >
            Complete Authentication
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}