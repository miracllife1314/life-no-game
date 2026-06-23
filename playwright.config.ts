import { defineConfig, devices } from '@playwright/test';

// 核心流程 E2E 煙霧測試。對「本機 dev(連測試庫)」跑。
// 跑法：npm run test:e2e
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1,            // 一次跑一個：避免多測試用同一帳號同時登入而互相打架
  retries: 1,            // App 有「同電話 10 分鐘最多 8 次登入」防盜刷，故全套只登入一次、重試也壓低
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    trace: 'on-first-retry',
    locale: 'zh-TW',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
