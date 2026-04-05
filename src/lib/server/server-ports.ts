interface PortMapping {
  Port?: number | string
  primary?: boolean
}

function parsePortMappings(portsJson: string | null | undefined): PortMapping[] | undefined {
  if (!portsJson) return undefined

  try {
    return JSON.parse(portsJson) as PortMapping[]
  } catch {
    return undefined
  }
}

function getPrimaryPortMapping(portsJson: string | null | undefined): PortMapping | undefined {
  const ports = parsePortMappings(portsJson)
  return ports?.find((port) => port?.primary) ?? ports?.[0]
}

function normalizePortCandidate(value: string) {
  return value.includes(':') ? value.split(':').filter(Boolean).pop() : value
}

function extractPortNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') return undefined

  const trimmed = value.trim()
  if (!trimmed) return undefined

  const parsed = Number(normalizePortCandidate(trimmed))
  return Number.isFinite(parsed) ? parsed : undefined
}

function stringifyPortBinding(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  if (typeof value !== 'string') return undefined

  const trimmed = value.trim()
  return trimmed || undefined
}

export function getPrimaryPortFromJson(portsJson: string | null | undefined): number | undefined {
  return extractPortNumber(getPrimaryPortMapping(portsJson)?.Port)
}

export function getPrimaryPortBindingFromJson(portsJson: string | null | undefined): string | undefined {
  return stringifyPortBinding(getPrimaryPortMapping(portsJson)?.Port)
}
