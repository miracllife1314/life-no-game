---
name: anti-n-plus-one
description: Use when the task mentions list, table, dashboard, leaderboard, statistics, report, loop query, for loop, map, batch query, large data, pagination, or performance. 當任務涉及列表、表格、儀表板、排行榜、統計報表、迴圈查詢、批量查詢、大量資料或分頁效能時使用。
---

# Anti N+1 — 效能守衛

規則細節見 `docs/AI_RULES.md` 第 4 節 Performance 維度。

## 禁止事項

1. 禁止在 `for` / `while` / `forEach` / `map` / `filter` / `reduce` / 遞迴中查資料庫或打 API。
2. 禁止列表頁一次撈全表。
3. 禁止後台表格無 limit / pagination。
4. 禁止排行榜即時計算全部資料。

## 標準做法

1. 先收集 IDs。
2. 使用 `.in()` 批量查詢。
3. 使用 `Map` / `Set` 在記憶體組裝資料。
4. 列表必須 limit / pagination。
5. 大量統計應考慮 view、RPC、batch query。
