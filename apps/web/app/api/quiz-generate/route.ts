import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateCompanionImage, getGenerationErrorMessage } from '~/lib/modelslab-api';

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
    console.log('📥 Raw request body:', JSON.stringify(body, null, 2));
    
    const { prompt, character, body: bodyType, email, sessionId } = QuizGenerateRequestSchema.parse(body);

    console.log('🎨 Quiz generation started:', { character, bodyType, email: email.substring(0, 3) + '***', sessionId });
    console.log('📝 Full prompt:', prompt);

    // Generate character name based on character type
    const characterNames = {
      'asian-beauty': ['Sakura', 'Yuki', 'Mei', 'Luna'],
      'blonde-companion': ['Aurora', 'Stella', 'Diana', 'Celeste'],
      'brunette-beauty': ['Sophia', 'Isabella', 'Valentina', 'Aria'],
      'redhead-model': ['Scarlett', 'Ruby', 'Phoenix', 'Amber']
    };
    
    const nameList = characterNames[character as keyof typeof characterNames] || ['Beauty'];
    const characterName = nameList[Math.floor(Math.random() * nameList.length)];

    // Generate the image using ModelsLab API
    console.log('🚀 Calling ModelsLab API with params:', {
      prompt: prompt.substring(0, 100) + '...',
      quality: 'hd',
      isFirstGeneration: true,
      characterSeed: `quiz_${character}_${bodyType}_${sessionId}`
    });
    
    const generation = await generateCompanionImage({
      prompt,
      quality: 'hd',
      isFirstGeneration: true,
      characterSeed: `quiz_${character}_${bodyType}_${sessionId}`
    });
    
    console.log('📊 ModelsLab API response:', {
      success: generation.success,
      error: generation.error,
      processingTime: generation.processingTime,
      imageUrl: generation.imageUrl ? generation.imageUrl.substring(0, 50) + '...' : 'none'
    });

    if (!generation.success) {
      const errorMessage = getGenerationErrorMessage(generation.error || 'Unknown error');
      console.error('❌ Quiz generation failed:', {
        originalError: generation.error,
        processedError: errorMessage,
        processingTime: generation.processingTime
      });
      
      return NextResponse.json(
        { 
          success: false,
          error: errorMessage,
          message: 'Generation failed. Please try again.',
          debug: {
            originalError: generation.error,
            processingTime: generation.processingTime
          }
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
    console.error('❌ Quiz generation API error:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      type: error instanceof Error ? error.constructor.name : typeof error
    });
    
    if (error instanceof z.ZodError) {
      console.error('📋 Validation error details:', error.errors);
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
        message: 'Please try again in a moment',
        debug: {
          errorType: error instanceof Error ? error.constructor.name : typeof error,
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    );
  }
}