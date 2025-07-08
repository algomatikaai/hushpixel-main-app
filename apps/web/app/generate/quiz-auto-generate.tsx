'use client';

import { useState, useEffect } from 'react';
import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Badge } from '@kit/ui/badge';
import { Spinner } from '@kit/ui/spinner';
import { Alert, AlertDescription } from '@kit/ui/alert';
import { Loader2, Sparkles, Crown, Heart, Download, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

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
    const generateImage = async () => {
      try {
        setIsGenerating(true);
        
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
        
        // Call anonymous quiz generation API
        const response = await fetch('/api/quiz-generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: fullPrompt,
            character: character,
            body: body,
            email: email,
            sessionId: session
          })
        });

        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Generation failed');
        }

        if (data.success) {
          const characterName = generateCharacterName(character, body);
          setResult({
            imageUrl: data.imageUrl,
            characterName,
            prompt: fullPrompt,
            success: true
          });
          toast.success(`Meet ${characterName}! Your perfect companion is ready.`);
        } else {
          throw new Error(data.error || 'Generation failed');
        }
        
      } catch (err) {
        console.error('Generation error:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to generate your companion';
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setIsGenerating(false);
      }
    };

    generateImage();
  }, [character, body, session]);

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
  const handleGenerateMore = () => {
    // Redirect to regular generation page for more creations
    window.location.href = '/generate';
  };

  const handleUpgrade = () => {
    // Redirect to subscription/billing page (MakerKit billing path)
    window.location.href = '/home/billing?source=quiz_completion';
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center">
          <Badge variant="secondary" className="mb-4">
            <Sparkles className="w-4 h-4 mr-2" />
            Your Companion is Ready!
          </Badge>
          
          <h1 className="text-4xl font-bold mb-2">
            Meet {result.characterName}
          </h1>
          
          <p className="text-muted-foreground text-lg">
            Created based on your perfect match: {character.replace('-', ' ')} with {body} figure
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-start">
          {/* Generated Image */}
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <img 
                src={result.imageUrl} 
                alt={result.characterName}
                className="w-full h-auto"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/images/placeholder-companion.jpg';
                }}
              />
            </CardContent>
          </Card>

          {/* Action Panel */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Crown className="w-5 h-5 mr-2 text-primary" />
                  Your Perfect Match
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="font-semibold text-lg">{result.characterName}</p>
                  <p className="text-sm text-muted-foreground">Generated just for you</p>
                </div>
                
                <div className="flex space-x-2">
                  <Button 
                    onClick={handleGenerateMore}
                    variant="outline" 
                    className="flex-1"
                  >
                    <Heart className="w-4 h-4 mr-2" />
                    Generate More
                  </Button>
                  
                  <Button 
                    onClick={handleUpgrade}
                    className="flex-1"
                  >
                    <Crown className="w-4 h-4 mr-2" />
                    Unlock Premium
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-secondary/50">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-muted-foreground mb-1">Want unlimited generations and premium features?</p>
                <p className="text-sm font-medium">Upgrade to premium for full access!</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}