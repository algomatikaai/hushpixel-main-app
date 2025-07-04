'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';

interface AdminUserManagementProps {
  users: Array<{
    id: string;
    email: string;
    status: string;
    lastActive: string;
  }>;
}

export function AdminUserManagement({ users }: AdminUserManagementProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">User Management</h2>
        <p className="text-muted-foreground">
          Manage user accounts, subscriptions, and access
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <p>User management dashboard - Currently in development</p>
          {users.length > 0 && (
            <div className="mt-4">
              <p>Total users: {users.length}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}