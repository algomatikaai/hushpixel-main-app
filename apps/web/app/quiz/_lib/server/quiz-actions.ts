'use server';

import { z } from 'zod';

const QuizSubmissionSchema = z.object({
  characterType: z.string().min(1, 'Character type is required'),
  bodyType: z.string().min(1, 'Body type is required'),
  email: z.string().email('Valid email is required'),
});

export async function submitQuizAction(data: z.infer<typeof QuizSubmissionSchema>) {
  try {
    console.log('🔄 Quiz submission started (session-based):', { email: data.email });
    
    // Validate input data
    const validatedData = QuizSubmissionSchema.parse(data);
    console.log('✅ Data validation passed');
    
    // Generate session ID for tracking
    const sessionId = `quiz_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log('✅ Session ID generated:', sessionId);
    
    // No database needed - just return success with session data
    // Email will be captured via Facebook Pixel and URL params
    console.log('✅ Quiz submission completed successfully (session-based)');

    // Return success with generation redirect - pass all data via URL
    return { 
      success: true, 
      data: {
        sessionId: sessionId,
        email: validatedData.email,
        characterType: validatedData.characterType,
        bodyType: validatedData.bodyType,
        redirectUrl: `/generate?character=${validatedData.characterType}&body=${validatedData.bodyType}&email=${encodeURIComponent(validatedData.email)}&session=${sessionId}`
      }
    };
  } catch (error) {
    console.error('❌ Quiz submission unexpected error:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return { success: false, error: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}