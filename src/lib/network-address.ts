export function normalizeHost(address: string): string {
  const normalized = address.trim();

  try {
    const parsed = new URL(
      /^[a-z][a-z0-9+.-]*:\/\//i.test(normalized) ? normalized : `http://${normalized}`,
    );
    if (parsed.hostname.includes(':')) return `[${parsed.hostname}]`;
    return parsed.hostname;
  } catch {
    if (normalized.startsWith('[')) {
      const closingBracketIndex = normalized.indexOf(']');
      if (closingBracketIndex !== -1) return normalized.slice(0, closingBracketIndex + 1);
    }

    const colonCount = normalized.split(':').length - 1;
    if (colonCount === 1) return normalized.split(':')[0];
    return normalized;
  }
}
