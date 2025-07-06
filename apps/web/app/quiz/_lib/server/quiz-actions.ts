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
    console.log('🔄 Quiz submission started:', { email: data.email });
    
    // Validate input data
    const validatedData = QuizSubmissionSchema.parse(data);
    console.log('✅ Data validation passed');
    
    // Use admin client to create user account without authentication
    let adminClient;
    try {
      adminClient = getSupabaseServerAdminClient();
      console.log('✅ Admin client created');
    } catch (error) {
      console.error('❌ Failed to create admin client:', error);
      return { success: false, error: 'Missing SUPABASE_SERVICE_ROLE_KEY environment variable' };
    }
    
    // Test admin client connection
    const { data: testResult, error: testError } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1 });
    if (testError) {
      console.error('❌ Admin client connection failed:', testError);
      console.error('❌ This usually means SUPABASE_SERVICE_ROLE_KEY is wrong or missing');
      return { success: false, error: 'Invalid service role key - check environment variables' };
    }
    console.log('✅ Admin client connection verified');
    
    // First, check if user already exists
    const { data: existingUser, error: getUserError } = await adminClient.auth.admin.getUserByEmail(validatedData.email);
    if (getUserError) {
      console.error('❌ Failed to check existing user:', getUserError);
      return { success: false, error: 'Failed to verify user account' };
    }
    
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
      
      // Wait a moment for the account trigger to create the accounts record
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Verify the account was created, if not create it manually
      const { data: accountExists } = await adminClient
        .from('accounts')
        .select('id')
        .eq('id', userId)
        .single();
        
      if (!accountExists) {
        console.log('Account not created by trigger, creating manually...');
        const { error: accountError } = await adminClient
          .from('accounts')
          .insert({
            id: userId,
            primary_owner_user_id: userId,
            name: validatedData.email.split('@')[0],
            email: validatedData.email,
            is_personal_account: true,
          });
          
        if (accountError) {
          console.error('Error creating account:', accountError);
          // Continue anyway - we can still save the quiz response
        }
      }
    }

    // Save the quiz response
    console.log('🔄 Saving quiz response for user:', userId);
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
    console.error('❌ Quiz submission unexpected error:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return { success: false, error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}