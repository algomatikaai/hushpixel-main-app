'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Button } from '@kit/ui/button';
import { Badge } from '@kit/ui/badge';
import { Separator } from '@kit/ui/separator';
import { Alert, AlertDescription } from '@kit/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';
import { 
  Crown, 
  CreditCard, 
  Calendar, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  Gift,
  Zap,
  Shield,
  Download,
  Settings,
  TrendingUp,
  Users,
  Star,
  Sparkles
} from 'lucide-react';
import { PersonalAccountCheckoutForm } from './personal-account-checkout-form';
import { createPersonalAccountBillingPortalSession } from '../_lib/server/server-actions';
import { BillingPortalCard } from '@kit/billing-gateway/components';

interface EnhancedSubscriptionManagementProps {
  user: any;
  subscriptionData: any;
  productPlan: any;
  customerId: string | null;
}

// Mock data for user statistics
const MOCK_USER_STATS = {
  totalGenerations: 247,
  thisMonth: 89,
  favoriteImages: 32,
  daysActive: 23,
  averageRating: 4.8
};

export function EnhancedSubscriptionManagement({ 
  user, 
  subscriptionData, 
  productPlan, 
  customerId 
}: EnhancedSubscriptionManagementProps) {
  const [activeTab, setActiveTab] = useState('overview');

  const isSubscribed = !!subscriptionData;
  const isActive = subscriptionData?.status === 'active';
  const isCanceled = subscriptionData?.status === 'canceled';
  const isPastDue = subscriptionData?.status === 'past_due';

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header with status */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          {isSubscribed ? (
            <Badge 
              variant={isActive ? 'default' : 'destructive'}
              className={isActive ? 'bg-green-600 text-white' : ''}
            >
              {isActive && <CheckCircle className="w-4 h-4 mr-1" />}
              {isCanceled && <XCircle className="w-4 h-4 mr-1" />}
              {isPastDue && <AlertTriangle className="w-4 h-4 mr-1" />}
              {isActive ? 'Premium Active' : isCanceled ? 'Subscription Canceled' : 'Past Due'}
            </Badge>
          ) : (
            <Badge variant="outline" className="border-purple-500/50 text-purple-200">
              <Gift className="w-4 h-4 mr-1" />
              Free Plan
            </Badge>
          )}
        </div>
        
        <div>
          <h1 className="text-3xl font-bold text-white">
            {isSubscribed ? 'Manage Your Premium Subscription' : 'Upgrade to Premium'}
          </h1>
          <p className="text-gray-400 mt-2">
            {isSubscribed 
              ? 'Manage your billing, view usage, and update your subscription'
              : 'Unlock unlimited AI companions and premium features'
            }
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-gray-800/50 border border-gray-700">
          <TabsTrigger value="overview" className="data-[state=active]:bg-purple-600">Overview</TabsTrigger>
          <TabsTrigger value="billing" className="data-[state=active]:bg-purple-600">Billing</TabsTrigger>
          <TabsTrigger value="usage" className="data-[state=active]:bg-purple-600">Usage</TabsTrigger>
          <TabsTrigger value="upgrade" className="data-[state=active]:bg-purple-600">
            {isSubscribed ? 'Manage' : 'Upgrade'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Current Plan */}
            <Card className="lg:col-span-2 bg-gradient-to-br from-purple-900/20 to-pink-900/20 border-purple-500/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Crown className="w-5 h-5 text-yellow-400" />
                  {isSubscribed ? 'Premium Plan' : 'Current Plan: Free'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isSubscribed ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">Plan Type</span>
                      <span className="text-white font-medium">Premium</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">Billing</span>
                      <span className="text-white font-medium">
                        ${subscriptionData?.amount ? (subscriptionData.amount / 100).toFixed(2) : '24.99'}/month
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">Next Billing</span>
                      <span className="text-white font-medium">
                        {subscriptionData?.current_period_end 
                          ? new Date(subscriptionData.current_period_end * 1000).toLocaleDateString()
                          : 'N/A'
                        }
                      </span>
                    </div>
                    
                    <Separator className="bg-purple-500/30" />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-white">{MOCK_USER_STATS.totalGenerations}</div>
                        <div className="text-sm text-gray-400">Total Generations</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-white">{MOCK_USER_STATS.daysActive}</div>
                        <div className="text-sm text-gray-400">Days Active</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Alert className="border-yellow-500/30 bg-yellow-900/20">
                      <Gift className="w-4 h-4 text-yellow-400" />
                      <AlertDescription className="text-yellow-200">
                        You're on the free plan. Upgrade to unlock unlimited generations and premium features!
                      </AlertDescription>
                    </Alert>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-gray-300">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span>1 free generation completed</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <XCircle className="w-4 h-4 text-red-400" />
                        <span>Unlimited generations (Premium only)</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <XCircle className="w-4 h-4 text-red-400" />
                        <span>Character conversations (Premium only)</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="space-y-4">
              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {isSubscribed ? (
                    <>
                      <Button variant="outline" className="w-full border-gray-600 text-gray-300 hover:bg-gray-700">
                        <Download className="w-4 h-4 mr-2" />
                        Download Invoices
                      </Button>
                      <Button variant="outline" className="w-full border-gray-600 text-gray-300 hover:bg-gray-700">
                        <Settings className="w-4 h-4 mr-2" />
                        Update Payment
                      </Button>
                      <Button variant="outline" className="w-full border-red-600 text-red-300 hover:bg-red-900/20">
                        <XCircle className="w-4 h-4 mr-2" />
                        Cancel Subscription
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button 
                        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                        onClick={() => setActiveTab('upgrade')}
                      >
                        <Crown className="w-4 h-4 mr-2" />
                        Upgrade to Premium
                      </Button>
                      <Button variant="outline" className="w-full border-gray-600 text-gray-300 hover:bg-gray-700">
                        <Gift className="w-4 h-4 mr-2" />
                        View Benefits
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Community Stats */}
              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-400" />
                    Community
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Active Users</span>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium text-white">2,340</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Premium Users</span>
                    <span className="text-sm font-medium text-white">78%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Satisfaction</span>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-400" />
                      <span className="text-sm font-medium text-white">4.9</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="billing" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {isSubscribed ? (
              <>
                <Card className="bg-gray-800/50 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <CreditCard className="w-5 h-5" />
                      Current Subscription
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-300">Plan</span>
                        <span className="text-white font-medium">Premium Monthly</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Amount</span>
                        <span className="text-white font-medium">$24.99/month</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Status</span>
                        <Badge variant={isActive ? 'default' : 'destructive'} className={isActive ? 'bg-green-600' : ''}>
                          {subscriptionData?.status || 'Active'}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Next billing</span>
                        <span className="text-white font-medium">
                          {subscriptionData?.current_period_end 
                            ? new Date(subscriptionData.current_period_end * 1000).toLocaleDateString()
                            : 'N/A'
                          }
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gray-800/50 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white">Billing Portal</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form action={createPersonalAccountBillingPortalSession}>
                      <BillingPortalCard />
                    </form>
                  </CardContent>
                </Card>
              </>
            ) : (
              <div className="lg:col-span-2">
                <Card className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border-purple-500/30">
                  <CardHeader>
                    <CardTitle className="text-white text-center">Start Your Premium Journey</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <PersonalAccountCheckoutForm customerId={customerId} />
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="usage" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-purple-400" />
                  Generation Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-white">{MOCK_USER_STATS.totalGenerations}</div>
                    <div className="text-sm text-gray-400">Total Generations</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-white">{MOCK_USER_STATS.thisMonth}</div>
                    <div className="text-sm text-gray-400">This Month</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-white">{MOCK_USER_STATS.favoriteImages}</div>
                    <div className="text-sm text-gray-400">Favorites</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center">
                      <div className="text-3xl font-bold text-white">{MOCK_USER_STATS.averageRating}</div>
                      <Star className="w-5 h-5 text-yellow-400 ml-1" />
                    </div>
                    <div className="text-sm text-gray-400">Avg Rating</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-400" />
                  Account Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Account created</span>
                    <span className="text-white">{new Date(user.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Days active</span>
                    <span className="text-white">{MOCK_USER_STATS.daysActive}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Last generation</span>
                    <span className="text-white">2 hours ago</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Subscription status</span>
                    <Badge variant={isSubscribed ? 'default' : 'outline'} className={isSubscribed ? 'bg-green-600' : 'border-gray-500'}>
                      {isSubscribed ? 'Premium' : 'Free'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="upgrade" className="space-y-6">
          {!isSubscribed ? (
            <div className="max-w-4xl mx-auto">
              <PersonalAccountCheckoutForm customerId={customerId} />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Manage Subscription</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-gray-300">
                    Use the billing portal to update your subscription, change payment methods, or download invoices.
                  </p>
                  <form action={createPersonalAccountBillingPortalSession}>
                    <BillingPortalCard />
                  </form>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border-purple-500/30">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Crown className="w-5 h-5 text-yellow-400" />
                    Premium Benefits
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    {[
                      'Unlimited HD generations',
                      'Character conversations',
                      'Private secure gallery',
                      'Priority support',
                      'No watermarks',
                      'Advanced customization',
                      'Export to high resolution',
                      'Early access to new features'
                    ].map((benefit, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span className="text-gray-300 text-sm">{benefit}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}