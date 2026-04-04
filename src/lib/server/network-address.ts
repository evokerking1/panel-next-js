export function normalizeHost(address: string): string {
  const normalized = address.trim();

  if (!normalized) return '127.0.0.1';
  if (normalized === '0.0.0.0') return '127.0.0.1';
  if (normalized === '::' || normalized === '[::]') return '[::1]';

  try {
    const parsed = new URL(
      /^[a-z][a-z0-9+.-]*:\/\//i.test(normalized) ? normalized : `http://${normalized}`,
    );
    let hostname = parsed.hostname;
    if (hostname === '0.0.0.0') hostname = '127.0.0.1';
    if (hostname === '::') hostname = '::1';
    if (hostname.includes(':')) return `[${hostname}]`;
    return hostname;
  } catch {
    if (normalized.startsWith('[')) {
      const closingBracketIndex = normalized.indexOf(']');
      if (closingBracketIndex !== -1) {
        const bracketed = normalized.slice(0, closingBracketIndex + 1);
        return bracketed === '[::]' ? '[::1]' : bracketed;
      }
    }

    const colonCount = normalized.split(':').length - 1;
    if (colonCount === 1) return normalized.split(':')[0];
    return normalized;
  }
}
