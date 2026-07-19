---
name: karpathy-guidelines
description: Use when writing, reviewing, or refactoring code to avoid overcomplication, unnecessary rewrites, hidden assumptions, and unverifiable changes. 撰寫、審查或重構程式碼時使用，避免過度複雜、順手重構、隱藏假設與無法驗證的修改。
---

# Karpathy Guidelines — 避坑守則

規則細節見 `docs/AI_RULES.md` 第 9 節。

## 四守則

1. **Think Before Coding（想清楚再寫）**：不要亂猜、不要假裝知道，有不確定要明確標記。
2. **Simplicity First（先求簡單）**：用最小可行解法，不過度設計，不做沒被要求的功能。
3. **Surgical Changes（精準修改）**：只改本次任務需要改的地方，不順手重構、不順手改格式、不順手刪無關程式。
4. **Goal-Driven Execution（目標導向）**：每次任務都要有可驗證的成功標準；不能只說「已完成」，要說明做了什麼、怎麼測、有什麼風險。
