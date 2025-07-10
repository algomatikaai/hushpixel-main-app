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
  MessageCircle,
  Images
} from 'lucide-react';

import { loadUserAnalytics, type UserAnalytics } from '../_lib/server/analytics.service';
import { UsageStats } from './usage-stats';
import { EnhancedHomeClientContent } from './enhanced-home-client-content';

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
  analytics: UserAnalytics;
}
export function EnhancedHomeContent({ user, searchParams, analytics }: HomeContentProps) {
  // Check if user is new (created within last 24 hours)
  const userCreatedAt = new Date(user.created_at);
  const now = new Date();
  const hoursSinceCreation = (now.getTime() - userCreatedAt.getTime()) / (1000 * 60 * 60);
  const isNewUser = hoursSinceCreation < 24;

  return (
    <div className="space-y-6">
      {/* Client-side interactive components */}
      <EnhancedHomeClientContent 
        user={user}
        searchParams={searchParams}
        isNewUser={isNewUser}
      />

      {/* Main Dashboard Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Primary Action Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl text-foreground flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-primary" />
                  {isNewUser ? 'Welcome to HushPixel!' : 'Ready to Create?'}
                </CardTitle>
                <p className="text-muted-foreground mt-1">
                  {isNewUser 
                    ? 'Generate your perfect AI companion in seconds' 
                    : 'Generate beautiful AI companions with advanced customization'
                  }
                </p>
              </div>
              {analytics.generationStats.total > 0 && (
                <Badge variant="secondary">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Experienced
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Real stats for social proof */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">{analytics.systemStats.totalUsers.toLocaleString()}+</div>
                <div className="text-xs text-muted-foreground">Happy Users</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">{analytics.systemStats.generationsToday.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Generated Today</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center">
                  <div className="text-2xl font-bold text-foreground">{analytics.systemStats.averageRating}</div>
                  <Star className="w-4 h-4 text-yellow-400 ml-1" />
                </div>
                <div className="text-xs text-muted-foreground">Avg Rating</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                  <div className="text-lg font-bold text-foreground">{analytics.systemStats.activeToday.toLocaleString()}</div>
                </div>
                <div className="text-xs text-muted-foreground">Active Now</div>
              </div>
            </div>

            <Separator />
            
            <div className="space-y-3">
              <a href="/home/generate" className="block">
                <Button 
                  className="w-full text-lg py-6" 
                  size="lg"
                >
                  <Camera className="w-5 h-5 mr-2" />
                  {isNewUser ? 'Create Your First Companion' : 'Generate New Companion'}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </a>
              
              {/* Show popular characters */}
              {analytics.popularCharacters.length > 0 && (
                <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
                  <div className="text-sm font-medium text-foreground mb-2">Your Popular Characters</div>
                  <div className="flex flex-wrap gap-2">
                    {analytics.popularCharacters.slice(0, 3).map((char) => (
                      <Badge key={char.name} variant="secondary" className="text-xs">
                        {char.name} ({char.count})
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Usage Stats Sidebar */}
        <div className="space-y-4">
          <UsageStats 
            subscription={analytics.subscription}
            generationStats={analytics.generationStats}
          />

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                variant="outline" 
                onClick={() => window.location.href = '/home/generate'}
                className="w-full justify-start"
              >
                <Camera className="w-4 h-4 mr-2" />
                Generate New
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.location.href = '/home/gallery'}
                className="w-full justify-start"
              >
                <Images className="w-4 h-4 mr-2" />
                View Gallery ({analytics.generationStats.total})
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.location.href = '/home/billing'}
                className="w-full justify-start"
              >
                <Crown className="w-4 h-4 mr-2" />
                Manage Plan
              </Button>
            </CardContent>
          </Card>

          {/* Community Stats */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Community
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Active Users</span>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-foreground">{analytics.systemStats.activeToday.toLocaleString()}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Generations</span>
                <span className="text-sm font-medium text-foreground">2.3M+</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Satisfaction</span>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm font-medium text-foreground">{analytics.systemStats.averageRating}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}