import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import LoginForm from './LoginForm';

interface Props {
  searchParams: Promise<{ err?: string; wait?: string }>;
}

export default async function LoginPage({ searchParams }: Props) {
  const session = await getSession();
  if (session.user) redirect('/dashboard');

  const params = await searchParams;
  const userCount = await prisma.users.count();
  if (userCount === 0) redirect('/register');

  const settings = await prisma.settings.findUnique({ where: { id: 1 } });

  return (
    <LoginForm
      err={params.err}
      wait={params.wait}
      settings={{
        title: settings?.title ?? 'AirLink',
        logo: settings?.logo ?? null,
        loginWallpaper: settings?.loginWallpaper ?? null,
        allowRegistration: settings?.allowRegistration ?? false,
      }}
    />
  );
}
