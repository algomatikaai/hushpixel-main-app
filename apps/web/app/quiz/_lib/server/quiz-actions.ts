'use server';

import { z } from 'zod';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

const QuizSubmissionSchema = z.object({
  characterType: z.string().min(1, 'Character type is required'),
  bodyType: z.string().min(1, 'Body type is required'),
  email: z.string().email('Valid email is required'),
});

export async function submitQuizAction(data: z.infer<typeof QuizSubmissionSchema>) {
  try {
    // Validate input data
    const validatedData = QuizSubmissionSchema.parse(data);
    
    // Use admin client to create user account without authentication
    const adminClient = getSupabaseServerAdminClient();
    
    // First, check if user already exists
    const { data: existingUser } = await adminClient.auth.admin.getUserByEmail(validatedData.email);
    
    let userId: string;
    
    if (existingUser.user) {
      // User exists, use their ID
      userId = existingUser.user.id;
    } else {
      // Create new user account
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email: validatedData.email,
        email_confirm: true, // Auto-confirm email for quiz users
        user_metadata: {
          name: validatedData.email.split('@')[0],
          quiz_completed: true,
          character_type: validatedData.characterType,
          body_type: validatedData.bodyType,
        }
      });

      if (createError || !newUser.user) {
        console.error('Error creating user:', createError);
        return { success: false, error: 'Failed to create user account' };
      }
      
      userId = newUser.user.id;
    }

    // Save the quiz response
    const { data: quizResponse, error: quizError } = await adminClient
      .from('quiz_responses')
      .insert({
        user_id: userId,
        character_type: validatedData.characterType,
        body_type: validatedData.bodyType,
        email: validatedData.email,
        completed_at: new Date().toISOString(),
        source: 'main_app_quiz'
      })
      .select()
      .single();

    if (quizError) {
      console.error('Error saving quiz response:', quizError);
      return { success: false, error: 'Failed to save quiz data' };
    }

    // Generate a session for the user so they're automatically logged in
    const { data: sessionData, error: sessionError } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email: validatedData.email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/generate?quiz_completed=true&character=${validatedData.characterType}&body=${validatedData.bodyType}`
      }
    });

    if (sessionError) {
      console.error('Error generating session:', sessionError);
      // Continue without session - user can log in manually
    }

    return { 
      success: true, 
      data: {
        quizId: quizResponse.id,
        userId: userId,
        characterType: validatedData.characterType,
        bodyType: validatedData.bodyType,
        magicLink: sessionData?.properties?.action_link || null,
      }
    };
  } catch (error) {
    console.error('Quiz submission error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}