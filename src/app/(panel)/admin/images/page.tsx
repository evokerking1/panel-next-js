import { requireAdmin } from '@/lib/auth';
import prisma from '@/lib/prisma';
import PageTitle from '@/components/PageTitle';
import ImagesClient from './ImagesClient';

export const dynamic = 'force-dynamic';

export default async function AdminImagesPage() {
  await requireAdmin();
  const images = await prisma.images.findMany({ orderBy: { name: 'asc' } });

  return (
    <div className="pt-16 px-6 lg:px-12 pb-8">
      <PageTitle title="Images" subtitle="Manage docker images and egg configurations." />
      <ImagesClient
        images={images.map((i) => ({
          id: i.id,
          UUID: i.UUID,
          name: i.name ?? '',
          description: i.description ?? '',
          author: i.author ?? '',
          createdAt: i.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
