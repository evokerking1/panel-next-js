export interface PortMapping {
  Port?: number | string
  primary?: boolean
}

function getPrimaryPortMapping(portsJson: string | null | undefined): PortMapping | undefined {
  if (!portsJson) return undefined

  try {
    const ports = JSON.parse(portsJson) as PortMapping[]
    return ports.find((port) => port?.primary) ?? ports[0]
  } catch {
    return undefined
  }
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
  return extractPortNumber(getPrimaryPortMapping(portsJson)?.Port)
}

export function getPrimaryPortBindingFromJson(portsJson: string | null | undefined): string | undefined {
  const rawPort = getPrimaryPortMapping(portsJson)?.Port
  if (rawPort === undefined || rawPort === null) {
    return undefined
  }

  if (typeof rawPort === 'number' && Number.isFinite(rawPort)) {
    return String(rawPort)
  }

  if (typeof rawPort !== 'string') {
    return undefined
  }

  const trimmed = rawPort.trim()
  return trimmed || undefined
}
