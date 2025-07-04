'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Button } from '@kit/ui/button';
import { Badge } from '@kit/ui/badge';
import { Separator } from '@kit/ui/separator';
import { Alert, AlertDescription } from '@kit/ui/alert';
import { 
  Sparkles, 
  Crown, 
  Heart, 
  Zap, 
  Users, 
  TrendingUp,
  Gift,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  X,
  Star,
  Camera,
  MessageCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface User {
  id: string;
  email: string;
  user_metadata?: {
    quiz_completed?: boolean;
    character_data?: any;
    first_generation_complete?: boolean;
  };
  created_at: string;
}

interface HomeContentProps {
  user: User;
  searchParams: {
    welcome?: string;
    character?: string;
    image?: string;
    error?: string;
    message?: string;
  };
}

// Mock data for now - in production this would come from your database
const MOCK_STATS = {
  totalUsers: 127000,
  generationsToday: 45000,
  averageRating: 4.9,
  activeNow: 2340
};

export function EnhancedHomeContent({ user, searchParams }: HomeContentProps) {
  const router = useRouter();
  const [showWelcome, setShowWelcome] = useState(false);
  const [showError, setShowError] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);

  // Check if user is new (created within last 24 hours)
  useEffect(() => {
    const userCreatedAt = new Date(user.created_at);
    const now = new Date();
    const hoursSinceCreation = (now.getTime() - userCreatedAt.getTime()) / (1000 * 60 * 60);
    setIsNewUser(hoursSinceCreation < 24);

    // Show welcome modal for quiz completions
    if (searchParams.welcome === 'true' && searchParams.character) {
      setShowWelcome(true);
    }

    // Show error alert if generation failed
    if (searchParams.error) {
      setShowError(true);
      toast.error(searchParams.message || 'Something went wrong during generation');
    }
  }, [searchParams, user.created_at]);

  const handleStartGenerating = () => {
    router.push('/generate');
  };

  const handleUpgrade = () => {
    router.push('/home/billing');
  };

  const dismissWelcome = () => {
    setShowWelcome(false);
    // Clean up URL parameters
    router.replace('/home', { scroll: false });
  };

  const dismissError = () => {
    setShowError(false);
    router.replace('/home', { scroll: false });
  };

  return (
    <div className="space-y-6">
      {/* Welcome Modal for New Users from Quiz */}
      {showWelcome && searchParams.character && (
        <Card className="border-2 border-purple-500/50 bg-gradient-to-r from-purple-900/20 to-pink-900/20 shadow-xl">
          <CardHeader className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={dismissWelcome}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl text-white">
                  Welcome to HushPixel! 🎉
                </CardTitle>
                <p className="text-purple-200">Meet {decodeURIComponent(searchParams.character)}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {searchParams.image && (
              <div className="flex flex-col md:flex-row gap-6">
                <div className="md:w-1/3">
                  <div className="aspect-square rounded-xl overflow-hidden shadow-lg">
                    <img 
                      src={decodeURIComponent(searchParams.image)} 
                      alt={`Your companion ${decodeURIComponent(searchParams.character)}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <div className="md:w-2/3 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-green-900/30 border border-green-500/30 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-400" />
                        <span className="text-green-200 font-medium">Quiz Complete</span>
                      </div>
                      <p className="text-xs text-green-300 mt-1">Character created from your preferences</p>
                    </div>
                    <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <Gift className="w-5 h-5 text-blue-400" />
                        <span className="text-blue-200 font-medium">First Image Free</span>
                      </div>
                      <p className="text-xs text-blue-300 mt-1">HD quality generation complete</p>
                    </div>
                  </div>
                  
                  <Alert className="border-purple-500/30 bg-purple-900/20">
                    <Crown className="w-4 h-4 text-purple-400" />
                    <AlertDescription className="text-purple-200">
                      <strong>Ready for unlimited access?</strong> Upgrade now to generate unlimited companions, 
                      have conversations, and unlock premium features.
                    </AlertDescription>
                  </Alert>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button 
                      onClick={handleUpgrade}
                      className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    >
                      <Crown className="w-4 h-4 mr-2" />
                      Unlock Unlimited Access - $24.99/mo
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={handleStartGenerating}
                      className="flex-1 border-purple-500/50 text-purple-200 hover:bg-purple-600/20"
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      Generate More
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Error Alert */}
      {showError && searchParams.error && (
        <Alert variant="destructive" className="border-red-500/50 bg-red-900/20">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <AlertDescription className="text-red-200 flex items-center justify-between">
            <span>
              <strong>Generation Failed:</strong> {searchParams.message || 'Something went wrong'}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={dismissError}
              className="text-red-400 hover:text-red-200 p-0 h-auto"
            >
              <X className="w-4 h-4" />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Dashboard Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Primary Action Card */}
        <Card className="lg:col-span-2 bg-gradient-to-br from-purple-900/20 to-pink-900/20 border-purple-500/30">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl text-white flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-purple-400" />
                  {isNewUser ? 'Welcome to HushPixel!' : 'Ready to Create?'}
                </CardTitle>
                <p className="text-gray-300 mt-1">
                  {isNewUser 
                    ? 'Generate your perfect AI companion in seconds' 
                    : 'Generate beautiful AI companions with advanced customization'
                  }
                </p>
              </div>
              {user.user_metadata?.first_generation_complete && (
                <Badge variant="secondary" className="bg-green-900/50 text-green-200 border-green-500/50">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Experienced
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Quick stats for social proof */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{MOCK_STATS.totalUsers.toLocaleString()}+</div>
                <div className="text-xs text-gray-400">Happy Users</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{MOCK_STATS.generationsToday.toLocaleString()}</div>
                <div className="text-xs text-gray-400">Generated Today</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center">
                  <div className="text-2xl font-bold text-white">{MOCK_STATS.averageRating}</div>
                  <Star className="w-4 h-4 text-yellow-400 ml-1" />
                </div>
                <div className="text-xs text-gray-400">Avg Rating</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                  <div className="text-lg font-bold text-white">{MOCK_STATS.activeNow.toLocaleString()}</div>
                </div>
                <div className="text-xs text-gray-400">Active Now</div>
              </div>
            </div>

            <Separator className="bg-purple-500/30" />
            
            <div className="space-y-3">
              <Button 
                onClick={handleStartGenerating}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-lg py-6"
              >
                <Camera className="w-5 h-5 mr-2" />
                {isNewUser ? 'Create Your First Companion' : 'Generate New Companion'}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              
              {/* Free user CTA */}
              {!user.user_metadata?.first_generation_complete && (
                <div className="bg-purple-900/30 border border-purple-500/30 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-purple-200">First Generation Free!</div>
                      <div className="text-xs text-purple-300">HD quality, no strings attached</div>
                    </div>
                    <Gift className="w-6 h-6 text-purple-400" />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Upgrade CTA Sidebar */}
        <div className="space-y-4">
          <Card className="border-yellow-500/50 bg-gradient-to-b from-yellow-900/20 to-orange-900/20">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-yellow-400" />
                <CardTitle className="text-lg text-white">Go Premium</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span>Unlimited generations</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span>HD quality images</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span>Character conversations</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span>Private gallery</span>
                </div>
              </div>
              
              <div className="text-center py-2">
                <div className="text-2xl font-bold text-white">$24.99</div>
                <div className="text-sm text-gray-400">/month</div>
                <div className="text-xs text-green-400">Save 33% annually</div>
              </div>
              
              <Button 
                onClick={handleUpgrade}
                className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700"
              >
                <Crown className="w-4 h-4 mr-2" />
                Upgrade Now
              </Button>
            </CardContent>
          </Card>

          {/* Community Stats */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-400" />
                Community
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Active Users</span>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-white">{MOCK_STATS.activeNow.toLocaleString()}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Total Generations</span>
                <span className="text-sm font-medium text-white">2.3M+</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Satisfaction</span>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm font-medium text-white">{MOCK_STATS.averageRating}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Activity / Quick Actions */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle className="text-xl text-white">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              variant="outline" 
              onClick={handleStartGenerating}
              className="h-20 border-purple-500/30 text-purple-200 hover:bg-purple-600/20 flex-col gap-2"
            >
              <Camera className="w-6 h-6" />
              <span>Generate</span>
            </Button>
            <Button 
              variant="outline" 
              onClick={() => router.push('/home/settings')}
              className="h-20 border-blue-500/30 text-blue-200 hover:bg-blue-600/20 flex-col gap-2"
            >
              <Users className="w-6 h-6" />
              <span>Settings</span>
            </Button>
            <Button 
              variant="outline" 
              onClick={handleUpgrade}
              className="h-20 border-yellow-500/30 text-yellow-200 hover:bg-yellow-600/20 flex-col gap-2"
            >
              <Crown className="w-6 h-6" />
              <span>Upgrade</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}