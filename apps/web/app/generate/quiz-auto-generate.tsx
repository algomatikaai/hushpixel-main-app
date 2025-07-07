'use client';

import { useState, useEffect } from 'react';
import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Badge } from '@kit/ui/badge';
import { Loader2, Sparkles, Crown, Heart, Download } from 'lucide-react';
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

// Character type mappings for prompt building
const CHARACTER_PROMPTS = {
  'asian-beauty': 'beautiful Asian woman, elegant and graceful',
  'blonde-goddess': 'beautiful blonde woman, goddess-like appearance',
  'brunette-bombshell': 'beautiful brunette woman, stunning and confident',
  'redhead-vixen': 'beautiful redhead woman, fiery and passionate'
};

const BODY_TYPE_PROMPTS = {
  'slim': 'slim figure, elegant proportions',
  'curvy': 'curvy figure, feminine silhouette',
  'athletic': 'athletic build, toned physique',
  'petite': 'petite frame, delicate features'
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
        
        // Build prompt from quiz selections
        const characterPrompt = CHARACTER_PROMPTS[character as keyof typeof CHARACTER_PROMPTS] || 'beautiful woman';
        const bodyPrompt = BODY_TYPE_PROMPTS[body as keyof typeof BODY_TYPE_PROMPTS] || 'attractive figure';
        
        const fullPrompt = `${characterPrompt}, ${bodyPrompt}, professional photography, high quality, detailed, beautiful lighting, portrait style`;
        
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
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-purple-900 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-6">
        <div className="mb-8">
          <div className="w-24 h-24 mx-auto mb-6 relative">
            <div className="absolute inset-0 rounded-full border-4 border-purple-200 opacity-20"></div>
            <div className="absolute inset-0 rounded-full border-4 border-purple-500 border-t-transparent animate-spin"></div>
            <div className="absolute inset-3 rounded-full border-2 border-purple-300 border-b-transparent animate-spin animation-delay-150"></div>
          </div>
          
          <h1 className="text-3xl font-bold text-white mb-4">
            Creating Your Perfect Companion...
          </h1>
          
          <p className="text-purple-200 text-lg mb-6">
            Based on your quiz: {character.replace('-', ' ')} with {body} figure
          </p>

          <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between text-sm text-gray-300 mb-2">
              <span>Processing your preferences...</span>
              <span className="text-purple-400">✓</span>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-300 mb-2">
              <span>Generating HD image...</span>
              <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>Preparing your companion...</span>
              <span>⏳</span>
            </div>
          </div>

          <p className="text-sm text-gray-400">
            This usually takes 10-15 seconds
          </p>
        </div>
      </div>
    </div>
  );
}

function ErrorDisplay({ error, character, body }: { error: string; character: string; body: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-purple-900 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-4">
            Oops! Something went wrong
          </h1>
          
          <p className="text-red-200 text-lg mb-6">
            {error}
          </p>

          <Button 
            onClick={() => window.location.reload()} 
            className="bg-purple-600 hover:bg-purple-700"
          >
            Try Again
          </Button>
        </div>
      </div>
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
    // Redirect to subscription/billing page
    window.location.href = '/billing?source=quiz_completion';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-purple-900 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <Badge className="mb-4 bg-green-600">
            <Sparkles className="w-4 h-4 mr-2" />
            Your Companion is Ready!
          </Badge>
          
          <h1 className="text-4xl font-bold text-white mb-2">
            Meet {result.characterName}
          </h1>
          
          <p className="text-purple-200 text-lg">
            Created based on your perfect match: {character.replace('-', ' ')} with {body} figure
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-center">
          {/* Generated Image */}
          <div className="relative">
            <Card className="bg-gray-800/50 border-purple-500/30">
              <CardContent className="p-4">
                <img 
                  src={result.imageUrl} 
                  alt={result.characterName}
                  className="w-full h-auto rounded-lg"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/images/placeholder-companion.jpg';
                  }}
                />
              </CardContent>
            </Card>
          </div>

          {/* Action Panel */}
          <div className="space-y-6">
            <Card className="bg-gray-800/30 border-purple-500/30">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Crown className="w-5 h-5 mr-2 text-yellow-500" />
                  Your Perfect Match
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-gray-300">
                  <p className="font-semibold text-purple-200">{result.characterName}</p>
                  <p className="text-sm text-gray-400">Generated just for you</p>
                </div>
                
                <div className="flex space-x-2">
                  <Button 
                    onClick={handleGenerateMore}
                    variant="outline" 
                    className="flex-1 border-purple-500 text-purple-200 hover:bg-purple-800"
                  >
                    <Heart className="w-4 h-4 mr-2" />
                    Generate More
                  </Button>
                  
                  <Button 
                    onClick={handleUpgrade}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    <Crown className="w-4 h-4 mr-2" />
                    Unlock Premium
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="text-center text-gray-400 text-sm">
              <p>Want unlimited generations and premium features?</p>
              <p className="text-purple-300">Upgrade to premium for full access!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}