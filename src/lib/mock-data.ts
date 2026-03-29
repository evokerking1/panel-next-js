// mock data so the UI has stuff to render - swap this out for real API calls later

export const mockUser = {
  id: 1,
  username: 'thavanish',
  email: 'admin@airlink.dev',
  isAdmin: true,
  description: 'Panel Administrator',
  avatar: null as string | null,
  credits: 500,
}

export const mockSettings = {
  title: 'Airlink',
  logo: '',
  favicon: '',
  allowRegistration: true,
  loginWallpaper: 'https://i.imgur.com/j9BodUY.jpeg',
  registerWallpaper: 'https://i.imgur.com/8G5eRWX.jpeg',
}

export const mockServers = [
  {
    UUID: 'abc123de-f456-7890-abcd-ef1234567890',
    name: 'Minecraft SMP',
    description: 'Main survival server',
    status: 'running' as const,
    ramUsage: 72,
    cpuUsage: 14,
    ramUsed: '1.4GB',
    node: { name: 'US-East-1', address: '192.168.1.10' },
    owner: { username: 'thavanish', avatar: null as string | null },
    Ports: JSON.stringify([{ primary: true, Port: '0:25565' }]),
    Memory: 2048,
    Cpu: 2,
    Storage: 20,
    Suspended: false,
    image: { name: 'Minecraft Java' },
    createdAt: new Date('2024-01-15').toISOString(),
  },
  {
    UUID: 'bcd234ef-g567-8901-bcde-fg2345678901',
    name: 'Valheim World',
    description: 'Viking survival game',
    status: 'stopped' as const,
    ramUsage: 0,
    cpuUsage: 0,
    ramUsed: '0MB',
    node: { name: 'US-West-2', address: '192.168.1.20' },
    owner: { username: 'thavanish', avatar: null as string | null },
    Ports: JSON.stringify([{ primary: true, Port: '0:2456' }]),
    Memory: 4096,
    Cpu: 4,
    Storage: 50,
    Suspended: false,
    image: { name: 'Valheim' },
    createdAt: new Date('2024-02-20').toISOString(),
  },
  {
    UUID: 'cde345fg-h678-9012-cdef-gh3456789012',
    name: 'CS2 Competitive',
    description: 'Casual competitive server',
    status: 'running' as const,
    ramUsage: 45,
    cpuUsage: 31,
    ramUsed: '900MB',
    node: { name: 'EU-Central', address: '10.0.0.5' },
    owner: { username: 'player2', avatar: null as string | null },
    Ports: JSON.stringify([{ primary: true, Port: '0:27015' }]),
    Memory: 2048,
    Cpu: 2,
    Storage: 30,
    Suspended: false,
    image: { name: 'CS2' },
    createdAt: new Date('2024-03-01').toISOString(),
  },
]

export const mockFolders = [
  {
    id: 1,
    name: 'Game Servers',
    members: [{ serverUUID: 'abc123de-f456-7890-abcd-ef1234567890' }],
  },
]

export const mockNodes = [
  {
    id: 1,
    name: 'US-East-1',
    address: '192.168.1.10',
    port: 8080,
    status: 'Online' as const,
    instances: [mockServers[0]],
    ram: 16384,
    cpu: 8,
    disk: 500,
  },
  {
    id: 2,
    name: 'US-West-2',
    address: '192.168.1.20',
    port: 8080,
    status: 'Online' as const,
    instances: [mockServers[1]],
    ram: 32768,
    cpu: 16,
    disk: 1000,
  },
  {
    id: 3,
    name: 'EU-Central',
    address: '10.0.0.5',
    port: 8080,
    status: 'Offline' as const,
    instances: [],
    ram: 8192,
    cpu: 4,
    disk: 250,
  },
]

export const mockUsers = [
  { id: 1, username: 'thavanish', email: 'admin@airlink.dev', isAdmin: true, servers: 2, createdAt: '2024-01-01' },
  { id: 2, username: 'player2', email: 'player2@example.com', isAdmin: false, servers: 1, createdAt: '2024-02-01' },
  { id: 3, username: 'testuser', email: 'test@example.com', isAdmin: false, servers: 0, createdAt: '2024-03-01' },
]

export const mockImages = [
  { id: 1, name: 'Minecraft Java', tag: 'ghcr.io/airlinklabs/minecraft-java:latest', category: 'Game Servers' },
  { id: 2, name: 'Valheim', tag: 'ghcr.io/airlinklabs/valheim:latest', category: 'Game Servers' },
  { id: 3, name: 'CS2', tag: 'ghcr.io/airlinklabs/cs2:latest', category: 'Game Servers' },
]

export const mockApiKeys = [
  { id: 1, name: 'Main API Key', key: 'al-xxxxxxxxxxxxxxxxxxxxx', createdAt: '2024-01-15', lastUsed: '2024-03-20' },
]

export const mockAdminStats = {
  userCount: mockUsers.length,
  instanceCount: mockServers.length,
  nodeCount: mockNodes.length,
  imageCount: mockImages.length,
  airlinkVersion: '1.0.0',
}

// ~ https://github.com/thavanish made this shitty code
