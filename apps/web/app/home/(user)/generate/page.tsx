import { Suspense } from 'react';
import { PageBody } from '@kit/ui/page';
import { Trans } from '@kit/ui/trans';

import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';
import { requireUserInServerComponent } from '~/lib/server/require-user-in-server-component';

import { HomeLayoutPageHeader } from '../_components/home-page-header';
import { AuthenticatedGenerateClient } from './_components/authenticated-generate-client';

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();
  const title = i18n.t('account:generatePage');

  return {
    title: title || 'Generate AI Companions',
  };
};

async function UserGeneratePage() {
  const user = await requireUserInServerComponent();

  return (
    <>
      <HomeLayoutPageHeader
        title={<Trans i18nKey={'generate:title'} defaults="Generate AI Companions" />}
        description={<Trans i18nKey={'generate:description'} defaults="Create your perfect AI companion with unlimited generations" />}
      />

      <PageBody>
        <Suspense fallback={<div className="p-8 text-center">Loading generation interface...</div>}>
          <AuthenticatedGenerateClient user={user} />
        </Suspense>
      </PageBody>
    </>
  );
}

export default withI18n(UserGeneratePage);