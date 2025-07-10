import { Suspense } from 'react';

import { PageBody } from '@kit/ui/page';
import { Trans } from '@kit/ui/trans';
import { Spinner } from '@kit/ui/spinner';

import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';
import { requireUserInServerComponent } from '~/lib/server/require-user-in-server-component';

import { HomeLayoutPageHeader } from '../_components/home-page-header';
import { loadGalleryPageData } from './_lib/server/gallery-page.loader';
import { GalleryGrid } from './_components/gallery-grid';
import { GalleryStats } from './_components/gallery-stats';

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();
  const title = i18n.t('account:galleryTab') || 'Gallery';

  return {
    title,
  };
};

interface GalleryPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    character?: string;
    period?: 'today' | 'week' | 'month' | 'all';
  }>;
}

async function GalleryPage({ searchParams }: GalleryPageProps) {
  const user = await requireUserInServerComponent();
  const params = await searchParams;

  const page = params.page ? parseInt(params.page, 10) : 1;
  const search = params.search || undefined;
  const character = params.character || undefined;
  const period = params.period || 'all';

  const data = await loadGalleryPageData(
    user.id,
    page,
    20,
    search,
    character,
    period
  );

  return (
    <>
      <HomeLayoutPageHeader
        title={<Trans i18nKey={'common:routes.gallery'} defaults="Gallery" />}
        description={<Trans i18nKey={'common:galleryDescription'} defaults="View and manage your AI generations" />}
      />

      <PageBody>
        <div className="space-y-6">
          <Suspense fallback={<Spinner className="mx-auto" />}>
            <GalleryStats stats={data.stats} />
          </Suspense>

          <Suspense fallback={<Spinner className="mx-auto" />}>
            <GalleryGrid
              generations={data.generations}
              characterCounts={data.characterCounts}
              currentPage={page}
              searchParams={{
                search,
                character,
                period,
              }}
            />
          </Suspense>
        </div>
      </PageBody>
    </>
  );
}

export default withI18n(GalleryPage);