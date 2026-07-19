# BRAND UI SYSTEM — 品牌與樣式系統

> 涉及 UI / 樣式 / 頁面 / 元件時，先讀本檔與 `docs/UX_GUIDELINES.md`。
> 新頁面 / 新流程的風格選擇見 `docs/STYLE_PACKS.md`；UI/UX 角色見 `docs/roles/ui-ux-product-designer.md`。
> 修改 UI 規範時，依 `docs/AI_RULES.md` 第 8 節同步更新本檔。

## 1. 品牌視覺核心

清楚、乾淨、穩定、有質感、手機友善、操作直覺。裝飾服務於可讀性，不喧賓奪主。

## 2. 顏色規範

1. **禁止隨意寫死**：`#fff`、`#000`、`#111827`、`#f3f4f6`、`red`、`blue`、`gray` 等。
2. **優先使用 CSS variables**，色彩來自設計系統 token。
3. 顏色以語意命名（`--color-primary`、`--color-danger`、`--color-bg`、`--color-text`），不用具體色名。

### 起手式 Design Tokens（新專案直接複製，之後只改品牌色）

> 這套 token 已按可讀性與層次調好，小白直接用就有一致的質感；
> 要換品牌，只改 `--color-primary` 系列即可，其他不用動。

```css
:root {
  /* === 品牌色（換品牌只改這區） === */
  --color-primary: #2563eb;
  --color-primary-hover: #1d4ed8;
  --color-primary-soft: #eff6ff;      /* 淺底強調區 */

  /* === 語意色 === */
  --color-success: #16a34a;
  --color-warning: #d97706;
  --color-danger:  #dc2626;
  --color-danger-soft: #fef2f2;

  /* === 中性色（背景/文字/邊框） === */
  --color-bg: #ffffff;
  --color-bg-subtle: #f8fafc;         /* 卡片外的頁面底 */
  --color-surface: #ffffff;           /* 卡片/面板 */
  --color-text: #0f172a;
  --color-text-secondary: #475569;
  --color-text-muted: #94a3b8;
  --color-border: #e2e8f0;

  /* === 字級（依 BRAND 第 5 節級距） === */
  --text-xs: 12px; --text-sm: 14px; --text-base: 16px;
  --text-lg: 20px; --text-xl: 24px; --text-2xl: 32px;
  --leading-body: 1.5; --leading-heading: 1.2;

  /* === 間距（4 的倍數） === */
  --space-1: 4px; --space-2: 8px; --space-3: 12px;
  --space-4: 16px; --space-6: 24px; --space-8: 32px; --space-12: 48px;

  /* === 圓角 / 陰影 === */
  --radius-sm: 6px; --radius-md: 10px; --radius-lg: 16px; --radius-full: 9999px;
  --shadow-sm: 0 1px 2px rgba(15,23,42,.06);
  --shadow-md: 0 4px 12px rgba(15,23,42,.08);
  --shadow-lg: 0 12px 32px rgba(15,23,42,.12);

  /* === 元件基準 === */
  --btn-height: 44px;                 /* 手機觸控最低 44px */
  --focus-ring: 0 0 0 3px rgba(37,99,235,.35);
}

/* 深色模式：同名 token 換值，元件程式碼不用改 */
@media (prefers-color-scheme: dark) {
  :root {
    --color-primary-soft: #172554;
    --color-danger-soft: #450a0a;
    --color-bg: #0b1220;
    --color-bg-subtle: #0f172a;
    --color-surface: #111c33;
    --color-text: #e2e8f0;
    --color-text-secondary: #94a3b8;
    --color-text-muted: #64748b;
    --color-border: #1e293b;
    --shadow-sm: 0 1px 2px rgba(0,0,0,.4);
    --shadow-md: 0 4px 12px rgba(0,0,0,.5);
    --shadow-lg: 0 12px 32px rgba(0,0,0,.6);
  }
}
```

使用規則：元件一律引用 token（`background: var(--color-surface)`），**永不**直接寫色碼；深色模式即自動成立。

## 3. Dark Mode

1. 若支援深色模式，**每次改色都要同時檢查深色模式**。
2. 深色值也走 token（`@media (prefers-color-scheme: dark)` 或 `[data-theme="dark"]`）。
3. 對比度需符合可讀性（見第 9 節無障礙）。

## 4. 質感與可讀性

玻璃磨砂、陰影、漸層可用，但**不得犧牲可讀性**。文字與背景對比永遠優先。

## 5. 字級 / 行高

1. 建議字級級距：12 / 14 / 16 / 20 / 24 / 32（依 token 定義）。
2. 內文行高約 1.5，標題約 1.2。
3. 手機內文不小於 14px。

## 6. 圓角 / 陰影 / 留白

1. 圓角走 token（例：`--radius-sm/md/lg`），全站一致。
2. 陰影分層級（sm / md / lg），不濫用重陰影。
3. 留白用間距 token（4 的倍數），避免隨手 magic number。

## 7. 按鈕狀態

| 狀態 | 要求 |
|---|---|
| default | 清楚可點 |
| hover | 明顯回饋 |
| active | 有按下感 |
| focus-visible | **必須看得見**（鍵盤可及） |
| disabled | 明確不可點、降低對比 |
| loading | 顯示載入中、防重複點擊 |

手機版按鈕**高度至少 44px**（觸控友善）。

## 8. 表單狀態

1. 必填、錯誤、成功、loading、disabled 狀態都要有明確視覺。
2. 錯誤訊息靠近欄位、白話、告訴使用者下一步（見 `docs/UX_GUIDELINES.md`）。

## 9. 前台 Landing Page 架構

建議區塊順序：Hero（價值主張 + 主 CTA）→ 痛點/賣點 → 社會證明 → 功能說明 → 定價/方案 → FAQ → 最終 CTA。CTA 清楚、阻力低。

## 10. 後台 Dashboard 規範

1. 表格、列表、表單**優先清楚**，不過度裝飾。
2. 大量資料要分頁 / 搜尋 / 篩選。
3. 大量編輯用 draft state + Sticky Save Bar（見 `docs/UX_GUIDELINES.md`）。

## 11. 無障礙基本要求

1. focus-visible 可見，鍵盤可操作。
2. 文字對比度達 WCAG AA（一般文字 ≥ 4.5:1）。
3. 圖片有 alt，表單有 label。
4. 顏色不作為唯一資訊來源（搭配文字 / 圖示）。

## 12. 交付前 UI 品質門檻

目的：避免 AI 產出看起來像半成品、測試頁、工程師介面的畫面。只補既有章節缺少或不夠明確的項目，其餘引用不重抄。

### 手機優先與防破版硬性標準

只要涉及 UI，必須以**手機使用體驗**為基本標準，不能只完成桌機版。逐項檢查：

* 不得出現非必要橫向捲動；內容不得超出畫面。
* 卡片、表格、圖片、圖表、按鈕與長文字不得破版（超寬、重疊、擠壓、截斷到無法理解）。
* 文字大小清楚可讀（內文不小於 14px，見第 5 節）。
* 重要按鈕容易點擊，主要觸控區原則上不得小於 44px（見第 7 節）。
* 表單容易輸入與選擇；長表單應合理分段或分步。
* Modal、Drawer、Lightbox、下拉選單在手機上可完整操作**與關閉**。
* 主要 CTA 在手機上清楚可見；導覽、返回與取消路徑清楚。
* 圖片有合理比例與 fallback（見下方「圖片與背景可讀性」）。
* **不使用只能 hover 才能完成的主要操作**（手機沒有 hover）。
* 不得為了桌機視覺犧牲手機體驗；需檢查常見手機寬度（例：375 / 390 / 414）。
* 後台手機版即使不完美，也至少要能查看、搜尋、送出、返回。

桌機與手機可以採不同排列，不需要機械式完全相同。
表格在手機上依內容擇一，不得直接壓縮到無法閱讀：

* 卡片化
* 重點欄位優先、次要欄位收合
* 可控的橫向捲動（明確提示可滑動）
* 展開查看更多內容

### 圖片與背景可讀性

* 圖片需有 fallback，避免破圖或半成品感。
* 圖片上放文字時，必須有遮罩、漸層或明確底色保護。
* Modal / Lightbox 的返回或關閉按鈕必須明顯可見。
* 深底淺字、淺底深字與 WCAG 對比規則：見第 4 節與第 11 節，不重複撰寫。

### 空狀態（Empty State）

* 所有列表、卡片、表格、搜尋結果、排行榜、後台資料區塊，在無資料時都必須有明確 empty state（說明文字 + 可選的下一步動作），不可只顯示空白或破版。

### 交付回報要求

凡涉及 UI、樣式、頁面、元件的修改，完成後必須回報：

* 是否檢查手機版破版風險。
* 是否檢查深底深字、淺底淺字、灰底灰字問題。
* 已檢查哪些頁面 / 元件。
* 是否有需要人工確認的畫面。

寬度檢查以**實測**為準：有瀏覽器工具可用時，實際以 375px 寬度開啟頁面驗證，
不得只讀程式碼推測；無法實測時必須標註「未實測，僅程式碼推估（Unverified）」，不得寫成「已檢查」。

（按鈕高度、hover / active / focus / loading 狀態見第 7 節；表單 loading / success / error 狀態見第 8 節與 `docs/UX_GUIDELINES.md`，皆不重複撰寫。）

## 13. 可選風格包 Style Packs

風格庫已抽出為獨立可擴充文件：見 **`docs/STYLE_PACKS.md`**（單一事實來源）。
內含：風格提問協定（未指定風格時先問使用者，不得自行猜測）、
五個基本風格 A～E（高級極簡 / 溫暖專業 / 現代商務 / 高轉換行銷 / 高級科技）、
擴充風格包（高級學院風、遊戲任務風）與新增格式。
不論選哪個風格包，本檔的硬性規則（token、狀態、無障礙、§12 防破版）一律適用。

## 14. 微互動與視覺打磨層

目的：讓系統不只是能用，而是操作起來順、有回饋、有質感。只補「動效與打磨」相關規範，不重複表單、按鈕、錯誤狀態等既有規則。

* 卡片 hover 可有輕微上浮或陰影變化。
* Modal 開啟 / 關閉應有自然過渡。
* 圖片 lightbox 關閉按鈕要明顯，手機版也容易點擊。
* 頁面或區塊載入優先使用 skeleton，避免空白畫面。
* 重要資料更新後可使用 toast 或區塊提示；具體表單回饋規則見 `docs/UX_GUIDELINES.md`。
* 動畫不得影響可讀性與操作效率。
* 後台系統以清楚、穩定、低干擾為優先，避免過度動畫。
