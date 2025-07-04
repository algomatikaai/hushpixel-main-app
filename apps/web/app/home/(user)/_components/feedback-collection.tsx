'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Button } from '@kit/ui/button';
import { Textarea } from '@kit/ui/textarea';
import { Badge } from '@kit/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@kit/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@kit/ui/radio-group';
import { Label } from '@kit/ui/label';
import { 
  MessageSquare, 
  Star, 
  ThumbsUp, 
  ThumbsDown, 
  Send, 
  X,
  Heart,
  Zap,
  AlertCircle,
  CheckCircle,
  Gift
} from 'lucide-react';
import { toast } from 'sonner';

interface FeedbackCollectionProps {
  userId: string;
  context: 'generation' | 'onboarding' | 'general' | 'subscription';
  trigger?: React.ReactNode;
  autoShow?: boolean;
  delay?: number;
}

interface FeedbackData {
  rating: number;
  feedback: string;
  category: string;
  context: string;
  timestamp: Date;
}

const FEEDBACK_CATEGORIES = {
  generation: [
    { id: 'quality', label: 'Image Quality' },
    { id: 'speed', label: 'Generation Speed' },
    { id: 'accuracy', label: 'Prompt Accuracy' },
    { id: 'variety', label: 'Result Variety' }
  ],
  onboarding: [
    { id: 'ease', label: 'Ease of Use' },
    { id: 'clarity', label: 'Instructions Clarity' },
    { id: 'help', label: 'Help & Support' },
    { id: 'flow', label: 'User Flow' }
  ],
  general: [
    { id: 'ui', label: 'User Interface' },
    { id: 'features', label: 'Features' },
    { id: 'performance', label: 'Performance' },
    { id: 'support', label: 'Customer Support' }
  ],
  subscription: [
    { id: 'value', label: 'Value for Money' },
    { id: 'billing', label: 'Billing Process' },
    { id: 'features', label: 'Premium Features' },
    { id: 'support', label: 'Premium Support' }
  ]
};

const QUICK_FEEDBACK_OPTIONS = [
  { id: 'love', icon: Heart, label: 'Love it!', color: 'text-red-400' },
  { id: 'good', icon: ThumbsUp, label: 'Good', color: 'text-green-400' },
  { id: 'okay', icon: Star, label: 'Okay', color: 'text-yellow-400' },
  { id: 'poor', icon: ThumbsDown, label: 'Poor', color: 'text-gray-400' }
];

export function FeedbackCollection({ 
  userId, 
  context, 
  trigger, 
  autoShow = false, 
  delay = 0 
}: FeedbackCollectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<'quick' | 'detailed' | 'thanks'>('quick');
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [category, setCategory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  useEffect(() => {
    if (autoShow && delay > 0) {
      const timer = setTimeout(() => {
        // Check if user hasn't provided feedback for this context recently
        const lastFeedback = localStorage.getItem(`feedback-${context}-${userId}`);
        const daysSinceLastFeedback = lastFeedback ? 
          (Date.now() - parseInt(lastFeedback)) / (1000 * 60 * 60 * 24) : 999;
        
        if (daysSinceLastFeedback > 3) { // Show feedback request every 3 days
          setIsOpen(true);
        }
      }, delay);
      
      return () => clearTimeout(timer);
    }
  }, [autoShow, delay, context, userId]);

  const handleQuickFeedback = (option: string) => {
    const ratingMap = { love: 5, good: 4, okay: 3, poor: 2 };
    const selectedRating = ratingMap[option as keyof typeof ratingMap] || 3;
    setRating(selectedRating);
    
    if (selectedRating >= 4) {
      // For positive feedback, just thank them
      handleSubmit(selectedRating, '', '');
    } else {
      // For negative feedback, ask for details
      setStep('detailed');
    }
  };

  const handleDetailedSubmit = () => {
    handleSubmit(rating, feedback, category);
  };

  const handleSubmit = async (ratingValue: number, feedbackText: string, categoryValue: string) => {
    setIsSubmitting(true);
    
    try {
      // In production, this would call your API
      const feedbackData: FeedbackData = {
        rating: ratingValue,
        feedback: feedbackText,
        category: categoryValue,
        context,
        timestamp: new Date()
      };
      
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Store feedback timestamp to avoid spamming user
      localStorage.setItem(`feedback-${context}-${userId}`, Date.now().toString());
      
      setStep('thanks');
      setHasSubmitted(true);
      
      toast.success('Thank you for your feedback!');
      
      // Auto close after showing thanks
      setTimeout(() => {
        setIsOpen(false);
      }, 2000);
      
    } catch (error) {
      toast.error('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep('quick');
    setRating(0);
    setFeedback('');
    setCategory('');
    setIsSubmitting(false);
    setHasSubmitted(false);
  };

  const handleClose = () => {
    setIsOpen(false);
    resetForm();
  };

  const categories = FEEDBACK_CATEGORIES[context] || FEEDBACK_CATEGORIES.general;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="border-purple-500/30 text-purple-200 hover:bg-purple-600/20">
            <MessageSquare className="w-4 h-4 mr-2" />
            Feedback
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md bg-gray-800 border-gray-700">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-purple-400" />
              Share Your Feedback
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {step === 'quick' && (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-gray-300 mb-4">
                  How was your experience with {context === 'generation' ? 'image generation' : context}?
                </p>
                
                <div className="grid grid-cols-2 gap-3">
                  {QUICK_FEEDBACK_OPTIONS.map((option) => (
                    <Button
                      key={option.id}
                      variant="outline"
                      onClick={() => handleQuickFeedback(option.id)}
                      className="h-16 border-gray-600 hover:bg-gray-700 flex flex-col gap-2"
                    >
                      <option.icon className={`w-6 h-6 ${option.color}`} />
                      <span className="text-sm text-gray-300">{option.label}</span>
                    </Button>
                  ))}
                </div>
              </div>
              
              <div className="text-center">
                <Button
                  variant="link"
                  onClick={() => setStep('detailed')}
                  className="text-purple-400 hover:text-purple-300 text-sm"
                >
                  Provide detailed feedback instead
                </Button>
              </div>
            </div>
          )}

          {step === 'detailed' && (
            <div className="space-y-4">
              <div>
                <Label className="text-gray-300 mb-2 block">Rate your experience</Label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Button
                      key={star}
                      variant="ghost"
                      size="sm"
                      onClick={() => setRating(star)}
                      className="p-1"
                    >
                      <Star 
                        className={`w-6 h-6 ${
                          star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-600'
                        }`} 
                      />
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-gray-300 mb-2 block">Category (optional)</Label>
                <RadioGroup value={category} onValueChange={setCategory}>
                  <div className="grid grid-cols-2 gap-2">
                    {categories.map((cat) => (
                      <div key={cat.id} className="flex items-center space-x-2">
                        <RadioGroupItem value={cat.id} id={cat.id} />
                        <Label htmlFor={cat.id} className="text-sm text-gray-300">{cat.label}</Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label className="text-gray-300 mb-2 block">Your feedback</Label>
                <Textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Tell us what you think..."
                  className="bg-gray-900/50 border-gray-600 text-white"
                  rows={4}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => setStep('quick')}
                  variant="outline"
                  className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  Back
                </Button>
                <Button
                  onClick={handleDetailedSubmit}
                  disabled={isSubmitting || rating === 0}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  {isSubmitting ? (
                    <>
                      <Zap className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Submit
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {step === 'thanks' && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Thank You!</h3>
                <p className="text-gray-300">
                  Your feedback helps us improve HushPixel for everyone.
                </p>
              </div>

              {rating >= 4 && (
                <div className="bg-purple-900/30 border border-purple-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-purple-200 mb-2">
                    <Gift className="w-4 h-4" />
                    <span className="font-medium">Enjoying HushPixel?</span>
                  </div>
                  <p className="text-sm text-purple-300 mb-3">
                    Consider upgrading to Premium for unlimited generations!
                  </p>
                  <Button 
                    size="sm" 
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    onClick={() => {
                      handleClose();
                      // Navigate to billing
                      window.location.href = '/home/billing';
                    }}
                  >
                    Upgrade to Premium
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Utility component for embedded feedback prompts
export function QuickFeedbackPrompt({ 
  userId, 
  context, 
  className = '' 
}: { 
  userId: string; 
  context: string; 
  className?: string; 
}) {
  const [rating, setRating] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleQuickRating = async (selectedRating: number) => {
    setRating(selectedRating);
    
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 500));
      setIsSubmitted(true);
      toast.success('Thanks for your feedback!');
      
      // Store feedback to avoid asking again soon
      localStorage.setItem(`quick-feedback-${context}-${userId}`, Date.now().toString());
    } catch (error) {
      toast.error('Failed to submit feedback');
      setRating(null);
    }
  };

  if (isSubmitted) {
    return (
      <div className={`bg-green-900/20 border border-green-500/30 rounded-lg p-3 ${className}`}>
        <div className="flex items-center gap-2 text-green-200">
          <CheckCircle className="w-4 h-4" />
          <span className="text-sm">Thank you for your feedback!</span>
        </div>
      </div>
    );
  }

  return (
    <Card className={`bg-gray-800/50 border-gray-700 ${className}`}>
      <CardContent className="p-4">
        <div className="text-center space-y-3">
          <p className="text-sm text-gray-300">How was this experience?</p>
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <Button
                key={star}
                variant="ghost"
                size="sm"
                onClick={() => handleQuickRating(star)}
                className="p-1 hover:bg-gray-700"
                disabled={rating !== null}
              >
                <Star 
                  className={`w-5 h-5 ${
                    rating === star 
                      ? 'text-yellow-400 fill-current' 
                      : star <= (rating || 0) 
                        ? 'text-yellow-400 fill-current'
                        : 'text-gray-600 hover:text-yellow-400'
                  }`} 
                />
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}