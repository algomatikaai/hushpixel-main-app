'use client';

import { useState, useEffect } from 'react';
import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Badge } from '@kit/ui/badge';
import { Check, Crown, Sparkles, Shield, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { StripeCheckout } from '@kit/stripe/components';

interface PremiumCheckoutProps {
  userId?: string | null;
  email?: string;
  source?: string;
  sessionId?: string;
  isGuestCheckout?: boolean;
}

export function PremiumCheckout({ userId, email, source, sessionId, isGuestCheckout }: PremiumCheckoutProps) {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('monthly');
  const [isLoading, setIsLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(23 * 60 + 47); // 23:47
  const [checkoutToken, setCheckoutToken] = useState<string | null>(null);

  // Countdown timer for urgency
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(prev => prev > 0 ? prev - 1 : 0);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCheckout = async () => {
    setIsLoading(true);
    
    try {
      // Call MakerKit billing API to create checkout session
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: selectedPlan === 'monthly' ? 'premium-monthly' : 'premium-annual',
          successUrl: `${window.location.origin}/home?welcome=premium`,
          cancelUrl: window.location.href,
          metadata: {
            source,
            email,
            plan: selectedPlan
          }
        })
      });

      const data = await response.json();
      
      if (data.checkoutToken) {
        // Show embedded checkout
        setCheckoutToken(data.checkoutToken);
      } else {
        throw new Error(data.error || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Failed to start checkout. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const plans = {
    monthly: {
      id: 'premium-monthly',
      name: 'Premium Monthly',
      price: 24.99,
      originalPrice: 49.99,
      interval: 'month',
      savings: 'Save 50%',
      perDay: '$0.83/day'
    },
    annual: {
      id: 'premium-annual',
      name: 'Premium Annual',
      price: 199.99,
      originalPrice: 599.88,
      interval: 'year',
      savings: 'Save 67%',
      perDay: '$0.55/day',
      popular: true
    }
  };

  const features = [
    'Unlimited HD generations',
    'All character types & poses',
    'Custom outfits & backgrounds',
    'Private gallery storage',
    'Priority generation speed',
    'No content restrictions',
    'Cancel anytime'
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-full font-semibold text-sm mb-4">
          <Crown className="w-4 h-4" />
          Unlock Premium Features
        </div>
        
        <h1 className="text-4xl font-bold mb-4 text-foreground">
          Create Unlimited Companions
        </h1>
        
        <p className="text-muted-foreground text-lg">
          Join thousands creating their perfect AI companions
        </p>
      </div>

      {/* Urgency Banner */}
      <Card className="border-2 border-destructive/50 bg-destructive/5">
        <CardContent className="p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-destructive" />
            <span className="font-bold text-destructive">LIMITED TIME: 50% OFF</span>
          </div>
          <div className="text-2xl font-bold text-destructive mb-1">
            {formatTime(timeLeft)}
          </div>
          <p className="text-sm text-muted-foreground">Special launch pricing expires soon</p>
        </CardContent>
      </Card>

      {/* Plan Selection */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-center">Choose Your Plan</h2>
        
        <div className="grid gap-4">
          {Object.entries(plans).map(([key, plan]) => (
            <Card 
              key={key}
              className={`cursor-pointer transition-all duration-200 border-2 ${
                selectedPlan === key 
                  ? 'border-primary ring-2 ring-primary/20 bg-primary/5' 
                  : 'border-border hover:border-primary/50'
              }`}
              onClick={() => setSelectedPlan(key as 'monthly' | 'annual')}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{plan.name}</h3>
                      {plan.popular && (
                        <Badge>
                          Most Popular
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-3xl font-bold">${plan.price}</span>
                      <span className="text-lg text-muted-foreground line-through">
                        ${plan.originalPrice}
                      </span>
                      <span className="text-sm text-green-600 font-medium">
                        {plan.savings}
                      </span>
                    </div>
                    
                    <p className="text-sm text-muted-foreground">
                      {plan.perDay} • Billed {plan.interval}ly
                    </p>
                  </div>
                  
                  <div className="flex-shrink-0">
                    {selectedPlan === key ? (
                      <div className="bg-primary text-primary-foreground rounded-full p-2">
                        <Check className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full border-2 border-border"></div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Sparkles className="w-5 h-5 mr-2 text-primary" />
            What You Get
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center gap-3">
                <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Checkout Button */}
      <Card className="bg-primary text-primary-foreground">
        <CardContent className="p-6 text-center">
          <Button 
            onClick={handleCheckout}
            disabled={isLoading}
            size="lg"
            className="w-full bg-primary-foreground text-primary hover:bg-primary-foreground/90 font-bold text-lg py-6"
          >
            {isLoading ? (
              'Creating checkout...'
            ) : (
              <>
                Start Creating Now - ${plans[selectedPlan].price}
                <span className="text-sm opacity-80 ml-2">
                  ({plans[selectedPlan].savings})
                </span>
              </>
            )}
          </Button>
          
          <div className="mt-4 space-y-2 text-sm opacity-90">
            <div className="flex items-center justify-center gap-2">
              <Shield className="w-4 h-4" />
              <span>30-day money-back guarantee</span>
            </div>
            <div>Cancel anytime • No hidden fees • Instant access</div>
          </div>
        </CardContent>
      </Card>

      {/* Social Proof */}
      <div className="text-center text-sm text-muted-foreground">
        <p>Join 12,000+ users creating unlimited AI companions</p>
        <p className="mt-1">⭐⭐⭐⭐⭐ Rated 4.9/5 by our community</p>
      </div>
      
      {/* Embedded Checkout */}
      {checkoutToken && (
        <StripeCheckout
          checkoutToken={checkoutToken}
          onClose={() => setCheckoutToken(null)}
        />
      )}
    </div>
  );
}