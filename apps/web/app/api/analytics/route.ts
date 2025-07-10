import { NextRequest, NextResponse } from 'next/server';
import { enhanceRouteHandler } from '@kit/next/routes';
import { loadUserAnalytics } from '../../home/(user)/_lib/server/analytics.service';

export const GET = enhanceRouteHandler(
  async function ({ user }) {
    try {
      const analytics = await loadUserAnalytics(user.id);
      
      return NextResponse.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      console.error('Error fetching user analytics:', error);
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to fetch analytics data' 
        },
        { status: 500 }
      );
    }
  },
  {
    auth: true,
  },
);