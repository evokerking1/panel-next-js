import { requireAdmin } from '@/lib/auth';
import prisma from '@/lib/prisma';
import PageTitle from '@/components/PageTitle';
import AdminSettingsClient from './AdminSettingsClient';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  await requireAdmin();
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });

  const s = settings!;
  return (
    <div className="pt-16 px-6 lg:px-12 pb-8">
      <PageTitle title="Settings" subtitle="Configure your panel." />
      <AdminSettingsClient
        settings={{
          title: s.title,
          description: s.description,
          logo: s.logo,
          language: s.language,
          allowRegistration: s.allowRegistration,
          uploadLimit: s.uploadLimit,
          rateLimitEnabled: s.rateLimitEnabled,
          rateLimitRpm: s.rateLimitRpm,
          allowUserCreateServer: s.allowUserCreateServer,
          allowUserDeleteServer: s.allowUserDeleteServer,
          defaultServerLimit: s.defaultServerLimit,
          defaultMaxMemory: s.defaultMaxMemory,
          defaultMaxCpu: s.defaultMaxCpu,
          defaultMaxStorage: s.defaultMaxStorage,
          loginMaxAttempts: s.loginMaxAttempts,
          loginLockoutMinutes: s.loginLockoutMinutes,
          enforceDaemonHttps: s.enforceDaemonHttps,
          behindReverseProxy: s.behindReverseProxy,
          hashApiKeys: s.hashApiKeys,
        }}
      />
    </div>
  );
}
