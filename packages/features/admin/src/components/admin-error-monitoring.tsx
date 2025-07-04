'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';

interface AdminErrorMonitoringProps {
  errors: Array<{
    error: string;
    count: number;
    severity: string;
    lastOccurred: string;
  }>;
}

export function AdminErrorMonitoring({ errors }: AdminErrorMonitoringProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Error Monitoring</h2>
        <p className="text-muted-foreground">
          Track, monitor, and resolve application errors and issues
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Error Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Error monitoring dashboard - Currently in development</p>
          {errors.length > 0 && (
            <div className="mt-4">
              <p>Recent errors: {errors.length}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}