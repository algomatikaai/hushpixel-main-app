'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Button } from '@kit/ui/button';
import { Alert, AlertDescription } from '@kit/ui/alert';
import { 
  Sparkles, 
  Crown, 
  Gift,
  CheckCircle,
  AlertCircle,
  X,
  Camera
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

interface EnhancedHomeClientContentProps {
  user: User;
  searchParams: {
    welcome?: string;
    character?: string;
    image?: string;
    error?: string;
    message?: string;
  };
  isNewUser: boolean;
}

export function EnhancedHomeClientContent({ 
  user, 
  searchParams, 
  isNewUser 
}: EnhancedHomeClientContentProps) {
  const router = useRouter();
  const [showWelcome, setShowWelcome] = useState(false);
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    // Show welcome modal for quiz completions
    if (searchParams.welcome === 'true' && searchParams.character) {
      setShowWelcome(true);
    }

    // Show error alert if generation failed
    if (searchParams.error) {
      setShowError(true);
      toast.error(searchParams.message || 'Something went wrong during generation');
    }
  }, [searchParams]);

  const handleUpgrade = () => {
    router.push('/home/billing');
  };

  const handleStartGenerating = () => {
    router.push('/home/generate');
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
    <>
      {/* Welcome Modal for New Users from Quiz */}
      {showWelcome && searchParams.character && (
        <Card className="border-2 border-primary/50 bg-primary/5 shadow-xl">
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
              <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <CardTitle className="text-2xl text-foreground">
                  Welcome to HushPixel! 🎉
                </CardTitle>
                <p className="text-muted-foreground">Meet {decodeURIComponent(searchParams.character)}</p>
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
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <span className="text-foreground font-medium">Quiz Complete</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Character created from your preferences</p>
                    </div>
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <Gift className="w-5 h-5 text-blue-500" />
                        <span className="text-foreground font-medium">First Image Free</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">HD quality generation complete</p>
                    </div>
                  </div>
                  
                  <Alert className="border-primary/30">
                    <Crown className="w-4 h-4" />
                    <AlertDescription>
                      <strong>Ready for unlimited access?</strong> Upgrade now to generate unlimited companions, 
                      have conversations, and unlock premium features.
                    </AlertDescription>
                  </Alert>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button 
                      onClick={handleUpgrade}
                      className="flex-1"
                    >
                      <Crown className="w-4 h-4 mr-2" />
                      Unlock Unlimited Access - $24.99/mo
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={handleStartGenerating}
                      className="flex-1"
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
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription className="flex items-center justify-between">
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
    </>
  );
}