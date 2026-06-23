# 規劃書：個資安全修復（profiles 手機號碼外洩）

> 狀態：**規劃中，尚未實作**。本文件僅供評估決策，未變更任何程式或資料庫。
> 日期：2026-06-22

## 0. 一句話
任何人用瀏覽器 F12 + 公開 anon 金鑰，就能撈出全系統學員的「姓名 + 手機號碼」。本規劃用「公開視圖 + 收緊 RLS（沿用現成函式）」修補，並先在測試站完整驗證再上正式站。

---

## 1. 問題與證據（已實際驗證）
1. **RLS 無條件開放**：`p_profiles_select` = `for select to anon, authenticated using (true)`
   （`docs/FIX_security_recover.sql:151`、`docs/PROD_step5_enable_rls.sql:91`）。連未登入訪客都能讀整張表。
2. **前端整列撈出**：`services/queries.ts:42` `from('profiles').select('*')`，含 `phone`、`auth_user_id`。
3. **anon 金鑰是公開的**（本來就在網頁原始碼）。
→ 結論：可被任意人 `supabase.from('profiles').select('name,phone')` 撈走全部，屬**真實個資外洩**（個資法風險）。

**附帶**：`submissions`、`teams` 的 select 也是 `using(true)`，但它們不含手機；本規劃聚焦 `profiles.phone`（最敏感）。`score_logs` 已是受限政策，無虞。

---

## 2. 目標 / 非目標
**目標**
- 外人（含未登入、含一般學員）**無法**取得他人手機號碼與 `auth_user_id`。
- 同時保留：排行榜（看別人姓名/分數）、小隊列表、見證牆、後台名單與手機搜尋、登入。

**目標（已決定三張一起做）**
- `profiles`：藏手機（§3~§12）。
- `submissions`：別人讀不到你「沒上見證牆」的私人心得（§13）。
- `teams`：藏邀請碼，避免被亂用（§14）。

**非目標**
- 不改登入機制本身（但 teams 需新增一支「邀請碼解析」API，見 §14）。

---

## 3. 解法總覽
採「**公開視圖 + 收緊 RLS**」（業界標準），且**用資料庫現成函式 `is_admin()` / `is_captain_of()`**，避免 G 版本的兩個錯誤（遞迴、漏掉隊長）。

1. 建 `v_public_profiles` 視圖：只露非敏感欄位（`id, name, role, team_id, batch_id, score, status`），**不含 phone / auth_user_id**，開放所有人讀。
2. 收緊 `profiles` 的 SELECT：只有「**管理員 / 本人 / 該隊隊長**」能讀整列（含手機）。
3. 前端「讀別人」的清單改讀視圖；「讀自己 / 後台需要手機」維持讀 `profiles`。

> 為何視圖有效：預設視圖以擁有者權限執行、會繞過底表 RLS，只回我們挑的安全欄位 → 公開名字可、手機讀不到。

---

## 4. 影響範圍盤點（grounded，逐處）
### 4a. 要從 profiles 改讀「公開視圖」的（讀別人、只需姓名/分數/隊別）
| 位置 | 用途 |
|---|---|
| `services/queries.ts:42` | 主載入（排行榜/小隊/見證/下拉的資料來源）|
| `services/queries.ts:87` | 第二載入（歷屆神人榜/姓名）|
| `app/page.tsx:432 / 469 / 503` | 註冊/入期後重撈整包名單 |

### 4b. 維持讀 profiles（需要手機，且 RLS 會放行）
| 位置 | 角色 | 為何要留 |
|---|---|---|
| `hooks/useAdminPeople.ts:25` | 管理員 | 後台名單需手機（`is_admin()` 放行整列）|
| `app/page.tsx:178` (`eq id`) | 管理員/隊長看個人 | 看單一學員面板 |
| 本人自己的資料 | 學員 | 看自己手機（`auth.uid()=auth_user_id` 放行）|

### 4c. phone 實際使用點（都在後台，走 4b）
`AdminDashboard`(末3碼)、`AdjustTab`(搜尋)、`RosterTab`(顯示/編輯/搜尋)、`TeamsTab`(末3碼/手機欄)。
→ 全是**管理員畫面**，靠 `is_admin()` 仍讀得到。排行榜/見證/小隊（給學員看的）**都不需要別人手機**。

### 4d. 需確認的點（實作時驗證）
- `hooks/useAuth.ts:70/105` 是否在「未登入(anon)」狀態下讀 profiles？登入現已走 `/api/auth/login`（service role）。若這兩處是舊的 client 讀取，收緊後可能受影響 → 實作時先確認是否為死碼或改走 API。
- 收緊後，前端 `currentUser`（本人）仍要拿得到自己的手機：由登入 API 回傳的 profile 提供，或加一次「自己那列」的讀取。

---

## 5. 詳細步驟
### 步驟 1：SQL（測試庫先跑）
```sql
-- 1) 公開視圖：只露非敏感欄位
create or replace view public.v_public_profiles as
  select id, name, role, team_id, batch_id, score, status, created_at
  from public.profiles;
grant select on public.v_public_profiles to anon, authenticated;

-- 2) 收緊 profiles 的 SELECT（用現成函式，不遞迴、保留隊長）
drop policy if exists "p_profiles_select" on public.profiles;
create policy "p_profiles_select" on public.profiles
  for select to anon, authenticated
  using ( public.is_admin()
          or auth.uid() = auth_user_id
          or public.is_captain_of(id) );
```
> 註：`anon` 仍保留在政策上，但 `using` 條件對未登入者幾乎都不成立（無 auth.uid）。登入查名+電話走 service role，不受影響。

### 步驟 2：前端（4a 各處改讀視圖）
- 把 4a 的 `from('profiles').select('*')` → `from('v_public_profiles').select('*')`。
- 確保本人手機來源（登入 API 回傳已含；必要時補一次自我讀取）。
- 型別：`Profile` 對「別人」不再有 `phone`（本來就不該有）；稽核有無程式預設別人有 phone（盤點顯示只有後台用，安全）。

### 步驟 3：本機 build + 等價檢查
### 步驟 4：測試站（測試庫）整套驗證（見 §7）
### 步驟 5：你確認後才上正式站（見 §8）

---

## 6. 風險與回滾
| 風險 | 說明 | 對策 |
|---|---|---|
| 排行榜/小隊變空 | 收緊後若漏改某個讀取，學員看不到別人 | 逐處改視圖 + 測試站清單逐項點過 |
| 把所有人鎖在外 | RLS 寫錯 | 用現成 `is_admin/is_captain_of`，先測試庫 |
| 隊長功能壞 | 漏 `is_captain_of` | 政策已含；測試站用隊長帳號驗 |
| 本人看不到自己手機 | 收緊後自我讀取漏掉 | 由登入 API 提供/補自我讀取 |
**回滾**：一行 SQL 即可還原舊政策
```sql
drop policy if exists "p_profiles_select" on public.profiles;
create policy "p_profiles_select" on public.profiles for select to anon, authenticated using (true);
```
（前端改視圖的部分用 git revert 對應 commit。）

---

## 7. 測試計畫（測試站，逐項勾）
- [ ] 學員登入正常、看得到自己的姓名/手機
- [ ] 排行榜（神人榜/神隊榜）看得到**別人**姓名與分數
- [ ] 小隊列表、見證牆、各下拉名單正常
- [ ] 隊長：指揮所看得到組員
- [ ] 管理員：後台名單顯示手機、**用手機搜尋**正常
- [ ] **滲透測試**：用一般學員身分在 F12 跑 `from('profiles').select('phone')` → **應拿不到別人手機**（只剩自己）
- [ ] F12 跑 `from('v_public_profiles').select('*')` → 有姓名分數、**無 phone 欄位**
- [ ] Console 無錯誤

---

## 8. 部署計畫
1. 測試站(staging/測試庫)跑完 §7 全綠、你也看過。
2. 正式庫：貼 §5 步驟1 的 SQL（你在 Supabase SQL Editor 執行；我無正式庫寫入權）。
3. 前端 commit 合併到 main（Vercel 自動部署）。
4. 上線後立刻用一般學員身分做一次 §7 的滲透測試確認封住。
> 注意：此為 RLS 變更，過程中盡量避開學員大量使用時段。

---

## 9. 工時與規模
- SQL：1 份小腳本（視圖 + 1 條政策）。
- 前端：約 5 處讀取改視圖 + 本人手機來源處理 + 型別稽核。
- 測試：測試站走一輪 §7。
- **規模：中。風險：中（在正式站動 RLS，但有測試站先驗 + 一行回滾）。**

---

## 10. 需你決定的未決問題
1. ~~隊長要不要看到組員手機？~~ → **已決定：要（隊長可看組員手機）**。見 §12 補充：需多一個「隊長補撈」與「指揮所加手機顯示」。
2. 一併處理 `submissions`/`teams` 的 `using(true)` 嗎？（本次建議先不動，另案。）
3. 何時做？現在 / 等手上 UI 批次告一段落。

---

## 12. 補充：因「隊長可看組員手機」新增的工項
背景：主載入改讀視圖後 `profiles` state 不含手機；而 `CaptainDashboard` 目前**也還沒顯示手機**、且資料來自主 state。故需：
1. **RLS**：維持 `is_captain_of(id)`（§5 政策已含，隊長可讀組員整列含手機）。
2. **前端補撈**：當登入者為隊長時，補一次 `from('profiles').select('*').eq('team_id', 自己的隊)`（RLS 放行），把手機併進指揮所用的資料。
3. **UI**：在 `CaptainDashboard` 組員清單加上手機顯示（目前無）。
4. **測試**：隊長帳號在指揮所看得到組員手機；但**切到排行榜/別隊**時看不到別人手機（只有自己隊）。
> 規模影響：在原「中」之上再 +1 個補撈 + 1 處小 UI，整體仍屬中等。

---

## ⛔ 鐵則：一律先在「測試區（測試庫）」做完並驗證，確認無誤、你看過後，才碰正式區
- 所有 RLS SQL **先套測試庫**（我有測試庫金鑰，可直接套+用 F12 滲透測試驗）。
- 前端改動走 `staging` 分支 → 測試站驗證。
- **正式庫的 SQL 一律等你最後核可，由你在 Supabase SQL Editor 執行**（我無正式庫寫入權，本來就動不了）。
- 正式站前端也等測試站全綠才合併 `main`。

---

## 13. submissions（私人心得外洩）修復設計
**敏感**：沒上見證牆的 proof_text/照片（私人心得）目前任何人可讀。
**仍需廣讀的**：①見證牆(approved 且 share_to_witness/自由貼文) ②邀約王者/影響力之神排行榜(需跨學員數「特定任務的 approved 筆數」)。

設計：
1. 建視圖 `v_witness_submissions`：只含「approved 且(share_to_witness 或 task-custom-post)」、安全欄位 → 見證牆改讀它。
2. 排行榜的跨學員統計改用**計數視圖/RPC**（只回「某任務各人 approved 次數」，不外洩內容）。
3. 收緊 `submissions` SELECT：`is_admin() OR self OR is_captain_of(student_id)`（私人心得只剩自己/隊長/管理員）。
4. 前端：見證牆→視圖；邀約/影響力排行→計數來源；主載入(`queries.ts:45`)對非管理員只回自己/本隊(進度本來就只需自己的)。
- **複雜度：高**（排行榜跨讀是主要難點）。

## 14. teams（邀請碼外洩）修復設計
**敏感**：`invite_code`（外流可被亂加入小隊）。
**卡點**：目前**註冊時是把所有隊的邀請碼下載到瀏覽器**比對(`useAuth:124`、`page.tsx:425/492`)——這正是外洩主因。

設計：
1. 建視圖 `v_public_teams`：排除 `invite_code` → 排行榜/小隊列表改讀它。
2. 新增 server API `/api/invite/resolve`（service role）：傳邀請碼回該隊資訊；**註冊改呼叫它**，前端不再下載邀請碼。
3. 收緊 `teams` 含 `invite_code` 的整列讀取：限管理員 + 該隊隊長(產生邀請連結用)。
- **複雜度：中**（多一支小 API + 註冊流程改一處）。

## 15. 三張一起做的整體評估（更新 §9）
- **規模：大**（profiles 中 + submissions 高 + teams 中；含 1 支邀請碼 API、1 個計數視圖/RPC、多處前端改視圖）。
- **風險：中高**（同時動三張表 RLS；但全程測試庫先行 + 每張都有一行 SQL 回滾）。
- **建議節奏**：即使「一起做」，實作與上線仍**分三批**（profiles→teams→submissions），一批測穩再下一批，降低同時出錯難查的風險。

---

## 11. 不做的話（替代/緩解）
- **只改前端不撈 phone → 沒用**：RLS 還開著，有心人照樣直接 `select phone`。
- 唯一有效的緩解都需動 RLS；若暫不做，至少要知道「目前手機是對外可撈的」狀態持續存在。
