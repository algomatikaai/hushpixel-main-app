'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@kit/ui/button';
import { Card, CardContent } from '@kit/ui/card';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@kit/ui/form';
import { Input } from '@kit/ui/input';
import { Spinner } from '@kit/ui/spinner';

const EmailSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type EmailFormData = z.infer<typeof EmailSchema>;

interface EmailCaptureProps {
  onSubmit: (email: string) => void;
  isLoading?: boolean;
}

export function EmailCapture({ onSubmit, isLoading }: EmailCaptureProps) {
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  const form = useForm<EmailFormData>({
    resolver: zodResolver(EmailSchema),
    defaultValues: {
      email: '',
    },
  });

  const handleSubmit = (data: EmailFormData) => {
    setIsSubmitted(true);
    onSubmit(data.email);
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      <Card className="border-purple-500/20 bg-purple-900/10">
        <CardContent className="p-6">
          <div className="text-center mb-6">
            <h3 className="text-white text-xl font-semibold mb-2">
              Get Your Perfect Companion
            </h3>
            <p className="text-gray-300 text-sm">
              Enter your email to see your personalized AI companion generated just for you
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="Enter your email address"
                        className="bg-black/40 border-gray-600 text-white placeholder:text-gray-400 focus:border-purple-500"
                        disabled={isLoading || isSubmitted}
                      />
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />
              
              <Button
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3"
                disabled={isLoading || isSubmitted}
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Creating Your Companion...
                  </>
                ) : isSubmitted ? (
                  'Generating...'
                ) : (
                  'Generate My Perfect Companion'
                )}
              </Button>
            </form>
          </Form>

          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              We respect your privacy. Your email is only used to deliver your personalized companion.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Benefits section */}
      <div className="space-y-3 text-center">
        <div className="flex items-center justify-center space-x-2 text-sm text-gray-300">
          <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
          <span>Personalized AI companion based on your preferences</span>
        </div>
        <div className="flex items-center justify-center space-x-2 text-sm text-gray-300">
          <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
          <span>High-quality, realistic generation</span>
        </div>
        <div className="flex items-center justify-center space-x-2 text-sm text-gray-300">
          <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
          <span>Interactive chat capabilities</span>
        </div>
      </div>
    </div>
  );
}