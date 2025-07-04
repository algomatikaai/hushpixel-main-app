import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { enhanceRouteHandler } from '@kit/next/routes';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { generateCompanionImage, getGenerationErrorMessage } from '@/lib/modelslab-api';
import { generateCharacterName } from '@/lib/bridge-auth';

const GenerateRequestSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
  quality: z.enum(['standard', 'hd']).default('standard'),
  isFirstGeneration: z.boolean().default(false)
});

export const POST = enhanceRouteHandler(
  async function ({ body, user }) {
    const { prompt, quality, isFirstGeneration } = body;
    const supabase = getSupabaseServerClient();

    try {
      // Get user's personal account ID (user.id should be the account ID for personal accounts)
      const { data: account } = await supabase
        .from('accounts')
        .select('id')
        .eq('primary_owner_user_id', user.id)
        .eq('is_personal_account', true)
        .single();

      if (!account) {
        return NextResponse.json(
          { error: 'User account not found' },
          { status: 404 }
        );
      }

      const accountId = account.id;

      // Check user's generation limit (free users get 1 generation)
      const { count: generationCount } = await supabase
        .from('generations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', accountId);

      // Check if user has active subscription
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('status')
        .eq('account_id', accountId)
        .eq('status', 'active')
        .maybeSingle();

      const hasActiveSubscription = Boolean(subscription);
      const freeLimit = 1;

      // Check generation limits for free users
      if (!hasActiveSubscription && (generationCount || 0) >= freeLimit) {
        return NextResponse.json(
          { 
            error: 'Generation limit reached',
            requiresUpgrade: true,
            message: 'Upgrade to premium for unlimited generations'
          },
          { status: 402 }
        );
      }

      // Generate character name for consistency
      const characterName = generateCharacterName({
        type: 'blonde', // Default for now, can be customized later
        body: 'curvy',
        personality: 'confident',
        scene: 'bedroom'
      });

      // Generate the image using ModelsLab API
      const generation = await generateCompanionImage({
        prompt,
        quality,
        isFirstGeneration,
        characterSeed: `${user.id}_${Date.now()}`
      });

      if (!generation.success) {
        const errorMessage = getGenerationErrorMessage(generation.error || 'Unknown error');
        return NextResponse.json(
          { error: errorMessage },
          { status: 500 }
        );
      }

      // Save generation to database
      const { data: savedGeneration, error: saveError } = await supabase
        .from('generations')
        .insert({
          user_id: accountId,
          prompt,
          image_url: generation.imageUrl,
          character_name: characterName,
          is_first_generation: isFirstGeneration,
          quality,
          metadata: generation.metadata,
          processing_time: generation.processingTime,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (saveError) {
        console.error('Error saving generation:', saveError);
        // Still return success since image was generated successfully
      }

      return NextResponse.json({
        success: true,
        imageUrl: generation.imageUrl,
        characterName,
        processingTime: generation.processingTime,
        generationId: savedGeneration?.id,
        metadata: generation.metadata
      });

    } catch (error) {
      console.error('Generation API error:', error);
      
      return NextResponse.json(
        { 
          error: error instanceof Error ? error.message : 'Generation failed',
          message: 'Please try again in a moment'
        },
        { status: 500 }
      );
    }
  },
  {
    auth: true,
    schema: GenerateRequestSchema,
  },
);