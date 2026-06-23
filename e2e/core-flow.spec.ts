import { test, expect } from '@playwright/test';

// =====================================================================
// 核心流程煙霧測試（對本機 dev / 測試庫，唯讀、不送出打卡、不污染資料）。
//
// ⚠️ 重要：App 有「同一支電話 10 分鐘內最多 8 次登入」的防盜刷限制，
//    所以整個檔案「只登入一次」，再用 test.step 一次檢查所有重要畫面。
//    （若短時間重跑多次而看到登入失敗，等幾分鐘讓限制重置即可。）
//
// 測試帳號：測試庫既有、已綁定 auth 的帳號。
// =====================================================================
const TEST_NAME = '測試又嘉';
const TEST_PHONE = '0963242959';

test('核心流程：登入 → 計分顯示 / 打卡入口 / 排行榜 / 見證 都正常，且全程無 JS 例外', async ({ page }) => {
  // 收集「未捕捉的 JS 例外」——這是「有功能壞掉」最明確的訊號。
  const errs: string[] = [];
  page.on('pageerror', (e) => errs.push(e.message));

  await test.step('登入成功進入 App（不卡登入頁）', async () => {
    await page.goto('/');
    await page.getByPlaceholder('請輸入您的姓名').fill(TEST_NAME);
    await page.getByPlaceholder('請輸入您的手機號碼').fill(TEST_PHONE);
    await page.getByRole('button', { name: /開啟修行通道|連接中/ }).click();
    await expect(page.getByText('排行榜').first()).toBeVisible();
    await expect(page.getByText('連結修行印記')).toBeHidden();
  });

  await test.step('計分顯示沒壞（Header 有「經驗」與 LEVEL）', async () => {
    await expect(page.getByText('經驗', { exact: false }).first()).toBeVisible();
    await expect(page.getByText(/LEVEL/i).first()).toBeVisible();
  });

  await test.step('個人面板：看得到打卡入口（打卡頁沒壞）', async () => {
    await page.getByText('個人面板', { exact: false }).first().click();
    await expect(
      page.getByText(/點擊簽到|提交證明|補交證明|查看修行加速攻略/).first()
    ).toBeVisible();
  });

  await test.step('排行榜可開啟並正常渲染（神人榜/神隊榜）', async () => {
    await page.getByText('排行榜', { exact: false }).first().click();
    await expect(page.getByText(/神人榜|神隊榜/).first()).toBeVisible();
  });

  await test.step('見證分享頁正常渲染', async () => {
    await page.getByText('見證', { exact: false }).first().click();
    await expect(page.getByText('見證分享牆').first()).toBeVisible();
  });

  // 全程不應出現任何未捕捉的 JS 例外
  expect(errs, `偵測到 JS 例外（代表有功能壞掉）：${errs.join(' | ')}`).toHaveLength(0);
});
