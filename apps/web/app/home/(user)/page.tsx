import { Suspense } from 'react';
import { PageBody } from '@kit/ui/page';
import { Trans } from '@kit/ui/trans';

import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';
import { requireUserInServerComponent } from '~/lib/server/require-user-in-server-component';

// local imports
import { HomeLayoutPageHeader } from './_components/home-page-header';
import { EnhancedHomeContent } from './_components/enhanced-home-content';

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

  return (
    <>
      <HomeLayoutPageHeader
        title={<Trans i18nKey={'common:routes.home'} />}
        description={<Trans i18nKey={'common:homeTabDescription'} />}
      />

      <PageBody>
        <Suspense fallback={<div className="p-8 text-center">Loading your dashboard...</div>}>
          <EnhancedHomeContent 
            user={user} 
            searchParams={params}
          />
        </Suspense>
      </PageBody>
    </>
  );
}

export default withI18n(UserHomePage);
