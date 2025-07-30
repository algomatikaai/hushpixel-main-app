import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { QuizAutoGenerate } from './quiz-auto-generate';
import { FacebookPixel } from '../quiz/_components/facebook-pixel';

interface GeneratePageProps {
  searchParams: Promise<{ 
    token?: string; 
    source?: string;
    character?: string;
    body?: string;
    email?: string;
    session?: string;
    auth?: string;
    user?: string;
  }>;
}

export default async function GeneratePage({ searchParams }: GeneratePageProps) {
  const params = await searchParams;
  const { email, session, source } = params;
  
  console.log('🔍 Generate page - ZERO FRICTION FLOW:', {
    email: email?.substring(0, 3) + '***' || 'missing',
    session: session || 'missing',
    source: source || 'missing',
    timestamp: new Date().toISOString()
  });

  // ZERO FRICTION FLOW - Anonymous generation with quiz data
  if (email && session) {
    console.log('✅ Zero friction flow - generating without authentication');
    
    // Get quiz data from database using session
    const supabase = getSupabaseServerClient();
    const { data: quizData } = await supabase
      .from('quiz_responses')
      .select('*')
      .eq('session_id', session)
      .eq('email', decodeURIComponent(email))
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (quizData) {
      return (
        <>
          <FacebookPixel />
          <Suspense fallback={<GenerationLoading />}>
            <QuizAutoGenerate 
              character={quizData.character_type}
              body={quizData.body_type}
              email={decodeURIComponent(email)}
              session={session}
              isAuthenticated={false}
              userId={null}
            />
          </Suspense>
        </>
      );
    }
  }

  // Check if user is authenticated (for existing users)
  const supabase = getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // AUTHENTICATED USER FLOW - Use quiz preferences from user metadata
  if (user && user.user_metadata?.character_type && user.user_metadata?.body_type) {
    console.log('✅ Authenticated user with quiz preferences - using metadata');
    return (
      <>
        <FacebookPixel />
        <Suspense fallback={<GenerationLoading />}>
          <QuizAutoGenerate 
            character={user.user_metadata.character_type}
            body={user.user_metadata.body_type}
            email={user.email!}
            session={user.user_metadata.quiz_session_id || 'auth-user'}
            isAuthenticated={true}
            userId={user.id}
          />
        </Suspense>
      </>
    );
  }

  // AUTHENTICATED USER WITHOUT QUIZ DATA - Redirect to workspace 
  if (user) {
    console.log('🔄 Authenticated user without quiz data - redirecting to workspace');
    redirect('/home/generate');
  }

  // NO VALID FLOW - Redirect to quiz
  console.log('❌ No valid flow detected - redirecting to quiz');
  redirect('/quiz');
}

// This function is no longer used but kept for reference
// The bridge flow now happens through quiz-auto-generate component

function GenerationLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-purple-900 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-6">
        <div className="mb-8">
          <div className="w-24 h-24 mx-auto mb-6 relative">
            <div className="absolute inset-0 rounded-full border-4 border-purple-200 opacity-20"></div>
            <div className="absolute inset-0 rounded-full border-4 border-purple-500 border-t-transparent animate-spin"></div>
            <div className="absolute inset-3 rounded-full border-2 border-purple-300 border-b-transparent animate-spin animation-delay-150"></div>
          </div>
          
          <h1 className="text-3xl font-bold text-white mb-4">
            Creating Your Perfect Companion...
          </h1>
          
          <p className="text-purple-200 text-lg mb-6">
            Using your quiz preferences to generate the perfect match
          </p>

          <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between text-sm text-gray-300 mb-2">
              <span>Processing your preferences...</span>
              <span className="text-purple-400">✓</span>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-300 mb-2">
              <span>Generating HD image...</span>
              <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>Preparing your companion...</span>
              <span>⏳</span>
            </div>
          </div>

          <p className="text-sm text-gray-400">
            This usually takes 10-15 seconds
          </p>
        </div>
      </div>
    </div>
  );
}