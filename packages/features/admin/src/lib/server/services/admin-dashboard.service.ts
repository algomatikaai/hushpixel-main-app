import { SupabaseClient } from '@supabase/supabase-js';

import { getLogger } from '@kit/shared/logger';
import { Database } from '@kit/supabase/database';

export function createAdminDashboardService(client: SupabaseClient<Database>) {
  return new AdminDashboardService(client);
}

export class AdminDashboardService {
  constructor(private readonly client: SupabaseClient<Database>) {}

  /**
   * Get the dashboard data for the admin dashboard
   * @param count
   */
  async getDashboardData(
    { count }: { count: 'exact' | 'estimated' | 'planned' } = {
      count: 'estimated',
    },
  ) {
    const logger = await getLogger();
    const ctx = {
      name: `admin.dashboard`,
    };

    const selectParams = {
      count,
      head: true,
    };

    const subscriptionsPromise = this.client
      .from('subscriptions')
      .select('*', selectParams)
      .eq('status', 'active')
      .then((response) => {
        if (response.error) {
          logger.error(
            { ...ctx, error: response.error.message },
            `Error fetching active subscriptions`,
          );

          throw new Error();
        }

        return response.count;
      });

    const trialsPromise = this.client
      .from('subscriptions')
      .select('*', selectParams)
      .eq('status', 'trialing')
      .then((response) => {
        if (response.error) {
          logger.error(
            { ...ctx, error: response.error.message },
            `Error fetching trialing subscriptions`,
          );

          throw new Error();
        }

        return response.count;
      });

    const accountsPromise = this.client
      .from('accounts')
      .select('*', selectParams)
      .eq('is_personal_account', true)
      .then((response) => {
        if (response.error) {
          logger.error(
            { ...ctx, error: response.error.message },
            `Error fetching personal accounts`,
          );

          throw new Error();
        }

        return response.count;
      });

    const teamAccountsPromise = this.client
      .from('accounts')
      .select('*', selectParams)
      .eq('is_personal_account', false)
      .then((response) => {
        if (response.error) {
          logger.error(
            { ...ctx, error: response.error.message },
            `Error fetching team accounts`,
          );

          throw new Error();
        }

        return response.count;
      });

    const [subscriptions, trials, accounts, teamAccounts] = await Promise.all([
      subscriptionsPromise,
      trialsPromise,
      accountsPromise,
      teamAccountsPromise,
    ]);

    // Get generations count
    const { count: generations } = await this.client
      .from('generations')
      .select('*', selectParams);

    // Get recent analytics metrics
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get conversion rate (simplified calculation)
    const { data: recentEvents } = await this.client
      .from('user_journey_events')
      .select('event_type, event_name, user_id')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .in('event_name', ['quiz_started', 'subscription_created']);

    let conversionRate = 0;
    if (recentEvents) {
      const quizStarts = recentEvents.filter(e => e.event_name === 'quiz_started').length;
      const subscriptions = recentEvents.filter(e => e.event_name === 'subscription_created').length;
      conversionRate = quizStarts > 0 ? (subscriptions / quizStarts) * 100 : 0;
    }

    return {
      subscriptions,
      trials,
      accounts,
      teamAccounts,
      generations: generations || 0,
      conversionRate,
    };
  }

  /**
   * Get comprehensive business metrics for enhanced dashboard
   */
  async getEnhancedDashboardData() {
    const basicData = await this.getDashboardData();
    
    // Get additional metrics
    const [revenueData, errorData, userActivityData] = await Promise.all([
      this.getRevenueMetrics(),
      this.getErrorMetrics(),
      this.getUserActivityMetrics()
    ]);

    return {
      ...basicData,
      revenue: revenueData,
      errors: errorData,
      userActivity: userActivityData
    };
  }

  /**
   * Get revenue metrics
   */
  private async getRevenueMetrics() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get revenue data from subscriptions
    const { data: subscriptionData } = await this.client
      .from('subscriptions')
      .select('status, created_at')
      .eq('status', 'active');

    // Simplified revenue calculation (would need actual pricing data in production)
    const monthlyRevenue = (subscriptionData?.length || 0) * 20; // Assuming $20/month average
    const avgRevenuePerUser = subscriptionData && subscriptionData.length > 0 ? monthlyRevenue / subscriptionData.length : 0;

    return {
      monthlyRevenue,
      avgRevenuePerUser,
      activeSubscriptions: subscriptionData?.length || 0
    };
  }

  /**
   * Get error metrics
   */
  private async getErrorMetrics() {
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const { count: totalErrors } = await this.client
      .from('error_tracking')
      .select('*', { count: 'estimated', head: true })
      .gte('created_at', twentyFourHoursAgo.toISOString());

    const { count: criticalErrors } = await this.client
      .from('error_tracking')
      .select('*', { count: 'estimated', head: true })
      .eq('severity', 'critical')
      .gte('created_at', twentyFourHoursAgo.toISOString());

    return {
      totalErrors: totalErrors || 0,
      criticalErrors: criticalErrors || 0
    };
  }

  /**
   * Get user activity metrics
   */
  private async getUserActivityMetrics() {
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const { count: activeUsers } = await this.client
      .from('user_journey_events')
      .select('user_id', { count: 'estimated', head: true })
      .gte('created_at', twentyFourHoursAgo.toISOString());

    const { count: dailyGenerations } = await this.client
      .from('generations')
      .select('*', { count: 'estimated', head: true })
      .gte('created_at', twentyFourHoursAgo.toISOString());

    return {
      activeUsers: activeUsers || 0,
      dailyGenerations: dailyGenerations || 0
    };
  }
}
