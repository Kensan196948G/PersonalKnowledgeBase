import { createRequire } from 'module';
import chardet from 'charset-detector';

const require = createRequire(import.meta.url);
const iconv = require('iconv-lite');

/**
 * 文字コード自動検出と変換（Shift-JIS完全対応）
 */
export function detectAndConvert(buffer: Buffer): string {
  // 文字コード検出
  const detected = chardet(buffer) as Array<{ charsetName: string; lang?: string; confidence?: number }>;

  if (detected && detected.length > 0) {
    // 最高信頼度のエンコーディングを取得
    const topCandidate = detected[0];
    const topEncoding = topCandidate.charsetName.toLowerCase();
    const topConfidence = topCandidate.confidence || 0;

    // 高信頼度（>50%）でUTF-8が検出された場合、そのまま使用
    if (topConfidence > 50 && (topEncoding.includes('utf-8') || topEncoding.includes('utf8'))) {
      return buffer.toString('utf-8');
    }

    // 日本語エンコーディングを探す（信頼度が高い順）
    for (const candidate of detected) {
      const encoding = candidate.charsetName.toLowerCase();
      const confidence = candidate.confidence || 0;

      // 信頼度が10以上ある場合のみ考慮
      if (confidence >= 10) {
        if (encoding.includes('shift') || encoding.includes('sjis')) {
          // Shift-JIS → UTF-8変換
          return iconv.decode(buffer, 'shift_jis');
        }

        if (encoding.includes('euc-jp')) {
          // EUC-JP → UTF-8変換
          return iconv.decode(buffer, 'euc-jp');
        }

        if (encoding.includes('iso-2022-jp')) {
          // ISO-2022-JP → UTF-8変換
          return iconv.decode(buffer, 'iso-2022-jp');
        }
      }
    }

    // UTF-8として検出された場合
    if (topEncoding.includes('utf-8') || topEncoding.includes('utf8')) {
      return buffer.toString('utf-8');
    }
  }

  // デフォルトはUTF-8として扱う
  return buffer.toString('utf-8');
}

/**
 * ファイル名の文字化け修正（Shift-JIS対応）
 */
export function fixFilename(filename: string): string {
  // ファイル名がShift-JISでエンコードされている可能性がある場合
  try {
    // 一旦バッファに戻してShift-JISとしてデコード
    const buffer = Buffer.from(filename, 'binary');
    const decodedShiftJis = iconv.decode(buffer, 'shift_jis');

    // 日本語文字が正しく表示されるかチェック
    if (/[あ-ん]/.test(decodedShiftJis)) {
      return decodedShiftJis;
    }
  } catch (e) {
    // 失敗したら元のまま
  }

  return filename;
}
