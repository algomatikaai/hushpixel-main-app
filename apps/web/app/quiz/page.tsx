'use client';

import { Suspense } from 'react';
import { Spinner } from '@kit/ui/spinner';

// Quiz components
import { QuizFlow } from './_components/quiz-flow';
import { FacebookPixel } from './_components/facebook-pixel';

export default function QuizPage() {
  return (
    <>
      <FacebookPixel />
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
        <div className="container mx-auto px-4 py-8">
          <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen">
              <Spinner className="h-12 w-12" />
            </div>
          }>
            <QuizFlow />
          </Suspense>
        </div>
      </div>
    </>
  );
}