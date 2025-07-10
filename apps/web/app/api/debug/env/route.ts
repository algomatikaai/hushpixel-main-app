import { NextRequest, NextResponse } from 'next/server';
import { enhanceRouteHandler } from '@kit/next/routes';

export const GET = enhanceRouteHandler(
  async function ({ user }) {
    // Only allow authenticated users to access debug info
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check environment variables without exposing sensitive data
    const envCheck = {
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'MISSING',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING',
      // Additional debug info
      timestamp: new Date().toISOString(),
      userId: user.id,
    };

    // Test Supabase client creation
    let supabaseClientTest = 'UNKNOWN';
    let adminClientTest = 'UNKNOWN';

    try {
      const { getSupabaseServerClient } = await import('@kit/supabase/server-client');
      const client = getSupabaseServerClient();
      await client.from('accounts').select('id').limit(1);
      supabaseClientTest = 'SUCCESS';
    } catch (error) {
      supabaseClientTest = `ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }

    try {
      const { getSupabaseServerAdminClient } = await import('@kit/supabase/server-admin-client');
      const adminClient = getSupabaseServerAdminClient();
      // Test a simple admin operation
      await adminClient.auth.admin.listUsers({ page: 1, perPage: 1 });
      adminClientTest = 'SUCCESS';
    } catch (error) {
      adminClientTest = `ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }

    return NextResponse.json({
      environment: envCheck,
      supabaseClient: supabaseClientTest,
      adminClient: adminClientTest,
      timestamp: new Date().toISOString(),
    });
  },
  {
    auth: true,
  },
);