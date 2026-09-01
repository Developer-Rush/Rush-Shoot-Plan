/**
 * Rich-text sanitizer for Script Scene content ONLY.
 *
 * Used both when pasting into a scene's RichTextArea and again right before
 * any stored scene content is rendered via dangerouslySetInnerHTML -- never
 * trust previously-saved data, sanitize at render time too. A wide but
 * fixed allow-list of formatting tags/attributes survives (bold, italic,
 * underline, strikethrough, headings, lists, alignment, color, font,
 * links, sub/sup); everything else -- scripts, event handlers, iframes,
 * unknown tags/attributes/CSS properties -- is stripped. Plain text with no
 * markup passes through unchanged (existing plain-text scenes keep working).
 */

const ALLOWED_TAGS = new Set([
  'B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'SUB', 'SUP',
  'P', 'DIV', 'BR', 'SPAN', 'A',
  'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'UL', 'OL', 'LI', 'BLOCKQUOTE',
]);

// Tags whose content is never meaningful text -- drop the element AND its
// children entirely, rather than unwrapping (which would leak raw code as
// inert text).
const DROP_ENTIRELY = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'NOSCRIPT']);

// Only these CSS properties survive on a `style` attribute, and only when
// their value doesn't reference url()/expression()/javascript: -- covers
// font family/size/weight/style, color, highlight, alignment, and the
// margin/padding Word & Google Docs use for list/paragraph indentation.
const ALLOWED_STYLE_PROPS = new Set([
  'color', 'background-color', 'font-family', 'font-size', 'font-weight',
  'font-style', 'text-decoration', 'text-align', 'margin-left', 'padding-left',
]);

const UNSAFE_STYLE_VALUE = /url\(|expression\(|javascript:/i;

// Word/Docs "Title"/Heading paragraph styles often carry a literal 26-40pt
// inline font-size (not just a <h1> tag) -- left unclamped, one pasted
// heading can visually blow out this compact scene field far past the rest
// of the form. Clamping keeps "this part is bigger than that part" true
// (mixed formatting still reads correctly) without letting an absolute
// size break the layout.
const FONT_SIZE_LIMITS = { px: [10, 22], pt: [8, 16], em: [0.7, 1.4], rem: [0.7, 1.4], '%': [70, 140] };

function clampFontSizeDecl(decl) {
  const match = decl.match(/^font-size:\s*(-?\d*\.?\d+)(px|pt|em|rem|%)$/i);
  if (!match) return decl;
  const [, numStr, unit] = match;
  const limits = FONT_SIZE_LIMITS[unit.toLowerCase()];
  if (!limits) return decl;
  const [min, max] = limits;
  const clamped = Math.min(Math.max(parseFloat(numStr), min), max);
  return `font-size: ${clamped}${unit}`;
}

function sanitizeStyle(value) {
  if (!value) return '';
  return value
    .split(';')
    .map((decl) => decl.trim())
    .filter(Boolean)
    .filter((decl) => {
      const [prop] = decl.split(':');
      return prop && ALLOWED_STYLE_PROPS.has(prop.trim().toLowerCase());
    })
    .filter((decl) => !UNSAFE_STYLE_VALUE.test(decl))
    .map((decl) => (decl.toLowerCase().startsWith('font-size') ? clampFontSizeDecl(decl) : decl))
    .join('; ');
}

function sanitizeHref(value) {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^(https?:|mailto:)/i.test(trimmed)) return trimmed;
  return null;
}

function sanitizeElement(el) {
  Array.from(el.attributes).forEach((attr) => {
    const name = attr.name.toLowerCase();
    if (el.tagName === 'A' && name === 'href') {
      const safeHref = sanitizeHref(attr.value);
      if (safeHref) {
        el.setAttribute('href', safeHref);
        el.setAttribute('rel', 'noopener noreferrer');
        el.setAttribute('target', '_blank');
      } else {
        el.removeAttribute(attr.name);
      }
      return;
    }
    if (name === 'style') {
      const clean = sanitizeStyle(attr.value);
      if (clean) el.setAttribute('style', clean);
      else el.removeAttribute('style');
      return;
    }
    // Every other attribute -- class, id, onclick/onerror/on*, data-*, etc.
    el.removeAttribute(attr.name);
  });
}

export function sanitizeRichText(html) {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(String(html), 'text/html');

  const clean = (node) => {
    Array.from(node.childNodes).forEach((child) => {
      if (child.nodeType === Node.ELEMENT_NODE) {
        if (DROP_ENTIRELY.has(child.tagName)) {
          node.removeChild(child);
          return;
        }
        clean(child);
        if (ALLOWED_TAGS.has(child.tagName)) {
          sanitizeElement(child);
        } else {
          while (child.firstChild) node.insertBefore(child.firstChild, child);
          node.removeChild(child);
        }
      } else if (child.nodeType !== Node.TEXT_NODE) {
        node.removeChild(child);
      }
    });
  };

  clean(doc.body);
  return doc.body.innerHTML;
}

/** Plain-text preview of a rich-text value, e.g. for use inside a heading/summary. */
export function richTextToPlain(html) {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(String(html), 'text/html');
  return doc.body.textContent || '';
}

/** True if the sanitized value has no real text (an empty edited field). */
export function isRichTextEmpty(html) {
  if (!html) return true;
  const doc = new DOMParser().parseFromString(String(html), 'text/html');
  return !doc.body.textContent.trim();
}
