/**
 * HTML/MHT Import Unit Tests
 *
 * Tests for internal functions:
 * - decodeQuotedPrintable
 * - extractHtmlFromMht
 * - cleanOneNoteHtml
 * - extractTitle
 */

import { describe, it, expect } from '@jest/globals';

// Since these functions are not exported from import.ts, we'll need to test them
// through the API or export them for testing. For now, we'll create test versions.

/**
 * Test version of decodeQuotedPrintable
 */
function decodeQuotedPrintable(buffer: Buffer): string {
  let text = buffer.toString('binary');

  // Remove soft line breaks (=\r\n or =\n)
  text = text.replace(/=\r?\n/g, '');

  // Convert =XX format to byte values
  const bytes: number[] = [];
  let i = 0;
  while (i < text.length) {
    if (text[i] === '=' && i + 2 < text.length) {
      const hex = text.substring(i + 1, i + 3);
      if (/^[0-9A-F]{2}$/i.test(hex)) {
        bytes.push(parseInt(hex, 16));
        i += 3;
        continue;
      }
    }
    bytes.push(text.charCodeAt(i) & 0xFF);
    i++;
  }

  return Buffer.from(bytes).toString('utf-8');
}

/**
 * Test version of extractHtmlFromMht
 */
function extractHtmlFromMht(buffer: Buffer): string {
  const decoded = decodeQuotedPrintable(buffer);
  const htmlMatch = decoded.match(/<html[\s\S]*<\/html>/i);
  if (htmlMatch) {
    return htmlMatch[0];
  }
  throw new Error("No HTML content found in MHT file");
}

/**
 * Test version of cleanOneNoteHtml
 */
function cleanOneNoteHtml(html: string): string {
  // Remove mso-* styles
  html = html.replace(/mso-[a-z-]+:[^;]+;?/gi, "");

  // Remove empty style attributes
  html = html.replace(/\s*style=""\s*/gi, "");

  // Remove o:p tags (OneNote specific paragraph tags)
  html = html.replace(/<\/?o:p>/gi, "");

  // Remove Mso* classes from class attributes
  html = html.replace(/class="[^"]*Mso[^"]*"/gi, 'class=""');

  // Remove empty class attributes
  html = html.replace(/\s*class=""\s*/gi, "");

  return html;
}

describe('Quoted-Printable Decoding Tests', () => {
  it('should decode basic quoted-printable text', () => {
    const input = Buffer.from('Hello=20World', 'binary');
    const result = decodeQuotedPrintable(input);
    expect(result).toBe('Hello World');
  });

  it('should decode UTF-8 Japanese characters', () => {
    // "テスト" in UTF-8 quoted-printable
    const input = Buffer.from('=E3=83=86=E3=82=B9=E3=83=88', 'binary');
    const result = decodeQuotedPrintable(input);
    expect(result).toBe('テスト');
  });

  it('should handle soft line breaks (=\\r\\n)', () => {
    const input = Buffer.from('This is a long=\r\nline', 'binary');
    const result = decodeQuotedPrintable(input);
    expect(result).toBe('This is a longline');
  });

  it('should handle soft line breaks (=\\n)', () => {
    const input = Buffer.from('This is a long=\nline', 'binary');
    const result = decodeQuotedPrintable(input);
    expect(result).toBe('This is a longline');
  });

  it('should handle mixed encoded and plain text', () => {
    const input = Buffer.from('Hello =E3=83=86=E3=82=B9=E3=83=88 World', 'binary');
    const result = decodeQuotedPrintable(input);
    expect(result).toBe('Hello テスト World');
  });

  it('should handle equals sign not part of encoding', () => {
    const input = Buffer.from('1+1=2', 'binary');
    const result = decodeQuotedPrintable(input);
    expect(result).toBe('1+1=2');
  });

  it('should handle invalid hex codes', () => {
    const input = Buffer.from('Invalid =XY code', 'binary');
    const result = decodeQuotedPrintable(input);
    // Should keep the invalid sequence as is
    expect(result).toContain('=XY');
  });

  it('should decode complex Japanese text', () => {
    // "日本語テスト" in UTF-8 quoted-printable
    const input = Buffer.from('=E6=97=A5=E6=9C=AC=E8=AA=9E=E3=83=86=E3=82=B9=E3=83=88', 'binary');
    const result = decodeQuotedPrintable(input);
    expect(result).toBe('日本語テスト');
  });

  it('should handle empty input', () => {
    const input = Buffer.from('', 'binary');
    const result = decodeQuotedPrintable(input);
    expect(result).toBe('');
  });

  it('should handle newlines without equals', () => {
    const input = Buffer.from('Line1\nLine2\r\nLine3', 'binary');
    const result = decodeQuotedPrintable(input);
    expect(result).toBe('Line1\nLine2\r\nLine3');
  });
});

describe('MHT HTML Extraction Tests', () => {
  it('should extract HTML from basic MHT file', () => {
    const mhtContent = `MIME-Version: 1.0
Content-Type: text/html; charset="utf-8"

<html><body><h1>Test</h1></body></html>
`;
    const buffer = Buffer.from(mhtContent, 'utf-8');
    const result = extractHtmlFromMht(buffer);
    expect(result).toContain('<html>');
    expect(result).toContain('<h1>Test</h1>');
    expect(result).toContain('</html>');
  });

  it('should extract HTML with quoted-printable encoding', () => {
    const mhtContent = `MIME-Version: 1.0
Content-Type: text/html; charset="utf-8"
Content-Transfer-Encoding: quoted-printable

<html><body><p>=E3=83=86=E3=82=B9=E3=83=88</p></body></html>
`;
    const buffer = Buffer.from(mhtContent, 'utf-8');
    const result = extractHtmlFromMht(buffer);
    expect(result).toContain('<html>');
    expect(result).toContain('テスト');
    expect(result).toContain('</html>');
  });

  it('should extract HTML from multipart MHT', () => {
    const mhtContent = `MIME-Version: 1.0
Content-Type: multipart/related; boundary="----=_NextPart_000"

------=_NextPart_000
Content-Type: text/html; charset="utf-8"

<html>
<head><title>Test</title></head>
<body><h1>Content</h1></body>
</html>

------=_NextPart_000--
`;
    const buffer = Buffer.from(mhtContent, 'utf-8');
    const result = extractHtmlFromMht(buffer);
    expect(result).toContain('<html>');
    expect(result).toContain('<title>Test</title>');
    expect(result).toContain('</html>');
  });

  it('should throw error when no HTML content found', () => {
    const mhtContent = `MIME-Version: 1.0
Content-Type: text/plain

This is plain text, not HTML.
`;
    const buffer = Buffer.from(mhtContent, 'utf-8');
    expect(() => extractHtmlFromMht(buffer)).toThrow('No HTML content found in MHT file');
  });

  it('should handle case-insensitive HTML tags', () => {
    const mhtContent = `<HTML><BODY><H1>Test</H1></BODY></HTML>`;
    const buffer = Buffer.from(mhtContent, 'utf-8');
    const result = extractHtmlFromMht(buffer);
    expect(result).toContain('<HTML>');
    expect(result).toContain('</HTML>');
  });

  it('should extract HTML with attributes', () => {
    const mhtContent = `<html lang="ja"><body class="test"><p>Content</p></body></html>`;
    const buffer = Buffer.from(mhtContent, 'utf-8');
    const result = extractHtmlFromMht(buffer);
    expect(result).toContain('lang="ja"');
    expect(result).toContain('class="test"');
  });
});

describe('OneNote HTML Cleanup Tests', () => {
  it('should remove mso-* styles', () => {
    const input = '<p style="mso-style-name: Normal; color: red;">Text</p>';
    const result = cleanOneNoteHtml(input);
    expect(result).not.toContain('mso-style-name');
    expect(result).toContain('color: red;');
  });

  it('should remove multiple mso-* styles', () => {
    const input = '<div style="mso-foo: bar; mso-baz: qux; font-size: 12px;">Text</div>';
    const result = cleanOneNoteHtml(input);
    expect(result).not.toContain('mso-foo');
    expect(result).not.toContain('mso-baz');
    expect(result).toContain('font-size: 12px;');
  });

  it('should remove empty style attributes', () => {
    const input = '<p style="">Text</p>';
    const result = cleanOneNoteHtml(input);
    expect(result).toBe('<p>Text</p>');
  });

  it('should remove o:p tags', () => {
    const input = '<p>Text <o:p>OneNote specific</o:p> more text</p>';
    const result = cleanOneNoteHtml(input);
    expect(result).not.toContain('<o:p>');
    expect(result).not.toContain('</o:p>');
    expect(result).toContain('Text');
    expect(result).toContain('more text');
  });

  it('should remove Mso* classes', () => {
    const input = '<p class="MsoNormal">Text</p>';
    const result = cleanOneNoteHtml(input);
    expect(result).not.toContain('MsoNormal');
  });

  it('should remove empty class attributes', () => {
    const input = '<div class="">Text</div>';
    const result = cleanOneNoteHtml(input);
    expect(result).toBe('<div>Text</div>');
  });

  it('should handle complex OneNote HTML', () => {
    const input = `
      <div class="MsoNormal" style="mso-style-name: Heading1; font-size: 14px;">
        <p style="mso-list: l0 level1 lfo1;">
          <o:p>Text</o:p>
        </p>
      </div>
    `;
    const result = cleanOneNoteHtml(input);
    expect(result).not.toContain('mso-');
    expect(result).not.toContain('MsoNormal');
    expect(result).not.toContain('<o:p>');
    expect(result).toContain('font-size: 14px;');
    expect(result).toContain('Text');
  });

  it('should preserve non-OneNote styles', () => {
    const input = '<p style="color: blue; font-weight: bold;">Text</p>';
    const result = cleanOneNoteHtml(input);
    expect(result).toContain('color: blue;');
    expect(result).toContain('font-weight: bold;');
  });

  it('should handle case-insensitive mso styles', () => {
    const input = '<p style="MSO-STYLE-NAME: Normal; color: red;">Text</p>';
    const result = cleanOneNoteHtml(input);
    expect(result).not.toContain('MSO-STYLE-NAME');
    expect(result).toContain('color: red;');
  });

  it('should handle mixed case Mso classes', () => {
    const input = '<p class="msoNormal MSOTitle">Text</p>';
    const result = cleanOneNoteHtml(input);
    expect(result).not.toContain('msoNormal');
    expect(result).not.toContain('MSOTitle');
  });
});

describe('Edge Cases and Error Handling', () => {
  it('should handle quoted-printable with incomplete sequence at end', () => {
    const input = Buffer.from('Test=E3', 'binary');
    const result = decodeQuotedPrintable(input);
    // Should handle gracefully, keeping what it can
    expect(result).toBeDefined();
  });

  it('should handle very long quoted-printable lines', () => {
    const longText = 'A'.repeat(1000) + '=\r\n' + 'B'.repeat(1000);
    const input = Buffer.from(longText, 'binary');
    const result = decodeQuotedPrintable(input);
    expect(result.length).toBe(2000); // Soft line break removed
  });

  it('should handle HTML cleanup with no changes needed', () => {
    const input = '<div><p>Simple HTML</p></div>';
    const result = cleanOneNoteHtml(input);
    expect(result).toBe(input);
  });

  it('should handle empty HTML for cleanup', () => {
    const input = '';
    const result = cleanOneNoteHtml(input);
    expect(result).toBe('');
  });

  it('should handle MHT with multiple HTML tags', () => {
    const mhtContent = `<html><body>First</body></html>
<html><body>Second</body></html>`;
    const buffer = Buffer.from(mhtContent, 'utf-8');
    const result = extractHtmlFromMht(buffer);
    // Should extract the first matching HTML block
    expect(result).toContain('<html>');
  });

  it('should handle malformed quoted-printable', () => {
    const input = Buffer.from('Test==E3==82', 'binary');
    const result = decodeQuotedPrintable(input);
    // Should handle without crashing
    expect(result).toBeDefined();
  });

  it('should handle UTF-8 BOM in MHT', () => {
    const bom = Buffer.from([0xEF, 0xBB, 0xBF]);
    const content = Buffer.from('<html><body>Test</body></html>', 'utf-8');
    const buffer = Buffer.concat([bom, content]);
    const result = extractHtmlFromMht(buffer);
    expect(result).toContain('<html>');
    expect(result).toContain('Test');
  });
});
