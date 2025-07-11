'use client';

import { useState, useEffect } from 'react';
import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Badge } from '@kit/ui/badge';
import { Spinner } from '@kit/ui/spinner';
import { Alert, AlertDescription } from '@kit/ui/alert';
import { Loader2, Sparkles, Crown, Heart, Download, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { trackFBQuizEvent } from '../quiz/_components/facebook-pixel';

interface QuizAutoGenerateProps {
  character: string;
  body: string;
  email: string;
  session: string;
}

interface GenerationResult {
  imageUrl: string;
  characterName: string;
  prompt: string;
  success: boolean;
  error?: string;
}

// Enhanced character prompts for maximum WOW factor NSFW results
const CHARACTER_PROMPTS = {
  'asian-beauty': 'stunning Asian woman, perfect features, elegant and seductive, beautiful almond eyes, silky black hair',
  'blonde-goddess': 'gorgeous blonde goddess, radiant beauty, captivating blue eyes, flowing golden hair, divine appearance',
  'brunette-bombshell': 'sultry brunette bombshell, mesmerizing brown eyes, luscious dark hair, confident and alluring',
  'redhead-vixen': 'fiery redhead vixen, enchanting green eyes, cascading copper hair, passionate and irresistible'
};

const BODY_TYPE_PROMPTS = {
  'slim': 'slender graceful figure, perfect proportions, toned and elegant',
  'curvy': 'voluptuous curves, hourglass silhouette, sensual feminine form',
  'athletic': 'fit athletic physique, toned muscles, strong and beautiful body',
  'petite': 'delicate petite frame, adorable proportions, cute and alluring'
};

export function QuizAutoGenerate({ character, body, email, session }: QuizAutoGenerateProps) {
  const [isGenerating, setIsGenerating] = useState(true);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Capture email on component mount
  useEffect(() => {
    // Store email and session data in localStorage
    const sessionData = {
      sessionId: session,
      email: email,
      characterType: character,
      bodyType: body,
      timestamp: Date.now(),
      generationStarted: true
    };
    
    localStorage.setItem('hushpixel_session', JSON.stringify(sessionData));
    
    // Simple email capture - log to console for now (can be enhanced later)
    console.log('🎯 Lead captured:', { email: email.substring(0, 3) + '***', character, body, session });
    
    // Capture email via simple API call (non-blocking)
    fetch('/api/capture-lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, character, body, session, source: 'quiz_auto_generate' })
    }).catch(err => console.log('Lead capture API not available:', err));

  }, [email, session, character, body]);

  // Auto-generate image on component mount
  useEffect(() => {
    let isMounted = true;
    
    const generateImage = async () => {
      try {
        if (!isMounted) return;
        
        setIsGenerating(true);
        setError(null);
        
        // Build enhanced NSFW prompt for maximum WOW factor
        const characterPrompt = CHARACTER_PROMPTS[character as keyof typeof CHARACTER_PROMPTS] || 'beautiful woman';
        const bodyPrompt = BODY_TYPE_PROMPTS[body as keyof typeof BODY_TYPE_PROMPTS] || 'attractive figure';
        
        // Enhanced NSFW prompt for instant addiction
        const nsfwElements = [
          'nude',
          'topless', 
          'sexy lingerie',
          'seductive pose',
          'bedroom setting',
          'intimate lighting',
          'provocative angle'
        ];
        
        const qualityEnhancers = [
          'masterpiece quality',
          'ultra realistic',
          'detailed skin',
          'perfect anatomy',
          'cinematic lighting',
          'professional photography'
        ];
        
        const fullPrompt = `${characterPrompt}, ${bodyPrompt}, ${nsfwElements.join(', ')}, ${qualityEnhancers.join(', ')}`;
        
        console.log('🎨 Generating image with prompt:', fullPrompt);
        
        // Track generation start event
        trackFBQuizEvent('InitiateCheckout', {
          content_name: 'AI Companion Generation Started',
          content_category: 'AI Generation',
          character_type: character,
          body_type: body,
          value: 0,
          currency: 'USD'
        });
        
        // Call anonymous quiz generation API with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
        
        const response = await fetch('/api/quiz-generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: fullPrompt,
            character: character,
            body: body,
            email: email,
            sessionId: session
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        
        if (!isMounted) return;
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || `Server error: ${response.status}`);
        }

        if (data.success) {
          const characterName = generateCharacterName(character, body);
          setResult({
            imageUrl: data.imageUrl,
            characterName,
            prompt: fullPrompt,
            success: true
          });
          
          // Track successful generation
          trackFBQuizEvent('ViewContent', {
            content_name: 'AI Companion Generated',
            content_category: 'AI Generation',
            character_type: character,
            body_type: body,
            character_name: characterName,
            value: 24.99,
            currency: 'USD'
          });
          
          toast.success(`Meet ${characterName}! Your perfect companion is ready.`);
        } else {
          throw new Error(data.error || 'Generation failed');
        }
        
      } catch (err) {
        console.error('Generation error:', err);
        if (!isMounted) return;
        
        let errorMessage = 'Failed to generate your companion';
        if (err instanceof Error) {
          if (err.name === 'AbortError') {
            errorMessage = 'Generation timed out. Please try again.';
          } else {
            errorMessage = err.message;
          }
        }
        
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        if (isMounted) {
          setIsGenerating(false);
        }
      }
    };

    generateImage();
    
    return () => {
      isMounted = false;
    };
  }, [character, body, email, session]);

  // Generate character name based on selections
  const generateCharacterName = (charType: string, bodyType: string): string => {
    const names = {
      'asian-beauty': ['Sakura', 'Yuki', 'Mei', 'Luna'],
      'blonde-goddess': ['Aurora', 'Stella', 'Diana', 'Celeste'],
      'brunette-bombshell': ['Sophia', 'Isabella', 'Valentina', 'Aria'],
      'redhead-vixen': ['Scarlett', 'Ruby', 'Phoenix', 'Amber']
    };
    
    const nameList = names[charType as keyof typeof names] || ['Beauty'];
    return nameList[Math.floor(Math.random() * nameList.length)];
  };

  if (isGenerating) {
    return <GeneratingAnimation character={character} body={body} />;
  }

  if (error) {
    return <ErrorDisplay error={error} character={character} body={body} />;
  }

  if (result) {
    return <GenerationSuccess result={result} character={character} body={body} email={email} />;
  }

  return null;
}

function GeneratingAnimation({ character, body }: { character: string; body: string }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Spinner className="w-12 h-12" />
          </div>
          <CardTitle className="text-2xl font-bold">
            Creating Your Perfect Companion
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <p className="text-muted-foreground text-lg">
              Based on your quiz: {character.replace('-', ' ')} with {body} figure
            </p>
          </div>

          <Card className="bg-secondary/50">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Processing your preferences...</span>
                <span className="text-primary font-bold">✓</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Generating HD image...</span>
                <Spinner className="w-4 h-4" />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground opacity-60">Preparing your companion...</span>
                <span className="opacity-60">⏳</span>
              </div>
            </CardContent>
          </Card>

          <p className="text-sm text-muted-foreground text-center">
            This usually takes 10-15 seconds
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function ErrorDisplay({ error, character, body }: { error: string; character: string; body: string }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AlertCircle className="w-12 h-12 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-bold">
            Oops! Something went wrong
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              {error}
            </AlertDescription>
          </Alert>

          <div className="text-center">
            <Button 
              onClick={() => window.location.reload()}
              variant="default"
              className="w-full"
            >
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function GenerationSuccess({ result, character, body, email }: { 
  result: GenerationResult; 
  character: string; 
  body: string;
  email: string;
}) {
  const [premiumUsers, setPremiumUsers] = useState(Math.floor(Math.random() * 50) + 20);
  const [timeLeft, setTimeLeft] = useState(23 * 60 + 47); // 23:47

  // Update premium user counter every 15-30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setPremiumUsers(prev => prev + Math.floor(Math.random() * 3));
    }, Math.random() * 15000 + 15000);
    return () => clearInterval(interval);
  }, []);

  // Countdown timer for scarcity
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

  const handleGenerateMore = () => {
    // Redirect back to quiz for new selection
    window.location.href = '/quiz';
  };

  const handleUpgrade = () => {
    // Track upgrade button click
    trackFBQuizEvent('AddToCart', {
      content_name: 'HushPixel Premium Monthly',
      content_category: 'Subscription',
      character_type: character,
      body_type: body,
      character_name: result?.characterName,
      value: 24.99,
      currency: 'USD'
    });
    
    // Store user's companion data for post-authentication
    const companionData = {
      characterName: result.characterName,
      character,
      body,
      email,
      imageUrl: result.imageUrl,
      timestamp: Date.now()
    };
    localStorage.setItem('hushpixel_companion', JSON.stringify(companionData));
    
    // Get session data from localStorage
    const sessionData = localStorage.getItem('hushpixel_session');
    let sessionId = null;
    if (sessionData) {
      try {
        const parsed = JSON.parse(sessionData);
        sessionId = parsed.sessionId;
      } catch (e) {
        console.log('Could not parse session data');
      }
    }
    
    // Direct to seamless checkout with email and session data
    const checkoutUrl = new URL('/checkout', window.location.origin);
    checkoutUrl.searchParams.set('plan', 'premium-monthly');
    checkoutUrl.searchParams.set('source', 'quiz');
    checkoutUrl.searchParams.set('intent', 'premium');
    checkoutUrl.searchParams.set('email', email);
    if (sessionId) {
      checkoutUrl.searchParams.set('session', sessionId);
    }
    
    window.location.href = checkoutUrl.toString();
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Hero Section */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-full font-semibold text-sm mb-4">
            <Sparkles className="w-4 h-4" />
            Your Dream Companion is Ready!
          </div>
          
          <h1 className="text-5xl font-bold mb-2 text-foreground">
            Meet {result.characterName}
          </h1>
          
          <p className="text-muted-foreground text-xl">
            Created based on your perfect match: {character.replace('-', ' ')} with {body} figure
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Generated Image */}
          <div className="lg:col-span-2">
            <Card className="overflow-hidden shadow-2xl">
              <CardContent className="p-0 relative">
                <img 
                  src={result.imageUrl} 
                  alt={result.characterName}
                  className="w-full h-auto"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/images/placeholder-companion.jpg';
                  }}
                />
                <div className="absolute bottom-4 left-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
                  {result.characterName}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Premium Features & CTAs */}
          <div className="space-y-6">
            {/* Social Proof */}
            <Card className="border-2 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium">Live Activity</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{premiumUsers} online</span>
                </div>
                <div className="space-y-2 text-sm">
                  <p className="text-muted-foreground">🔥 {Math.floor(Math.random() * 15) + 12} premium members creating companions right now</p>
                  <p className="text-muted-foreground">⚡ Premium users generate 8x more companions</p>
                </div>
              </CardContent>
            </Card>

            {/* Locked Features Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">🔒 Premium Features</CardTitle>
                <p className="text-sm text-muted-foreground">Unlock {result.characterName}'s full potential</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Locked Feature 1: Poses */}
                <div className="relative">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="aspect-square bg-muted rounded-lg relative overflow-hidden">
                      <div className="absolute inset-0 bg-primary/20 backdrop-blur-sm flex items-center justify-center">
                        <span className="text-primary-foreground text-xs font-bold">🔒</span>
                      </div>
                    </div>
                    <div className="aspect-square bg-muted rounded-lg relative overflow-hidden">
                      <div className="absolute inset-0 bg-primary/20 backdrop-blur-sm flex items-center justify-center">
                        <span className="text-primary-foreground text-xs font-bold">🔒</span>
                      </div>
                    </div>
                    <div className="aspect-square bg-muted rounded-lg relative overflow-hidden">
                      <div className="absolute inset-0 bg-primary/20 backdrop-blur-sm flex items-center justify-center">
                        <span className="text-primary-foreground text-xs font-bold">🔒</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm font-medium mt-2">47+ Custom Poses</p>
                  <p className="text-xs text-muted-foreground">Sitting, standing, lying down & more</p>
                </div>

                {/* Locked Feature 2: Outfits */}
                <div className="relative">
                  <div className="grid grid-cols-4 gap-1">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="aspect-square bg-muted rounded-md relative overflow-hidden">
                        <div className="absolute inset-0 bg-primary/20 backdrop-blur-sm flex items-center justify-center">
                          <span className="text-primary-foreground text-xs font-bold">🔒</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm font-medium mt-2">23+ Outfit Styles</p>
                  <p className="text-xs text-muted-foreground">Lingerie, bikinis, costumes & more</p>
                </div>

                {/* Locked Feature 3: Backgrounds */}
                <div className="relative">
                  <div className="grid grid-cols-3 gap-2">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="aspect-video bg-muted rounded-md relative overflow-hidden">
                        <div className="absolute inset-0 bg-primary/20 backdrop-blur-sm flex items-center justify-center">
                          <span className="text-primary-foreground text-xs font-bold">🔒</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm font-medium mt-2">15+ Backgrounds</p>
                  <p className="text-xs text-muted-foreground">Bedroom, beach, studio & more</p>
                </div>
              </CardContent>
            </Card>

            {/* Scarcity & Upgrade CTA */}
            <Card className="border-2 border-destructive/50 bg-destructive/5">
              <CardContent className="p-4">
                <div className="text-center mb-4">
                  <div className="text-destructive font-bold text-lg mb-1">
                    ⏰ LIMITED TIME: 50% OFF
                  </div>
                  <div className="text-2xl font-bold text-destructive">
                    {formatTime(timeLeft)}
                  </div>
                  <p className="text-sm text-muted-foreground">Special launch pricing expires soon</p>
                </div>
                
                <div className="space-y-3">
                  <Button 
                    onClick={handleUpgrade}
                    className="w-full font-bold py-3 text-lg"
                    size="lg"
                  >
                    <Crown className="w-5 h-5 mr-2" />
                    Unlock Everything - $12.49/mo
                  </Button>
                  
                  <Button 
                    onClick={handleGenerateMore}
                    variant="outline" 
                    className="w-full"
                  >
                    <Heart className="w-4 h-4 mr-2" />
                    Create Another Companion
                  </Button>
                </div>
                
                <div className="mt-4 text-center">
                  <p className="text-xs text-muted-foreground mb-2">✅ 30-day money-back guarantee</p>
                  <p className="text-xs text-muted-foreground">Join {premiumUsers}+ premium members worldwide</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}