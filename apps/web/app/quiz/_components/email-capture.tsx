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
      <div className="text-center mb-8">
        <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
          Your Dream Companion Awaits!
        </h3>
        <p className="text-muted-foreground text-base">
          Get instant access to your personalized AI companion
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
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
                        className="h-12"
                        disabled={isLoading || isSubmitted}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button
                type="submit"
                className="w-full h-12 font-semibold text-lg"
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
            <p className="text-xs text-muted-foreground">
              We respect your privacy. Your email is only used to deliver your personalized companion.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Benefits section */}
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex items-center space-x-3 text-sm">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <span>Personalized AI companion based on your preferences</span>
            </div>
            <div className="flex items-center space-x-3 text-sm">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <span>High-quality, realistic generation</span>
            </div>
            <div className="flex items-center space-x-3 text-sm">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <span>Instant results with premium quality</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}