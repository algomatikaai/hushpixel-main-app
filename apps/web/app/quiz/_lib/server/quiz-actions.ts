'use server';

import { z } from 'zod';
import { enhanceAction } from '@kit/next/actions';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

const QuizSubmissionSchema = z.object({
  characterType: z.string().min(1, 'Character type is required'),
  bodyType: z.string().min(1, 'Body type is required'),
  email: z.string().email('Valid email is required'),
});

export const submitQuizAction = enhanceAction(
  async function submitQuiz(data, user) {
    const client = getSupabaseServerClient();
    
    try {
      // First, create or update the user with quiz completion status
      const { data: userAccount, error: userError } = await client
        .from('accounts')
        .upsert({
          id: user.id,
          email: data.email,
          name: data.email.split('@')[0], // Use email prefix as name
          is_personal_account: true,
          primary_owner_user_id: user.id,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (userError) {
        console.error('Error creating/updating user account:', userError);
        return { success: false, error: 'Failed to save user data' };
      }

      // Save the quiz response
      const { data: quizResponse, error: quizError } = await client
        .from('quiz_responses')
        .insert({
          user_id: user.id,
          character_type: data.characterType,
          body_type: data.bodyType,
          email: data.email,
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (quizError) {
        console.error('Error saving quiz response:', quizError);
        return { success: false, error: 'Failed to save quiz data' };
      }

      // TODO: Trigger first generation here using ModelsLab API
      // This will be implemented in the generation pipeline task
      
      return { 
        success: true, 
        data: {
          quizId: quizResponse.id,
          userId: user.id,
          characterType: data.characterType,
          bodyType: data.bodyType,
        }
      };
    } catch (error) {
      console.error('Quiz submission error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  },
  {
    auth: true,
    schema: QuizSubmissionSchema,
  },
);