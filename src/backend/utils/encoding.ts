import iconv from 'iconv-lite';
import chardet from 'charset-detector';

/**
 * 文字コード自動検出と変換（Shift-JIS完全対応）
 */
export function detectAndConvert(buffer: Buffer): string {
  // 文字コード検出
  const detected = chardet(buffer) as Array<{ charsetName: string; lang?: string; confidence?: number }>;

  // Shift-JIS検出
  if (detected && detected.length > 0) {
    const encoding = detected[0].charsetName.toLowerCase();

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
