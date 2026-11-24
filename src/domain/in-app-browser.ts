/** アプリの中に組み込まれたブラウザが名乗る文字列。 */
const IN_APP_PATTERNS: readonly RegExp[] = [
  /\bLine\//i,
  /\bFBA[NV]\b|\bFB_IAB\b/,
  /\bInstagram\b/,
  /\bTwitter for\b/,
  /\bMicroMessenger\b/,
  /\bKAKAOTALK\b/,
  /\bYJApp\b/,
  /\bBytedanceWebview\b|\bmusical_ly\b/,
  // Androidの一般的な組み込みブラウザ。
  /; wv\)/,
];

/**
 * アプリ内ブラウザか。Googleがログインを拒否するため、案内を出すのに使う。
 * 見落としも誤りもありうるので、これだけを理由に操作を止めないこと。
 */
export function isInAppBrowser(userAgent: string): boolean {
  return IN_APP_PATTERNS.some((pattern) => pattern.test(userAgent));
}
