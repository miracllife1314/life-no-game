# 《NLP人性溝通術計分系統》效能與流暢度優化第一階段：智慧分流與資料庫預計算 規格書

本規格書針對系統「流暢度（變順）」提供第一階段實作規格，解決首頁載入慢、切換分頁卡頓、以及隨著學員人數增加網頁會「越來越卡」的效能痛點。

---

## ⚡ 效能痛點與優化方案對照

| 痛點問題 (現狀) | 優化方案 (第一階段實作) | 預期流暢度提升 |
|---|---|---|
| **全表無篩選查詢**：每次登入下載歷史所有期數、全班學員與打卡（幾十 MB 資料）。 | **期數篩選器**：SQL 自動帶入 `batch_id` 過濾，只下載當前班期的必要資料。 | ⬇️ 數據下載量減少 **90%** |
| **瀏覽器暴力雙迴圈**：在 JavaScript 中用雙重迴圈（`.find()`）聯立打卡、學員與隊伍，網頁凍結卡頓。 | **Map 雜湊對齊**：用常數時間 $O(1)$ 的 Map Lookup 機制取代傳統陣列尋找。 | 🚀 聯立對齊速度提升 **20 - 50 倍** |
| **前端加總排行榜**：前端讀取數千筆打卡，每次畫面變更就重新在瀏覽器算一次總分與排行。 | **資料庫視圖 (Postgres Views)**：排行榜完全由高效資料庫算好，前端 0.1 秒直接載入結果。 | ⬇️ 前端 CPU 運算負擔歸零 |
| **一次載入所有打卡**：見證牆有幾百筆圖文打卡，網頁一次全部繪製，導致滾動時劇烈卡頓。 | **見證牆分頁加載 (Pagination)**：每次只載入 20 筆，滾動到底部才載入下一頁。 | 🚀 滾動與流暢度達到 **60 FPS** |

---

## 🛠️ 第一部分：資料庫預計算設定 SQL (Supabase SQL)

請在 **「測試區 Supabase 專案」** 的 SQL Editor 中執行以下指令（此指令具備冪等性，可重複執行）：

```sql
-- =====================================================================
-- 效能與流暢度第一階段：資料庫排行榜預計算視圖 (Database Views)
-- =====================================================================

-- ---------- 1. 個人排行榜視圖 (v_leaderboard) ----------
-- 資料庫會自動加總學員的分數並進行排行，前端直接讀取，無須手動在 React 中計算
CREATE OR REPLACE VIEW public.v_leaderboard AS
SELECT 
  p.id AS student_id,
  p.name AS student_name,
  p.role,
  p.team_id,
  p.batch_id,
  p.status,
  t.name AS team_name,
  COALESCE(p.score, 0) AS total_score,
  -- 產生排行名次（依分數從高到低，同分同名次）
  DENSE_RANK() OVER (PARTITION BY p.batch_id ORDER BY COALESCE(p.score, 0) DESC) AS rank
FROM 
  public.profiles p
LEFT JOIN 
  public.teams t ON p.team_id = t.id
WHERE 
  p.role = 'student' AND p.status = 'active';

-- ---------- 2. 小隊排行榜視圖 (v_team_leaderboard) ----------
-- 自動加總隊伍分數並排行
CREATE OR REPLACE VIEW public.v_team_leaderboard AS
SELECT 
  t.id AS team_id,
  t.name AS team_name,
  t.batch_id,
  COALESCE(t.total_score, 0) AS team_score,
  DENSE_RANK() OVER (PARTITION BY t.batch_id ORDER BY COALESCE(t.total_score, 0) DESC) AS rank
FROM 
  public.teams t;
```

---

## 💻 第二部分：前端代碼重構指引 (Frontend Refactor)

### 1. 將暴力平行撈取改為「精準期數與個人過濾」
修改 `app/page.tsx` 中 `fetchData` 函數的 Supabase 請求，加上當前班期（`currentBatchId`）或個人 ID 過濾：

```typescript
// 修正前的暴力全撈：
const submissionsRes = await supabase.from('submissions').select('*');
const profilesRes = await supabase.from('profiles').select('*');

// 修正後的精準過濾：
// 1. 打卡紀錄：只撈取「當前班期」的打卡
const submissionsRes = await supabase
  .from('submissions')
  .select('*')
  .eq('batch_id', currentBatchId);

// 2. 積分日誌：流水帳極多，只撈取「當前登入者自己」的紀錄
const scoreLogsRes = await supabase
  .from('score_logs')
  .select('*')
  .eq('student_id', loggedInUserId);
```

### 2. 用 Map 雜湊表取代雙重迴圈 (Map Lookup)
將前端 JavaScript 聯立關聯的程式碼進行優化，防範畫面凍結卡頓：

```typescript
// ❌ 修正前：雙重迴圈，時間複雜度 O(N * M)，資料多時會卡死
const joinedSubmissions = rawSubmissions.map(sub => {
  const profile = rawProfiles.find(p => p.id === sub.student_id);
  const team = rawTeams.find(t => t.id === profile?.team_id);
  return { ...sub, profile, team };
});

// ✅ 修正後：Map 常數查詢，時間複雜度 O(N + M)，瞬間完成
const profileMap = new Map(rawProfiles.map(p => [p.id, p]));
const teamMap = new Map(rawTeams.map(t => [t.id, t]));

const joinedSubmissions = rawSubmissions.map(sub => {
  const profile = profileMap.get(sub.student_id);
  const team = profile ? teamMap.get(profile.team_id) : undefined;
  return { ...sub, profile, team };
});
```

### 3. 見證牆導入分頁讀取 (Pagination)
不要一次撈取所有打卡，改為每次撈取 20 筆：

```typescript
const fetchWitnessPage = async (pageIndex: number) => {
  const PAGE_SIZE = 20;
  const from = pageIndex * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, error } = await supabase
    .from('submissions')
    .select(`
      *,
      profile:profiles(name, avatar_url),
      template:mission_templates(title)
    `)
    .eq('share_to_witness', true)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .range(from, to); // 👈 使用 range 進行分頁載入

  return data || [];
};
```

---

## 🧪 效能驗證計畫 (Verification Plan)

優化完成後，我們將檢測以下指標：

1. **網路傳輸量 (Network Payload Size)**
   * 打開 F12 Network 分頁重新整理。
   * **預期結果**：頁面載入傳輸的 JSON 大小應從原本的 **幾十 MB 降至 200KB 以下**。
2. **FPS (畫面幀率)**
   * 在見證牆或排行榜快速滾動滑鼠。
   * **預期結果**：網頁不再產生凍結（Freeze），滾動流暢，FPS 維持在 60 左右。
