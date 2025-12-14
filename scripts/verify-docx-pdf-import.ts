#!/usr/bin/env tsx
/**
 * DOCX/PDFインポート機能の検証スクリプト
 * - mammoth.jsの動作確認
 * - pdf-parseの動作確認
 * - インポートエンドポイントの存在確認
 */

import { createRequire } from 'module';
import path from 'path';
import { promises as fs } from 'fs';

const require = createRequire(import.meta.url);

interface VerificationResult {
  name: string;
  status: 'PASS' | 'FAIL';
  message: string;
}

const results: VerificationResult[] = [];

async function verify(): Promise<void> {
  console.log('🔍 DOCX/PDFインポート機能の検証を開始...\n');

  // 1. mammoth.js の確認
  try {
    const mammoth = await import('mammoth');
    if (typeof mammoth.convertToHtml === 'function') {
      results.push({
        name: 'mammoth.js インポート',
        status: 'PASS',
        message: 'mammoth.convertToHtml が利用可能',
      });
    } else {
      results.push({
        name: 'mammoth.js インポート',
        status: 'FAIL',
        message: 'mammoth.convertToHtml が見つかりません',
      });
    }
  } catch (error) {
    results.push({
      name: 'mammoth.js インポート',
      status: 'FAIL',
      message: error instanceof Error ? error.message : '不明なエラー',
    });
  }

  // 2. pdf-parse の確認 (CommonJS require)
  try {
    const PdfParse = require('pdf-parse');
    if (typeof PdfParse === 'function' || typeof PdfParse === 'object') {
      results.push({
        name: 'pdf-parse インポート (CommonJS)',
        status: 'PASS',
        message: 'pdf-parse が利用可能',
      });
    } else {
      results.push({
        name: 'pdf-parse インポート (CommonJS)',
        status: 'FAIL',
        message: 'pdf-parse の読み込みに失敗',
      });
    }
  } catch (error) {
    results.push({
      name: 'pdf-parse インポート (CommonJS)',
      status: 'FAIL',
      message: error instanceof Error ? error.message : '不明なエラー',
    });
  }

  // 3. import.ts の存在確認
  try {
    const importFilePath = path.join(
      process.cwd(),
      'src',
      'backend',
      'api',
      'import.ts'
    );
    await fs.access(importFilePath);
    results.push({
      name: 'import.ts 存在確認',
      status: 'PASS',
      message: `${importFilePath} が存在します`,
    });
  } catch (error) {
    results.push({
      name: 'import.ts 存在確認',
      status: 'FAIL',
      message: 'import.ts が見つかりません',
    });
  }

  // 4. import.ts の内容確認
  try {
    const importFilePath = path.join(
      process.cwd(),
      'src',
      'backend',
      'api',
      'import.ts'
    );
    const content = await fs.readFile(importFilePath, 'utf-8');

    // DOCX エンドポイント確認
    if (content.includes('router.post(') && content.includes('"/docx"')) {
      results.push({
        name: 'DOCX エンドポイント確認',
        status: 'PASS',
        message: 'POST /api/import/docx が実装されています',
      });
    } else {
      results.push({
        name: 'DOCX エンドポイント確認',
        status: 'FAIL',
        message: 'DOCX エンドポイントが見つかりません',
      });
    }

    // PDF エンドポイント確認
    if (content.includes('router.post(') && content.includes('"/pdf"')) {
      results.push({
        name: 'PDF エンドポイント確認',
        status: 'PASS',
        message: 'POST /api/import/pdf が実装されています',
      });
    } else {
      results.push({
        name: 'PDF エンドポイント確認',
        status: 'FAIL',
        message: 'PDF エンドポイントが見つかりません',
      });
    }

    // mammoth 使用確認
    if (content.includes('mammoth.convertToHtml')) {
      results.push({
        name: 'mammoth 使用確認',
        status: 'PASS',
        message: 'mammoth.convertToHtml が使用されています',
      });
    } else {
      results.push({
        name: 'mammoth 使用確認',
        status: 'FAIL',
        message: 'mammoth の使用が見つかりません',
      });
    }

    // pdf-parse 使用確認
    if (content.includes('PdfParse(buffer)') || content.includes('await PdfParse')) {
      results.push({
        name: 'pdf-parse 使用確認',
        status: 'PASS',
        message: 'pdf-parse が使用されています',
      });
    } else {
      results.push({
        name: 'pdf-parse 使用確認',
        status: 'FAIL',
        message: 'pdf-parse の使用が見つかりません',
      });
    }

    // ファイルサイズ制限確認
    if (content.includes('20 * 1024 * 1024') && content.includes('DOCX')) {
      results.push({
        name: 'DOCX ファイルサイズ制限',
        status: 'PASS',
        message: '20MB制限が設定されています',
      });
    } else {
      results.push({
        name: 'DOCX ファイルサイズ制限',
        status: 'FAIL',
        message: 'ファイルサイズ制限が見つかりません',
      });
    }

    if (content.includes('30 * 1024 * 1024') && content.includes('PDF')) {
      results.push({
        name: 'PDF ファイルサイズ制限',
        status: 'PASS',
        message: '30MB制限が設定されています',
      });
    } else {
      results.push({
        name: 'PDF ファイルサイズ制限',
        status: 'FAIL',
        message: 'ファイルサイズ制限が見つかりません',
      });
    }

    // エラーハンドリング確認
    if (content.includes('try {') && content.includes('catch (error)')) {
      results.push({
        name: 'エラーハンドリング確認',
        status: 'PASS',
        message: 'try-catch によるエラーハンドリングが実装されています',
      });
    } else {
      results.push({
        name: 'エラーハンドリング確認',
        status: 'FAIL',
        message: 'エラーハンドリングが見つかりません',
      });
    }

    // 一時ファイルクリーンアップ確認
    if (content.includes('fs.unlink(req.file.path)')) {
      results.push({
        name: '一時ファイルクリーンアップ',
        status: 'PASS',
        message: '一時ファイルの削除処理が実装されています',
      });
    } else {
      results.push({
        name: '一時ファイルクリーンアップ',
        status: 'FAIL',
        message: '一時ファイルの削除処理が見つかりません',
      });
    }
  } catch (error) {
    results.push({
      name: 'import.ts 内容確認',
      status: 'FAIL',
      message: error instanceof Error ? error.message : '不明なエラー',
    });
  }

  // 5. encoding.ts の存在確認
  try {
    const encodingFilePath = path.join(
      process.cwd(),
      'src',
      'backend',
      'utils',
      'encoding.ts'
    );
    await fs.access(encodingFilePath);
    results.push({
      name: 'encoding.ts 存在確認',
      status: 'PASS',
      message: `${encodingFilePath} が存在します`,
    });
  } catch (error) {
    results.push({
      name: 'encoding.ts 存在確認',
      status: 'FAIL',
      message: 'encoding.ts が見つかりません',
    });
  }

  // 6. テストファイルの存在確認
  try {
    const testFilePath = path.join(
      process.cwd(),
      'tests',
      'backend',
      'import-docx-pdf.test.ts'
    );
    await fs.access(testFilePath);
    results.push({
      name: 'テストファイル存在確認',
      status: 'PASS',
      message: `${testFilePath} が存在します`,
    });
  } catch (error) {
    results.push({
      name: 'テストファイル存在確認',
      status: 'FAIL',
      message: 'テストファイルが見つかりません',
    });
  }

  // 結果表示
  console.log('📋 検証結果:\n');
  let passCount = 0;
  let failCount = 0;

  results.forEach((result) => {
    const icon = result.status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} ${result.name}`);
    console.log(`   ${result.message}\n`);

    if (result.status === 'PASS') {
      passCount++;
    } else {
      failCount++;
    }
  });

  console.log('━'.repeat(60));
  console.log(`合計: ${results.length} 項目`);
  console.log(`成功: ${passCount} 項目`);
  console.log(`失敗: ${failCount} 項目`);
  console.log('━'.repeat(60));

  if (failCount === 0) {
    console.log('\n🎉 すべての検証に成功しました！');
    process.exit(0);
  } else {
    console.log(`\n⚠️  ${failCount} 項目の検証に失敗しました。`);
    process.exit(1);
  }
}

verify().catch((error) => {
  console.error('検証中にエラーが発生しました:', error);
  process.exit(1);
});
