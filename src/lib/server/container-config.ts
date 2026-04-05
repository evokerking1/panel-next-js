type VariableEntry = {
  env_variable?: string
  env?: string
  value?: unknown
  default_value?: unknown
}

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) {
    return fallback
  }

  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

export function parseVariableEntries(variablesJson: string | null | undefined) {
  return parseJson<VariableEntry[]>(variablesJson, [])
}

export function buildServerEnvVariables(variablesJson: string | null | undefined) {
  return parseVariableEntries(variablesJson).reduce<Record<string, string>>((env, variable) => {
    const key = variable.env_variable || variable.env
    if (key) {
      env[key] = String(variable.value ?? variable.default_value ?? '')
    }
    return env
  }, {})
}

export function resolveDockerImageValue(value: string | null | undefined): string {
  if (!value) {
    return ''
  }

  try {
    const parsed = JSON.parse(value)
    if (Array.isArray(parsed)) {
      return String(parsed[0] ?? '')
    }
    if (parsed && typeof parsed === 'object') {
      return String(Object.values(parsed)[0] ?? '')
    }
  } catch {}

  return value
}

export function parseJsonArray<T>(value: string | null | undefined) {
  return parseJson<T[]>(value, [])
}
