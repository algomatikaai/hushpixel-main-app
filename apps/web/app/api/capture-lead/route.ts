import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const LeadCaptureSchema = z.object({
  email: z.string().email('Valid email is required'),
  character: z.string().min(1, 'Character type is required'),
  body: z.string().min(1, 'Body type is required'), 
  session: z.string().min(1, 'Session ID is required'),
  source: z.string().default('unknown'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, character, body: bodyType, session, source } = LeadCaptureSchema.parse(body);

    // Log the lead capture (can be enhanced to save to database later)
    console.log('📧 Lead captured:', {
      email: email.substring(0, 3) + '***',
      character,
      bodyType,
      session,
      source,
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
    });

    // Simple success response - can be enhanced later with actual email service integration
    return NextResponse.json({
      success: true,
      message: 'Lead captured successfully',
      sessionId: session,
    });

  } catch (error) {
    console.error('❌ Lead capture API error:', error);
    
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
        error: error instanceof Error ? error.message : 'Lead capture failed'
      },
      { status: 500 }
    );
  }
}