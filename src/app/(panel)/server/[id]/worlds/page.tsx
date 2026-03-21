import { requireServerAccess } from '@/lib/auth';
import { notFound } from 'next/navigation';

interface Props { params: Promise<{ id: string }> }

export default async function WorldsPage({ params }: Props) {
  const { id } = await params;
  await requireServerAccess(id);
  return (
    <div className="py-8 text-center">
      <p className="text-sm text-neutral-500">World management coming soon.</p>
    </div>
  );
}
