import { NextResponse } from 'next/server';
import { getLogger } from '@kit/shared/logger';

/**
 * Simple health check endpoint to verify webhook URL is accessible
 */
export async function GET() {
  const logger = await getLogger();
  
  logger.info({ 
    name: 'webhook-health-check',
    timestamp: new Date().toISOString(),
    endpoint: '/api/billing/webhook/health'
  }, '🟢 Webhook health check endpoint accessed');

  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    endpoint: '/api/billing/webhook/health',
    message: 'Webhook endpoint is accessible and logging is working'
  });
}

export async function POST() {
  const logger = await getLogger();
  
  logger.info({ 
    name: 'webhook-health-check-post',
    timestamp: new Date().toISOString(),
    endpoint: '/api/billing/webhook/health'
  }, '🟢 Webhook health check POST endpoint accessed');

  return NextResponse.json({
    status: 'healthy',
    method: 'POST',
    timestamp: new Date().toISOString(),
    endpoint: '/api/billing/webhook/health',
    message: 'Webhook POST endpoint is accessible and logging is working'
  });
}