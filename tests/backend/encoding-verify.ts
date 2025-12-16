/**
 * Character Encoding Detection Verification Script
 */

import { detectAndConvert } from "../../src/backend/utils/encoding.js";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const iconv = require("iconv-lite");

console.log("Testing improved encoding detection...\n");

// Test 1: Shift-JIS
console.log("Test 1: Shift-JIS Detection");
const sjisText = "これはテストです";
const sjisBuffer = iconv.encode(sjisText, "shift_jis");
const sjisResult = detectAndConvert(sjisBuffer);
console.log("  Original:", sjisText);
console.log("  Result:", sjisResult);
console.log("  Match:", sjisResult === sjisText ? "✓ PASS" : "✗ FAIL");
console.log();

// Test 2: UTF-8
console.log("Test 2: UTF-8 Detection");
const utf8Text = "日本語のテストです";
const utf8Buffer = Buffer.from(utf8Text, "utf-8");
const utf8Result = detectAndConvert(utf8Buffer);
console.log("  Original:", utf8Text);
console.log("  Result:", utf8Result);
console.log("  Match:", utf8Result === utf8Text ? "✓ PASS" : "✗ FAIL");
console.log();

// Test 3: EUC-JP
console.log("Test 3: EUC-JP Detection");
const eucText = "EUCテスト";
const eucBuffer = iconv.encode(eucText, "euc-jp");
const eucResult = detectAndConvert(eucBuffer);
console.log("  Original:", eucText);
console.log("  Result:", eucResult);
console.log("  Match:", eucResult === eucText ? "✓ PASS" : "✗ FAIL");
console.log();

// Test 4: ASCII
console.log("Test 4: ASCII/UTF-8 (ASCII text)");
const asciiText = "Simple ASCII text";
const asciiBuffer = Buffer.from(asciiText, "utf-8");
const asciiResult = detectAndConvert(asciiBuffer);
console.log("  Original:", asciiText);
console.log("  Result:", asciiResult);
console.log("  Match:", asciiResult === asciiText ? "✓ PASS" : "✗ FAIL");
console.log();

console.log("All tests completed!");
