import { test, expect } from '@playwright/test';

// 核心流程煙霧測試（對本機 dev / 測試庫）。
// 測試帳號：測試庫既有、已綁定 auth 的帳號。
const TEST_NAME = '測試又嘉';
const TEST_PHONE = '0963242959';

async function login(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByPlaceholder('請輸入您的姓名').fill(TEST_NAME);
  await page.getByPlaceholder('請輸入您的手機號碼').fill(TEST_PHONE);
  await page.getByRole('button', { name: /開啟修行通道|連接中/ }).click();
  // 登入成功 → 底部導航出現分頁（不再停在登入頁）
  await expect(page.getByText('排行榜').first()).toBeVisible();
}

test('學員登入 → 成功進入 App（不卡登入頁、不被踢回登入）', async ({ page }) => {
  await login(page);
  // 確認真的離開登入頁
  await expect(page.getByText('連結修行印記')).toBeHidden();
});

test('登入後可開啟「見證分享」頁並正常渲染', async ({ page }) => {
  await login(page);
  await page.getByText('見證', { exact: false }).first().click();
  await expect(page.getByText('見證分享牆').first()).toBeVisible();
});

test('登入後可開啟「個人面板/每日任務」並看到打卡入口', async ({ page }) => {
  await login(page);
  await page.getByText('個人面板', { exact: false }).first().click();
  // 每日任務頁應出現「簽到」或「提交證明」之類的打卡入口（任一即可）
  await expect(
    page.getByText(/點擊簽到|提交證明|補交證明|查看修行加速攻略/).first()
  ).toBeVisible();
});
