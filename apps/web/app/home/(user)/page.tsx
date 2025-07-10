import { Suspense } from 'react';
import { PageBody } from '@kit/ui/page';
import { Trans } from '@kit/ui/trans';
import { Spinner } from '@kit/ui/spinner';

import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';
import { requireUserInServerComponent } from '~/lib/server/require-user-in-server-component';

// local imports
import { HomeLayoutPageHeader } from './_components/home-page-header';
import { EnhancedHomeContent } from './_components/enhanced-home-content';
import { loadUserAnalytics } from './_lib/server/analytics.service';

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();
  const title = i18n.t('account:homePage');

  return {
    title,
  };
};

interface HomePageProps {
  searchParams: Promise<{ 
    welcome?: string; 
    character?: string; 
    image?: string;
    error?: string;
    message?: string;
  }>;
}

async function UserHomePage({ searchParams }: HomePageProps) {
  const user = await requireUserInServerComponent();
  const params = await searchParams;
  
  // Load analytics data
  const analytics = await loadUserAnalytics(user.id);

  return (
    <>
      <HomeLayoutPageHeader
        title={<Trans i18nKey={'common:routes.home'} />}
        description={<Trans i18nKey={'common:homeTabDescription'} />}
      />

      <PageBody>
        <EnhancedHomeContent 
          user={user} 
          searchParams={params}
          analytics={analytics}
        />
      </PageBody>
    </>
  );
}

export default withI18n(UserHomePage);
