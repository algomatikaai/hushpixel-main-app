import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateCompanionImage, getGenerationErrorMessage } from '@/lib/modelslab-api';

const QuizGenerateRequestSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
  character: z.string().min(1, 'Character type is required'),
  body: z.string().min(1, 'Body type is required'),
  email: z.string().email('Valid email is required'),
  sessionId: z.string().min(1, 'Session ID is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, character, body: bodyType, email, sessionId } = QuizGenerateRequestSchema.parse(body);

    console.log('🎨 Quiz generation started:', { character, bodyType, email: email.substring(0, 3) + '***', sessionId });

    // Generate character name based on character type
    const characterNames = {
      'asian-beauty': ['Sakura', 'Yuki', 'Mei', 'Luna'],
      'blonde-goddess': ['Aurora', 'Stella', 'Diana', 'Celeste'],
      'brunette-bombshell': ['Sophia', 'Isabella', 'Valentina', 'Aria'],
      'redhead-vixen': ['Scarlett', 'Ruby', 'Phoenix', 'Amber']
    };
    
    const nameList = characterNames[character as keyof typeof characterNames] || ['Beauty'];
    const characterName = nameList[Math.floor(Math.random() * nameList.length)];

    // Generate the image using ModelsLab API
    const generation = await generateCompanionImage({
      prompt,
      quality: 'hd',
      isFirstGeneration: true,
      characterSeed: `quiz_${character}_${bodyType}_${sessionId}`
    });

    if (!generation.success) {
      const errorMessage = getGenerationErrorMessage(generation.error || 'Unknown error');
      console.error('❌ Quiz generation failed:', errorMessage);
      
      return NextResponse.json(
        { 
          success: false,
          error: errorMessage,
          message: 'Generation failed. Please try again.'
        },
        { status: 500 }
      );
    }

    console.log('✅ Quiz generation completed successfully');

    // Return success response with generated image
    return NextResponse.json({
      success: true,
      imageUrl: generation.imageUrl,
      characterName,
      processingTime: generation.processingTime,
      metadata: generation.metadata,
      sessionId,
      message: `Meet ${characterName}! Your perfect companion is ready.`
    });

  } catch (error) {
    console.error('❌ Quiz generation API error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid request data',
          details: error.errors
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Generation failed',
        message: 'Please try again in a moment'
      },
      { status: 500 }
    );
  }
}