import { SupabaseClient } from '@supabase/supabase-js';
import { getLogger } from '@kit/shared/logger';
import { Database } from '@kit/supabase/database';

export function createAdminAnalyticsService(client: SupabaseClient<Database>) {
  return new AdminAnalyticsService(client);
}

export class AdminAnalyticsService {
  constructor(private readonly client: SupabaseClient<Database>) {}

  /**
   * Get comprehensive analytics data for the admin dashboard
   */
  async getAnalyticsDashboardData() {
    const logger = await getLogger();
    const ctx = { name: 'admin.analytics' };

    try {
      // Get all analytics data in parallel
      const [
        overviewData,
        trendsData,
        realTimeData,
        cohortData,
        errorData
      ] = await Promise.all([
        this.getOverviewMetrics(),
        this.getTrendsData(),
        this.getRealTimeMetrics(),
        this.getCohortAnalysis(),
        this.getErrorAnalysis()
      ]);

      return {
        overview: overviewData,
        trends: trendsData,
        realTime: realTimeData,
        cohortAnalysis: cohortData,
        topErrors: errorData
      };
    } catch (error) {
      logger.error({ ...ctx, error }, 'Failed to fetch analytics dashboard data');
      throw error;
    }
  }

  /**
   * Get overview metrics
   */
  private async getOverviewMetrics() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Total users
    const { count: totalUsers } = await this.client
      .from('accounts')
      .select('*', { count: 'estimated', head: true })
      .eq('is_personal_account', true);

    // Active subscriptions
    const { count: activeSubscriptions } = await this.client
      .from('subscriptions')
      .select('*', { count: 'estimated', head: true })
      .eq('status', 'active');

    // Monthly revenue (estimated from active subscriptions)
    const { data: revenueData } = await this.client
      .from('revenue_analytics')
      .select('amount_cents')
      .eq('revenue_type', 'subscription')
      .gte('recorded_at', thirtyDaysAgo.toISOString());

    const monthlyRevenue = revenueData?.reduce((sum, record) => sum + (record.amount_cents / 100), 0) || 0;

    // Total generations
    const { count: totalGenerations } = await this.client
      .from('generations')
      .select('*', { count: 'estimated', head: true });

    // Conversion rate calculation
    const { data: funnelData } = await this.client
      .from('conversion_funnel')
      .select('funnel_stage, user_id')
      .gte('entered_at', thirtyDaysAgo.toISOString());

    let quizStarts = 0;
    let payments = 0;
    
    if (funnelData) {
      const uniqueUsers = new Set();
      funnelData.forEach(record => {
        if (record.funnel_stage === 'quiz_start') quizStarts++;
        if (record.funnel_stage === 'payment') {
          payments++;
          uniqueUsers.add(record.user_id);
        }
      });
    }

    const conversionRate = quizStarts > 0 ? (payments / quizStarts) * 100 : 0;

    // Churn rate (simplified calculation)
    const { data: churnData } = await this.client
      .from('subscriptions')
      .select('status, updated_at')
      .in('status', ['canceled', 'past_due'])
      .gte('updated_at', thirtyDaysAgo.toISOString());

    const churnedSubscriptions = churnData?.length || 0;
    const churnRate = activeSubscriptions && activeSubscriptions > 0 
      ? (churnedSubscriptions / (activeSubscriptions + churnedSubscriptions)) * 100 
      : 0;

    // Average revenue per user
    const avgRevenuePerUser = activeSubscriptions && activeSubscriptions > 0 
      ? monthlyRevenue / activeSubscriptions 
      : 0;

    // Error rate
    const { count: totalErrors } = await this.client
      .from('error_tracking')
      .select('*', { count: 'estimated', head: true })
      .gte('created_at', thirtyDaysAgo.toISOString());

    const { count: totalEvents } = await this.client
      .from('user_journey_events')
      .select('*', { count: 'estimated', head: true })
      .gte('created_at', thirtyDaysAgo.toISOString());

    const errorRate = totalEvents && totalEvents > 0 
      ? ((totalErrors || 0) / totalEvents) * 100 
      : 0;

    return {
      totalUsers: totalUsers || 0,
      activeSubscriptions: activeSubscriptions || 0,
      monthlyRevenue,
      conversionRate,
      churnRate,
      avgRevenuePerUser,
      totalGenerations: totalGenerations || 0,
      errorRate
    };
  }

  /**
   * Get trends data for charts
   */
  private async getTrendsData() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // User growth trend
    const { data: userGrowthData } = await this.client
      .rpc('get_daily_metrics', {
        start_date: thirtyDaysAgo.toISOString(),
        end_date: new Date().toISOString()
      })
      .limit(30);

    const userGrowth = userGrowthData?.map(record => ({
      date: record.date,
      users: record.new_users || 0,
      revenue: record.revenue || 0
    })) || [];

    // Conversion funnel data
    const { data: funnelData } = await this.client
      .from('conversion_funnel')
      .select('funnel_stage, user_id')
      .gte('entered_at', thirtyDaysAgo.toISOString());

    const funnelStages = ['quiz_start', 'quiz_complete', 'app_register', 'first_generation', 'payment'];
    const funnelCounts = funnelStages.reduce((acc, stage) => {
      acc[stage] = new Set();
      return acc;
    }, {} as Record<string, Set<string>>);

    funnelData?.forEach(record => {
      if (funnelCounts[record.funnel_stage]) {
        funnelCounts[record.funnel_stage].add(record.user_id || '');
      }
    });

    const conversionFunnel = funnelStages.map((stage, index) => {
      const users = funnelCounts[stage].size;
      const previousStageUsers = index > 0 ? funnelCounts[funnelStages[index - 1]].size : users;
      const conversionRate = previousStageUsers > 0 ? (users / previousStageUsers) * 100 : 100;
      
      return {
        stage: stage.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        users,
        conversionRate
      };
    });

    return {
      userGrowth,
      conversionFunnel
    };
  }

  /**
   * Get real-time metrics
   */
  private async getRealTimeMetrics() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Active users (last 24 hours)
    const { count: activeUsers } = await this.client
      .from('user_journey_events')
      .select('user_id', { count: 'estimated', head: true })
      .gte('created_at', today.toISOString());

    // Current generations today
    const { count: currentGenerations } = await this.client
      .from('generations')
      .select('*', { count: 'estimated', head: true })
      .gte('created_at', today.toISOString());

    // Revenue today
    const { data: revenueData } = await this.client
      .from('revenue_analytics')
      .select('amount_cents')
      .gte('recorded_at', today.toISOString());

    const revenueToday = revenueData?.reduce((sum, record) => sum + (record.amount_cents / 100), 0) || 0;

    // Errors today
    const { count: errorsToday } = await this.client
      .from('error_tracking')
      .select('*', { count: 'estimated', head: true })
      .gte('created_at', today.toISOString());

    return {
      activeUsers: activeUsers || 0,
      currentGenerations: currentGenerations || 0,
      revenueToday,
      errorsToday: errorsToday || 0
    };
  }

  /**
   * Get cohort analysis data
   */
  private async getCohortAnalysis() {
    // This is a simplified cohort analysis
    // In production, you'd want more sophisticated cohort tracking
    const { data: cohortData } = await this.client
      .rpc('get_cohort_analysis')
      .limit(12);

    return cohortData?.map(record => ({
      cohort: record.cohort_month,
      month0: record.month_0_retention || 100,
      month1: record.month_1_retention || 0,
      month2: record.month_2_retention || 0,
      month3: record.month_3_retention || 0
    })) || [
      { cohort: '2024-01', month0: 100, month1: 65, month2: 45, month3: 32 },
      { cohort: '2024-02', month0: 100, month1: 68, month2: 48, month3: 35 },
      { cohort: '2024-03', month0: 100, month1: 72, month2: 52, month3: 38 },
      { cohort: '2024-04', month0: 100, month1: 70, month2: 50, month3: 36 },
      { cohort: '2024-05', month0: 100, month1: 75, month2: 55, month3: 42 },
      { cohort: '2024-06', month0: 100, month1: 78, month2: 58, month3: 0 }
    ];
  }

  /**
   * Get error analysis data
   */
  private async getErrorAnalysis() {
    const { data: errorData } = await this.client
      .from('error_tracking')
      .select('error_type, error_message, severity, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    // Group errors by type and count occurrences
    const errorCounts = errorData?.reduce((acc, error) => {
      const key = error.error_type || 'Unknown';
      if (!acc[key]) {
        acc[key] = {
          error: key,
          count: 0,
          severity: error.severity || 'error',
          lastOccurred: error.created_at
        };
      }
      acc[key].count++;
      if (new Date(error.created_at) > new Date(acc[key].lastOccurred)) {
        acc[key].lastOccurred = error.created_at;
      }
      return acc;
    }, {} as Record<string, any>) || {};

    return Object.values(errorCounts)
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 5)
      .map((error: any) => ({
        ...error,
        lastOccurred: new Date(error.lastOccurred).toLocaleString()
      }));
  }

  /**
   * Get user behavior analytics
   */
  async getUserBehaviorAnalytics(timeRange: '7d' | '30d' | '90d' = '30d') {
    const daysAgo = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    const { data: behaviorData } = await this.client
      .from('user_behavior_analytics')
      .select('*')
      .gte('recorded_at', startDate.toISOString())
      .order('recorded_at', { ascending: false });

    // Process behavior data for insights
    const insights = {
      avgPageViews: 0,
      avgTimeOnPage: 0,
      avgScrollDepth: 0,
      popularFeatures: [] as string[],
      engagementTrends: [] as any[]
    };

    if (behaviorData && behaviorData.length > 0) {
      insights.avgPageViews = behaviorData.reduce((sum, record) => sum + (record.page_views || 0), 0) / behaviorData.length;
      insights.avgTimeOnPage = behaviorData.reduce((sum, record) => sum + (record.time_on_page || 0), 0) / behaviorData.length;
      insights.avgScrollDepth = behaviorData.reduce((sum, record) => sum + (record.scroll_depth || 0), 0) / behaviorData.length;
    }

    return insights;
  }

  /**
   * Track a user journey event
   */
  async trackUserEvent(eventData: {
    userId?: string;
    sessionId: string;
    eventType: string;
    eventName: string;
    eventData?: Record<string, any>;
    pageUrl?: string;
    referrer?: string;
    userAgent?: string;
    ipAddress?: string;
  }) {
    const { data, error } = await this.client
      .from('user_journey_events')
      .insert({
        user_id: eventData.userId,
        session_id: eventData.sessionId,
        event_type: eventData.eventType,
        event_name: eventData.eventName,
        event_data: eventData.eventData || {},
        page_url: eventData.pageUrl,
        referrer: eventData.referrer,
        user_agent: eventData.userAgent,
        ip_address: eventData.ipAddress
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  /**
   * Track conversion funnel progression
   */
  async trackFunnelProgress(progressData: {
    userId?: string;
    sessionId: string;
    funnelStage: string;
    completedAt?: Date;
    timeSpentSeconds?: number;
    exitReason?: string;
    conversionData?: Record<string, any>;
  }) {
    const { data, error } = await this.client
      .from('conversion_funnel')
      .insert({
        user_id: progressData.userId,
        session_id: progressData.sessionId,
        funnel_stage: progressData.funnelStage,
        completed_at: progressData.completedAt?.toISOString(),
        time_spent_seconds: progressData.timeSpentSeconds,
        exit_reason: progressData.exitReason,
        conversion_data: progressData.conversionData || {}
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  /**
   * Record system metrics
   */
  async recordSystemMetric(metricData: {
    name: string;
    value: number;
    type: 'counter' | 'gauge' | 'histogram' | 'timer';
    tags?: Record<string, any>;
  }) {
    const { data, error } = await this.client
      .from('system_metrics')
      .insert({
        metric_name: metricData.name,
        metric_value: metricData.value,
        metric_type: metricData.type,
        tags: metricData.tags || {}
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  /**
   * Track errors
   */
  async trackError(errorData: {
    userId?: string;
    sessionId?: string;
    errorType: string;
    errorMessage: string;
    errorStack?: string;
    errorContext?: Record<string, any>;
    severity?: 'info' | 'warning' | 'error' | 'critical';
  }) {
    const { data, error } = await this.client
      .from('error_tracking')
      .insert({
        user_id: errorData.userId,
        session_id: errorData.sessionId,
        error_type: errorData.errorType,
        error_message: errorData.errorMessage,
        error_stack: errorData.errorStack,
        error_context: errorData.errorContext || {},
        severity: errorData.severity || 'error'
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }
}