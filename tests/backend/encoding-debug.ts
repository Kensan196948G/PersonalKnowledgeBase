/**
 * Character Encoding Detection Debug Script
 *
 * This script tests the charset-detector library behavior
 */

import chardet from 'charset-detector';
import iconv from 'iconv-lite';

console.log('Testing charset-detector library...\n');

// Test 1: UTF-8
const utf8Text = '日本語のテストです';
const utf8Buffer = Buffer.from(utf8Text, 'utf-8');
const utf8Detected = chardet(utf8Buffer);
console.log('UTF-8 Test:');
console.log('  Text:', utf8Text);
console.log('  Detected:', JSON.stringify(utf8Detected, null, 2));
console.log();

// Test 2: Shift-JIS
const sjisText = 'これはテストです';
const sjisBuffer = iconv.encode(sjisText, 'shift_jis');
const sjisDetected = chardet(sjisBuffer);
console.log('Shift-JIS Test:');
console.log('  Original text:', sjisText);
console.log('  Buffer:', sjisBuffer.toString('hex'));
console.log('  Detected:', JSON.stringify(sjisDetected, null, 2));
console.log('  Decoded as UTF-8 (wrong):', sjisBuffer.toString('utf-8'));
console.log('  Decoded as Shift-JIS (correct):', iconv.decode(sjisBuffer, 'shift_jis'));
console.log();

// Test 3: EUC-JP
const eucText = 'EUCテスト';
const eucBuffer = iconv.encode(eucText, 'euc-jp');
const eucDetected = chardet(eucBuffer);
console.log('EUC-JP Test:');
console.log('  Original text:', eucText);
console.log('  Detected:', JSON.stringify(eucDetected, null, 2));
console.log('  Decoded as EUC-JP:', iconv.decode(eucBuffer, 'euc-jp'));
console.log();

// Test 4: ASCII
const asciiText = 'Simple ASCII text';
const asciiBuffer = Buffer.from(asciiText, 'ascii');
const asciiDetected = chardet(asciiBuffer);
console.log('ASCII Test:');
console.log('  Text:', asciiText);
console.log('  Detected:', JSON.stringify(asciiDetected, null, 2));
console.log();

console.log('Testing detection algorithm...');
if (sjisDetected && sjisDetected.length > 0) {
  const encoding = sjisDetected[0].charsetName.toLowerCase();
  console.log('Shift-JIS detected encoding name:', encoding);
  console.log('  Includes "shift"?', encoding.includes('shift'));
  console.log('  Includes "sjis"?', encoding.includes('sjis'));
}
