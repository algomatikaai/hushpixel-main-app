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
          setCurrentStep('completed');
          
          // Track quiz completion with full data for Facebook Pixel
          trackFBQuizComplete({
            character_type: result.data.characterType,
            body_type: result.data.bodyType,
            email: result.data.email.substring(0, 3) + '***', // Partial email for privacy
            session_id: result.data.sessionId,
          });
          
          // Store session data in localStorage for stickiness
          localStorage.setItem('hushpixel_session', JSON.stringify({
            sessionId: result.data.sessionId,
            email: result.data.email,
            characterType: result.data.characterType,
            bodyType: result.data.bodyType,
            timestamp: Date.now()
          }));
          
          // Redirect to generation page with session data
          setTimeout(() => {
            window.location.href = result.data.redirectUrl;
          }, 2000);
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
            <span className="text-sm text-gray-300">{getProgressText()}</span>
            <span className="text-sm text-purple-400 font-medium">{getProgressPercentage()}</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 h-3 rounded-full transition-all duration-500 ease-in-out relative overflow-hidden"
              style={{ width: getProgressPercentage() }}
            >
              {/* Animated shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 animate-pulse" />
            </div>
          </div>
        </div>
      </If>

      {/* Step content */}
      <If condition={currentStep === 'character'}>
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
            {getStepTitle()}
          </h2>
          <p className="text-gray-200 text-base">
            {getStepDescription()}
          </p>
        </div>
        <CharacterSelection onSelect={handleCharacterSelect} />
      </If>
      
      <If condition={currentStep === 'body-type'}>
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
            {getStepTitle()}
          </h2>
          <p className="text-gray-200 text-base">
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
      
      <If condition={currentStep === 'completed'}>
        <div className="text-center py-8">
          <div className="relative mb-6">
            <Spinner className="h-16 w-16 mx-auto text-purple-500" />
            <div className="absolute inset-0 rounded-full border-2 border-purple-500/20 animate-ping" />
          </div>
          <h2 className="text-white text-2xl font-bold mb-3">
            {getStepTitle()}
          </h2>
          <p className="text-purple-300 text-lg mb-2">
            {getStepDescription()}
          </p>
          <div className="mt-4 space-y-1">
            <p className="text-gray-400 text-sm animate-pulse">
              ✨ Analyzing your preferences...
            </p>
            <p className="text-gray-400 text-sm animate-pulse" style={{animationDelay: '0.5s'}}>
              💖 Crafting your perfect match...
            </p>
            <p className="text-gray-400 text-sm animate-pulse" style={{animationDelay: '1s'}}>
              🎨 Adding final touches...
            </p>
          </div>
        </div>
      </If>
    </div>
  );
}