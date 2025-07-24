'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@kit/ui/button';
import { If } from '@kit/ui/if';
import { Spinner } from '@kit/ui/spinner';
import { toast } from '@kit/ui/sonner';

import { CharacterSelection } from './character-selection';
import { BodyTypeSelection } from './body-type-selection';
import { EmailCapture } from './email-capture';
import { submitQuizAction } from '../_lib/server/quiz-actions';
import { trackFBQuizComplete, trackFBQuizEvent } from './facebook-pixel';

type QuizStep = 'character' | 'body-type' | 'email' | 'completed';

interface QuizData {
  characterType: string;
  bodyType: string;
  email: string;
}

export function QuizFlow() {
  const [currentStep, setCurrentStep] = useState<QuizStep>('character');
  const [quizData, setQuizData] = useState<Partial<QuizData>>({});
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleCharacterSelect = (characterType: string) => {
    setQuizData(prev => ({ ...prev, characterType }));
    setCurrentStep('body-type');
  };

  const handleBodyTypeSelect = (bodyType: string) => {
    setQuizData(prev => ({ ...prev, bodyType }));
    setCurrentStep('email');
  };

  const handleEmailSubmit = (email: string) => {
    const completeQuizData = { ...quizData, email } as QuizData;
    
    // Track email capture immediately
    trackFBQuizEvent('Lead', {
      content_name: 'Email Captured',
      content_category: 'email_capture',
      email: email.substring(0, 3) + '***', // Partial email for privacy
    });
    
    startTransition(async () => {
      try {
        const result = await submitQuizAction(completeQuizData);
        
        if (result.success) {
          // Track quiz completion with full data for Facebook Pixel
          trackFBQuizComplete({
            character_type: result.data.characterType,
            body_type: result.data.bodyType,
            email: result.data.email.substring(0, 3) + '***', // Partial email for privacy
            session_id: result.data.sessionId,
          });
          
          // Store session data including user info for authentication
          localStorage.setItem('hushpixel_session', JSON.stringify({
            sessionId: result.data.sessionId,
            email: result.data.email,
            characterType: result.data.characterType,
            bodyType: result.data.bodyType,
            userId: result.data.userId,
            isNewUser: result.data.isNewUser,
            timestamp: Date.now(),
            autoCreated: true
          }));
          
          // For new users, trigger auto-signin before redirect
          if (result.data.isNewUser && result.data.userId) {
            try {
              const signinResponse = await fetch('/api/quiz/auto-signin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: result.data.userId })
              });
              
              const signinData = await signinResponse.json();
              
              if (signinData.success && signinData.authUrl) {
                // Redirect to auth URL which will sign in and redirect to generate
                window.location.href = signinData.authUrl;
                return;
              }
            } catch (signinError) {
              console.warn('Auto-signin failed, using fallback redirect:', signinError);
            }
          }
          
          // Fallback: redirect to generate page (existing users or auto-signin failed)
          window.location.href = result.data.redirectUrl;
        } else {
          toast.error('Failed to save quiz data. Please try again.');
        }
      } catch (error) {
        console.error('Quiz submission error:', error);
        toast.error('Something went wrong. Please try again.');
      }
    });
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 'character':
        return 'Who Will Be Your Perfect Companion?';
      case 'body-type':
        return 'What Draws You In Most?';
      case 'email':
        return 'Your Dream Companion Awaits!';
      case 'completed':
        return 'Creating Your Perfect Match...';
      default:
        return '';
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case 'character':
        return 'Choose the type that speaks to your desires';
      case 'body-type':
        return 'Select what captivates you most';
      case 'email':
        return 'Get instant access to your personalized AI companion';
      case 'completed':
        return 'Analyzing your preferences and creating your ideal companion...';
      default:
        return '';
    }
  };

  const getProgressText = () => {
    switch (currentStep) {
      case 'character':
        return 'Building your profile...';
      case 'body-type':
        return 'Personalizing your experience...';
      case 'email':
        return 'Almost ready to meet her!';
      default:
        return '';
    }
  };

  const getProgressPercentage = () => {
    switch (currentStep) {
      case 'character':
        return '33%';
      case 'body-type':
        return '66%';
      case 'email':
        return '100%';
      default:
        return '100%';
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Enhanced Progress bar with excitement copy */}
      <If condition={currentStep !== 'completed'}>
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-muted-foreground">{getProgressText()}</span>
            <span className="text-sm text-primary font-medium">{getProgressPercentage()}</span>
          </div>
          <div className="w-full bg-muted rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-primary via-primary to-primary h-3 rounded-full transition-all duration-500 ease-in-out relative overflow-hidden"
              style={{ width: getProgressPercentage() }}
            >
              {/* Animated shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-foreground/30 to-transparent -skew-x-12 animate-pulse" />
            </div>
          </div>
        </div>
      </If>

      {/* Step content */}
      <If condition={currentStep === 'character'}>
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            {getStepTitle()}
          </h2>
          <p className="text-muted-foreground text-base">
            {getStepDescription()}
          </p>
        </div>
        <CharacterSelection onSelect={handleCharacterSelect} />
      </If>
      
      <If condition={currentStep === 'body-type'}>
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            {getStepTitle()}
          </h2>
          <p className="text-muted-foreground text-base">
            {getStepDescription()}
          </p>
        </div>
        <BodyTypeSelection onSelect={handleBodyTypeSelect} />
      </If>
      
      <If condition={currentStep === 'email'}>
        <EmailCapture 
          onSubmit={handleEmailSubmit}
          isLoading={isPending}
        />
      </If>
      
    </div>
  );
}