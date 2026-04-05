export const DEFAULT_PANEL_SETTINGS = {
  title: 'Airlink',
  logo: '/assets/logo.png',
  favicon: '/assets/favicon.ico',
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
}

function parseBoolean(value: unknown) {
  return value === true || value === 'true'
}

function parseInteger(value: unknown) {
  return Number.parseInt(String(value), 10)
}

function integerOrNull(value: unknown) {
  return value === '' || value === null ? null : parseInteger(value)
}

function optionalApiKey(value: unknown) {
  if (typeof value !== 'string') {
    return undefined
  }
  return value.trim() || null
}

export function buildGeneralSettings(body: Record<string, unknown>) {
  const data: Record<string, unknown> = {
    title: body.title || 'Airlink',
    description: body.description || '',
    allowRegistration: parseBoolean(body.allowRegistration),
    uploadLimit: parseInteger(body.uploadLimit) || 100,
    loginWallpaper: typeof body.loginWallpaper === 'string' ? body.loginWallpaper.trim() || null : null,
    registerWallpaper: typeof body.registerWallpaper === 'string' ? body.registerWallpaper.trim() || null : null,
    lightTheme: typeof body.lightTheme === 'string' ? body.lightTheme : 'default',
    darkTheme: typeof body.darkTheme === 'string' ? body.darkTheme : 'default',
  }

  const apiKey = optionalApiKey(body.virusTotalApiKey)
  if (apiKey !== undefined) {
    data.virusTotalApiKey = apiKey
  }

  return data
}

export function buildSecuritySettings(body: Record<string, unknown>) {
  const rateLimitRpm = parseInteger(body.rateLimitRpm)
  const loginMaxAttempts = parseInteger(body.loginMaxAttempts)
  const loginLockoutMinutes = parseInteger(body.loginLockoutMinutes)

  if (Number.isNaN(rateLimitRpm) || rateLimitRpm < 1 || rateLimitRpm > 10000) {
    throw new Error('RPM must be between 1 and 10000.')
  }
  if (Number.isNaN(loginMaxAttempts) || loginMaxAttempts < 1 || loginMaxAttempts > 100) {
    throw new Error('Max attempts must be between 1 and 100.')
  }
  if (Number.isNaN(loginLockoutMinutes) || loginLockoutMinutes < 1 || loginLockoutMinutes > 1440) {
    throw new Error('Lockout must be between 1 and 1440 minutes.')
  }

  const data: Record<string, unknown> = {
    rateLimitEnabled: parseBoolean(body.rateLimitEnabled),
    rateLimitRpm,
    loginMaxAttempts,
    loginLockoutMinutes,
    enforceDaemonHttps: parseBoolean(body.enforceDaemonHttps),
    behindReverseProxy: parseBoolean(body.behindReverseProxy),
    hashApiKeys: parseBoolean(body.hashApiKeys),
  }

  const apiKey = optionalApiKey(body.virusTotalApiKey)
  if (apiKey !== undefined) {
    data.virusTotalApiKey = apiKey
  }

  return data
}

export function buildServerPolicySettings(body: Record<string, unknown>) {
  const defaultServerLimit = parseInteger(body.defaultServerLimit)
  const defaultMaxMemory = parseInteger(body.defaultMaxMemory)
  const defaultMaxCpu = parseInteger(body.defaultMaxCpu)
  const defaultMaxStorage = parseInteger(body.defaultMaxStorage)

  if (Number.isNaN(defaultServerLimit) || defaultServerLimit < 0) {
    throw new Error('Server limit must be 0 or greater.')
  }
  if (Number.isNaN(defaultMaxMemory) || defaultMaxMemory < 128) {
    throw new Error('Max memory must be at least 128 MB.')
  }
  if (Number.isNaN(defaultMaxCpu) || defaultMaxCpu < 10) {
    throw new Error('Max CPU must be at least 10%.')
  }
  if (Number.isNaN(defaultMaxStorage) || defaultMaxStorage < 1) {
    throw new Error('Max storage must be at least 1 GB.')
  }

  return {
    allowUserCreateServer: parseBoolean(body.allowUserCreateServer),
    allowUserDeleteServer: parseBoolean(body.allowUserDeleteServer),
    defaultServerLimit,
    defaultMaxMemory,
    defaultMaxCpu,
    defaultMaxStorage,
  }
}

export function buildUserLimitUpdates(body: Record<string, unknown>) {
  const data: Record<string, unknown> = {}

  if (body.serverLimit !== undefined) data.serverLimit = integerOrNull(body.serverLimit)
  if (body.maxMemory !== undefined) data.maxMemory = integerOrNull(body.maxMemory)
  if (body.maxCpu !== undefined) data.maxCpu = integerOrNull(body.maxCpu)
  if (body.maxStorage !== undefined) data.maxStorage = integerOrNull(body.maxStorage)

  return data
}
