import 'server-only';

import { cache } from 'react';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { createAdminAnalyticsService } from '../services/admin-analytics.service';

/**
 * Load analytics dashboard data
 */
export const loadAnalyticsDashboard = cache(analyticsLoader);

function analyticsLoader() {
  const client = getSupabaseServerClient();
  const service = createAdminAnalyticsService(client);

  return service.getAnalyticsDashboardData();
}

/**
 * Load user behavior analytics
 */
export const loadUserBehaviorAnalytics = cache(
  (timeRange: '7d' | '30d' | '90d' = '30d') => {
    const client = getSupabaseServerClient();
    const service = createAdminAnalyticsService(client);

    return service.getUserBehaviorAnalytics(timeRange);
  }
);

/**
 * Mock data for development - remove in production
 */
export const getMockAnalyticsData = () => ({
  overview: {
    totalUsers: 12543,
    activeSubscriptions: 2156,
    monthlyRevenue: 43280,
    conversionRate: 1.73,
    churnRate: 5.2,
    avgRevenuePerUser: 20.05,
    totalGenerations: 45678,
    errorRate: 0.3
  },
  trends: {
    userGrowth: [
      { date: '2024-06-01', users: 45, revenue: 890 },
      { date: '2024-06-02', users: 52, revenue: 1040 },
      { date: '2024-06-03', users: 38, revenue: 760 },
      { date: '2024-06-04', users: 67, revenue: 1340 },
      { date: '2024-06-05', users: 43, revenue: 860 },
      { date: '2024-06-06', users: 58, revenue: 1160 },
      { date: '2024-06-07', users: 72, revenue: 1440 },
      { date: '2024-06-08', users: 41, revenue: 820 },
      { date: '2024-06-09', users: 65, revenue: 1300 },
      { date: '2024-06-10', users: 49, revenue: 980 },
      { date: '2024-06-11', users: 78, revenue: 1560 },
      { date: '2024-06-12', users: 56, revenue: 1120 },
      { date: '2024-06-13', users: 63, revenue: 1260 },
      { date: '2024-06-14', users: 47, revenue: 940 },
      { date: '2024-06-15', users: 84, revenue: 1680 }
    ],
    conversionFunnel: [
      { stage: 'Quiz Start', users: 10000, conversionRate: 100 },
      { stage: 'Quiz Complete', users: 8698, conversionRate: 86.98 },
      { stage: 'App Register', users: 1500, conversionRate: 17.25 },
      { stage: 'First Generation', users: 1200, conversionRate: 80.0 },
      { stage: 'Payment', users: 173, conversionRate: 14.42 }
    ]
  },
  realTime: {
    activeUsers: 234,
    currentGenerations: 89,
    revenueToday: 1245,
    errorsToday: 3
  },
  cohortAnalysis: [
    { cohort: '2024-01', month0: 100, month1: 65, month2: 45, month3: 32 },
    { cohort: '2024-02', month0: 100, month1: 68, month2: 48, month3: 35 },
    { cohort: '2024-03', month0: 100, month1: 72, month2: 52, month3: 38 },
    { cohort: '2024-04', month0: 100, month1: 70, month2: 50, month3: 36 },
    { cohort: '2024-05', month0: 100, month1: 75, month2: 55, month3: 42 },
    { cohort: '2024-06', month0: 100, month1: 78, month2: 58, month3: 0 }
  ],
  topErrors: [
    {
      error: 'ModelsLab API Timeout',
      count: 45,
      severity: 'critical',
      lastOccurred: '2 hours ago'
    },
    {
      error: 'Stripe Webhook Failed',
      count: 12,
      severity: 'error',
      lastOccurred: '4 hours ago'
    },
    {
      error: 'User Registration Failed',
      count: 8,
      severity: 'warning',
      lastOccurred: '6 hours ago'
    },
    {
      error: 'Image Generation Failed',
      count: 23,
      severity: 'error',
      lastOccurred: '1 hour ago'
    },
    {
      error: 'Database Connection Lost',
      count: 3,
      severity: 'critical',
      lastOccurred: '8 hours ago'
    }
  ]
});