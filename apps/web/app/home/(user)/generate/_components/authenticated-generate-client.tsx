'use client';

import { useState, useTransition, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@kit/ui/button';
import { Textarea } from '@kit/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Badge } from '@kit/ui/badge';
import { ScrollArea } from '@kit/ui/scroll-area';
import { Separator } from '@kit/ui/separator';
import { Spinner } from '@kit/ui/spinner';
import { Alert, AlertDescription } from '@kit/ui/alert';
import { useUserWorkspace } from '@kit/accounts/hooks/use-user-workspace';
import { Loader2, Sparkles, Crown, Download, Heart, History, RefreshCw, AlertCircle, X, ChevronLeft, ChevronRight, Timer, Zap, Users, Star, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

// Import our new components
import { FeedbackCollection, QuickFeedbackPrompt } from '../../_components/feedback-collection';
import { OnboardingTooltips, TourTarget, ContextualHelp } from '../../_components/onboarding-tooltips';

// Types for generation history
interface GenerationItem {
  id: string;
  prompt: string;
  imageUrl: string;
  characterName: string;
  timestamp: Date;
  style?: string;
}

interface GenerationError {
  message: string;
  code?: string;
  retryable: boolean;
}

interface AuthenticatedGenerateClientProps {
  user: {
    id: string;
    email: string;
  };
}

// Style presets for quick generation
const STYLE_PRESETS = [
  {
    name: 'Photorealistic',
    description: 'Lifelike photography style',
    prompt: 'beautiful woman, professional photography, realistic style, high detail, natural lighting'
  },
  {
    name: 'Artistic Fantasy',
    description: 'Fantasy art style',
    prompt: 'beautiful fantasy woman, digital art, magical setting, artistic style, ethereal lighting'
  },
  {
    name: 'Cinematic',
    description: 'Movie-like dramatic style',
    prompt: 'beautiful woman, cinematic lighting, dramatic photography, film style, professional'
  },
  {
    name: 'Elegant Portrait',
    description: 'Classic portrait style',
    prompt: 'beautiful woman, elegant portrait, studio lighting, professional, sophisticated'
  }
];

export function AuthenticatedGenerateClient({ user }: AuthenticatedGenerateClientProps) {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [characterName, setCharacterName] = useState<string>('');
  const [generationCount, setGenerationCount] = useState(0);
  const [showPaywall, setShowPaywall] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [generationHistory, setGenerationHistory] = useState<GenerationItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [error, setError] = useState<GenerationError | null>(null);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [activeUsers, setActiveUsers] = useState(2340);
  const [todaysGenerations, setTodaysGenerations] = useState(45230);
  const router = useRouter();
  
  // Use MakerKit workspace context
  const { user: workspaceUser, account } = useUserWorkspace();

  // Load generation history from database on mount
  useEffect(() => {
    loadGenerationHistory();
    checkIfFirstTime();
    
    // Simulate live stats updates
    const interval = setInterval(() => {
      setActiveUsers(prev => prev + Math.floor(Math.random() * 5 - 2));
      setTodaysGenerations(prev => prev + Math.floor(Math.random() * 10));
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const loadGenerationHistory = async () => {
    try {
      const response = await fetch('/api/generations/history');
      if (response.ok) {
        const data = await response.json();
        const historyWithDates = data.map((item: any) => ({
          ...item,
          timestamp: new Date(item.created_at)
        }));
        setGenerationHistory(historyWithDates);
        setGenerationCount(data.length);
      }
    } catch (error) {
      console.error('Failed to load generation history:', error);
      // Fallback to localStorage for now
      const savedHistory = localStorage.getItem('hushpixel-generation-history');
      if (savedHistory) {
        try {
          const parsed = JSON.parse(savedHistory).map((item: any) => ({
            ...item,
            timestamp: new Date(item.timestamp)
          }));
          setGenerationHistory(parsed);
          setGenerationCount(parsed.length);
        } catch (e) {
          console.error('Failed to parse local history:', e);
        }
      }
    }
  };

  const checkIfFirstTime = () => {
    const hasGenerated = localStorage.getItem('hushpixel-has-generated');
    setIsFirstTime(!hasGenerated && generationCount === 0);
  };

  const handleGenerate = useCallback(async (customPrompt?: string, stylePreset?: string) => {
    const finalPrompt = customPrompt || prompt;
    
    if (!finalPrompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    setError(null);
    setIsGenerating(true);
    setGenerationProgress(0);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: finalPrompt,
          quality: 'standard',
          isFirstGeneration: generationCount === 0
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.error || 'Generation failed';
        const isRetryable = response.status >= 500 || response.status === 429;
        
        throw {
          message: errorMessage,
          code: response.status.toString(),
          retryable: isRetryable
        } as GenerationError;
      }

      const generationItem: GenerationItem = {
        id: Date.now().toString(),
        prompt: finalPrompt,
        imageUrl: data.imageUrl,
        characterName: data.characterName || 'Your Companion',
        timestamp: new Date(),
        style: stylePreset
      };

      setGeneratedImage(data.imageUrl);
      setCharacterName(data.characterName || 'Your Companion');
      setGenerationCount(prev => prev + 1);
      setGenerationHistory(prev => [generationItem, ...prev]);
      setGenerationProgress(100);
      setRetryCount(0);
      
      // Mark that user has generated at least once
      localStorage.setItem('hushpixel-has-generated', 'true');
      setIsFirstTime(false);
      
      // Save to localStorage as backup
      localStorage.setItem('hushpixel-generation-history', JSON.stringify([generationItem, ...generationHistory]));
      
      // Show feedback collection after a delay
      setTimeout(() => {
        setShowFeedback(true);
      }, 5000);
      
      toast.success(`${data.characterName} is ready! 🎉`);
      
    } catch (err) {
      console.error('Generation error:', err);
      
      if (err instanceof Error || (typeof err === 'object' && err !== null && 'message' in err)) {
        setError(err as GenerationError);
        
        if ((err as GenerationError).retryable && retryCount < 3) {
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
            handleGenerate(customPrompt, stylePreset);
          }, 2000);
          return;
        }
      } else {
        setError({
          message: 'An unexpected error occurred',
          retryable: true
        });
      }
      
      toast.error('Generation failed. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, generationCount, generationHistory, retryCount]);

  const handleRetry = () => {
    setError(null);
    handleGenerate();
  };

  const selectFromHistory = (item: GenerationItem) => {
    setGeneratedImage(item.imageUrl);
    setCharacterName(item.characterName);
    setCurrentHistoryIndex(generationHistory.indexOf(item));
    setShowHistory(false);
  };

  const navigateHistory = (direction: 'prev' | 'next') => {
    const newIndex = direction === 'prev' 
      ? Math.max(0, currentHistoryIndex - 1)
      : Math.min(generationHistory.length - 1, currentHistoryIndex + 1);
    
    const item = generationHistory[newIndex];
    if (item) {
      setGeneratedImage(item.imageUrl);
      setCharacterName(item.characterName);
      setCurrentHistoryIndex(newIndex);
    }
  };

  const handleUpgrade = () => {
    startTransition(async () => {
      router.push('/home/billing?source=generation_paywall');
    });
  };

  // Check if user can generate more (based on subscription)
  const canGenerate = true; // For now, let authenticated users generate unlimited

  if (showPaywall && generatedImage) {
    return <PaywallScreen 
      imageUrl={generatedImage}
      characterName={characterName}
      onUpgrade={handleUpgrade}
      isPending={isPending}
    />;
  }

  return (
    <div className="min-h-screen bg-background py-4 sm:py-8">
      {/* Onboarding Tooltips */}
      <OnboardingTooltips 
        userId={account.id} 
        userStatus={isFirstTime ? 'new' : 'returning'} 
        currentPage="generate" 
      />

      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row items-center justify-between mb-4">
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold mb-2 sm:mb-4">
              Generate Your <span className="text-primary">AI Companion</span>
            </h1>
            <div className="flex items-center gap-3">
              {generationHistory.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setShowHistory(!showHistory)}
                  className="mb-2 sm:mb-0"
                >
                  <History className="w-4 h-4 mr-2" />
                  History ({generationHistory.length})
                </Button>
              )}
              <FeedbackCollection 
                userId={account.id} 
                context="generation"
                trigger={
                  <Button variant="outline" size="sm" className="mb-2 sm:mb-0">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Feedback
                  </Button>
                }
              />
            </div>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>{activeUsers.toLocaleString()} active now</span>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              <span>{todaysGenerations.toLocaleString()} generated today</span>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4" />
              <span>4.9/5 rating</span>
            </div>
          </div>
        </div>

        {/* Generation History Sidebar */}
        {showHistory && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Generation History
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowHistory(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {generationHistory.map((item, index) => (
                    <div
                      key={item.id}
                      className="relative group cursor-pointer"
                      onClick={() => selectFromHistory(item)}
                    >
                      <div className="aspect-square rounded-lg overflow-hidden bg-secondary">
                        <img
                          src={item.imageUrl}
                          alt={item.characterName}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-background/0 group-hover:bg-background/20 transition-colors" />
                      </div>
                      <div className="absolute bottom-1 left-1 right-1">
                        <div className="bg-background/80 rounded px-1 py-0.5">
                          <p className="text-xs truncate">{item.characterName}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Left side: Generation controls */}
          <div className="space-y-4 sm:space-y-6">
            {/* Error display */}
            {error && (
              <Card className="bg-destructive/10 border-destructive/30">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="text-destructive font-medium mb-1">Generation Failed</h4>
                      <p className="text-destructive/80 text-sm mb-3">{error.message}</p>
                      {error.retryable && (
                        <Button
                          onClick={handleRetry}
                          variant="outline"
                          size="sm"
                          className="border-destructive/50 text-destructive hover:bg-destructive/20"
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Try Again
                        </Button>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setError(null)}
                      className="text-destructive hover:text-destructive/80"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Prompt input */}
            <TourTarget tourId="prompt-input">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg sm:text-xl">Describe Your Vision</CardTitle>
                    <ContextualHelp 
                      title="Prompt Tips" 
                      description="Be specific about appearance, clothing, pose, and setting. Use terms like 'professional photography' or 'cinematic lighting' for better quality."
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Beautiful woman, elegant dress, professional photography..."
                    className="min-h-[100px] sm:min-h-[120px] text-sm sm:text-base"
                  />
                  
                  {/* Tips for first-time users */}
                  {isFirstTime && prompt.length < 10 && (
                    <Card className="bg-accent/10 border-accent/20">
                      <CardContent className="p-3">
                        <div className="flex items-start gap-2">
                          <Sparkles className="w-4 h-4 text-accent-foreground mt-0.5" />
                          <div>
                            <p className="text-sm font-medium">Pro tip:</p>
                            <p className="text-xs text-muted-foreground">Try: "Beautiful brunette woman, confident smile, red dress, professional photography, studio lighting"</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  
                  <TourTarget tourId="generate-button">
                    <Button 
                      onClick={() => handleGenerate()}
                      disabled={isGenerating || !prompt.trim() || !canGenerate}
                      size="lg"
                      className="w-full font-semibold text-sm sm:text-base"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Generating... {Math.round(generationProgress)}%
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5 mr-2" />
                          {isFirstTime ? 'Generate Your First Companion' : 'Generate Companion'}
                        </>
                      )}
                    </Button>
                  </TourTarget>
                </CardContent>
              </Card>
            </TourTarget>

            {/* Style presets */}
            <TourTarget tourId="style-presets">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg sm:text-xl">Quick Style Presets</CardTitle>
                    <ContextualHelp 
                      title="Style Presets" 
                      description="These presets provide optimized prompts for different artistic styles. Perfect for beginners!"
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
                    {STYLE_PRESETS.map((style, index) => (
                      <Button
                        key={index}
                        onClick={() => handleGenerate(style.prompt, style.name)}
                        disabled={isGenerating || !canGenerate}
                        variant="outline"
                        className="w-full p-3 sm:p-4 h-auto justify-between group"
                      >
                        <div className="text-left">
                          <div className="font-semibold text-primary text-sm sm:text-base">{style.name}</div>
                          <div className="text-xs sm:text-sm text-muted-foreground">{style.description}</div>
                        </div>
                        <div className="text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                          <ChevronLeft className="w-4 h-4" />
                        </div>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TourTarget>
          </div>

          {/* Right side: Generation result */}
          <div className="space-y-4 sm:space-y-6">
            {isGenerating && (
              <Card>
                <CardContent className="p-6 sm:p-8 text-center">
                  <div className="flex justify-center mb-4">
                    <Spinner className="w-16 h-16" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold mb-2">Creating Your Companion...</h3>
                  <p className="text-sm sm:text-base text-muted-foreground mb-4">This usually takes 10-15 seconds</p>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-secondary rounded-full h-2 mb-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-500"
                      style={{ width: `${generationProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-muted-foreground">{Math.round(generationProgress)}% complete</p>
                </CardContent>
              </Card>
            )}

            {generatedImage && (
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="relative">
                    <img 
                      src={generatedImage} 
                      alt={`Generated companion: ${characterName}`}
                      className="w-full aspect-square object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4">
                      <h3 className="text-lg sm:text-xl font-bold mb-2">Meet {characterName}!</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground">Your AI companion is ready to chat</p>
                    </div>
                    
                    {/* History navigation */}
                    {generationHistory.length > 1 && (
                      <div className="absolute top-4 right-4 flex gap-1">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => navigateHistory('prev')}
                          disabled={currentHistoryIndex === 0}
                          className="bg-background/80 backdrop-blur-sm"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => navigateHistory('next')}
                          disabled={currentHistoryIndex === generationHistory.length - 1}
                          className="bg-background/80 backdrop-blur-sm"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-4 space-y-3">
                    <Button 
                      onClick={() => setShowPaywall(true)}
                      className="w-full"
                    >
                      <Crown className="w-4 h-4 mr-2" />
                      Start Chatting with {characterName}
                    </Button>
                    
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1 text-xs sm:text-sm">
                        <Download className="w-4 h-4 mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">Download</span>
                      </Button>
                      <Button variant="outline" className="flex-1 text-xs sm:text-sm">
                        <Heart className="w-4 h-4 mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">Save</span>
                      </Button>
                    </div>
                    
                    {/* Quick feedback after generation */}
                    {showFeedback && (
                      <QuickFeedbackPrompt 
                        userId={account.id} 
                        context="generation" 
                        className="mt-4"
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PaywallScreen({ 
  imageUrl, 
  characterName, 
  onUpgrade, 
  isPending 
}: { 
  imageUrl: string; 
  characterName: string; 
  onUpgrade: () => void;
  isPending: boolean;
}) {
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes timer
  const [viewers, setViewers] = useState(847);
  const [recentSignups, setRecentSignups] = useState(23);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => prev > 0 ? prev - 1 : 0);
    }, 1000);
    
    // Simulate live viewer count changes
    const viewersTimer = setInterval(() => {
      setViewers(prev => prev + Math.floor(Math.random() * 6 - 3));
      if (Math.random() < 0.3) {
        setRecentSignups(prev => prev + 1);
      }
    }, 8000);
    
    return () => {
      clearInterval(timer);
      clearInterval(viewersTimer);
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-2xl mx-auto w-full">
        <Card className="shadow-2xl">
          <CardContent className="p-6 sm:p-8 text-center">
            {/* Special offer badge */}
            <Badge variant="destructive" className="mb-6 text-sm font-semibold">
              <Sparkles className="w-4 h-4 mr-2" />
              LIMITED TIME: Save 50% - Only {formatTime(timeLeft)} left!
            </Badge>

            {/* Character preview */}
            <Card className="relative w-48 sm:w-64 h-48 sm:h-64 mx-auto mb-6 overflow-hidden">
              <img 
                src={imageUrl}
                alt={characterName}
                className="w-full h-full object-cover filter blur-sm"
              />
              <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                <div className="bg-primary rounded-full p-4">
                  <Crown className="w-6 sm:w-8 h-6 sm:h-8 text-primary-foreground" />
                </div>
              </div>
            </Card>

            <h2 className="text-2xl sm:text-3xl font-bold mb-2">
              💔 {characterName} Wants More!
            </h2>
            
            <p className="text-lg sm:text-xl text-muted-foreground mb-2">
              "I loved posing for you... but I can do so much more"
            </p>
            
            <p className="text-sm text-muted-foreground mb-8">
              She's waiting to show you her favorite lingerie, strike seductive poses, and fulfill your deepest fantasies.
            </p>

            {/* Locked customization teasing */}
            <Card className="bg-destructive/10 border-destructive/20 mb-4">
              <CardContent className="p-6">
                <h3 className="font-bold text-destructive mb-4 text-lg flex items-center">
                  <Crown className="w-5 h-5 mr-2" />
                  🔒 Customize {characterName} - LOCKED
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left opacity-75">
                  {[
                    { icon: '👗', text: 'Change outfits & lingerie', locked: true },
                    { icon: '💃', text: '50+ seductive poses', locked: true },
                    { icon: '🏠', text: 'Bedroom & fantasy scenarios', locked: true },
                    { icon: '🎭', text: 'Personality & mood control', locked: true },
                    { icon: '📱', text: 'Voice messages & audio', locked: true },
                    { icon: '🌙', text: 'Exclusive NSFW content', locked: true }
                  ].map((feature, index) => (
                    <div key={index} className="flex items-center text-muted-foreground relative">
                      <span className="mr-3 text-lg grayscale">{feature.icon}</span>
                      <span className="text-sm line-through">{feature.text}</span>
                      <Badge variant="destructive" className="absolute -right-1 -top-1 text-xs px-1 h-auto py-0">🔒</Badge>
                    </div>
                  ))}
                </div>
                <div className="mt-4 text-center">
                  <p className="text-destructive text-sm font-semibold animate-pulse">
                    💔 Want to see {characterName} in that red dress? Upgrade to unlock!
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Value proposition */}
            <Card className="bg-primary/10 border-primary/20 mb-6">
              <CardContent className="p-6">
                <h3 className="font-bold mb-4 text-lg">✨ Unlock Everything Instantly:</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                  {[
                    { icon: '🚀', text: 'Unlimited HD generations', highlight: true },
                    { icon: '💬', text: 'Unlimited intimate conversations', highlight: true },
                    { icon: '🎨', text: 'Full customization control', highlight: false },
                    { icon: '💎', text: 'Ultra HD 4K quality', highlight: false },
                    { icon: '🔒', text: 'Private secure gallery', highlight: false },
                    { icon: '⚡', text: 'Priority 5-second generation', highlight: false }
                  ].map((feature, index) => (
                    <div key={index} className={`flex items-center ${feature.highlight ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                      <span className="mr-3 text-lg">{feature.icon}</span>
                      <span className="text-sm font-medium">{feature.text}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Pricing with urgency */}
            <Card className="bg-accent/10 border-accent border-2 mb-6">
              <CardContent className="p-6">
                <div className="flex items-center justify-center gap-4 mb-4">
                  <div className="text-left">
                    <div className="text-muted-foreground line-through text-lg">$49.99</div>
                    <div className="text-4xl sm:text-5xl font-bold">$24.99</div>
                    <div className="text-muted-foreground font-medium">/month</div>
                  </div>
                  <Badge variant="destructive" className="animate-pulse font-bold">
                    50% OFF
                  </Badge>
                </div>
                <div className="text-sm text-green-600 dark:text-green-400 font-medium text-center">
                  💰 Annual plan: Just $16.99/month (Save 66%!)
                </div>
              </CardContent>
            </Card>

            {/* Enhanced social proof with live elements */}
            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {[1,2,3,4].map(i => (
                      <div key={i} className="w-6 h-6 rounded-full bg-primary border-2 border-background"></div>
                    ))}
                  </div>
                  <span className="text-muted-foreground">127,000+ happy users</span>
                </div>
                <Separator orientation="vertical" className="h-4" />
                <span className="text-yellow-600 dark:text-yellow-400">⭐ 4.9/5 rating</span>
              </div>
              
              {/* Live activity indicators */}
              <Card className="bg-secondary/50">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-green-600 dark:text-green-400">{viewers} people viewing this offer</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Crown className="w-3 h-3 text-yellow-600 dark:text-yellow-400" />
                      <span className="text-yellow-600 dark:text-yellow-400">{recentSignups} signed up in the last hour</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Urgency message */}
            <Card className="bg-destructive/10 border-destructive/30 mb-6">
              <CardContent className="p-4">
                <p className="text-destructive text-sm font-medium text-center">
                  ⚠️ Only 23 spots left at this price! {characterName} and thousands of others are waiting.
                </p>
              </CardContent>
            </Card>

            {/* CTA buttons */}
            <div className="space-y-3">
              <Button 
                onClick={onUpgrade}
                disabled={isPending}
                size="lg"
                className="w-full font-bold text-lg"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Unlocking Your Premium Access...
                  </>
                ) : (
                  <>
                    <Crown className="w-5 h-5 mr-2" />
                    🔥 Unlock Everything Now - $24.99/month
                  </>
                )}
              </Button>
              
              <Button 
                onClick={onUpgrade}
                variant="outline"
                disabled={isPending}
                size="lg"
                className="w-full font-medium"
              >
                💎 Try Annual Plan - Save 66% ($16.99/month)
              </Button>
            </div>

            <div className="mt-6 space-y-2 text-center">
              <p className="text-xs text-muted-foreground">
                ✅ Cancel anytime • 💯 7-day money-back guarantee • 🔒 Secure payment
              </p>
              <p className="text-xs text-accent-foreground">
                ⏰ This offer expires in {formatTime(timeLeft)} - Don't miss out!
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}