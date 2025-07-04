'use client';

import { useCallback, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

interface UseAnalyticsProps {
  userId?: string;
  enabled?: boolean;
}

interface AnalyticsEvent {
  eventType: 'quiz' | 'app' | 'generation' | 'payment' | 'user' | 'navigation';
  eventName: string;
  eventData?: Record<string, any>;
  userId?: string;
}

export function useAnalytics({ userId, enabled = true }: UseAnalyticsProps = {}) {
  const pathname = usePathname();
  const sessionId = useRef<string>('');
  const startTime = useRef<number>(Date.now());

  // Initialize session ID
  useEffect(() => {
    if (typeof window !== 'undefined') {
      let storedSessionId = sessionStorage.getItem('hushpixel_session_id');
      if (!storedSessionId) {
        storedSessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem('hushpixel_session_id', storedSessionId);
      }
      sessionId.current = storedSessionId;
    }
  }, []);

  // Track page views
  useEffect(() => {
    if (!enabled || !sessionId.current) return;

    const trackPageView = async () => {
      try {
        await fetch('/api/analytics/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: sessionId.current,
            userId,
            eventType: 'navigation',
            eventName: 'page_view',
            eventData: {
              path: pathname,
              timestamp: new Date().toISOString(),
              referrer: document.referrer
            },
            pageUrl: window.location.href,
            referrer: document.referrer,
            userAgent: navigator.userAgent
          })
        });
      } catch (error) {
        console.error('Failed to track page view:', error);
      }
    };

    trackPageView();
    startTime.current = Date.now();
  }, [pathname, userId, enabled]);

  // Track page exit time
  useEffect(() => {
    if (!enabled) return;

    const handleBeforeUnload = async () => {
      const timeSpent = Math.round((Date.now() - startTime.current) / 1000);
      
      try {
        // Use sendBeacon for reliable tracking on page unload
        if (navigator.sendBeacon) {
          navigator.sendBeacon('/api/analytics/track', JSON.stringify({
            sessionId: sessionId.current,
            userId,
            eventType: 'navigation',
            eventName: 'page_exit',
            eventData: {
              path: pathname,
              timeSpent,
              timestamp: new Date().toISOString()
            }
          }));
        }
      } catch (error) {
        console.error('Failed to track page exit:', error);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [pathname, userId, enabled]);

  const track = useCallback(async (event: AnalyticsEvent) => {
    if (!enabled || !sessionId.current) return;

    try {
      await fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionId.current,
          userId: event.userId || userId,
          eventType: event.eventType,
          eventName: event.eventName,
          eventData: event.eventData,
          pageUrl: window.location.href,
          referrer: document.referrer,
          userAgent: navigator.userAgent
        })
      });
    } catch (error) {
      console.error('Failed to track event:', error);
    }
  }, [userId, enabled]);

  const trackQuizEvent = useCallback((eventName: string, data?: Record<string, any>) => {
    track({
      eventType: 'quiz',
      eventName,
      eventData: data
    });
  }, [track]);

  const trackAppEvent = useCallback((eventName: string, data?: Record<string, any>) => {
    track({
      eventType: 'app',
      eventName,
      eventData: data
    });
  }, [track]);

  const trackGenerationEvent = useCallback((eventName: string, data?: Record<string, any>) => {
    track({
      eventType: 'generation',
      eventName,
      eventData: data
    });
  }, [track]);

  const trackPaymentEvent = useCallback((eventName: string, data?: Record<string, any>) => {
    track({
      eventType: 'payment',
      eventName,
      eventData: data
    });
  }, [track]);

  const trackUserEvent = useCallback((eventName: string, data?: Record<string, any>) => {
    track({
      eventType: 'user',
      eventName,
      eventData: data
    });
  }, [track]);

  const trackError = useCallback(async (error: Error, context?: Record<string, any>) => {
    if (!enabled || !sessionId.current) return;

    try {
      await fetch('/api/analytics/error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionId.current,
          userId,
          errorType: error.name || 'Error',
          errorMessage: error.message,
          errorStack: error.stack,
          errorContext: {
            path: pathname,
            timestamp: new Date().toISOString(),
            ...context
          },
          severity: 'error'
        })
      });
    } catch (trackingError) {
      console.error('Failed to track error:', trackingError);
    }
  }, [userId, pathname, enabled]);

  return {
    track,
    trackQuizEvent,
    trackAppEvent,
    trackGenerationEvent,
    trackPaymentEvent,
    trackUserEvent,
    trackError,
    sessionId: sessionId.current
  };
}

// Hook for tracking form interactions
export function useFormAnalytics(formName: string, options: UseAnalyticsProps = {}) {
  const { track } = useAnalytics(options);

  const trackFormStart = useCallback(() => {
    track({
      eventType: 'user',
      eventName: 'form_started',
      eventData: { formName }
    });
  }, [track, formName]);

  const trackFormComplete = useCallback((data?: Record<string, any>) => {
    track({
      eventType: 'user',
      eventName: 'form_completed',
      eventData: { formName, ...data }
    });
  }, [track, formName]);

  const trackFormAbandoned = useCallback((step?: string) => {
    track({
      eventType: 'user',
      eventName: 'form_abandoned',
      eventData: { formName, step }
    });
  }, [track, formName]);

  const trackFieldInteraction = useCallback((fieldName: string, action: string) => {
    track({
      eventType: 'user',
      eventName: 'field_interaction',
      eventData: { formName, fieldName, action }
    });
  }, [track, formName]);

  return {
    trackFormStart,
    trackFormComplete,
    trackFormAbandoned,
    trackFieldInteraction
  };
}

// Hook for tracking user behavior
export function useBehaviorAnalytics(options: UseAnalyticsProps = {}) {
  const { track } = useAnalytics(options);

  const trackClick = useCallback((element: string, context?: Record<string, any>) => {
    track({
      eventType: 'user',
      eventName: 'click',
      eventData: { element, ...context }
    });
  }, [track]);

  const trackScroll = useCallback((depth: number) => {
    track({
      eventType: 'user',
      eventName: 'scroll',
      eventData: { depth }
    });
  }, [track]);

  const trackSearch = useCallback((query: string, results?: number) => {
    track({
      eventType: 'user',
      eventName: 'search',
      eventData: { query, results }
    });
  }, [track]);

  const trackFeatureUsage = useCallback((feature: string, usage?: Record<string, any>) => {
    track({
      eventType: 'user',
      eventName: 'feature_used',
      eventData: { feature, ...usage }
    });
  }, [track]);

  return {
    trackClick,
    trackScroll,
    trackSearch,
    trackFeatureUsage
  };
}