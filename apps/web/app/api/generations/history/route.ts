import { NextRequest, NextResponse } from 'next/server';
import { enhanceRouteHandler } from '@kit/next/routes';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export const GET = enhanceRouteHandler(
  async function ({ user }) {
    const supabase = getSupabaseServerClient();

    try {
      // Get user's personal account ID
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

      // Fetch user's generation history
      const { data: generations, error } = await supabase
        .from('generations')
        .select('id, prompt, image_url, character_name, is_first_generation, quality, processing_time, metadata, created_at, updated_at')
        .eq('user_id', account.id)
        .order('created_at', { ascending: false })
        .limit(50); // Limit to last 50 generations

      if (error) {
        console.error('Error fetching generation history:', error);
        return NextResponse.json(
          { error: 'Failed to fetch generation history' },
          { status: 500 }
        );
      }

      return NextResponse.json(generations || []);

    } catch (error) {
      console.error('Unexpected error in generation history:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  },
  {
    auth: true,
  },
);