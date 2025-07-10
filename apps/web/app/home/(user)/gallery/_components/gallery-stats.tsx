'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Sparkles, Clock, Calendar, TrendingUp } from 'lucide-react';

interface GalleryStatsProps {
  stats: {
    total: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
}

export function GalleryStats({ stats }: GalleryStatsProps) {
  const statCards = [
    {
      title: 'Total Generations',
      value: stats.total,
      icon: Sparkles,
      description: 'All time',
      trend: null,
    },
    {
      title: 'Today',
      value: stats.today,
      icon: Clock,
      description: 'Last 24 hours',
      trend: stats.today > 0 ? '+' + stats.today : null,
    },
    {
      title: 'This Week',
      value: stats.thisWeek,
      icon: Calendar,
      description: 'Last 7 days',
      trend: stats.thisWeek > 0 ? '+' + stats.thisWeek : null,
    },
    {
      title: 'This Month',
      value: stats.thisMonth,
      icon: TrendingUp,
      description: 'Last 30 days',
      trend: stats.thisMonth > 0 ? '+' + stats.thisMonth : null,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
              {stat.trend && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  {stat.trend} new
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}