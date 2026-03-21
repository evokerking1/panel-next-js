import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import RegisterForm from './RegisterForm';

interface Props {
  searchParams: Promise<{ err?: string }>;
}

export default async function RegisterPage({ searchParams }: Props) {
  const session = await getSession();
  if (session.user) redirect('/dashboard');

  const params = await searchParams;
  const userCount = await prisma.users.count();
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });

  const isFirst = userCount === 0;
  if (!isFirst && !settings?.allowRegistration) {
    redirect('/login?err=registration_disabled');
  }

  return (
    <RegisterForm
      err={params.err}
      isFirst={isFirst}
      settings={{
        title: settings?.title ?? 'AirLink',
        logo: settings?.logo ?? null,
        registerWallpaper: settings?.registerWallpaper ?? null,
      }}
    />
  );
}
