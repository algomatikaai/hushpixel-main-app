'use client';

import { useState, useTransition, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@kit/ui/button';
import { Textarea } from '@kit/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Badge } from '@kit/ui/badge';
import { ScrollArea } from '@kit/ui/scroll-area';
import { Separator } from '@kit/ui/separator';
import { Loader2, Sparkles, Crown, Download, Heart, History, RefreshCw, AlertCircle, X, ChevronLeft, ChevronRight, Timer, Zap, Users, Star, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

// Import our new components
import { FeedbackCollection, QuickFeedbackPrompt } from '../home/(user)/_components/feedback-collection';
import { OnboardingTooltips, TourTarget, ContextualHelp } from '../home/(user)/_components/onboarding-tooltips';

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

export default function GenerateClient() {
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

  // Mock user ID for demo - in production this would come from your auth system
  const userId = 'demo-user-123';

  // Load generation history from localStorage on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('hushpixel-generation-history');
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory).map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        }));
        setGenerationHistory(parsed);
      } catch (e) {
        console.error('Failed to load generation history:', e);
      }
    }

    // Check if this is the user's first time
    const hasGenerated = localStorage.getItem('hushpixel-has-generated');
    setIsFirstTime(!hasGenerated);

    // Simulate live stats updates
    const statsInterval = setInterval(() => {
      setActiveUsers(prev => prev + Math.floor(Math.random() * 10 - 5));
      setTodaysGenerations(prev => prev + Math.floor(Math.random() * 5));
    }, 30000); // Update every 30 seconds

    return () => clearInterval(statsInterval);
  }, []);

  // Save generation history to localStorage whenever it changes
  useEffect(() => {
    if (generationHistory.length > 0) {
      localStorage.setItem('hushpixel-generation-history', JSON.stringify(generationHistory));
    }
  }, [generationHistory]);

  // Progress simulation for better UX
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isGenerating) {
      setGenerationProgress(0);
      interval = setInterval(() => {
        setGenerationProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 10;
        });
      }, 500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isGenerating]);

  const handleGenerate = async (customPrompt?: string, stylePreset?: string) => {
    const finalPrompt = customPrompt || prompt;
    
    if (!finalPrompt.trim()) {
      toast.error('Please enter a description or select a style preset');
      return;
    }

    // Check if user hit the free limit
    if (generationCount >= 1) {
      setShowPaywall(true);
      return;
    }

    setIsGenerating(true);
    setGeneratedImage(null);
    setError(null);
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
      
      // Show feedback collection after a delay
      setTimeout(() => {
        setShowFeedback(true);
      }, 3000);
      
      toast.success('Image generated successfully!');

    } catch (error) {
      console.error('Generation error:', error);
      const errorObj = error as GenerationError;
      setError(errorObj);
      
      if (errorObj.retryable && retryCount < 2) {
        toast.error(`Generation failed. Retrying... (${retryCount + 1}/3)`);
        setRetryCount(prev => prev + 1);
        setTimeout(() => handleGenerate(finalPrompt, stylePreset), 2000);
      } else {
        toast.error(errorObj.message || 'Generation failed');
      }
    } finally {
      if (!error || !(error as GenerationError).retryable || retryCount >= 2) {
        setIsGenerating(false);
        setGenerationProgress(0);
      }
    }
  };

  const handleRetry = useCallback(() => {
    if (error && error.retryable) {
      setRetryCount(0);
      handleGenerate(prompt);
    }
  }, [error, prompt]);

  const selectFromHistory = (item: GenerationItem) => {
    setGeneratedImage(item.imageUrl);
    setCharacterName(item.characterName);
    setPrompt(item.prompt);
    setShowHistory(false);
  };

  const navigateHistory = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentHistoryIndex > 0) {
      setCurrentHistoryIndex(prev => prev - 1);
    } else if (direction === 'next' && currentHistoryIndex < generationHistory.length - 1) {
      setCurrentHistoryIndex(prev => prev + 1);
    }
  };

  const handleUpgrade = () => {
    startTransition(() => {
      router.push('/home/billing');
    });
  };

  if (showPaywall && generatedImage) {
    return <PaywallScreen 
      imageUrl={generatedImage}
      characterName={characterName}
      onUpgrade={handleUpgrade}
      isPending={isPending}
    />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-purple-900 py-4 sm:py-8">
      {/* Onboarding Tooltips */}
      <OnboardingTooltips 
        userId={userId} 
        userStatus={isFirstTime ? 'new' : 'returning'} 
        currentPage="generate" 
      />

      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row items-center justify-between mb-4">
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold text-white mb-2 sm:mb-4">
              Generate Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">AI Companion</span>
            </h1>
            <div className="flex items-center gap-3">
              {generationHistory.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setShowHistory(!showHistory)}
                  className="border-purple-500/30 text-purple-200 hover:bg-purple-600/20 mb-2 sm:mb-0"
                >
                  <History className="w-4 h-4 mr-2" />
                  History ({generationHistory.length})
                </Button>
              )}
              <FeedbackCollection 
                userId={userId} 
                context="generation"
                trigger={
                  <Button variant="outline" size="sm" className="border-purple-500/30 text-purple-200 hover:bg-purple-600/20 mb-2 sm:mb-0">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Feedback
                  </Button>
                }
              />
            </div>
          </div>
          <p className="text-lg sm:text-xl text-gray-300 mb-4">
            Describe your perfect companion and watch AI bring them to life
          </p>
          
          {/* Social Proof and Status Indicators */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 mb-4">
            <div className="inline-flex items-center gap-2 bg-purple-600/20 border border-purple-500/30 rounded-full px-3 sm:px-4 py-2 text-purple-200">
              <Sparkles className="w-4 h-4" />
              <span className="text-xs sm:text-sm">
                {generationCount === 0 ? 'First generation is HD quality!' : `${1 - generationCount} free generations remaining`}
              </span>
            </div>
            
            <div className="inline-flex items-center gap-2 bg-green-600/20 border border-green-500/30 rounded-full px-3 sm:px-4 py-2 text-green-200">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-xs sm:text-sm">
                {activeUsers.toLocaleString()} users online
              </span>
            </div>
            
            <div className="inline-flex items-center gap-2 bg-blue-600/20 border border-blue-500/30 rounded-full px-3 sm:px-4 py-2 text-blue-200">
              <Zap className="w-4 h-4" />
              <span className="text-xs sm:text-sm">
                {todaysGenerations.toLocaleString()} generated today
              </span>
            </div>
            
            {error && (
              <Badge variant="destructive" className="text-xs">
                <AlertCircle className="w-3 h-3 mr-1" />
                Generation Error
              </Badge>
            )}
          </div>

          {/* Trust indicators for first-time users */}
          {isFirstTime && (
            <div className="flex items-center justify-center gap-4 text-sm text-gray-400 mb-4">
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>127,000+ users</span>
              </div>
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-400" />
                <span>4.9/5 rating</span>
              </div>
              <div className="flex items-center gap-1">
                <Crown className="w-4 h-4 text-purple-400" />
                <span>No credit card required</span>
              </div>
            </div>
          )}
        </div>

        {/* Generation History Sidebar */}
        {showHistory && (
          <Card className="mb-6 bg-gray-800/50 border-gray-700">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Generation History
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowHistory(false)}
                  className="text-gray-400 hover:text-white"
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
                      <div className="aspect-square rounded-lg overflow-hidden bg-gray-700">
                        <img
                          src={item.imageUrl}
                          alt={item.characterName}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                      </div>
                      <div className="absolute bottom-1 left-1 right-1">
                        <div className="bg-black/70 rounded px-1 py-0.5">
                          <p className="text-xs text-white truncate">{item.characterName}</p>
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
              <Card className="bg-red-900/20 border-red-500/30">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="text-red-200 font-medium mb-1">Generation Failed</h4>
                      <p className="text-red-300 text-sm mb-3">{error.message}</p>
                      {error.retryable && (
                        <Button
                          onClick={handleRetry}
                          variant="outline"
                          size="sm"
                          className="border-red-500/50 text-red-200 hover:bg-red-600/20"
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
                      className="text-red-400 hover:text-red-200"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Prompt input */}
            <TourTarget tourId="prompt-input">
              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white text-lg sm:text-xl">Describe Your Vision</CardTitle>
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
                    className="min-h-[100px] sm:min-h-[120px] bg-gray-900/50 border-gray-600 text-white placeholder-gray-400 text-sm sm:text-base"
                  />
                  
                  {/* Tips for first-time users */}
                  {isFirstTime && prompt.length < 10 && (
                    <div className="bg-purple-900/30 border border-purple-500/30 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <Sparkles className="w-4 h-4 text-purple-400 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-purple-200">Pro tip:</p>
                          <p className="text-xs text-purple-300">Try: "Beautiful brunette woman, confident smile, red dress, professional photography, studio lighting"</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <TourTarget tourId="generate-button">
                    <Button 
                      onClick={() => handleGenerate()}
                      disabled={isGenerating || !prompt.trim()}
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 text-sm sm:text-base"
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
              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white text-lg sm:text-xl">Quick Style Presets</CardTitle>
                    <ContextualHelp 
                      title="Style Presets" 
                      description="These presets provide optimized prompts for different artistic styles. Perfect for beginners!"
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
                    {STYLE_PRESETS.map((style, index) => (
                      <button
                        key={index}
                        onClick={() => handleGenerate(style.prompt, style.name)}
                        disabled={isGenerating}
                        className="w-full p-3 sm:p-4 text-left bg-gray-900/50 hover:bg-gray-700/50 border border-gray-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-purple-400 text-sm sm:text-base group-hover:text-purple-300">{style.name}</div>
                            <div className="text-xs sm:text-sm text-gray-400">{style.description}</div>
                          </div>
                          <div className="text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity">
                            <ChevronRight className="w-4 h-4" />
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TourTarget>
          </div>

          {/* Right side: Generation result */}
          <div className="space-y-4 sm:space-y-6">
            {isGenerating && (
              <Card className="bg-gray-800/50 border-gray-700">
                <CardContent className="p-6 sm:p-8 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 relative">
                    <div className="absolute inset-0 rounded-full border-4 border-purple-200 opacity-20"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-purple-500 border-t-transparent animate-spin"></div>
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">Creating Your Companion...</h3>
                  <p className="text-sm sm:text-base text-gray-400 mb-4">This usually takes 10-15 seconds</p>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                    <div 
                      className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${generationProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500">{Math.round(generationProgress)}% complete</p>
                </CardContent>
              </Card>
            )}

            {generatedImage && (
              <Card className="bg-gray-800/50 border-gray-700 overflow-hidden">
                <CardContent className="p-0">
                  <div className="relative">
                    <img 
                      src={generatedImage} 
                      alt={`Generated companion: ${characterName}`}
                      className="w-full aspect-square object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4">
                      <h3 className="text-lg sm:text-xl font-bold text-white mb-2">Meet {characterName}!</h3>
                      <p className="text-xs sm:text-sm text-gray-200">Your AI companion is ready to chat</p>
                    </div>
                    
                    {/* History navigation */}
                    {generationHistory.length > 1 && (
                      <div className="absolute top-4 right-4 flex gap-1">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => navigateHistory('prev')}
                          disabled={currentHistoryIndex === 0}
                          className="bg-black/50 border-gray-600 text-white hover:bg-black/70"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => navigateHistory('next')}
                          disabled={currentHistoryIndex === generationHistory.length - 1}
                          className="bg-black/50 border-gray-600 text-white hover:bg-black/70"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-4 space-y-3">
                    <Button 
                      onClick={() => setShowPaywall(true)}
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-sm sm:text-base py-2 sm:py-3"
                    >
                      <Crown className="w-4 h-4 mr-2" />
                      Start Chatting with {characterName}
                    </Button>
                    
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700 text-xs sm:text-sm">
                        <Download className="w-4 h-4 mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">Download</span>
                      </Button>
                      <Button variant="outline" className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700 text-xs sm:text-sm">
                        <Heart className="w-4 h-4 mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">Save</span>
                      </Button>
                    </div>
                    
                    {/* Quick feedback after generation */}
                    {showFeedback && (
                      <QuickFeedbackPrompt 
                        userId={userId} 
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
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-purple-900 flex items-center justify-center p-4">
      <div className="max-w-2xl mx-auto w-full">
        <Card className="bg-gray-800/90 border-purple-500/30 backdrop-blur-sm shadow-2xl">
          <CardContent className="p-6 sm:p-8 text-center">
            {/* Special offer badge */}
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-red-500 to-pink-500 rounded-full px-4 py-2 mb-6">
              <Sparkles className="w-4 h-4 text-white" />
              <span className="text-white text-sm font-semibold">
                LIMITED TIME: Save 50% - Only {formatTime(timeLeft)} left!
              </span>
            </div>

            {/* Character preview */}
            <div className="relative w-48 sm:w-64 h-48 sm:h-64 mx-auto mb-6 rounded-2xl overflow-hidden shadow-2xl">
              <img 
                src={imageUrl}
                alt={characterName}
                className="w-full h-full object-cover filter blur-sm"
              />
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-full p-4 shadow-lg">
                  <Crown className="w-6 sm:w-8 h-6 sm:h-8 text-white" />
                </div>
              </div>
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
              🔓 Unlock {characterName} Now!
            </h2>
            
            <p className="text-lg sm:text-xl text-gray-300 mb-2">
              Your perfect companion is waiting...
            </p>
            
            <p className="text-sm text-purple-300 mb-8">
              Don't let {characterName} slip away! Unlimited generations & conversations await.
            </p>

            {/* Value proposition */}
            <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 rounded-xl p-6 mb-6 border border-purple-500/20">
              <h3 className="font-bold text-white mb-4 text-lg">🎯 What You Get Instantly:</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                {[
                  { icon: '🚀', text: 'Unlimited HD generations', highlight: true },
                  { icon: '💬', text: 'Unlimited chat conversations', highlight: true },
                  { icon: '🎨', text: 'Character consistency & memory', highlight: false },
                  { icon: '💎', text: 'Premium HD quality', highlight: false },
                  { icon: '🔒', text: 'Private secure gallery', highlight: false },
                  { icon: '⚡', text: 'Lightning-fast generation', highlight: false }
                ].map((feature, index) => (
                  <div key={index} className={`flex items-center ${feature.highlight ? 'text-yellow-300' : 'text-gray-300'}`}>
                    <span className="mr-3 text-lg">{feature.icon}</span>
                    <span className="text-sm font-medium">{feature.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pricing with urgency */}
            <div className="bg-gradient-to-r from-purple-600/30 to-pink-600/30 rounded-xl p-6 mb-6 border-2 border-purple-400/50">
              <div className="flex items-center justify-center gap-4 mb-4">
                <div className="text-left">
                  <div className="text-gray-400 line-through text-lg">$49.99</div>
                  <div className="text-4xl sm:text-5xl font-bold text-white">$24.99</div>
                  <div className="text-purple-300 font-medium">/month</div>
                </div>
                <div className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold animate-pulse">
                  50% OFF
                </div>
              </div>
              <div className="text-sm text-green-400 font-medium">
                💰 Annual plan: Just $16.99/month (Save 66%!)
              </div>
            </div>

            {/* Enhanced social proof with live elements */}
            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {[1,2,3,4].map(i => (
                      <div key={i} className="w-6 h-6 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 border-2 border-gray-800"></div>
                    ))}
                  </div>
                  <span className="text-gray-300">127,000+ happy users</span>
                </div>
                <Separator orientation="vertical" className="h-4" />
                <span className="text-yellow-400">⭐ 4.9/5 rating</span>
              </div>
              
              {/* Live activity indicators */}
              <div className="bg-gray-800/50 rounded-lg p-3 border border-purple-500/20">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-green-200">{viewers} people viewing this offer</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Crown className="w-3 h-3 text-yellow-400" />
                    <span className="text-yellow-200">{recentSignups} signed up in the last hour</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Urgency message */}
            <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-4 mb-6">
              <p className="text-red-200 text-sm font-medium">
                ⚠️ Only 23 spots left at this price! {characterName} and thousands of others are waiting.
              </p>
            </div>

            {/* CTA buttons */}
            <div className="space-y-3">
              <Button 
                onClick={onUpgrade}
                disabled={isPending}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-4 text-lg shadow-xl hover:shadow-2xl transition-all"
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
                className="w-full border-purple-500/50 text-purple-200 hover:bg-purple-600/20 font-medium"
              >
                💎 Try Annual Plan - Save 66% ($16.99/month)
              </Button>
            </div>

            <div className="mt-6 space-y-2">
              <p className="text-xs text-gray-400">
                ✅ Cancel anytime • 💯 7-day money-back guarantee • 🔒 Secure payment
              </p>
              <p className="text-xs text-purple-300">
                ⏰ This offer expires in {formatTime(timeLeft)} - Don't miss out!
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}