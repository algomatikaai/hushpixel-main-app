import { AdminGuard } from '@kit/admin/components/admin-guard';
import { PageBody, PageHeader } from '@kit/ui/page';
import { AdminAnalyticsDashboard } from '../../../../../packages/features/admin/src/components/admin-analytics-dashboard';
import { getMockAnalyticsData } from '../../../../../packages/features/admin/src/lib/server/loaders/admin-analytics.loader';

async function AnalyticsPage() {
  // In production, replace with actual data loader
  const analyticsData = getMockAnalyticsData();

  return (
    <>
      <PageHeader 
        title="Analytics Dashboard"
        description="Comprehensive business intelligence and performance metrics"
      />
      
      <PageBody>
        <AdminAnalyticsDashboard data={analyticsData} />
      </PageBody>
    </>
  );
}

export default AdminGuard(AnalyticsPage);