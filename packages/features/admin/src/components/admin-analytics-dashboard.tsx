'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  DollarSign, 
  Target, 
  AlertTriangle,
  Eye,
  MousePointer,
  CreditCard,
  Zap,
  RefreshCw
} from 'lucide-react';

interface AnalyticsDashboardProps {
  data: {
    overview: {
      totalUsers: number;
      activeSubscriptions: number;
      monthlyRevenue: number;
      conversionRate: number;
      churnRate: number;
      avgRevenuePerUser: number;
      totalGenerations: number;
      errorRate: number;
    };
    trends: {
      userGrowth: Array<{ date: string; users: number; revenue: number }>;
      conversionFunnel: Array<{ stage: string; users: number; conversionRate: number }>;
    };
    realTime: {
      activeUsers: number;
      currentGenerations: number;
      revenueToday: number;
      errorsToday: number;
    };
    cohortAnalysis: Array<{
      cohort: string;
      month0: number;
      month1: number;
      month2: number;
      month3: number;
    }>;
    topErrors: Array<{
      error: string;
      count: number;
      severity: string;
      lastOccurred: string;
    }>;
  };
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff88'];

export function AdminAnalyticsDashboard({ data }: AnalyticsDashboardProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate refresh
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLastUpdated(new Date());
    setIsRefreshing(false);
  };

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

  const formatPercentage = (value: number) => `${value.toFixed(2)}%`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive business intelligence for HushPixel
          </p>
        </div>
        <div className="flex items-center gap-4">
          <p className="text-sm text-muted-foreground">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
          <Button 
            onClick={handleRefresh} 
            disabled={isRefreshing}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Real-time Metrics */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-600" />
            Real-time Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{data.realTime.activeUsers}</div>
              <div className="text-sm text-muted-foreground">Active Users</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{data.realTime.currentGenerations}</div>
              <div className="text-sm text-muted-foreground">Generations Today</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600">
                {formatCurrency(data.realTime.revenueToday)}
              </div>
              <div className="text-sm text-muted-foreground">Revenue Today</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{data.realTime.errorsToday}</div>
              <div className="text-sm text-muted-foreground">Errors Today</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overview KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Users"
          value={data.overview.totalUsers.toLocaleString()}
          icon={<Users className="h-4 w-4" />}
          trend={12.5}
          description="Active user accounts"
        />
        <MetricCard
          title="Monthly Revenue"
          value={formatCurrency(data.overview.monthlyRevenue)}
          icon={<DollarSign className="h-4 w-4" />}
          trend={8.2}
          description="Recurring monthly revenue"
        />
        <MetricCard
          title="Conversion Rate"
          value={formatPercentage(data.overview.conversionRate)}
          icon={<Target className="h-4 w-4" />}
          trend={-2.1}
          description="Quiz to payment conversion"
        />
        <MetricCard
          title="Churn Rate"
          value={formatPercentage(data.overview.churnRate)}
          icon={<TrendingDown className="h-4 w-4" />}
          trend={-5.3}
          description="Monthly subscription churn"
          inverseTrend
        />
      </div>

      {/* Main Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="funnel">Conversion Funnel</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="users">User Analytics</TabsTrigger>
          <TabsTrigger value="errors">Error Monitoring</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* User Growth Chart */}
            <Card>
              <CardHeader>
                <CardTitle>User Growth & Revenue Trend</CardTitle>
                <CardDescription>Daily user registrations and revenue over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={data.trends.userGrowth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Area 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="users" 
                      stackId="1" 
                      stroke="#8884d8" 
                      fill="#8884d8" 
                      name="New Users"
                    />
                    <Area 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="revenue" 
                      stackId="2" 
                      stroke="#82ca9d" 
                      fill="#82ca9d" 
                      name="Revenue ($)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Additional Metrics */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Key Performance Indicators</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Average Revenue Per User</span>
                    <span className="text-lg font-bold">{formatCurrency(data.overview.avgRevenuePerUser)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Total Generations</span>
                    <span className="text-lg font-bold">{data.overview.totalGenerations.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Error Rate</span>
                    <Badge variant={data.overview.errorRate < 1 ? "default" : "destructive"}>
                      {formatPercentage(data.overview.errorRate)}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Active Subscriptions</span>
                    <span className="text-lg font-bold">{data.overview.activeSubscriptions}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="funnel" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Conversion Funnel Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Conversion Funnel Analysis</CardTitle>
                <CardDescription>User progression through the conversion funnel</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={data.trends.conversionFunnel} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="stage" type="category" width={100} />
                    <Tooltip />
                    <Bar dataKey="users" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Funnel Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Funnel Conversion Rates</CardTitle>
                <CardDescription>Stage-to-stage conversion performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.trends.conversionFunnel.map((stage, index) => (
                    <div key={stage.stage} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{stage.stage}</div>
                        <div className="text-sm text-muted-foreground">{stage.users} users</div>
                      </div>
                      <Badge variant={stage.conversionRate > 50 ? "default" : "secondary"}>
                        {formatPercentage(stage.conversionRate)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trends</CardTitle>
                <CardDescription>Monthly recurring revenue growth</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={data.trends.userGrowth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#82ca9d" 
                      strokeWidth={2}
                      name="Revenue ($)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Cohort Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>Cohort Retention Analysis</CardTitle>
                <CardDescription>User retention by signup cohort</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.cohortAnalysis.map((cohort) => (
                    <div key={cohort.cohort} className="grid grid-cols-5 gap-2 text-sm">
                      <div className="font-medium">{cohort.cohort}</div>
                      <div className="text-center bg-blue-100 p-1 rounded">
                        {formatPercentage(cohort.month0)}
                      </div>
                      <div className="text-center bg-green-100 p-1 rounded">
                        {formatPercentage(cohort.month1)}
                      </div>
                      <div className="text-center bg-yellow-100 p-1 rounded">
                        {formatPercentage(cohort.month2)}
                      </div>
                      <div className="text-center bg-red-100 p-1 rounded">
                        {formatPercentage(cohort.month3)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* User Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>User Segmentation</CardTitle>
                <CardDescription>Distribution of user types</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Free Users', value: 65, fill: '#8884d8' },
                        { name: 'Premium Users', value: 30, fill: '#82ca9d' },
                        { name: 'Churned Users', value: 5, fill: '#ffc658' }
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {[
                        { name: 'Free Users', value: 65, fill: '#8884d8' },
                        { name: 'Premium Users', value: 30, fill: '#82ca9d' },
                        { name: 'Churned Users', value: 5, fill: '#ffc658' }
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* User Engagement */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>User Engagement Metrics</CardTitle>
                <CardDescription>Daily active users and engagement rates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">2,340</div>
                    <div className="text-sm text-muted-foreground">Daily Active Users</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">67%</div>
                    <div className="text-sm text-muted-foreground">User Engagement Rate</div>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={data.trends.userGrowth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area 
                      type="monotone" 
                      dataKey="users" 
                      stroke="#8884d8" 
                      fill="#8884d8" 
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Error Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  Error Monitoring
                </CardTitle>
                <CardDescription>System errors and issues tracking</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-red-600">12</div>
                      <div className="text-xs text-muted-foreground">Critical</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-yellow-600">45</div>
                      <div className="text-xs text-muted-foreground">Warning</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-blue-600">123</div>
                      <div className="text-xs text-muted-foreground">Info</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Top Errors */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Critical Errors</CardTitle>
                <CardDescription>Most frequent errors requiring attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.topErrors.map((error, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{error.error}</div>
                        <div className="text-xs text-muted-foreground">{error.lastOccurred}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={error.severity === 'critical' ? 'destructive' : 'secondary'}>
                          {error.count}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend: number;
  description?: string;
  inverseTrend?: boolean;
}

function MetricCard({ title, value, icon, trend, description, inverseTrend = false }: MetricCardProps) {
  const isPositiveTrend = inverseTrend ? trend < 0 : trend > 0;
  const trendColor = isPositiveTrend ? 'text-green-600' : 'text-red-600';
  const TrendIcon = isPositiveTrend ? TrendingUp : TrendingDown;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center text-xs text-muted-foreground">
          <TrendIcon className={`h-3 w-3 mr-1 ${trendColor}`} />
          <span className={trendColor}>
            {Math.abs(trend).toFixed(1)}%
          </span>
          <span className="ml-1">from last month</span>
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}