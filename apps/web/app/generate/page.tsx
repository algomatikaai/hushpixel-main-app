import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import GenerateClient from './generate-client';
import { QuizAutoGenerate } from './quiz-auto-generate';

interface GeneratePageProps {
  searchParams: Promise<{ 
    token?: string; 
    source?: string;
    character?: string;
    body?: string;
    email?: string;
    session?: string;
  }>;
}

export default async function GeneratePage({ searchParams }: GeneratePageProps) {
  const params = await searchParams;
  const { character, body, email, session } = params;
  
  // Handle quiz flow - auto-generate based on quiz selections
  if (character && body && email && session) {
    console.log('Quiz flow detected:', { character, body, email: email.substring(0, 3) + '***', session });
    return <Suspense fallback={<GenerationLoading />}>
      <QuizAutoGenerate 
        character={character}
        body={body}
        email={decodeURIComponent(email)}
        session={session}
      />
    </Suspense>;
  }

  // Regular generation page for existing users  
  return <GenerateClient />;
}

async function BridgeHandler({ token }: { token: string }) {
  // Verify the bridge token
  const tokenPayload = await verifyBridgeToken(token);
  
  if (!tokenPayload) {
    console.error('Invalid bridge token received');
    redirect('/auth/sign-in?error=invalid_token');
  }

  const supabase = getSupabaseServerClient();

  try {
    // Find or create user in Supabase
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', tokenPayload.email)
      .single();

    if (userError && userError.code !== 'PGRST116') {
      console.error('Error fetching user:', userError);
      redirect('/auth/sign-in?error=user_fetch_failed');
    }

    let userId = user?.id;

    // If user doesn't exist, create them
    if (!user) {
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: tokenPayload.email,
        email_confirm: true,
        user_metadata: {
          quiz_completed: true,
          character_data: tokenPayload.characterData
        }
      });

      if (createError) {
        console.error('Error creating user:', createError);
        redirect('/auth/sign-in?error=user_creation_failed');
      }

      userId = newUser.user.id;
    }

    // Generate the character name and prompt
    const characterName = generateCharacterName(tokenPayload.characterData);
    const prompt = buildPromptFromQuizData(tokenPayload.characterData);

    // Generate the first image
    const generation = await generateCompanionImage({
      prompt,
      characterSeed: `${tokenPayload.characterData.type}_${tokenPayload.characterData.body}`,
      isFirstGeneration: true,
      quality: 'hd'
    });

    if (!generation.success) {
      console.error('Generation failed:', generation.error);
      // Still redirect to app, but show error there
      redirect(`/home?error=generation_failed&message=${encodeURIComponent(generation.error || 'Unknown error')}`);
    }

    // Save generation to database
    const { error: saveError } = await supabase
      .from('generations')
      .insert({
        user_id: userId,
        prompt,
        image_url: generation.imageUrl,
        character_name: characterName,
        is_first_generation: true,
        metadata: generation.metadata,
        created_at: new Date().toISOString()
      });

    if (saveError) {
      console.error('Error saving generation:', saveError);
    }

    // Redirect to main app with success
    redirect(`/home?welcome=true&character=${encodeURIComponent(characterName)}&image=${encodeURIComponent(generation.imageUrl || '')}`);

  } catch (error) {
    console.error('Bridge handler error:', error);
    redirect('/auth/sign-in?error=bridge_processing_failed');
  }
}

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