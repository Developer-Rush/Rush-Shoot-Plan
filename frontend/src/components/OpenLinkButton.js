import React from 'react';
import { toSafeHref } from '../utils/url';

/**
 * The "🔗 Open link" affordance shown below a URL field (Reference link,
 * Map URL, ...) once it has a value -- same safe-URL validation, same
 * target="_blank" + rel="noopener noreferrer", same styling everywhere it's
 * used, so every URL field in the wizard behaves identically.
 */
export default function OpenLinkButton({ url }) {
  if (!url) return null;
  const href = toSafeHref(url);
  if (!href) {
    return (
      <div style={{ marginTop: 6, fontSize: 12, color: 'rgba(0,0,0,.4)' }}>
        Not a valid web link — must start with http:// or https://
      </div>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{ display: 'inline-block', marginTop: 6, fontSize: 12.5, color: '#1a5fd0', textDecoration: 'underline', wordBreak: 'break-all' }}
    >
      🔗 Open link
    </a>
  );
}
