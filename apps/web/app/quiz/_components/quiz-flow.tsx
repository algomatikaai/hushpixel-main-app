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
          
          // Track quiz completion with full data
          trackFBQuizComplete({
            character_type: result.data.characterType,
            body_type: result.data.bodyType,
            quiz_id: result.data.quizId,
          });
          
          // Redirect to auth with quiz context
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
        return 'Choose Your Perfect Companion';
      case 'body-type':
        return 'Select Body Type';
      case 'email':
        return 'Almost Done!';
      case 'completed':
        return 'Creating Your Companion...';
      default:
        return '';
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case 'character':
        return 'Select the character type that appeals to you most';
      case 'body-type':
        return 'Choose your preferred body type';
      case 'email':
        return 'Enter your email to see your personalized companion';
      case 'completed':
        return 'Your perfect AI companion is being created...';
      default:
        return '';
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Progress bar - only show during quiz steps */}
      <If condition={currentStep !== 'completed'}>
        <div className="w-full bg-gray-700 rounded-full h-2 mb-8">
          <div 
            className="bg-gradient-to-r from-purple-500 to-orange-500 h-2 rounded-full transition-all duration-300 ease-in-out"
            style={{ 
              width: currentStep === 'character' ? '33%' : 
                     currentStep === 'body-type' ? '66%' : 
                     currentStep === 'email' ? '100%' : '100%' 
            }}
          />
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
          <Spinner className="h-16 w-16 mx-auto mb-4" />
          <p className="text-white text-xl mb-2">Creating your perfect companion...</p>
          <p className="text-gray-400">Redirecting to your personalized experience...</p>
        </div>
      </If>
    </div>
  );
}