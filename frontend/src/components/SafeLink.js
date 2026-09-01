import React from 'react';
import { toSafeHref } from '../utils/url';

/**
 * Renders a reference-link value (Reel.reference_link, PhotoReferenceLink.url,
 * ...) as a real clickable hyperlink to the exact URL entered -- falling
 * back to plain text (or `fallback`) when the value isn't a safe http(s)
 * destination, instead of ever producing a dead/dummy/javascript: link.
 */
export default function SafeLink({ url, fallback = '—', style, className }) {
  const href = toSafeHref(url);
  if (!href) return <>{url || fallback}</>;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" style={style} className={className}>
      {url}
    </a>
  );
}
