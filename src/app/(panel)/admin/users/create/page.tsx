import { requireAdmin } from '@/lib/auth';
import CreateUserClient from './CreateUserClient';

export default async function CreateUserPage() {
  await requireAdmin();
  return (
    <div className="pt-16 px-6 lg:px-12 pb-8">
      <CreateUserClient />
    </div>
  );
}
