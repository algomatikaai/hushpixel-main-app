'use server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function linkQuizResponseToUser(userId: string, email: string) {
  try {
    const client = getSupabaseServerClient();
    
    // Find quiz responses for this email without a user_id
    const { data: quizResponses, error: findError } = await client
      .from('quiz_responses')
      .select('*')
      .eq('email', email)
      .is('user_id', null)
      .order('created_at', { ascending: false }); // Get most recent first
    
    if (findError) {
      console.error('Error finding quiz responses:', findError);
      return { success: false, error: findError.message };
    }
    
    if (quizResponses && quizResponses.length > 0) {
      // Link the most recent quiz response to this user
      const latestQuiz = quizResponses[0];
      
      const { error: updateError } = await client
        .from('quiz_responses')
        .update({ user_id: userId })
        .eq('id', latestQuiz.id);
      
      if (updateError) {
        console.error('Error linking quiz response:', updateError);
        return { success: false, error: updateError.message };
      }
      
      console.log('✅ Quiz response linked to user:', { userId, quizId: latestQuiz.id });
      
      return { 
        success: true, 
        quizData: {
          characterType: latestQuiz.character_type,
          bodyType: latestQuiz.body_type,
          quizId: latestQuiz.id
        }
      };
    }
    
    // No quiz responses found for this email
    return { success: true, quizData: null };
  } catch (error) {
    console.error('Unexpected error linking quiz:', error);
    return { success: false, error: 'Failed to link quiz data' };
  }
}