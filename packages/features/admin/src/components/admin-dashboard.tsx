import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';
import { Button } from '@kit/ui/button';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Zap,
  AlertTriangle,
  Activity
} from 'lucide-react';

import { loadAdminDashboard } from '../lib/server/loaders/admin-dashboard.loader';
import { getMockAnalyticsData } from '../lib/server/loaders/admin-analytics.loader';
import { AdminAnalyticsDashboard } from './admin-analytics-dashboard';
import { AdminUserManagement } from './admin-user-management';
import { AdminErrorMonitoring } from './admin-error-monitoring';
import { AdminRevenueTracking } from './admin-revenue-tracking';

export async function AdminDashboard() {
  const basicData = await loadAdminDashboard();
  
  // For development, using mock data. In production, replace with actual data loader
  const analyticsData = getMockAnalyticsData();

  return (
    <div className="space-y-6">
      {/* Quick Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{basicData.accounts}</div>
            <div className="flex items-center text-xs text-blue-600">
              <TrendingUp className="h-3 w-3 mr-1" />
              <span>12.5% from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{basicData.subscriptions}</div>
            <div className="flex items-center text-xs text-green-600">
              <TrendingUp className="h-3 w-3 mr-1" />
              <span>8.2% from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trial Users</CardTitle>
            <Zap className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-700">{basicData.trials}</div>
            <div className="flex items-center text-xs text-yellow-600">
              <Activity className="h-3 w-3 mr-1" />
              <span>Converting at 14.3%</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <BarChart3 className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700">
              ${(analyticsData.overview.monthlyRevenue).toLocaleString()}
            </div>
            <div className="flex items-center text-xs text-purple-600">
              <TrendingUp className="h-3 w-3 mr-1" />
              <span>18.1% from last month</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="analytics" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="revenue">Revenue Tracking</TabsTrigger>
          <TabsTrigger value="errors">Error Monitoring</TabsTrigger>
          <TabsTrigger value="overview">System Overview</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics">
          <AdminAnalyticsDashboard data={analyticsData} />
        </TabsContent>

        <TabsContent value="users">
          <AdminUserManagement />
        </TabsContent>

        <TabsContent value="revenue">
          <AdminRevenueTracking data={analyticsData} />
        </TabsContent>

        <TabsContent value="errors">
          <AdminErrorMonitoring errors={analyticsData.topErrors} />
        </TabsContent>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Personal Accounts</CardTitle>
                <CardDescription>
                  The number of personal accounts that have been created.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className={'flex justify-between'}>
                  <Figure>{basicData.accounts}</Figure>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Team Accounts</CardTitle>
                <CardDescription>
                  The number of team accounts that have been created.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className={'flex justify-between'}>
                  <Figure>{basicData.teamAccounts}</Figure>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Paying Customers</CardTitle>
                <CardDescription>
                  The number of paying customers with active subscriptions.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className={'flex justify-between'}>
                  <Figure>{basicData.subscriptions}</Figure>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Trials</CardTitle>
                <CardDescription>
                  The number of trial subscriptions currently active.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className={'flex justify-between'}>
                  <Figure>{basicData.trials}</Figure>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6">
            <p className={'text-muted-foreground w-max text-xs'}>
              The above data is estimated and may not be 100% accurate. For precise analytics, use the Analytics tab.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Figure(props: React.PropsWithChildren) {
  return <div className={'text-3xl font-bold'}>{props.children}</div>;
}
