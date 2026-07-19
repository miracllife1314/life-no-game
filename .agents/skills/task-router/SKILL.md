---
name: task-router
description: Use when starting any task, deciding which documents to read, or classifying work as Tiny Change, Prototype Mode, medium change, or high-risk task. 當開始任何任務、要決定該讀哪些文件、或要判斷屬於小改/Prototype/中改/高風險時使用。
---

# Task Router — 任務路由

任務開始前，先讀 `docs/TASK_ROUTER.md`，依任務類型判斷「改什麼讀什麼」。
規則細節以 `docs/AI_RULES.md` 為單一事實來源。

## 核心規則

1. 任務開始前先讀 `docs/TASK_ROUTER.md`。
2. 小改走 Tiny Change Fast Path。
3. Prototype 只做草稿與概念驗證，不得混入正式功能。
4. 中改在準備動手前做 Technical Review Mode。
5. 高風險任務先停手，提出方案與風險。
6. 不得每天盲目閱讀所有文件，也不得完全不讀規則就改。
7. 每次修改都要檢查是否需要同步更新 `docs/`。
