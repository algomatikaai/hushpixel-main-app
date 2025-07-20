import { NextResponse } from 'next/server';
import { createBillingGatewayService } from '@kit/billing-gateway';
import { getLogger } from '@kit/shared/logger';

/**
 * @description Retrieve Stripe session details including metadata
 * This helps avoid URL parameter corruption issues
 */
export async function GET(request: Request) {
  const logger = await getLogger();
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
  }

  const ctx = { name: 'billing.session-details', sessionId };

  try {
    logger.info(ctx, 'Retrieving session details');
    
    const billingGateway = createBillingGatewayService('stripe');
    const session = await billingGateway.retrieveCheckoutSession(sessionId);

    if (!session) {
      logger.error(ctx, 'Session not found');
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Extract email from metadata or customer details
    const email = session.metadata?.email || session.customer_details?.email || null;

    logger.info({ ...ctx, email: email ? email.substring(0, 3) + '***' : 'none' }, 'Session retrieved successfully');

    return NextResponse.json({
      success: true,
      email,
      metadata: session.metadata,
      customerDetails: session.customer_details
    });
  } catch (error) {
    logger.error({ ...ctx, error }, 'Failed to retrieve session details');
    return NextResponse.json(
      { error: 'Failed to retrieve session details' },
      { status: 500 }
    );
  }
}