/**
 * Turns a user-entered reference link into a safe, clickable href.
 *
 * Only http(s) destinations are ever allowed -- javascript:/data:/file:/vbscript:
 * and anything else are rejected outright (returns null, so callers can fall
 * back to plain text instead of rendering a link). A bare domain typed
 * without a protocol (e.g. "www.example.com") is treated as https:// rather
 * than left unclickable, since that's the common case for a pasted URL.
 */
export function toSafeHref(url) {
  if (!url) return null;
  const trimmed = String(url).trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  // No protocol at all (not `mailto:`, `javascript:`, etc.) -- only treat it
  // as a web address if it looks like one (has a dot, no whitespace).
  if (!/:/.test(trimmed) && /^[^\s]+\.[^\s]+$/.test(trimmed)) return `https://${trimmed}`;
  return null;
}
