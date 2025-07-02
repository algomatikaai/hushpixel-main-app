import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { createAdminAnalyticsService } from '../../../packages/features/admin/src/lib/server/services/admin-analytics.service';

export interface AnalyticsEvent {
  userId?: string;
  sessionId: string;
  eventType: 'quiz' | 'app' | 'generation' | 'payment' | 'error' | 'user';
  eventName: string;
  eventData?: Record<string, any>;
  pageUrl?: string;
  referrer?: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface FunnelEvent {
  userId?: string;
  sessionId: string;
  stage: 'quiz_start' | 'quiz_complete' | 'app_register' | 'first_generation' | 'payment';
  completedAt?: Date;
  timeSpentSeconds?: number;
  exitReason?: string;
  conversionData?: Record<string, any>;
}

export interface ErrorEvent {
  userId?: string;
  sessionId?: string;
  errorType: string;
  errorMessage: string;
  errorStack?: string;
  errorContext?: Record<string, any>;
  severity?: 'info' | 'warning' | 'error' | 'critical';
}

export class AnalyticsTracker {
  private static instance: AnalyticsTracker;
  private analyticsService: ReturnType<typeof createAdminAnalyticsService>;

  private constructor() {
    const client = getSupabaseServerClient();
    this.analyticsService = createAdminAnalyticsService(client);
  }

  public static getInstance(): AnalyticsTracker {
    if (!AnalyticsTracker.instance) {
      AnalyticsTracker.instance = new AnalyticsTracker();
    }
    return AnalyticsTracker.instance;
  }

  /**
   * Track user journey events
   */
  async trackEvent(event: AnalyticsEvent): Promise<void> {
    try {
      await this.analyticsService.trackUserEvent({
        userId: event.userId,
        sessionId: event.sessionId,
        eventType: event.eventType,
        eventName: event.eventName,
        eventData: event.eventData,
        pageUrl: event.pageUrl,
        referrer: event.referrer,
        userAgent: event.userAgent,
        ipAddress: event.ipAddress
      });
    } catch (error) {
      console.error('Failed to track analytics event:', error);
      // Fail silently to not break user experience
    }
  }

  /**
   * Track conversion funnel progression
   */
  async trackFunnel(funnelEvent: FunnelEvent): Promise<void> {
    try {
      await this.analyticsService.trackFunnelProgress({
        userId: funnelEvent.userId,
        sessionId: funnelEvent.sessionId,
        funnelStage: funnelEvent.stage,
        completedAt: funnelEvent.completedAt,
        timeSpentSeconds: funnelEvent.timeSpentSeconds,
        exitReason: funnelEvent.exitReason,
        conversionData: funnelEvent.conversionData
      });
    } catch (error) {
      console.error('Failed to track funnel event:', error);
    }
  }

  /**
   * Track errors
   */
  async trackError(errorEvent: ErrorEvent): Promise<void> {
    try {
      await this.analyticsService.trackError({
        userId: errorEvent.userId,
        sessionId: errorEvent.sessionId,
        errorType: errorEvent.errorType,
        errorMessage: errorEvent.errorMessage,
        errorStack: errorEvent.errorStack,
        errorContext: errorEvent.errorContext,
        severity: errorEvent.severity || 'error'
      });
    } catch (error) {
      console.error('Failed to track error event:', error);
    }
  }

  /**
   * Track quiz events
   */
  async trackQuizEvent(eventName: string, data: {
    sessionId: string;
    userId?: string;
    step?: string;
    selections?: Record<string, any>;
    timeSpent?: number;
    pageUrl?: string;
  }): Promise<void> {
    await this.trackEvent({
      userId: data.userId,
      sessionId: data.sessionId,
      eventType: 'quiz',
      eventName,
      eventData: {
        step: data.step,
        selections: data.selections,
        timeSpent: data.timeSpent
      },
      pageUrl: data.pageUrl
    });

    // Also track funnel progression for key events
    if (eventName === 'quiz_started') {
      await this.trackFunnel({
        userId: data.userId,
        sessionId: data.sessionId,
        stage: 'quiz_start'
      });
    } else if (eventName === 'quiz_completed') {
      await this.trackFunnel({
        userId: data.userId,
        sessionId: data.sessionId,
        stage: 'quiz_complete',
        completedAt: new Date(),
        timeSpentSeconds: data.timeSpent
      });
    }
  }

  /**
   * Track app events
   */
  async trackAppEvent(eventName: string, data: {
    sessionId: string;
    userId?: string;
    action?: string;
    context?: Record<string, any>;
    pageUrl?: string;
  }): Promise<void> {
    await this.trackEvent({
      userId: data.userId,
      sessionId: data.sessionId,
      eventType: 'app',
      eventName,
      eventData: {
        action: data.action,
        context: data.context
      },
      pageUrl: data.pageUrl
    });

    // Track funnel progression for registration
    if (eventName === 'user_registered') {
      await this.trackFunnel({
        userId: data.userId,
        sessionId: data.sessionId,
        stage: 'app_register',
        completedAt: new Date()
      });
    }
  }

  /**
   * Track generation events
   */
  async trackGenerationEvent(eventName: string, data: {
    sessionId: string;
    userId?: string;
    generationId?: string;
    prompt?: string;
    processingTime?: number;
    success?: boolean;
    errorMessage?: string;
  }): Promise<void> {
    await this.trackEvent({
      userId: data.userId,
      sessionId: data.sessionId,
      eventType: 'generation',
      eventName,
      eventData: {
        generationId: data.generationId,
        prompt: data.prompt,
        processingTime: data.processingTime,
        success: data.success,
        errorMessage: data.errorMessage
      }
    });

    // Track funnel progression for first generation
    if (eventName === 'first_generation' && data.success) {
      await this.trackFunnel({
        userId: data.userId,
        sessionId: data.sessionId,
        stage: 'first_generation',
        completedAt: new Date()
      });
    }

    // Track errors if generation failed
    if (!data.success && data.errorMessage) {
      await this.trackError({
        userId: data.userId,
        sessionId: data.sessionId,
        errorType: 'generation_failed',
        errorMessage: data.errorMessage,
        errorContext: {
          generationId: data.generationId,
          prompt: data.prompt
        },
        severity: 'error'
      });
    }
  }

  /**
   * Track payment events
   */
  async trackPaymentEvent(eventName: string, data: {
    sessionId: string;
    userId?: string;
    subscriptionId?: string;
    amount?: number;
    currency?: string;
    paymentMethod?: string;
    success?: boolean;
    errorMessage?: string;
  }): Promise<void> {
    await this.trackEvent({
      userId: data.userId,
      sessionId: data.sessionId,
      eventType: 'payment',
      eventName,
      eventData: {
        subscriptionId: data.subscriptionId,
        amount: data.amount,
        currency: data.currency,
        paymentMethod: data.paymentMethod,
        success: data.success,
        errorMessage: data.errorMessage
      }
    });

    // Track funnel completion for successful payments
    if (eventName === 'subscription_created' && data.success) {
      await this.trackFunnel({
        userId: data.userId,
        sessionId: data.sessionId,
        stage: 'payment',
        completedAt: new Date(),
        conversionData: {
          subscriptionId: data.subscriptionId,
          amount: data.amount,
          currency: data.currency
        }
      });
    }

    // Track payment errors
    if (!data.success && data.errorMessage) {
      await this.trackError({
        userId: data.userId,
        sessionId: data.sessionId,
        errorType: 'payment_failed',
        errorMessage: data.errorMessage,
        errorContext: {
          subscriptionId: data.subscriptionId,
          amount: data.amount,
          paymentMethod: data.paymentMethod
        },
        severity: 'error'
      });
    }
  }

  /**
   * Generate session ID
   */
  static generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get session ID from client (browser)
   */
  static getClientSessionId(): string {
    if (typeof window === 'undefined') {
      return this.generateSessionId();
    }

    let sessionId = sessionStorage.getItem('hushpixel_session_id');
    if (!sessionId) {
      sessionId = this.generateSessionId();
      sessionStorage.setItem('hushpixel_session_id', sessionId);
    }
    return sessionId;
  }
}

// Export convenience functions
export const analytics = AnalyticsTracker.getInstance();

export const trackQuizEvent = (eventName: string, data: Parameters<AnalyticsTracker['trackQuizEvent']>[1]) =>
  analytics.trackQuizEvent(eventName, data);

export const trackAppEvent = (eventName: string, data: Parameters<AnalyticsTracker['trackAppEvent']>[1]) =>
  analytics.trackAppEvent(eventName, data);

export const trackGenerationEvent = (eventName: string, data: Parameters<AnalyticsTracker['trackGenerationEvent']>[1]) =>
  analytics.trackGenerationEvent(eventName, data);

export const trackPaymentEvent = (eventName: string, data: Parameters<AnalyticsTracker['trackPaymentEvent']>[1]) =>
  analytics.trackPaymentEvent(eventName, data);

export const trackError = (errorEvent: ErrorEvent) =>
  analytics.trackError(errorEvent);