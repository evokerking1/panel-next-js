export interface PortMapping {
  Port?: number | string
  primary?: boolean
}

function extractPortNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value !== 'string') {
    return undefined
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return undefined
  }

  const candidate = trimmed.includes(':')
    ? trimmed.split(':').filter(Boolean).pop()
    : trimmed

  const parsed = Number(candidate)
  return Number.isFinite(parsed) ? parsed : undefined
}

export function getPrimaryPortFromJson(portsJson: string | null | undefined): number | undefined {
  if (!portsJson) return undefined

  try {
    const ports = JSON.parse(portsJson) as PortMapping[]
    const primary = ports.find((port) => port?.primary) ?? ports[0]
    return extractPortNumber(primary?.Port)
  } catch {
    return undefined
  }
}
