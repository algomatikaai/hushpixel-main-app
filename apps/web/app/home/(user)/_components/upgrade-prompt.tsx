'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@kit/ui/card';
import { Button } from '@kit/ui/button';
import { Badge } from '@kit/ui/badge';
import { Progress } from '@kit/ui/progress';
import { Crown, Sparkles, X, Zap, Timer, Gift } from 'lucide-react';

interface UpgradePromptProps {
  userId: string;
}

// Mock function to check user's subscription status
// In production, this would query your database
const getUserSubscriptionStatus = async (userId: string) => {
  // For now, return free status
  return {
    status: 'free',
    generationsUsed: 1,
    generationsLimit: 1,
    daysInTrial: 0,
    hasActiveSubscription: false
  };
};

export function UpgradePrompt({ userId }: UpgradePromptProps) {
  const router = useRouter();
  const [userStatus, setUserStatus] = useState<any>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showUrgency, setShowUrgency] = useState(false);

  useEffect(() => {
    // Load user status
    getUserSubscriptionStatus(userId).then(setUserStatus);

    // Show urgency indicator after 30 seconds
    const urgencyTimer = setTimeout(() => {
      setShowUrgency(true);
    }, 30000);

    return () => clearTimeout(urgencyTimer);
  }, [userId]);

  useEffect(() => {
    // Check if user dismissed the prompt today
    const dismissedToday = localStorage.getItem(`upgrade-prompt-dismissed-${userId}`);
    const today = new Date().toDateString();
    
    if (dismissedToday === today) {
      setIsMinimized(true);
    }
  }, [userId]);

  const handleUpgrade = () => {
    router.push('/home/billing');
  };

  const handleDismiss = () => {
    const today = new Date().toDateString();
    localStorage.setItem(`upgrade-prompt-dismissed-${userId}`, today);
    setIsMinimized(true);
  };

  const handleRestore = () => {
    setIsMinimized(false);
  };

  if (!userStatus || userStatus.hasActiveSubscription) {
    return null;
  }

  if (isMinimized) {
    return (
      <Card 
        className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border-purple-500/50 cursor-pointer hover:from-purple-900/40 hover:to-pink-900/40 transition-all"
        onClick={handleRestore}
      >
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-medium text-white">Upgrade</span>
            {showUrgency && (
              <Badge variant="destructive" className="text-xs px-1 py-0 h-4">
                <Timer className="w-3 h-3 mr-1" />
                Limited Time
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const usagePercentage = (userStatus.generationsUsed / userStatus.generationsLimit) * 100;
  const isAtLimit = userStatus.generationsUsed >= userStatus.generationsLimit;

  return (
    <Card className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 border-purple-500/50 shadow-lg">
      <CardContent className="p-4 space-y-3">
        {/* Header with dismiss button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
              <Crown className="w-4 h-4 text-white" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Go Premium</h4>
              {showUrgency && (
                <div className="flex items-center gap-1">
                  <Timer className="w-3 h-3 text-red-400" />
                  <span className="text-xs text-red-300">Limited offer</span>
                </div>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-6 w-6 p-0 text-gray-400 hover:text-white"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>

        {/* Usage indicator */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-300">Generations Used</span>
            <span className="text-white font-medium">
              {userStatus.generationsUsed}/{userStatus.generationsLimit}
            </span>
          </div>
          <Progress 
            value={usagePercentage} 
            className="h-2"
            // Custom colors based on usage
            style={{
              background: 'rgb(55, 65, 81)',
            }}
          />
          {isAtLimit && (
            <div className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-yellow-400" />
              <span className="text-xs text-yellow-300">Limit reached! Upgrade for unlimited access</span>
            </div>
          )}
        </div>

        {/* Value proposition */}
        <div className="text-xs text-gray-300 space-y-1">
          <div className="flex items-center gap-1">
            <Zap className="w-3 h-3 text-purple-400" />
            <span>Unlimited HD generations</span>
          </div>
          <div className="flex items-center gap-1">
            <Gift className="w-3 h-3 text-pink-400" />
            <span>Character conversations</span>
          </div>
        </div>

        {/* Pricing */}
        <div className="text-center">
          <div className="text-lg font-bold text-white">$24.99<span className="text-xs text-gray-400 font-normal">/mo</span></div>
          {showUrgency && (
            <div className="text-xs text-green-400 font-medium">Save 50% - Limited time!</div>
          )}
        </div>

        {/* CTA Button */}
        <Button
          onClick={handleUpgrade}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-sm py-2"
        >
          <Crown className="w-4 h-4 mr-2" />
          {isAtLimit ? 'Unlock Now' : 'Upgrade Premium'}
        </Button>

        {/* Trust indicators */}
        <div className="text-center">
          <div className="text-xs text-gray-400">
            ✅ Cancel anytime • 7-day guarantee
          </div>
        </div>
      </CardContent>
    </Card>
  );
}