'use server';

import { z } from 'zod';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

const QuizSubmissionSchema = z.object({
  characterType: z.string().min(1, 'Character type is required'),
  bodyType: z.string().min(1, 'Body type is required'),
  email: z.string().email('Valid email is required'),
});

export async function submitQuizAction(data: z.infer<typeof QuizSubmissionSchema>) {
  try {
    console.log('🔄 Quiz submission started:', { email: data.email });
    
    // Validate input data
    const validatedData = QuizSubmissionSchema.parse(data);
    console.log('✅ Data validation passed');
    
    // Use regular Supabase client (no admin needed)
    const client = getSupabaseServerClient();
    console.log('✅ Regular client created');
    
    // Save quiz response without user creation
    const { data: quizResponse, error: quizError } = await client
      .from('quiz_responses')
      .insert({
        email: validatedData.email,
        character_type: validatedData.characterType,
        body_type: validatedData.bodyType,
        completed_at: new Date().toISOString(),
        source: 'main_app_quiz'
        // user_id: null - will be linked during actual authentication
      })
      .select()
      .single();

    if (quizError) {
      console.error('❌ Error saving quiz response:', quizError);
      console.error('❌ Quiz error details:', {
        message: quizError.message,
        details: quizError.details,
        hint: quizError.hint,
        code: quizError.code
      });
      return { success: false, error: `Database error: ${quizError.message}` };
    }
    
    console.log('✅ Quiz response saved successfully:', quizResponse.id);

    // Return success with redirect information
    return { 
      success: true, 
      data: {
        quizId: quizResponse.id,
        characterType: validatedData.characterType,
        bodyType: validatedData.bodyType,
        redirectUrl: `/auth/sign-up?email=${encodeURIComponent(validatedData.email)}&quiz=${quizResponse.id}&character=${validatedData.characterType}&body=${validatedData.bodyType}`
      }
    };
  } catch (error) {
    console.error('❌ Quiz submission unexpected error:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return { success: false, error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}