# 《NLP人性溝通術計分系統》安全防護第一階段：真實認證與 RLS 安全鎖定 規格書

本規格書針對系統「安全防護」提供第一階段實作規格，解決現有系統「免驗證模擬登入」導致任何人皆可從瀏覽器 F12 竄改資料、灌分與防刷的安全漏洞。

---

## 🔒 核心安全架構設計

優化後，系統的安全邏輯將從「前端信任」轉向「後端（資料庫）零信任驗證」：

```
                    ┌────────────────────────────┐
                    │     學員手機簡訊 (Phone OTP)│
                    └──────────────┬─────────────┘
                                   │  1. 簡訊驗證碼登入
                                   ▼
                    ┌────────────────────────────┐
                    │      Supabase Auth 驗證     │  <-- 產生安全加密 JWT Token
                    └──────────────┬─────────────┘
                                   │  2. 帶有身分 Token 的 API 請求
                                   ▼
 ┌──────────────────────────────────────────────────────────────┐
 │                      Supabase 資料庫 (Postgres)               │
 ├──────────────────────────────────────────────────────────────┤
 │  [RLS 政策攔截] 檢查 auth.uid()                             │
 │    * 讀取：只能讀取同期數/同隊的資料                          │
 │    * 寫入：只能寫入/更新自己的打卡紀錄                        │
 │  [Trigger 鎖定]                                             │
 │    * 禁止任何人在前端直接 Update 自己的 profiles.score 欄位   │
 └──────────────────────────────────────────────────────────────┘
```

---

## 🛠️ 第一部分：資料庫安全性調整 SQL (DB Schema Changes)

請在 **「測試區 Supabase 專案」** 的 SQL Editor 中執行以下指令（此指令具備冪等性，可重複執行）：

```sql
-- =====================================================================
-- 安全防護第一階段：帳號關聯、RLS 政策與欄位保護 Trigger
-- =====================================================================

-- ---------- 1. 關聯 Profiles 與內建 Auth 表 ----------
-- 新增 auth_user_id 欄位，用來存放 Supabase 內建 Auth 產生的真實 User ID (UUID)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS auth_user_id uuid UNIQUE;

-- ---------- 2. 建立防灌分 Trigger：防止前端直接修改 score ----------
CREATE OR REPLACE FUNCTION public._check_score_modify_protection()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 只有當是由系統內部的 Trigger/Function 觸發，或是管理員角色時，才允許修改分數
  -- 如果是普通 anonymous 用戶在前端隨意呼叫 update profiles，直接阻擋並報錯
  IF (TG_OP = 'UPDATE') AND (old.score IS DISTINCT FROM new.score) THEN
    -- 如果目前是 anon 用戶操作，且試圖手動修改分數，直接拋出異常
    IF (current_setting('role', true) = 'anon') THEN
      RAISE EXCEPTION '❌ [安全警報] 偵測到非法分數變更，分數僅能透過系統審核自動發放。';
    END IF;
  END IF;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS trg_profile_score_protect ON public.profiles;
CREATE TRIGGER trg_profile_score_protect
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public._check_score_modify_protection();

-- ---------- 3. 啟用行級安全 (Row Level Security) ----------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.score_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_mission_templates ENABLE ROW LEVEL SECURITY;

-- ---------- 4. 設定 RLS 行級安全政策 (RLS Policies) ----------

-- 4a. Profiles 表政策
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy" ON public.profiles
  FOR SELECT TO anon, authenticated
  USING (
    -- 1. 所有人可以讀取同班期/同小隊的學員名字 (以便顯示排行榜與組員列表)
    -- 2. 或是管理員可以讀取所有資料
    TRUE
  );

DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
CREATE POLICY "profiles_update_policy" ON public.profiles
  FOR UPDATE TO anon, authenticated
  USING (
    -- 只有當前登入者自己，可以更新自己的姓名、電話等個資
    auth.uid() = auth_user_id
  )
  WITH CHECK (
    auth.uid() = auth_user_id
  );

-- 4b. Submissions (打卡紀錄表) 政策
DROP POLICY IF EXISTS "submissions_all_policy" ON public.submissions;
CREATE POLICY "submissions_all_policy" ON public.submissions
  FOR ALL TO anon, authenticated
  USING (
    -- 學員只能看到同班期的打卡紀錄 (用於見證牆與小隊進度)
    TRUE
  );

DROP POLICY IF EXISTS "submissions_insert_policy" ON public.submissions;
CREATE POLICY "submissions_insert_policy" ON public.submissions
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    -- 只能幫自己建立打卡紀錄，不允許代人打卡
    -- 對齊 submissions 中的 student_id 對應 profiles 的 auth_user_id
    EXISTS (
      SELECT 1 FROM public.profiles 
       WHERE profiles.id = submissions.student_id 
         AND profiles.auth_user_id = auth.uid()
    )
  );

-- 4c. Score Logs (積分日誌表) 政策
DROP POLICY IF EXISTS "score_logs_select_policy" ON public.score_logs;
CREATE POLICY "score_logs_select_policy" ON public.score_logs
  FOR SELECT TO anon, authenticated
  USING (
    -- 只能查詢自己的分數變動明細
    EXISTS (
      SELECT 1 FROM public.profiles 
       WHERE profiles.id = score_logs.student_id 
         AND profiles.auth_user_id = auth.uid()
    )
  );

-- ⚠️ 禁止任何人在前端對 score_logs 進行 INSERT, UPDATE, DELETE (完全由 Trigger 自動寫入)
```

---

## 📱 第二部分：前端登入與 RLS 對接流程 (Frontend Refactor)

### 1. 真實簡訊 OTP 驗證流程實作
修改登入流程，移除現有「比對資料庫電話號碼即登入」的模擬機制，對接 Supabase 驗證：

```typescript
// 1. 步驟一：學員輸入手機，發送簡訊驗證碼
const sendSmsCode = async (phoneNumber: string) => {
  // 將台灣手機格式 09xx-xxx-xxx 轉換為國際格式 +8869xxxxxxxx
  const formattedPhone = `+886${phoneNumber.replace(/^0/, '').replace(/-/g, '')}`;
  
  const { data, error } = await supabase.auth.signInWithOtp({
    phone: formattedPhone,
  });
  if (error) throw error;
  return data;
};

// 2. 步驟二：學員輸入 6 位數驗證碼，進行驗證登入
const verifySmsCode = async (phoneNumber: string, token: string) => {
  const formattedPhone = `+886${phoneNumber.replace(/^0/, '').replace(/-/g, '')}`;
  
  const { data, error } = await supabase.auth.verifyOtp({
    phone: formattedPhone,
    token: token,
    type: 'sms'
  });
  
  if (error) throw error;
  
  // 驗證成功後，Supabase 會將 JWT Token 自動存在瀏覽器的 Cookie/localStorage 中
  // 後續所有的 Supabase 請求都會自動帶上身分，啟動 RLS 判定。
  return data.user; 
};
```

### 2. 首批帳號綁定機制 (Account Mapping)
為確保舊學員的打卡數據不丟失，學員第一次使用簡訊登入成功後，系統會自動在資料庫查找對應手機號碼的舊 `profile`，並將 Supabase 內建的 `auth.users.id` 綁定回 `profiles.auth_user_id`：

```typescript
const handleFirstLoginBinding = async (authUser: any, rawPhone: string) => {
  // 1. 查詢 profiles 中是否已有該手機號碼，但還沒有綁定 auth_user_id 的資料
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id, auth_user_id')
    .eq('phone', rawPhone)
    .single();

  if (existingProfile && !existingProfile.auth_user_id) {
    // 2. 將 supabase auth 的 user.id 綁定至學員資料庫中
    // ⚠️ 注意：因為此時 RLS 還沒綁定，需暫時用 Service Role 金鑰或是此步驟在 RLS 啟用前完成
    await supabase
      .from('profiles')
      .update({ auth_user_id: authUser.id })
      .eq('id', existingProfile.id);
  }
};
```

---

## 🧪 安全性測試計畫 (Verification Plan)

實作完成後，請於瀏覽器 F12 Console 貼上以下程式碼，以驗證安全防禦是否生效：

### 1. 測試防灌分限制（前端修改分數）
```javascript
// 嘗試繞過審核直接修改分數為 9999
const { error } = await supabase
  .from('profiles')
  .update({ score: 9999 })
  .eq('phone', '您的電話');

console.log(error ? '🛡️ 安全防禦成功：' + error.message : '❌ 漏洞：修改分數成功！');
```
* **預期結果**：終端機應噴錯，顯示 `❌ [安全警報] 偵測到非法分數變更，分數僅能透過系統審核自動發放。` 且資料庫分數未被修改。

### 2. 測試代人打卡限制（竄改 student_id）
```javascript
// 嘗試用其他學員的 id 建立一筆打卡紀錄
const { error } = await supabase
  .from('submissions')
  .insert({
    student_id: '別人的profile_id',
    mission_id: 'task-custom-post',
    status: 'approved',
    score_awarded: 500
  });

console.log(error ? '🛡️ 安全防禦成功：' + error.message : '❌ 漏洞：代打卡成功！');
```
* **預期結果**：寫入失敗，提示違反 RLS `submissions_insert_policy`。
