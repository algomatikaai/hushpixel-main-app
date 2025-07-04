'use client';

import { useState, useEffect } from 'react';
import { Button } from '@kit/ui/button';
import { Card, CardContent } from '@kit/ui/card';
import { Badge } from '@kit/ui/badge';
import { Progress } from '@kit/ui/progress';
import { 
  HelpCircle, 
  ChevronRight, 
  ChevronLeft, 
  X, 
  Lightbulb,
  Target,
  Zap,
  Crown,
  Camera,
  MessageSquare,
  Settings,
  CreditCard,
  CheckCircle,
  Sparkles
} from 'lucide-react';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  target?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  optional?: boolean;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

interface OnboardingTooltipsProps {
  userId: string;
  userStatus: 'new' | 'returning' | 'experienced';
  currentPage?: 'home' | 'generate' | 'billing' | 'settings';
}

const ONBOARDING_STEPS: Record<string, OnboardingStep[]> = {
  home: [
    {
      id: 'welcome',
      title: 'Welcome to HushPixel! 🎉',
      description: 'Create stunning AI companions with just a text description. Let\'s get you started!',
      icon: Sparkles,
      position: 'bottom'
    },
    {
      id: 'generate-button',
      title: 'Start Creating',
      description: 'Click here to generate your first AI companion. Your first generation is free!',
      icon: Camera,
      target: '[data-tour="generate-button"]',
      position: 'top',
      action: {
        label: 'Try It Now',
        href: '/generate'
      }
    },
    {
      id: 'upgrade-cta',
      title: 'Unlock Unlimited Power',
      description: 'Upgrade to Premium for unlimited generations, conversations, and premium features.',
      icon: Crown,
      target: '[data-tour="upgrade-cta"]',
      position: 'bottom',
      optional: true
    },
    {
      id: 'navigation',
      title: 'Easy Navigation',
      description: 'Use the sidebar to access your settings, billing, and other features.',
      icon: Target,
      target: '[data-tour="sidebar"]',
      position: 'right'
    }
  ],
  generate: [
    {
      id: 'prompt-input',
      title: 'Describe Your Vision',
      description: 'Be detailed! Mention appearance, pose, setting, and style for best results.',
      icon: Lightbulb,
      target: '[data-tour="prompt-input"]',
      position: 'top'
    },
    {
      id: 'style-presets',
      title: 'Quick Start Presets',
      description: 'Not sure what to write? Try these style presets for instant inspiration.',
      icon: Zap,
      target: '[data-tour="style-presets"]',
      position: 'right',
      optional: true
    },
    {
      id: 'generation-tips',
      title: 'Pro Tips for Better Results',
      description: 'Use specific details like "professional photography" or "cinematic lighting" for higher quality.',
      icon: Target,
      position: 'bottom'
    }
  ],
  billing: [
    {
      id: 'subscription-overview',
      title: 'Manage Your Subscription',
      description: 'View your current plan, usage stats, and billing information all in one place.',
      icon: CreditCard,
      position: 'top'
    },
    {
      id: 'upgrade-benefits',
      title: 'Premium Benefits',
      description: 'See exactly what you get with Premium: unlimited generations, conversations, and more!',
      icon: Crown,
      target: '[data-tour="premium-benefits"]',
      position: 'left'
    }
  ]
};

const FEATURE_HIGHLIGHTS = [
  {
    icon: Camera,
    title: 'HD Quality',
    description: 'Professional-grade image generation'
  },
  {
    icon: MessageSquare,
    title: 'Conversations',
    description: 'Chat with your AI companions'
  },
  {
    icon: Crown,
    title: 'Premium Features',
    description: 'Unlock advanced customization'
  }
];

export function OnboardingTooltips({ userId, userStatus, currentPage = 'home' }: OnboardingTooltipsProps) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [showFloatingHelper, setShowFloatingHelper] = useState(false);

  const steps = ONBOARDING_STEPS[currentPage] || [];

  useEffect(() => {
    // Check if user has completed onboarding for this page
    const completedKey = `onboarding-${currentPage}-${userId}`;
    const completed = localStorage.getItem(completedKey);
    
    if (!completed && userStatus === 'new') {
      // Show onboarding for new users
      const timer = setTimeout(() => {
        setIsActive(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    } else if (userStatus === 'returning') {
      // Show floating helper for returning users
      setShowFloatingHelper(true);
    }
  }, [userId, userStatus, currentPage]);

  useEffect(() => {
    // Load completed steps from localStorage
    const savedSteps = localStorage.getItem(`onboarding-steps-${userId}`);
    if (savedSteps) {
      setCompletedSteps(JSON.parse(savedSteps));
    }
  }, [userId]);

  const markStepCompleted = (stepId: string) => {
    const updated = [...completedSteps, stepId];
    setCompletedSteps(updated);
    localStorage.setItem(`onboarding-steps-${userId}`, JSON.stringify(updated));
  };

  const handleNext = () => {
    const currentStepData = steps[currentStep];
    if (currentStepData) {
      markStepCompleted(currentStepData.id);
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeOnboarding();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    completeOnboarding();
  };

  const completeOnboarding = () => {
    setIsActive(false);
    localStorage.setItem(`onboarding-${currentPage}-${userId}`, 'completed');
  };

  const restartOnboarding = () => {
    setCurrentStep(0);
    setIsActive(true);
    setShowFloatingHelper(false);
  };

  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  if (!isActive && !showFloatingHelper) {
    return null;
  }

  return (
    <>
      {/* Floating Helper Button */}
      {showFloatingHelper && !isActive && (
        <div className="fixed bottom-6 right-6 z-50">
          <Card className="bg-purple-900/90 border-purple-500/50 backdrop-blur-sm shadow-xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                  <HelpCircle className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-white">Need help?</h4>
                  <p className="text-xs text-purple-200">Take a quick tour</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={restartOnboarding}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    Start Tour
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowFloatingHelper(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Onboarding Overlay */}
      {isActive && currentStepData && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm">
          {/* Onboarding Card */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-lg mx-4">
            <Card className="bg-gray-800/95 border-purple-500/50 shadow-2xl">
              <CardContent className="p-6">
                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="border-purple-500/50 text-purple-200">
                      Step {currentStep + 1} of {steps.length}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSkip}
                      className="text-gray-400 hover:text-white"
                    >
                      Skip Tour
                    </Button>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>

                {/* Step Content */}
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                    <currentStepData.icon className="w-8 h-8 text-white" />
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">{currentStepData.title}</h3>
                    <p className="text-gray-300">{currentStepData.description}</p>
                  </div>

                  {/* Action Button */}
                  {currentStepData.action && (
                    <div className="pt-2">
                      <Button
                        onClick={currentStepData.action.onClick}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                      >
                        {currentStepData.action.label}
                      </Button>
                    </div>
                  )}

                  {/* Feature Highlights for first step */}
                  {currentStep === 0 && (
                    <div className="grid grid-cols-3 gap-4 pt-4">
                      {FEATURE_HIGHLIGHTS.map((feature, index) => (
                        <div key={index} className="text-center">
                          <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-gray-700 flex items-center justify-center">
                            <feature.icon className="w-4 h-4 text-purple-400" />
                          </div>
                          <div className="text-xs text-gray-300 font-medium">{feature.title}</div>
                          <div className="text-xs text-gray-500">{feature.description}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Navigation */}
                <div className="flex justify-between mt-6">
                  <Button
                    variant="outline"
                    onClick={handlePrevious}
                    disabled={currentStep === 0}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Previous
                  </Button>

                  <Button
                    onClick={handleNext}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    {currentStep === steps.length - 1 ? (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Finish
                      </>
                    ) : (
                      <>
                        Next
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}

// Utility component for marking tour targets
export function TourTarget({ 
  children, 
  tourId, 
  className = '' 
}: { 
  children: React.ReactNode; 
  tourId: string; 
  className?: string; 
}) {
  return (
    <div data-tour={tourId} className={className}>
      {children}
    </div>
  );
}

// Contextual help tooltip
export function ContextualHelp({ 
  title, 
  description, 
  position = 'top' 
}: { 
  title: string; 
  description: string; 
  position?: 'top' | 'bottom' | 'left' | 'right'; 
}) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-block">
      <Button
        variant="ghost"
        size="sm"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="p-1 h-6 w-6 text-gray-400 hover:text-white"
      >
        <HelpCircle className="w-4 h-4" />
      </Button>
      
      {isVisible && (
        <div className={`absolute z-10 w-64 p-3 bg-gray-800 border border-gray-600 rounded-lg shadow-xl ${
          position === 'top' ? 'bottom-full mb-2' :
          position === 'bottom' ? 'top-full mt-2' :
          position === 'left' ? 'right-full mr-2' :
          'left-full ml-2'
        }`}>
          <h4 className="text-sm font-semibold text-white mb-1">{title}</h4>
          <p className="text-xs text-gray-300">{description}</p>
        </div>
      )}
    </div>
  );
}