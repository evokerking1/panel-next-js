import { requireAdmin } from '@/lib/auth';
import PageTitle from '@/components/PageTitle';

export default async function Page() {
  await requireAdmin();
  return (
    <div className="pt-16 px-6 lg:px-12 pb-8">
      <PageTitle title="Node Stats" subtitle="Live resource usage for this node." />
      <p className="text-sm text-neutral-500">Coming soon.</p>
    </div>
  );
}
