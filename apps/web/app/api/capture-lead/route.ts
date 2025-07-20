import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getLogger } from '@kit/shared/logger';

const LeadCaptureSchema = z.object({
  email: z.string().email('Valid email is required'),
  character: z.string().min(1, 'Character type is required'),
  body: z.string().min(1, 'Body type is required'), 
  session: z.string().min(1, 'Session ID is required'),
  source: z.string().default('unknown'),
});

export async function POST(request: NextRequest) {
  try {
    const logger = await getLogger();
    const body = await request.json();
    const ctx = { name: 'capture-lead' };
    
    logger.info(ctx, 'Lead capture request received');
    
    const { email, character, body: bodyType, session, source } = LeadCaptureSchema.parse(body);
    
    // Use admin client to bypass RLS for anonymous lead capture
    const supabase = getSupabaseServerAdminClient();
    
    // Check if lead already exists for this session
    const { data: existingLead } = await supabase
      .from('quiz_responses')
      .select('id')
      .eq('session_id', session)
      .maybeSingle();
    
    let leadId = existingLead?.id;
    
    if (!existingLead) {
      // Store lead in quiz_responses table
      const { data: lead, error } = await supabase
        .from('quiz_responses')
        .insert({
          session_id: session,
          email,
          character_type: character,
          body_type: bodyType,
          source: source || 'quiz',
          created_at: new Date().toISOString(),
          ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
          user_agent: request.headers.get('user-agent')
        })
        .select()
        .single();
      
      if (error) {
        logger.error({ ...ctx, error }, 'Failed to store lead');
        return NextResponse.json(
          { success: false, error: 'Failed to store lead' },
          { status: 500 }
        );
      }
      
      leadId = lead.id;
    }
    
    logger.info({ 
      ...ctx, 
      leadId, 
      email: email.substring(0, 3) + '***',
      character,
      bodyType,
      isExisting: !!existingLead
    }, 'Lead captured successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Lead captured successfully',
      leadId,
      sessionId: session
    });

  } catch (error) {
    const logger = await getLogger();
    
    logger.error({ 
      name: 'capture-lead',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, 'Lead capture API error');
    
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