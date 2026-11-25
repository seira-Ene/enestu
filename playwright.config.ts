import { defineConfig } from "@playwright/test";
import { APP_URL, FAKE_ENV } from "./e2e/ports";

const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  // まねたSupabaseは1つなので、順番に動かす。
  workers: 1,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [["list"], ["github"]] : "list",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: APP_URL,
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
    // 手元ではWindowsに入っているEdgeを使い、CIではChromiumを入れる。
    channel: isCI ? undefined : "msedge",
    viewport: { width: 375, height: 760 },
    isMobile: true,
    hasTouch: true,
    trace: "retain-on-failure",
  },
  webServer: {
    // CIでは、前の手順のビルドをそのまま使う。
    command: isCI
      ? "npm run start -- -p 3100"
      : "npm run build && npm run start -- -p 3100",
    url: APP_URL,
    env: FAKE_ENV,
    timeout: 180_000,
    // 本番の設定で動いているアプリを、誤って試験しないため。
    reuseExistingServer: false,
  },
});
