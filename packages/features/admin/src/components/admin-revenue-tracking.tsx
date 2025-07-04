'use client';

import { useState } from 'react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { 
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  CreditCard,
  Target,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  RefreshCw
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
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

interface RevenueTrackingProps {
  data: {
    overview: {
      monthlyRevenue: number;
      avgRevenuePerUser: number;
      churnRate: number;
      conversionRate: number;
    };
    trends: {
      userGrowth: Array<{ date: string; users: number; revenue: number }>;
    };
    cohortAnalysis: Array<{
      cohort: string;
      month0: number;
      month1: number;
      month2: number;
      month3: number;
    }>;
  };
}

const revenueMetrics = {
  mrr: 43280,
  arr: 519360,
  growth: 18.5,
  churnRate: 5.2,
  ltv: 245.67,
  cac: 32.45,
  paybackPeriod: 7.6,
  grossMargin: 87.3
};

const monthlyRevenueData = [
  { month: 'Jan', revenue: 28500, subscribers: 1420, churn: 4.2 },
  { month: 'Feb', revenue: 31200, subscribers: 1560, churn: 3.8 },
  { month: 'Mar', revenue: 34800, subscribers: 1740, churn: 4.1 },
  { month: 'Apr', revenue: 38400, subscribers: 1920, churn: 3.9 },
  { month: 'May', revenue: 41200, subscribers: 2060, churn: 4.3 },
  { month: 'Jun', revenue: 43280, subscribers: 2164, churn: 5.2 }
];

const revenueByPlan = [
  { name: 'Premium Monthly', value: 28500, color: '#8884d8' },
  { name: 'Premium Annual', value: 12200, color: '#82ca9d' },
  { name: 'Pro Monthly', value: 2580, color: '#ffc658' }
];

const projectionData = [
  { month: 'Jul', actual: null, projected: 46500, optimistic: 52000, pessimistic: 41000 },
  { month: 'Aug', actual: null, projected: 49800, optimistic: 58000, pessimistic: 43500 },
  { month: 'Sep', actual: null, projected: 53200, optimistic: 64500, pessimistic: 46000 },
  { month: 'Oct', actual: null, projected: 56800, optimistic: 71000, pessimistic: 48500 },
  { month: 'Nov', actual: null, projected: 60500, optimistic: 78000, pessimistic: 51000 },
  { month: 'Dec', actual: null, projected: 64800, optimistic: 85500, pessimistic: 54000 }
];

export function AdminRevenueTracking({ data }: RevenueTrackingProps) {
  const [timeRange, setTimeRange] = useState('6m');
  const [selectedMetric, setSelectedMetric] = useState('revenue');

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Revenue Analytics</h2>
          <p className="text-muted-foreground">
            Track revenue metrics, projections, and financial performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1m">1 Month</SelectItem>
              <SelectItem value="3m">3 Months</SelectItem>
              <SelectItem value="6m">6 Months</SelectItem>
              <SelectItem value="1y">1 Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Revenue Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Recurring Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">
              {formatCurrency(revenueMetrics.mrr)}
            </div>
            <div className="flex items-center text-xs text-green-600">
              <TrendingUp className="h-3 w-3 mr-1" />
              <span>{formatPercentage(revenueMetrics.growth)} from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Annual Recurring Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">
              {formatCurrency(revenueMetrics.arr)}
            </div>
            <div className="flex items-center text-xs text-blue-600">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              <span>MRR × 12</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customer LTV</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700">
              {formatCurrency(revenueMetrics.ltv)}
            </div>
            <div className="flex items-center text-xs text-purple-600">
              <Target className="h-3 w-3 mr-1" />
              <span>CAC: {formatCurrency(revenueMetrics.cac)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
            <TrendingDown className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700">
              {formatPercentage(revenueMetrics.churnRate)}
            </div>
            <div className="flex items-center text-xs text-orange-600">
              <ArrowDownRight className="h-3 w-3 mr-1" />
              <span>Monthly churn rate</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="projections">Projections</TabsTrigger>
          <TabsTrigger value="cohorts">Cohort Analysis</TabsTrigger>
          <TabsTrigger value="plans">Revenue by Plan</TabsTrigger>
          <TabsTrigger value="metrics">Key Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Growth Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue Growth Trend</CardTitle>
                <CardDescription>Monthly revenue and subscriber growth</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={monthlyRevenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Area 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="revenue" 
                      stackId="1" 
                      stroke="#10b981" 
                      fill="#10b981" 
                      fillOpacity={0.6}
                      name="Revenue ($)"
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="subscribers" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      name="Subscribers"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Key Ratios */}
            <Card>
              <CardHeader>
                <CardTitle>Financial Health Metrics</CardTitle>
                <CardDescription>Key business performance indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">LTV:CAC Ratio</div>
                      <div className="text-sm text-muted-foreground">
                        Lifetime Value to Customer Acquisition Cost
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-600">
                        {(revenueMetrics.ltv / revenueMetrics.cac).toFixed(1)}:1
                      </div>
                      <Badge variant="default">Excellent</Badge>
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">Payback Period</div>
                      <div className="text-sm text-muted-foreground">
                        Time to recover customer acquisition cost
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-blue-600">
                        {revenueMetrics.paybackPeriod} months
                      </div>
                      <Badge variant="secondary">Good</Badge>
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">Gross Margin</div>
                      <div className="text-sm text-muted-foreground">
                        Revenue minus cost of goods sold
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-purple-600">
                        {formatPercentage(revenueMetrics.grossMargin)}
                      </div>
                      <Badge variant="default">Excellent</Badge>
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">Monthly Growth Rate</div>
                      <div className="text-sm text-muted-foreground">
                        Month-over-month revenue growth
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-orange-600">
                        {formatPercentage(revenueMetrics.growth)}
                      </div>
                      <Badge variant="default">Strong</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="projections" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Projections</CardTitle>
              <CardDescription>
                6-month revenue forecast with optimistic, realistic, and pessimistic scenarios
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={projectionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="projected" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    strokeDasharray="5 5"
                    name="Projected"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="optimistic" 
                    stroke="#22c55e" 
                    strokeWidth={2}
                    strokeDasharray="3 3"
                    name="Optimistic"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="pessimistic" 
                    stroke="#ef4444" 
                    strokeWidth={2}
                    strokeDasharray="3 3"
                    name="Pessimistic"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-green-200 bg-green-50/50">
              <CardHeader>
                <CardTitle className="text-green-700">Optimistic Scenario</CardTitle>
                <CardDescription>Best case revenue projection</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-700">
                  {formatCurrency(85500)}
                </div>
                <p className="text-sm text-green-600">December 2024</p>
                <div className="mt-2 text-xs text-green-600">
                  • 25% monthly growth
                  • 2% churn rate
                  • Higher conversion rates
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-blue-50/50">
              <CardHeader>
                <CardTitle className="text-blue-700">Realistic Scenario</CardTitle>
                <CardDescription>Expected revenue projection</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-700">
                  {formatCurrency(64800)}
                </div>
                <p className="text-sm text-blue-600">December 2024</p>
                <div className="mt-2 text-xs text-blue-600">
                  • 15% monthly growth
                  • 5% churn rate
                  • Current conversion rates
                </div>
              </CardContent>
            </Card>

            <Card className="border-red-200 bg-red-50/50">
              <CardHeader>
                <CardTitle className="text-red-700">Conservative Scenario</CardTitle>
                <CardDescription>Worst case revenue projection</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-700">
                  {formatCurrency(54000)}
                </div>
                <p className="text-sm text-red-600">December 2024</p>
                <div className="mt-2 text-xs text-red-600">
                  • 8% monthly growth
                  • 8% churn rate
                  • Market saturation
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="cohorts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Cohort Analysis</CardTitle>
              <CardDescription>
                Revenue retention by customer signup cohort
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-5 gap-2 text-sm font-medium text-muted-foreground">
                  <div>Cohort</div>
                  <div className="text-center">Month 0</div>
                  <div className="text-center">Month 1</div>
                  <div className="text-center">Month 2</div>
                  <div className="text-center">Month 3</div>
                </div>
                
                {data.cohortAnalysis.map((cohort) => (
                  <div key={cohort.cohort} className="grid grid-cols-5 gap-2 text-sm">
                    <div className="font-medium">{cohort.cohort}</div>
                    <div className="text-center p-2 bg-green-100 rounded font-medium">
                      {formatPercentage(cohort.month0)}
                    </div>
                    <div className="text-center p-2 bg-blue-100 rounded">
                      {formatPercentage(cohort.month1)}
                    </div>
                    <div className="text-center p-2 bg-yellow-100 rounded">
                      {formatPercentage(cohort.month2)}
                    </div>
                    <div className="text-center p-2 bg-red-100 rounded">
                      {cohort.month3 > 0 ? formatPercentage(cohort.month3) : '-'}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plans" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Subscription Plan</CardTitle>
                <CardDescription>Distribution of revenue across different plans</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={revenueByPlan}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {revenueByPlan.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Plan Performance</CardTitle>
                <CardDescription>Revenue and subscriber metrics by plan</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {revenueByPlan.map((plan, index) => (
                    <div key={index} className="flex justify-between items-center p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{plan.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {plan.name.includes('Annual') ? 'Annual billing' : 'Monthly billing'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{formatCurrency(plan.value)}</div>
                        <div className="text-sm text-muted-foreground">
                          {((plan.value / revenueByPlan.reduce((sum, p) => sum + p.value, 0)) * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Unit Economics</CardTitle>
                <CardDescription>Key financial metrics per customer</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Average Revenue Per User (ARPU)</span>
                    <span className="text-lg font-bold">{formatCurrency(data.overview.avgRevenuePerUser)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Customer Acquisition Cost (CAC)</span>
                    <span className="text-lg font-bold">{formatCurrency(revenueMetrics.cac)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Customer Lifetime Value (LTV)</span>
                    <span className="text-lg font-bold">{formatCurrency(revenueMetrics.ltv)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">LTV:CAC Ratio</span>
                    <Badge variant="default" className="text-lg">
                      {(revenueMetrics.ltv / revenueMetrics.cac).toFixed(1)}:1
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Growth Metrics</CardTitle>
                <CardDescription>Business growth and retention metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Monthly Growth Rate</span>
                    <div className="flex items-center">
                      <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                      <span className="text-lg font-bold text-green-600">
                        {formatPercentage(revenueMetrics.growth)}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Churn Rate</span>
                    <div className="flex items-center">
                      <TrendingDown className="h-4 w-4 text-red-600 mr-1" />
                      <span className="text-lg font-bold text-red-600">
                        {formatPercentage(revenueMetrics.churnRate)}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Net Revenue Retention</span>
                    <span className="text-lg font-bold text-blue-600">112%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Gross Revenue Retention</span>
                    <span className="text-lg font-bold text-purple-600">94.8%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Progress toward exit goal */}
          <Card className="border-gold-200 bg-gradient-to-r from-yellow-50 to-orange-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-yellow-600" />
                Exit Strategy Progress
              </CardTitle>
              <CardDescription>
                Progress toward $8.3M exit target in 24 months
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Current ARR</span>
                  <span className="text-lg font-bold">{formatCurrency(revenueMetrics.arr)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Target ARR (10x multiple)</span>
                  <span className="text-lg font-bold text-yellow-600">{formatCurrency(830000)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-yellow-400 to-orange-500 h-2 rounded-full" 
                    style={{ width: `${(revenueMetrics.arr / 830000) * 100}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {((revenueMetrics.arr / 830000) * 100).toFixed(1)}% of target
                  </span>
                  <span className="text-muted-foreground">
                    {formatCurrency(830000 - revenueMetrics.arr)} remaining
                  </span>
                </div>
                <div className="mt-4 p-3 bg-yellow-100 rounded-lg">
                  <div className="text-sm">
                    <strong>At current growth rate ({formatPercentage(revenueMetrics.growth)}/month):</strong>
                    <br />
                    Estimated time to target: <strong>18 months</strong>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}