'use server';

import { z } from 'zod';

const QuizSubmissionSchema = z.object({
  characterType: z.string().min(1, 'Character type is required'),
  bodyType: z.string().min(1, 'Body type is required'),
  email: z.string().email('Valid email is required'),
});

export async function submitQuizAction(data: z.infer<typeof QuizSubmissionSchema>) {
  try {
    console.log('🔄 Quiz submission started (new flow):', { email: data.email });
    
    // Validate input data
    const validatedData = QuizSubmissionSchema.parse(data);
    console.log('✅ Data validation passed');
    
    // Generate session ID for tracking
    const sessionId = `quiz_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log('✅ Session ID generated:', sessionId);
    
    // Submit to new quiz API endpoint
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/quiz/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: validatedData.email,
        sessionId: sessionId,
        responses: {
          character_type: validatedData.characterType,
          body_type: validatedData.bodyType,
        },
        source: 'quiz'
      }),
    });

    if (!response.ok) {
      throw new Error(`Quiz submission failed: ${response.status}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Quiz submission failed');
    }

    console.log('✅ Quiz submission completed successfully (new flow)');

    // Return success with generate URL and user info for authentication
    return { 
      success: true, 
      data: {
        sessionId: sessionId,
        email: validatedData.email,
        characterType: validatedData.characterType,
        bodyType: validatedData.bodyType,
        redirectUrl: result.generateUrl,
        userId: result.userId,
        isNewUser: result.isNewUser
      }
    };
  } catch (error) {
    console.error('❌ Quiz submission error:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return { success: false, error: `Submission failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}