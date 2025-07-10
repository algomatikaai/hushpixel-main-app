'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Button } from '@kit/ui/button';
import { Progress } from '@kit/ui/progress';
import { Badge } from '@kit/ui/badge';
import { Alert, AlertDescription } from '@kit/ui/alert';
import { Crown, Zap, AlertCircle, TrendingUp } from 'lucide-react';

interface UsageStatsProps {
  subscription: {
    status: 'active' | 'inactive' | 'trial' | 'canceled' | null;
    currentPeriodEnd: string | null;
    generationLimit: number | null;
    generationsUsed: number;
  };
  generationStats: {
    total: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
    averagePerDay: number;
  };
}

export function UsageStats({ subscription, generationStats }: UsageStatsProps) {
  
  const isUnlimited = subscription.generationLimit === null;
  const usagePercentage = isUnlimited 
    ? 0 
    : Math.round((subscription.generationsUsed / subscription.generationLimit!) * 100);
  
  const remainingGenerations = isUnlimited 
    ? null 
    : Math.max(0, subscription.generationLimit! - subscription.generationsUsed);

  const showUpgradePrompt = !isUnlimited && usagePercentage >= 80;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-4">
      {/* Subscription Status */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Crown className="w-5 h-5 text-primary" />
              Subscription Status
            </CardTitle>
            {subscription.status === 'active' ? (
              <Badge variant="default" className="bg-green-500">
                Active
              </Badge>
            ) : subscription.status === 'trial' ? (
              <Badge variant="secondary">Trial</Badge>
            ) : (
              <Badge variant="outline">Free Plan</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Usage Progress */}
          {!isUnlimited && (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Generations Used</span>
                  <span className="font-medium">
                    {subscription.generationsUsed} / {subscription.generationLimit}
                  </span>
                </div>
                <Progress value={usagePercentage} className="h-2" />
                {remainingGenerations !== null && (
                  <p className="text-xs text-muted-foreground">
                    {remainingGenerations} generation{remainingGenerations !== 1 ? 's' : ''} remaining
                  </p>
                )}
              </div>

              {showUpgradePrompt && (
                <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-900/20">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-800 dark:text-orange-200">
                    You've used {usagePercentage}% of your free generations. Upgrade for unlimited access!
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}

          {isUnlimited && (
            <div className="flex items-center gap-2 text-sm">
              <Zap className="w-4 h-4 text-primary" />
              <span className="font-medium">Unlimited Generations</span>
            </div>
          )}

          {subscription.currentPeriodEnd && (
            <div className="text-sm text-muted-foreground">
              {subscription.status === 'active' ? 'Renews' : 'Expires'} on{' '}
              {formatDate(subscription.currentPeriodEnd)}
            </div>
          )}

          {!isUnlimited && (
            <Button 
              onClick={() => window.location.href = '/home/billing'}
              className="w-full"
              variant={showUpgradePrompt ? 'default' : 'outline'}
            >
              <Crown className="w-4 h-4 mr-2" />
              {showUpgradePrompt ? 'Upgrade Now' : 'View Plans'}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Usage Analytics */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Usage Analytics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-2xl font-bold">{generationStats.total}</p>
              <p className="text-xs text-muted-foreground">Total Generations</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{generationStats.averagePerDay}</p>
              <p className="text-xs text-muted-foreground">Per Day Average</p>
            </div>
          </div>
          
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Today</span>
              <span className="font-medium">{generationStats.today}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">This Week</span>
              <span className="font-medium">{generationStats.thisWeek}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">This Month</span>
              <span className="font-medium">{generationStats.thisMonth}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}