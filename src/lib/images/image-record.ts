type UnknownRecord = Record<string, unknown>

function stringifyJson(value: unknown, fallback: unknown) {
  return typeof value === 'string' ? value : JSON.stringify(value ?? fallback)
}

function normalizeDockerImages(value: unknown) {
  if (Array.isArray(value)) {
    return value
  }

  if (typeof value === 'object' && value !== null) {
    return Object.entries(value as Record<string, string>).map(([key, item]) => ({ [key]: item }))
  }

  return []
}

export function normalizeImageRecord(raw: UnknownRecord) {
  const dockerImages = raw.docker_images || raw.dockerImages

  return {
    name: String(raw.name ?? ''),
    description: String(raw.description ?? ''),
    author: String(raw.author ?? ''),
    authorName: String(raw.authorName ?? ''),
    startup: String(raw.startup ?? ''),
    stop: String(raw.stop ?? ''),
    startup_done: String(raw.startup_done ?? ''),
    config_files: String(raw.config_files ?? ''),
    meta: stringifyJson(raw.meta, {}),
    dockerImages: JSON.stringify(normalizeDockerImages(dockerImages)),
    info: stringifyJson(raw.info, {}),
    scripts: stringifyJson(raw.scripts, {}),
    variables: stringifyJson(raw.variables, []),
  }
}

export function buildDefaultImageData(raw: UnknownRecord) {
  return {
    name: String(raw.name ?? ''),
    description: String(raw.description ?? ''),
    author: String(raw.author ?? ''),
    authorName: String(raw.authorName ?? ''),
    startup: String(raw.startup ?? ''),
    stop: 'stop',
    startup_done: '',
    config_files: '',
    meta: JSON.stringify({ version: 'AL_V1' }),
    dockerImages: JSON.stringify([]),
    info: JSON.stringify({ features: [] }),
    scripts: JSON.stringify({}),
    variables: JSON.stringify([]),
  }
}

function buildGeneralImageUpdate(body: UnknownRecord) {
  if (!body.name || !body.startup) {
    throw new Error('Name and startup are required.')
  }

  return {
    name: body.name,
    description: body.description || '',
    author: body.author || '',
    startup: body.startup,
    stop: body.stop || 'stop',
    startup_done: body.startup_done || '',
  }
}

function buildJsonFieldUpdate(field: 'dockerImages' | 'variables', value: unknown) {
  return { [field]: stringifyJson(value, []) }
}

function buildRawImageUpdate(
  body: UnknownRecord,
  existing: {
    name: string | null
    description: string | null
    author: string | null
    authorName: string | null
    startup: string | null
    stop: string | null
    startup_done: string | null
    config_files: string | null
  },
) {
  const { section: _section, ...rest } = body
  void _section

  return {
    name: rest.name ?? existing.name ?? '',
    description: rest.description ?? existing.description,
    author: rest.author ?? existing.author,
    authorName: rest.authorName ?? existing.authorName,
    startup: rest.startup ?? existing.startup,
    stop: rest.stop ?? existing.stop,
    startup_done: rest.startup_done ?? existing.startup_done,
    config_files: rest.config_files ?? existing.config_files,
    dockerImages: stringifyJson(rest.dockerImages, []),
    variables: stringifyJson(rest.variables, []),
    scripts: stringifyJson(rest.scripts, {}),
    info: stringifyJson(rest.info, {}),
  }
}

function buildFullImageUpdate(body: UnknownRecord) {
  if (!body.name || !body.startup) {
    throw new Error('Name and startup are required.')
  }

  return {
    name: body.name,
    description: body.description || '',
    author: body.author || '',
    authorName: body.authorName || '',
    startup: body.startup,
    stop: body.stop || 'stop',
    startup_done: body.startup_done || '',
    config_files: body.config_files || '',
    dockerImages: stringifyJson(body.dockerImages, []),
    variables: stringifyJson(body.variables, []),
    scripts: stringifyJson(body.scripts, {}),
    info: stringifyJson(body.info, {}),
  }
}

export function buildImageUpdateData(
  body: UnknownRecord,
  existing: {
    name: string | null
    description: string | null
    author: string | null
    authorName: string | null
    startup: string | null
    stop: string | null
    startup_done: string | null
    config_files: string | null
    dockerImages: string | null
    variables: string | null
    scripts: string | null
    info: string | null
  },
) {
  const section = body.section as string | undefined

  if (section === 'general') {
    return buildGeneralImageUpdate(body)
  }

  if (section === 'docker') {
    return buildJsonFieldUpdate('dockerImages', body.dockerImages)
  }

  if (section === 'variables') {
    return buildJsonFieldUpdate('variables', body.variables)
  }

  if (section === 'raw') {
    return buildRawImageUpdate(body, existing)
  }

  return buildFullImageUpdate(body)
}
