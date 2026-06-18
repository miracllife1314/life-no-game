-- =====================================================================
-- NLP 課程計分系統 — LOCAL 測試庫真實身分+RLS安全鎖 (C 版通電 SQL)
-- 說明：此版本啟用真實身分認證 (JWT RLS) 與欄位 Trigger 保護，用於 LOCAL 測試庫驗收。
-- 請在 LOCAL 測試庫 (lwynbnphzpmbcawqvycy) SQL Editor 中貼上並執行一次。
-- =====================================================================

-- ---------- 1. 啟用 profiles auth_user_id 與 login_attempts 表 ----------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS auth_user_id uuid;
CREATE INDEX IF NOT EXISTS idx_profiles_auth_user_id ON public.profiles(auth_user_id);

CREATE TABLE IF NOT EXISTS public.login_attempts (
  id         bigserial primary key,
  ip         text,
  phone      text,
  created_at timestamptz default now()
);
CREATE INDEX IF NOT EXISTS idx_login_attempts_phone ON public.login_attempts(phone, created_at);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip    ON public.login_attempts(ip, created_at);
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;


-- ---------- 2. 建立 RLS 權限輔助函式 ----------

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE auth_user_id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_captain_of(p_student_id text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles me
    JOIN public.profiles stu ON stu.id = p_student_id
    WHERE me.auth_user_id = auth.uid()
      AND me.role = 'captain'
      AND me.team_id IS NOT NULL
      AND me.team_id = stu.team_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_captain_of_team(p_team_id text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE auth_user_id = auth.uid() AND role = 'captain' and team_id = p_team_id
  );
$$;


-- ---------- 3. 欄位保護與防偽造打卡 Trigger (INVOKER) ----------

-- profiles 欄位變更保護
CREATE OR REPLACE FUNCTION public._guard_profiles_update()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF public.is_admin() THEN RETURN NEW; END IF;
  IF current_user IN ('anon','authenticated') THEN
    IF  NEW.score        IS DISTINCT FROM OLD.score
     OR NEW.role         IS DISTINCT FROM OLD.role
     OR NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id
     OR NEW.batch_id     IS DISTINCT FROM OLD.batch_id
     OR NEW.team_id      IS DISTINCT FROM OLD.team_id
     OR NEW.status       IS DISTINCT FROM OLD.status
     OR NEW.captain_id   IS DISTINCT FROM OLD.captain_id THEN
      RAISE EXCEPTION '[安全] 無權變更敏感欄位（分數/角色/隊別/狀態）。';
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_guard_profiles_update ON public.profiles;
CREATE TRIGGER trg_guard_profiles_update 
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public._guard_profiles_update();

-- submissions 打卡防偽造 (強制身分與防禦修正分數)
CREATE OR REPLACE FUNCTION public._sanitize_submission_insert()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_req boolean; v_pts integer; v_maxc integer; v_cnt integer; v_found boolean := false;
BEGIN
  IF public.is_admin() OR public.is_captain_of(NEW.student_id) THEN RETURN NEW; END IF;
  IF current_user NOT IN ('anon','authenticated') THEN RETURN NEW; END IF;
  
  -- 限制 1：只能為自己打卡
  IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = NEW.student_id AND p.auth_user_id = auth.uid()) THEN
    RAISE EXCEPTION '[安全] 只能為自己建立打卡紀錄。';
  END IF;
  
  -- 取得任務設定
  SELECT t.requires_approval, t.score, COALESCE(t.max_completions,1) INTO v_req, v_pts, v_maxc
  FROM public.tasks t WHERE t.id = NEW.mission_id;
  IF FOUND THEN v_found := true; END IF;
  
  IF NOT v_found THEN
    SELECT (m.review_type <> 'auto'), m.points, COALESCE(m.max_completions,1) INTO v_req, v_pts, v_maxc
    FROM public.missions m WHERE m.id = NEW.mission_id;
    IF FOUND THEN v_found := true; END IF;
  END IF;
  
  IF NOT v_found THEN RAISE EXCEPTION '[安全] 無效的任務 ID。'; END IF;
  
  -- 限制 2：打卡次數限制
  IF v_maxc > 0 AND NEW.mission_id <> 'task-custom-post' THEN
    SELECT COUNT(*) INTO v_cnt FROM public.submissions s
    WHERE s.mission_id = NEW.mission_id AND s.student_id = NEW.student_id AND s.status <> 'rejected';
    IF v_cnt >= v_maxc THEN RAISE EXCEPTION '[安全] 此任務已達可完成次數。'; END IF;
  END IF;
  
  -- 強制校正欄位值
  NEW.status        := CASE WHEN v_req THEN 'pending' ELSE 'approved' END;
  NEW.score_awarded := CASE WHEN v_req THEN 0 ELSE v_pts END;
  NEW.reviewed_by   := null;
  NEW.reviewed_at   := CASE WHEN v_req THEN null ELSE now() END;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_sanitize_submission_insert ON public.submissions;
CREATE TRIGGER trg_sanitize_submission_insert 
  BEFORE INSERT ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION public._sanitize_submission_insert();

-- submissions 狀態審核保護 (防止非法審核通過)
CREATE OR REPLACE FUNCTION public._guard_submission_update()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF public.is_admin() OR public.is_captain_of(NEW.student_id) THEN RETURN NEW; END IF;
  IF current_user IN ('anon','authenticated') THEN
    IF  NEW.status        IS DISTINCT FROM OLD.status
     OR NEW.score_awarded IS DISTINCT FROM OLD.score_awarded
     OR NEW.student_id    IS DISTINCT FROM OLD.student_id
     OR NEW.mission_id    IS DISTINCT FROM OLD.mission_id
     OR NEW.reviewed_by   IS DISTINCT FROM OLD.reviewed_by THEN
      RAISE EXCEPTION '[安全] 無權變更打卡的審核狀態或分數。';
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_guard_submission_update ON public.submissions;
CREATE TRIGGER trg_guard_submission_update 
  BEFORE UPDATE ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION public._guard_submission_update();


-- ---------- 4. 鎖定 adjust_score (RPC) ----------
CREATE OR REPLACE FUNCTION public.adjust_score(
  p_student_id text, p_amount integer, p_reason text default '手動調整',
  p_submission_id text default null, p_created_by text default null
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.is_admin() OR public.is_captain_of(p_student_id)) THEN
    RAISE EXCEPTION '[安全] 僅管理員或該隊隊長可調整分數。';
  END IF;
  PERFORM public._apply_score_delta(p_student_id, p_amount, p_reason, p_submission_id, p_created_by);
END; $$;


-- ---------- 5. 設定 RLS 政策 ----------

-- 清除舊政策
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname, tablename FROM pg_policies
    WHERE schemaname='public' AND tablename IN ('profiles','submissions','score_logs','student_notes','teams')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- profiles
CREATE POLICY "p_profiles_select" ON public.profiles FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "p_profiles_update" ON public.profiles FOR UPDATE TO anon, authenticated
  USING      (public.is_admin() OR auth.uid() = auth_user_id OR public.is_captain_of(id))
  WITH CHECK (public.is_admin() OR auth.uid() = auth_user_id OR public.is_captain_of(id));
CREATE POLICY "p_profiles_insert" ON public.profiles FOR INSERT TO anon, authenticated
  WITH CHECK (public.is_admin() OR (role in ('student','captain') AND COALESCE(score,0) = 0));
CREATE POLICY "p_profiles_delete" ON public.profiles FOR DELETE TO anon, authenticated USING (public.is_admin());

-- submissions
CREATE POLICY "p_subs_select" ON public.submissions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "p_subs_insert" ON public.submissions FOR INSERT TO anon, authenticated
  WITH CHECK (public.is_admin() OR public.is_captain_of(student_id)
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = submissions.student_id AND p.auth_user_id = auth.uid()));
CREATE POLICY "p_subs_update" ON public.submissions FOR UPDATE TO anon, authenticated
  USING (public.is_admin() OR public.is_captain_of(student_id)
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = submissions.student_id AND p.auth_user_id = auth.uid()))
  WITH CHECK (public.is_admin() OR public.is_captain_of(student_id)
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = submissions.student_id AND p.auth_user_id = auth.uid()));
CREATE POLICY "p_subs_delete" ON public.submissions FOR DELETE TO anon, authenticated
  USING (public.is_admin() OR public.is_captain_of(student_id)
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = submissions.student_id AND p.auth_user_id = auth.uid()));

-- score_logs (唯讀，不可寫入)
CREATE POLICY "p_scorelogs_select" ON public.score_logs FOR SELECT TO anon, authenticated
  USING (public.is_admin() OR public.is_captain_of(student_id)
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = score_logs.student_id AND p.auth_user_id = auth.uid()));

-- student_notes (管理員/小隊長可讀寫)
CREATE POLICY "p_notes_all" ON public.student_notes FOR ALL TO anon, authenticated
  USING      (public.is_admin() OR public.is_captain_of(student_id))
  WITH CHECK (public.is_admin() OR public.is_captain_of(student_id));

-- teams
CREATE POLICY "p_teams_select" ON public.teams FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "p_teams_update" ON public.teams FOR UPDATE TO anon, authenticated
  USING      (public.is_admin() OR public.is_captain_of_team(id))
  WITH CHECK (public.is_admin() OR public.is_captain_of_team(id));
CREATE POLICY "p_teams_insert" ON public.teams FOR INSERT TO anon, authenticated WITH CHECK (public.is_admin());
CREATE POLICY "p_teams_delete" ON public.teams FOR DELETE TO anon, authenticated USING (public.is_admin());


-- ---------- 6. 啟用 RLS ----------
ALTER TABLE public.profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.score_logs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams         ENABLE ROW LEVEL SECURITY;
