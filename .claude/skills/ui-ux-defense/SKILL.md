---
name: ui-ux-defense
description: Use when the task mentions UI, style, CSS, page, component, color, dark mode, mobile, form, button, landing page, dashboard, admin editor, draft state, or UX. 當任務涉及 UI、樣式、CSS、頁面、元件、顏色、深色模式、手機版、表單、按鈕、Landing Page、後台儀表板、後台編輯器或 UX 時使用。
---

# UI UX Defense — 品牌與體驗守衛

規則細節見 `docs/BRAND_UI_SYSTEM.md`、`docs/UX_GUIDELINES.md`、`docs/STYLE_PACKS.md`。
達到「必須啟動」情境（首頁、登入註冊、會員中心、結帳、品牌改版、手機破版修正等，
見 `docs/ROLE_SYSTEM.md` §4）時，加讀 `../../../docs/roles/ui-ux-product-designer.md`。

## 風格選擇

1. 新頁面 / 新流程且使用者未指定風格 → 先依 `docs/STYLE_PACKS.md` 提問（A~E 基本風格），不得自行猜測。
2. 專案已有既定風格 → 直接沿用，不重問。

## 品牌與樣式

1. 不得隨意寫死顏色。
2. 優先使用 CSS variables，色彩走設計系統 token。
3. 若支援 Dark Mode，改色要同時檢查深色模式。
4. focus-visible 必須可見。
5. 不得為了裝飾犧牲可讀性。

## Mobile-first 防破版（硬性，見 BRAND_UI §12）

1. 手機不得非必要橫向捲動；內容不得超出畫面。
2. 主要觸控區不小於 44px；表單好輸入；長表單分段。
3. Modal / Drawer / 選單在手機可完整操作與關閉。
4. 表格手機化：卡片化 / 重點欄位 / 可控橫捲 / 展開，不得壓縮到無法閱讀。
5. 不使用只能 hover 才能完成的主要操作。
6. 檢查常見手機寬度（375 / 390 / 414）。

## 前台轉化率

1. 報名與結帳流程降低阻力。
2. 非必要時不要第一步強迫註冊。
3. 表單欄位不可過多。
4. 錯誤訊息白話，並告訴使用者下一步。

## 後台編輯器

1. 大量編輯用 draft state。
2. 不得每改一格就打 API。
3. 使用 Sticky Save Bar，批次儲存。
4. 高風險單筆操作二次確認並寫 audit log。
5. 後台表格支援搜尋 / 篩選 / 分頁。

## 人性化（見 UX_GUIDELINES §四）

使用者知道自己在哪、下一步做什麼；每個畫面一個清楚主要目標；
Loading / Empty / Error / Success 狀態齊備；簡單直覺優先於炫技。
