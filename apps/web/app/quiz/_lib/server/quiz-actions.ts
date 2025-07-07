'use server';

import { z } from 'zod';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

const QuizSubmissionSchema = z.object({
  characterType: z.string().min(1, 'Character type is required'),
  bodyType: z.string().min(1, 'Body type is required'),
  email: z.string().email('Valid email is required'),
});

// Generate a random password for auto-created accounts
function generateRandomPassword(): string {
  return Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);
}

export async function submitQuizAction(data: z.infer<typeof QuizSubmissionSchema>) {
  try {
    console.log('🔄 Quiz submission started:', { email: data.email });
    
    // Validate input data
    const validatedData = QuizSubmissionSchema.parse(data);
    console.log('✅ Data validation passed');
    
    // Use Supabase client for direct auth signup
    const client = getSupabaseServerClient();
    console.log('✅ Client created for auth signup');
    
    // Create user account directly via Supabase auth with quiz data in metadata
    const { data: authData, error: authError } = await client.auth.signUp({
      email: validatedData.email,
      password: generateRandomPassword(), // Auto-generate password
      options: {
        data: {
          character_type: validatedData.characterType,
          body_type: validatedData.bodyType,
          quiz_completed: true,
          quiz_completed_at: new Date().toISOString(),
          source: 'meta_ads_quiz'
        }
      }
    });

    if (authError) {
      console.error('❌ Error creating user account:', authError);
      console.error('❌ Auth error details:', {
        message: authError.message,
        code: authError.__isAuthError ? 'AUTH_ERROR' : 'UNKNOWN'
      });
      return { success: false, error: `Account creation failed: ${authError.message}` };
    }
    
    if (!authData.user) {
      console.error('❌ No user created despite no error');
      return { success: false, error: 'Account creation failed: No user returned' };
    }
    
    console.log('✅ User account created successfully:', authData.user.id);

    // Return success with generation redirect (user is now logged in)
    return { 
      success: true, 
      data: {
        userId: authData.user.id,
        characterType: validatedData.characterType,
        bodyType: validatedData.bodyType,
        redirectUrl: `/generate?character=${validatedData.characterType}&body=${validatedData.bodyType}&welcome=true`
      }
    };
  } catch (error) {
    console.error('❌ Quiz submission unexpected error:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return { success: false, error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}