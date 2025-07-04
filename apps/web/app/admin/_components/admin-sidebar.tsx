'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { LayoutDashboard, Users, BarChart3, AlertTriangle, DollarSign, Activity } from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
} from '@kit/ui/shadcn-sidebar';

import { AppLogo } from '~/components/app-logo';
import { ProfileAccountDropdownContainer } from '~/components/personal-account-dropdown-container';

export function AdminSidebar() {
  const path = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className={'m-2'}>
        <AppLogo href={'/admin'} className="max-w-full" />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Super Admin</SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuButton isActive={path === '/admin'} asChild>
                <Link className={'flex gap-2.5'} href={'/admin'}>
                  <LayoutDashboard className={'h-4'} />
                  <span>Dashboard</span>
                </Link>
              </SidebarMenuButton>

              <SidebarMenuButton
                isActive={path.includes('/admin/accounts')}
                asChild
              >
                <Link
                  className={'flex size-full gap-2.5'}
                  href={'/admin/accounts'}
                >
                  <Users className={'h-4'} />
                  <span>Accounts</span>
                </Link>
              </SidebarMenuButton>

              <SidebarMenuButton
                isActive={path.includes('/admin/analytics')}
                asChild
              >
                <Link
                  className={'flex size-full gap-2.5'}
                  href={'/admin/analytics'}
                >
                  <BarChart3 className={'h-4'} />
                  <span>Analytics</span>
                </Link>
              </SidebarMenuButton>

              <SidebarMenuButton
                isActive={path.includes('/admin/revenue')}
                asChild
              >
                <Link
                  className={'flex size-full gap-2.5'}
                  href={'/admin/revenue'}
                >
                  <DollarSign className={'h-4'} />
                  <span>Revenue</span>
                </Link>
              </SidebarMenuButton>

              <SidebarMenuButton
                isActive={path.includes('/admin/errors')}
                asChild
              >
                <Link
                  className={'flex size-full gap-2.5'}
                  href={'/admin/errors'}
                >
                  <AlertTriangle className={'h-4'} />
                  <span>Errors</span>
                </Link>
              </SidebarMenuButton>

              <SidebarMenuButton
                isActive={path.includes('/admin/monitoring')}
                asChild
              >
                <Link
                  className={'flex size-full gap-2.5'}
                  href={'/admin/monitoring'}
                >
                  <Activity className={'h-4'} />
                  <span>Monitoring</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <ProfileAccountDropdownContainer />
      </SidebarFooter>
    </Sidebar>
  );
}
