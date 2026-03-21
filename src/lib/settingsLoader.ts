import prisma from './prisma';

export async function settingsLoader() {
  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;

    const settings = await prisma.settings.findUnique({ where: { id: 1 } });
    if (!settings) {
      await prisma.settings.create({
        data: {
          title: 'AirLink',
          description: 'AirLink is a free and open source project by AirlinkLabs',
          logo: '../assets/logo.png',
          theme: 'default',
          lightTheme: 'default',
          darkTheme: 'default',
          language: 'en',
          allowRegistration: false,
          uploadLimit: 100,
          rateLimitEnabled: true,
          rateLimitRpm: 100,
          bannedIps: '[]',
          allowUserCreateServer: false,
          allowUserDeleteServer: false,
          defaultServerLimit: 0,
          defaultMaxMemory: 512,
          defaultMaxCpu: 100,
          defaultMaxStorage: 5,
          loginMaxAttempts: 5,
          loginLockoutMinutes: 15,
          enforceDaemonHttps: false,
          behindReverseProxy: false,
          hashApiKeys: false,
        },
      });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('settingsLoader: Database connection error:', message);
    throw error;
  }
}
