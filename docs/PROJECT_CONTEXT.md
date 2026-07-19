# PROJECT CONTEXT — 專案背景

> 通用模板，不寫死業務名。開新專案時把 placeholder 替換成實際內容。

## 1. 專案名稱

```text
<project_name>
```

## 2. 專案目標

```text
<business_goal>
```

## 3. 使用者角色

| 角色 | placeholder | 說明 |
|---|---|---|
| 目標使用者 | `<target_user>` | 主要服務對象 |
| 一般使用者 | `<user_role>` | 前台操作者 |
| 管理員 | `<admin_role>` | 後台管理者 |

## 4. 核心商業流程

```text
<main_workflow>
```

（例：使用者 → 瀏覽 → 報名/下單 → 付款 → 取得服務 → 後台審核/出貨）

## 5. 前台流程

1. `<user_role>` 進入前台。
2. 主要動作：`<feature_name>`。
3. 轉化關鍵步驟（降低阻力，見 `docs/UX_GUIDELINES.md`）。

## 6. 後台流程

1. `<admin_role>` 進入後台。
2. 主要管理動作：`<module_name>`。
3. 高風險單筆操作需二次確認 + audit log。

## 7. 權限邊界

1. `<user_role>` 只能存取自己的資料。
2. `<admin_role>` 的權限範圍需明確定義。
3. 敏感欄位（role、permission、points、score）不得由一般使用者直接更新。
4. 權限一律以資料庫層級（RLS）為準，不得只靠前端隱藏。

## 8. 高風險資料

1. 個資（姓名、聯絡方式、身分資訊）。
2. 金流（付款、退款、點數、優惠碼、ledger）。
3. 權限與角色設定。
4. 名額 / 庫存 / 席次。

## 9. 不做事項（Out of Scope）

```text
<列出本專案明確不做的功能，避免範圍蔓延>
```
