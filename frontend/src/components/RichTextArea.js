import React, { useRef, useEffect } from 'react';
import { sanitizeRichText } from '../utils/richText';
import './RichTextArea.css';

function escapeText(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * contentEditable rich-text field for Script Scene content ONLY (see
 * StepReels.js) -- every other text field in the app stays a plain
 * `<textarea>`. Stores its value as sanitized HTML instead of plain text
 * (see utils/richText.js), so formatting pasted from Word/Docs/ChatGPT/
 * websites -- fonts, bold/italic/underline/strikethrough, headings, lists,
 * alignment, color, links -- survives instead of being flattened to plain
 * text, while scripts/handlers/unknown markup are stripped.
 *
 * Follows the same defaultValue/onBlur "commit on blur" pattern the rest of
 * this wizard's fields already use, rather than pushing a value on every
 * keystroke.
 */
export default function RichTextArea({ value, onBlur, placeholder, rows = 3, style }) {
  const ref = useRef(null);
  const focused = useRef(false);

  useEffect(() => {
    if (ref.current && !focused.current) {
      ref.current.innerHTML = sanitizeRichText(value || '');
    }
  }, [value]);

  const handlePaste = (e) => {
    e.preventDefault();
    // Prefer the clipboard's real HTML representation (what Word/Docs/
    // ChatGPT/websites actually put there) over plain text, so formatting
    // survives the paste instead of being flattened.
    const html = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');
    const clean = html ? sanitizeRichText(html) : escapeText(text || '');
    document.execCommand('insertHTML', false, clean);
  };

  const handleBlur = () => {
    focused.current = false;
    if (onBlur) onBlur(sanitizeRichText(ref.current.innerHTML));
  };

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      className="rr-richtext"
      style={{ minHeight: rows * 22, ...style }}
      data-placeholder={placeholder}
      onFocus={() => { focused.current = true; }}
      onBlur={handleBlur}
      onPaste={handlePaste}
    />
  );
}
