import { requireAuthWithUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { uiComponentStore } from '@/lib/uiComponents';
import Sidebar from '@/components/Sidebar';
import ThemeToggle from '@/components/ThemeToggle';
import PageLoader from '@/components/PageLoader';
import ToastSystem from '@/components/ToastSystem';

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuthWithUser();
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });

  const regularMenuItems = uiComponentStore.getSidebarItems(undefined, false);

  const settingsForSidebar = {
    title: settings?.title ?? 'AirLink',
    logo: settings?.logo ?? '/assets/logo.png',
  };

  const userForSidebar = {
    id: user.id,
    username: user.username ?? '',
    description: user.description ?? '',
    isAdmin: user.isAdmin,
    avatar: user.avatar ?? null,
  };

  return (
    <>
      <ThemeToggle />
      <PageLoader title={settings?.title ?? 'AirLink'} />
      <ToastSystem />

      <Sidebar
        user={userForSidebar}
        settings={settingsForSidebar}
        regularMenuItems={regularMenuItems}
      />

      <main className="lg:pl-56" id="page-content">
        {children}
      </main>
    </>
  );
}
