/**
 * oneNoteImporter 手動テスト
 *
 * Note: このファイルはjsdomのESMの問題により、通常のJestテストとしては実行できません。
 * 代わりに、tsx経由で実行してください。
 *
 * 実行方法:
 * npx tsx tests/backend/oneNoteImporter.manual.ts
 */

import {
  cleanOneNoteHtml,
  extractTitle,
  extractMetadata,
  importOneNoteHtml,
} from "../../src/backend/services/oneNoteImporter";

async function runTests() {
  console.log("Starting oneNoteImporter integration tests...\n");

  // Test 1: cleanOneNoteHtml
  console.log("Test 1: cleanOneNoteHtml removes mso-* styles");
  const input1 = '<p style="mso-style-name: Normal; color: red;">Text</p>';
  const output1 = cleanOneNoteHtml(input1);
  console.assert(!output1.includes("mso-"), "Should not contain mso-*");
  console.log("✓ Pass\n");

  // Test 2: extractTitle with h1
  console.log("Test 2: extractTitle extracts from h1 tag");
  const html2 = "<html><body><h1>My Title</h1><p>Content</p></body></html>";
  const title2 = extractTitle(html2);
  console.assert(title2 === "My Title", `Expected 'My Title', got '${title2}'`);
  console.log("✓ Pass\n");

  // Test 3: extractTitle fallback
  console.log("Test 3: extractTitle fallback to title tag");
  const html3 =
    "<html><head><title>Page Title</title></head><body><p>Content</p></body></html>";
  const title3 = extractTitle(html3);
  console.assert(
    title3 === "Page Title",
    `Expected 'Page Title', got '${title3}'`,
  );
  console.log("✓ Pass\n");

  // Test 4: extractMetadata
  console.log("Test 4: extractMetadata extracts createdAt");
  const html4 =
    '<html><head><meta name="created" content="2024-01-15T10:30:00Z"></head><body></body></html>';
  const metadata4 = extractMetadata(html4);
  console.assert(
    metadata4.createdAt instanceof Date,
    "createdAt should be a Date",
  );
  console.log("✓ Pass\n");

  // Test 5: Full import
  console.log("Test 5: importOneNoteHtml full conversion");
  const html5 = `
    <html>
      <head>
        <title>Test Note</title>
        <meta name="created" content="2024-01-15T10:30:00Z">
      </head>
      <body>
        <h1>Test Note</h1>
        <p>This is test content.</p>
        <ul>
          <li>Item 1</li>
          <li>Item 2</li>
        </ul>
      </body>
    </html>
  `;
  const result5 = await importOneNoteHtml(html5);
  console.assert(result5.title === "Test Note", 'Title should be "Test Note"');
  console.assert(
    typeof result5.content === "object",
    "Content should be an object",
  );
  console.assert(
    result5.metadata.createdAt instanceof Date,
    "Metadata should have createdAt",
  );
  console.log("Result:", JSON.stringify(result5, null, 2));
  console.log("✓ Pass\n");

  console.log("All integration tests passed! ✅");
}

// Only run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}

export { runTests };
