import { NextResponse } from 'next/server';
import { getLogger } from '@kit/shared/logger';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * @description Automatically log in users after Stripe payment using their magic link
 * This allows users to go directly to dashboard without auth pages
 */
export async function POST(request: Request) {
  const logger = await getLogger();
  const adminClient = getSupabaseServerAdminClient();
  
  try {
    const { sessionId } = await request.json();
    
    const ctx = {
      name: 'auth.auto-login',
      sessionId
    };
    
    logger.info(ctx, 'Attempting automatic login for user');
    
    // Find user by Stripe session ID
    const { data: users, error: searchError } = await adminClient.auth.admin.listUsers();
    
    if (searchError) {
      logger.error({ ...ctx, error: searchError }, 'Failed to search for users');
      return NextResponse.json({ error: 'Failed to find user' }, { status: 500 });
    }
    
    // Find user with matching Stripe session ID in metadata
    const user = users.users.find(u => 
      u.user_metadata?.stripe_session_id === sessionId ||
      u.user_metadata?.stripe_session_id === `${sessionId}?session_id=${sessionId}` // Handle corrupted IDs
    );
    
    if (!user) {
      logger.warn(ctx, 'No user found with this session ID');
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const magicLinkToken = user.user_metadata?.magic_link_token;
    
    if (!magicLinkToken) {
      logger.warn({ ...ctx, userId: user.id }, 'User found but no magic link token');
      return NextResponse.json({ error: 'No magic link available' }, { status: 404 });
    }
    
    // Extract the token from the magic link URL
    const tokenMatch = magicLinkToken.match(/token=([^&]+)/);
    const token = tokenMatch ? tokenMatch[1] : null;
    
    if (!token) {
      logger.error({ ...ctx, userId: user.id }, 'Could not extract token from magic link');
      return NextResponse.json({ error: 'Invalid magic link format' }, { status: 400 });
    }
    
    // Create a response that will set the auth cookies
    const response = NextResponse.json({ 
      success: true, 
      email: user.email,
      redirectUrl: '/home?welcome=premium' 
    });
    
    // Use the token to authenticate the user
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            response.cookies.set(name, value, options);
          },
          remove(name: string, options: any) {
            response.cookies.delete(name);
          },
        },
      }
    );
    
    // Verify the magic link token
    const { data: session, error: verifyError } = await supabase.auth.verifyOtp({
      type: 'magiclink',
      token: token,
      email: user.email!
    });
    
    if (verifyError || !session) {
      logger.error({ ...ctx, error: verifyError }, 'Failed to verify magic link token');
      
      // If token is expired, generate a new one
      if (verifyError?.message?.includes('expired')) {
        const { data: newMagicLink, error: newLinkError } = await adminClient.auth.admin.generateLink({
          type: 'magiclink',
          email: user.email!,
          options: {
            redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/home?welcome=premium`
          }
        });
        
        if (!newLinkError && newMagicLink) {
          // Update user metadata with new magic link
          await adminClient.auth.admin.updateUserById(user.id, {
            user_metadata: {
              ...user.user_metadata,
              magic_link_token: newMagicLink.properties.action_link,
              magic_link_created_at: new Date().toISOString()
            }
          });
          
          // Extract new token and try again
          const newTokenMatch = newMagicLink.properties.action_link?.match(/token=([^&]+)/);
          const newToken = newTokenMatch ? newTokenMatch[1] : null;
          
          if (newToken) {
            const { data: newSession, error: newVerifyError } = await supabase.auth.verifyOtp({
              type: 'magiclink',
              token: newToken,
              email: user.email!
            });
            
            if (!newVerifyError && newSession) {
              logger.info({ ...ctx, userId: user.id }, 'Successfully auto-logged in user with new magic link');
              return response;
            }
          }
        }
      }
      
      return NextResponse.json({ error: 'Failed to authenticate' }, { status: 401 });
    }
    
    logger.info({ ...ctx, userId: user.id }, 'Successfully auto-logged in user');
    
    return response;
  } catch (error) {
    logger.error({ name: 'auth.auto-login', error }, 'Auto-login failed');
    return NextResponse.json({ error: 'Auto-login failed' }, { status: 500 });
  }
}