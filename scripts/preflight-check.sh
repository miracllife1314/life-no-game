#!/usr/bin/env bash
# =============================================================
# preflight-check.sh — 紅線掃描（機器護欄）  v1.9.0
#
# 這是輔助護欄，不取代人工審查。
# 目前需手動執行；待專案 git init 後，應掛成 .git/hooks/pre-commit
# 或 CI step 才會自動生效。
#
# 用法：
#   bash scripts/preflight-check.sh
# 掃到重大紅線時以 exit 1 結束。
#
# 掃描範圍：只掃實際程式與 migration 目錄，排除 docs/logs/.claude 等
# 規範文件，避免誤殺文件裡用來「警告」的字串。
#
# 白名單機制（兩種，依檔案類型擇一）：
#   1. 非 migration 檔：在命中行加 inline 註記 `-- preflight-allow: <原因>`。
#   2. migration 檔（不可修改）：登記到外部白名單檔 scripts/preflight-allow.txt，
#      以「路徑:行號」標定。原因：在 migration 檔加 inline 註記會同時
#      (a) 破壞 migration 只增不改鐵律、(b) 觸發本腳本檢查 #6「既有 migration 被修改」。
#      migration 只增不改 → 行號永久穩定，path:line 不漂移，且白名單檔可被 git 稽核。
#
# 機密掃描（sk_live 等）不受任何白名單影響——就算標了 allow 或列入白名單也一律攔。
# =============================================================

set -u

# 只掃描這些目錄（不存在則略過，不報錯）
SCAN_DIRS=(
  "src"
  "app"
  "pages"
  "components"
  "lib"
  "backend"
  "supabase/migrations"
)

# migration 目錄（判斷既有檔是否被修改用）
MIGRATION_DIRS=(
  "supabase/migrations"
  "backend/supabase/migrations"
)

# 外部白名單檔（路徑:行號 放行 RLS 例外）；可用環境變數覆寫以利測試
ALLOW_FILE="${PREFLIGHT_ALLOW_FILE:-scripts/preflight-allow.txt}"

FAIL=0
YELLOW='\033[0;33m'; RED='\033[0;31m'; GREEN='\033[0;32m'; NC='\033[0m'

info()  { printf "%b\n" "$1"; }
fail()  { printf "${RED}✗ %b${NC}\n" "$1"; FAIL=1; }
pass()  { printf "${GREEN}✓ %b${NC}\n" "$1"; }
skip()  { printf "${YELLOW}- %b${NC}\n" "$1"; }

# 存在的掃描目錄
existing_dirs() {
  local out=()
  for d in "${SCAN_DIRS[@]}"; do
    [ -d "$d" ] && out+=("$d")
  done
  # 空陣列在 set -u 下直接展開會報 unbound variable（macOS bash 3.2），需守衛
  [ "${#out[@]}" -gt 0 ] && printf '%s\n' "${out[@]}"
  return 0
}

# grep 樣式於掃描目錄；命中回傳結果字串。
# 大小寫不敏感（-i）：確保 USING (true) / using(true) 都抓得到——
#   SQL 慣例常寫大寫，若大小寫敏感會漏掉真正的政策紅線。
# 第 2 參數 skip_comments=1 時，排除三種行：
#   (a) 整行註解（SQL --、JS/TS //、# 、*）—— 避免警語型註解誤報。
#   (b) 含 `preflight-allow` 標記的行 —— 已人工審核、刻意放行（非 migration 檔用）。
#   (c) 命中「路徑:行號」出現在 $ALLOW_FILE 者 —— 已人工審核的 migration 例外。
# 機密掃描不使用此排除（機密就算寫在註解、標了 allow、或列在白名單也算外洩，一律攔）。
grep_scan() {
  local pattern="$1"; local skip_comments="${2:-0}"
  local dirs=()
  while IFS= read -r d; do [ -n "$d" ] && dirs+=("$d"); done < <(existing_dirs)
  [ ${#dirs[@]} -eq 0 ] && return 1
  local out
  out="$(grep -rEnIi "$pattern" "${dirs[@]}" 2>/dev/null)"
  if [ "$skip_comments" = "1" ] && [ -n "$out" ]; then
    # inline preflight-allow 只對「非 migration 檔」生效；migration 檔一律只認
    # 外部白名單（否則可在新 migration 行尾加標記靜默繞過審核程序）。
    out="$(printf '%s\n' "$out" | grep -vE ':[0-9]+:[[:space:]]*(--|//|#|\*)' \
      | awk 'BEGIN{IGNORECASE=1} !/preflight-allow/ || /^(supabase\/migrations|backend\/supabase\/migrations)\//')"
    # 外部白名單：抽出每列第一欄「路徑:行號」→ 加尾冒號成 "path:line:" 前綴，
    # 從命中結果中剔除（結果行格式為 path:line:content，前綴唯一定位該行）。
    if [ -n "$out" ] && [ -f "$ALLOW_FILE" ]; then
      local prefixes
      prefixes="$(grep -vE '^[[:space:]]*(#|$)' "$ALLOW_FILE" | awk '{print $1":"}')"
      if [ -n "$prefixes" ]; then
        out="$(printf '%s\n' "$out" | grep -vFf <(printf '%s\n' "$prefixes"))"
      fi
    fi
  fi
  printf '%s\n' "$out"
}

info "== preflight-check =="
info "（輔助護欄，不取代人工審查）"
info ""

# --- 1~3 + RLS 相關字面紅線 -------------------------------------------------
declare -a RED_PATTERNS=(
  'using\s*\(\s*true\s*\)|using\s*true'
  'check\s*\(\s*true\s*\)|with\s+check\s*\(\s*true\s*\)'
  'allow_all_anon'
)
declare -a RED_NAMES=(
  'RLS using(true)'
  'RLS check(true)'
  'allow_all_anon'
)
for i in "${!RED_PATTERNS[@]}"; do
  hit="$(grep_scan "${RED_PATTERNS[$i]}" 1)"
  if [ -n "$hit" ]; then
    fail "偵測到紅線：${RED_NAMES[$i]}"
    printf "%s\n" "$hit" | sed 's/^/    /'
  else
    pass "無 ${RED_NAMES[$i]}"
  fi
done

# --- 4. NEXT_PUBLIC_ 卻含 service_role -------------------------------------
hit="$(grep_scan 'NEXT_PUBLIC_[A-Z0-9_]*(SERVICE_ROLE|service_role)' 1)"
if [ -n "$hit" ]; then
  fail "偵測到 NEXT_PUBLIC_ 命名包含 service_role（機密可能外洩到前端）"
  printf "%s\n" "$hit" | sed 's/^/    /'
else
  pass "無 NEXT_PUBLIC_ service_role 命名"
fi

# --- 7. 硬寫死機密（只抓具體特徵，避免泛用長字串誤報）----------------------
declare -a SECRET_PATTERNS=(
  '(sk|rk)_(live|test)_[A-Za-z0-9]{8,}'
  'AKIA[0-9A-Z]{16}'
  '-----BEGIN [A-Z ]*PRIVATE KEY-----'
  'eyJ[A-Za-z0-9_-]{5,}.*service_role'
)
declare -a SECRET_NAMES=(
  'Stripe 類金鑰 (sk_/rk_live/test)'
  'AWS Access Key (AKIA...)'
  '私鑰區塊 (PRIVATE KEY)'
  '疑似 Supabase service_role JWT'
)
secret_found=0
for i in "${!SECRET_PATTERNS[@]}"; do
  hit="$(grep_scan "${SECRET_PATTERNS[$i]}")"
  if [ -n "$hit" ]; then
    fail "偵測到疑似硬寫死機密：${SECRET_NAMES[$i]}"
    printf "%s\n" "$hit" | sed 's/^/    /'
    secret_found=1
  fi
done
[ "$secret_found" -eq 0 ] && pass "無具體特徵的硬寫死機密"

# --- 8. skills 鏡像一致性（.claude 權威 vs .agents 鏡像）--------------------
# 規則見 AI_RULES 第 8 節：兩者分岔即為第 13 號事故「雙頭馬車」。
if [ -d ".claude/skills" ] && [ -d ".agents/skills" ]; then
  drift=""
  for d in .claude/skills/*/; do
    [ -d "$d" ] || continue
    s="$(basename "$d")"
    if [ -f ".agents/skills/$s/SKILL.md" ]; then
      diff -q ".claude/skills/$s/SKILL.md" ".agents/skills/$s/SKILL.md" >/dev/null 2>&1 || drift="$drift $s"
    else
      drift="$drift $s(缺鏡像)"
    fi
  done
  if [ -n "$drift" ]; then
    fail "skills 鏡像分岔（.claude 與 .agents 不一致，修法：以 .claude 為準覆蓋鏡像）：$drift"
  else
    pass "skills 鏡像一致（.claude ↔ .agents）"
  fi
else
  skip "skills 鏡像檢查 skipped：無 .agents/skills（單工具專案不需要）"
fi

# --- 10. 入口檔一致性（CLAUDE.md 與 AGENTS.md 必須完全相同）------------------
# 兩者是同一份規則進入點，只是分別給 Claude Code 與其他 AI 工具讀。
# 單邊修改即為「雙頭馬車」風險（比照 skills 鏡像，見 AI_RULES 第 8 節）。
if [ -f "CLAUDE.md" ] && [ -f "AGENTS.md" ]; then
  if diff -q "CLAUDE.md" "AGENTS.md" >/dev/null 2>&1; then
    pass "入口檔一致（CLAUDE.md ↔ AGENTS.md）"
  else
    fail "入口檔不一致（CLAUDE.md ↔ AGENTS.md 內容分岔，修法：確認哪份最新後覆蓋另一份，使兩者完全相同）："
    diff "CLAUDE.md" "AGENTS.md" | sed 's/^/    /'
  fi
elif [ -f "CLAUDE.md" ] || [ -f "AGENTS.md" ]; then
  skip "入口檔一致性檢查 skipped：只存在其中一個入口檔（單工具專案可接受）"
fi

# --- 12. 版本一致性（changelog 最新版號 ＝ preflight 檔頭版號）----------------
# 來源：v1.6.2 事故——tag 打了新版但 changelog / 檔頭未同步，版本號散落多處而無檢查。
# 本檢查只比對兩份「檔案內」的版號（commit 當刻可驗）；tag 一致性由 scripts/release.sh 閘門把關。
# 黃字提醒不擋 commit：版號落差是文件一致性問題，非安全紅線；且下游專案可能有邊角情況。
if [ -f "docs/TEMPLATE_CHANGELOG.md" ]; then
  chlog_ver="$(grep -oE 'v[0-9]+\.[0-9]+\.[0-9]+' "docs/TEMPLATE_CHANGELOG.md" 2>/dev/null | head -1 || true)"
  header_ver="$(grep -m1 -oE '機器護欄）[[:space:]]*v[0-9]+\.[0-9]+\.[0-9]+' "scripts/preflight-check.sh" 2>/dev/null | grep -oE 'v[0-9]+\.[0-9]+\.[0-9]+' || true)"
  if [ -n "$chlog_ver" ] && [ -n "$header_ver" ]; then
    if [ "$chlog_ver" = "$header_ver" ]; then
      pass "版本一致（changelog $chlog_ver ＝ preflight 檔頭）"
    else
      skip "⚠ 版本不一致：changelog 最新 $chlog_ver ≠ preflight 檔頭 $header_ver（打 tag 前請先讓兩者一致，或用 scripts/release.sh 發版）"
    fi
  else
    skip "版本一致性檢查 skipped：無法從 changelog 或檔頭解析版號"
  fi
fi

# --- 13. 索引一致性（.claude/skills 實際資料夾 vs 索引表；黃字提醒，不擋 commit）---
# 來源：學院實戰實證——手動索引必 drift（漏列 skill、路徑寫錯）。
# R8 二選一落地：_目錄說明 skill 表與 TASK_ROUTER §0 表由本項機器對帳；
# 其餘手動表格（README 目錄樹等）改為檔頭標註「可能落後實況」。
if [ -d ".claude/skills" ]; then
  DIR_DOC="docs/_目錄說明.md"; ROUTER_DOC="docs/TASK_ROUTER.md"
  idx_drift=""
  for d in .claude/skills/*/; do
    [ -d "$d" ] || continue
    s="$(basename "$d")"
    if [ -f "$DIR_DOC" ] && ! grep -q "$s" "$DIR_DOC"; then
      idx_drift="$idx_drift 目錄說明漏列:$s"
    fi
    if [ -f "$ROUTER_DOC" ] && ! grep -q "$s" "$ROUTER_DOC"; then
      idx_drift="$idx_drift Router§0漏列:$s"
    fi
  done
  # 反向：表有列但資料夾不存在（幽靈條目）
  if [ -f "$DIR_DOC" ]; then
    listed="$(sed -n '/^## \.claude\/skills/,/^## [^.]/p' "$DIR_DOC" | grep -oE '`[a-z0-9-]+/`' | tr -d '`/' || true)"
    for s in $listed; do
      [ -d ".claude/skills/$s" ] || idx_drift="$idx_drift 目錄說明幽靈條目:$s"
    done
  fi
  if [ -f "$ROUTER_DOC" ]; then
    r_listed="$(grep -E '^\|[[:space:]]*[0-9]+[[:space:]]*\|' "$ROUTER_DOC" | awk -F'|' '{gsub(/[[:space:]]/,"",$4); print $4}' || true)"
    for s in $r_listed; do
      [ -n "$s" ] || continue
      [ -d ".claude/skills/$s" ] || idx_drift="$idx_drift Router§0幽靈條目:$s"
    done
  fi
  if [ -n "$idx_drift" ]; then
    skip "⚠ 提醒：skill 索引與 .claude/skills/ 實際資料夾不一致（修法：更新 docs/_目錄說明.md 或 TASK_ROUTER §0 表，或補建資料夾）：$idx_drift"
  else
    pass "skill 索引一致（.claude/skills ↔ _目錄說明 ↔ Router §0）"
  fi
fi

# --- Git 相關檢查（先判斷是否為 Git 專案）----------------------------------
if [ -d ".git" ] && git rev-parse --git-dir >/dev/null 2>&1; then

  # 5. .env 是否被 Git 追蹤
  tracked_env="$(git ls-files 2>/dev/null | grep -E '(^|/)\.env($|\.)' | grep -v '\.env\.example$' || true)"
  if [ -n "$tracked_env" ]; then
    fail ".env 類機密檔被 Git 追蹤："
    printf "%s\n" "$tracked_env" | sed 's/^/    /'
  else
    pass ".env 未被 Git 追蹤"
  fi

  # 6. 既有 migration 檔被「修改或刪除」（新增則放行）
  if git rev-parse HEAD >/dev/null 2>&1; then
    mig_regex=""
    for d in "${MIGRATION_DIRS[@]}"; do
      mig_regex="${mig_regex}${mig_regex:+|}^${d}/"
    done
    # 比對工作區 + 已 staged 相對於 HEAD 的狀態
    changed="$(git diff HEAD --name-status 2>/dev/null; git diff --cached --name-status 2>/dev/null)"
    bad_mig="$(printf "%s\n" "$changed" | grep -E "^(M|D)[[:space:]]" | grep -E "$mig_regex" || true)"
    if [ -n "$bad_mig" ]; then
      fail "既有 migration 檔被修改或刪除（只允許新增）："
      printf "%s\n" "$bad_mig" | sed 's/^/    /'
    else
      pass "未修改/刪除既有 migration（新增檔放行）"
    fi
  else
    skip "migration 檢查 skipped：尚無提交基準 (no HEAD)"
  fi

  # 9. 金流/交易檔變更卻無任何測試變更（黃字提醒，不擋 commit）
  #    來源：實戰回饋——TESTING.md「金流必測」規則因無機器提醒而被整批跳過。
  if git rev-parse HEAD >/dev/null 2>&1; then
    all_changed="$(( git diff HEAD --name-only 2>/dev/null; git diff --cached --name-only 2>/dev/null ) | sort -u)"
    money_changed="$(printf '%s\n' "$all_changed" | grep -Ei '(payment|refund|coupon|point|ledger|checkout|order|stock|balance|quota|seat|enroll)' | grep -viE '(\.test\.|\.spec\.|__tests__/)' | grep -vE '^(docs|logs|scripts)/' || true)"
    tests_changed="$(printf '%s\n' "$all_changed" | grep -Ei '(\.test\.|\.spec\.|__tests__/)' || true)"
    if [ -n "$money_changed" ] && [ -z "$tests_changed" ]; then
      skip "⚠ 提醒：本次變更碰到金流/交易相關檔案，但沒有任何測試變更（TESTING.md 要求金流/權限/交易必測）："
      printf '%s\n' "$money_changed" | sed 's/^/      /'
    elif [ -n "$money_changed" ]; then
      pass "金流相關變更附有測試變更"
    fi

    # 11. UI 檔案變更的手機檢查聲明三態標記（黃字提醒，不擋 commit）
    #     來源：BRAND_UI §12 手機優先硬性標準最容易被「只看桌機」跳過。
    #     本檢查**只驗證聲明狀態，不能也不宣稱能自動判斷是否破版**。
    #     聲明寫法：在本次 logs/ai_sync_log.md 紀錄中加一行三態標記——
    #       Mobile check: verified        （已實測 375px 等寬度）
    #       Mobile check: unverified      （尚未實測，僅程式碼推估）
    #       Mobile check: not-applicable  （本次變更不涉及 UI 版面）
    ui_changed="$(printf '%s\n' "$all_changed" | grep -Ei '\.(css|scss|tsx|jsx|vue|svelte|html)$|(^|/)(components|app|pages)/' | grep -vE '^(docs|logs|scripts|\.claude|\.agents)/' || true)"
    if [ -n "$ui_changed" ]; then
      mobile_state="$( (git diff HEAD -- logs/ai_sync_log.md 2>/dev/null; git diff --cached -- logs/ai_sync_log.md 2>/dev/null) \
        | grep -oEi 'Mobile check:[[:space:]]*(verified|unverified|not-applicable)' | tail -1 \
        | grep -oEi '(verified|unverified|not-applicable)$' | tr 'A-Z' 'a-z' || true)"
      case "$mobile_state" in
        verified)
          pass "手機檢查聲明：verified（已提供手機檢查聲明——僅字面驗證聲明狀態，不代表自動判斷破版）" ;;
        unverified)
          skip "⚠ 手機檢查聲明：unverified（尚未實測，僅程式碼推估）——實測 375px 後請改標 verified" ;;
        not-applicable)
          skip "手機檢查聲明：not-applicable（聲明本次不涉及 UI 版面）" ;;
        *)
          skip "⚠ 提醒：本次變更含 UI 檔案，但 logs/ai_sync_log.md 未見三態標記（Mobile check: verified / unverified / not-applicable，見 BRAND_UI §12）："
          printf '%s\n' "$ui_changed" | sed 's/^/      /' ;;
      esac
    fi

    # 14. 新 migration 建表卻無 REVOKE anon/authenticated（黃字提醒，不擋 commit）
    #     來源：學院 Staging 實證——Supabase default privileges 自動 GRANT 新表給
    #     anon/authenticated，migration 只寫 GRANT（加法）收不窄任何權限（anon 拿到
    #     56 筆權限，全靠 RLS 單層硬撐）。規則見 DB_MIGRATION_RULES 鐵律 12。
    #     只掃「新增」的 migration 檔（含未追蹤），仿第 9 項金流無測試模式。
    mig_regex14=""
    for d in "${MIGRATION_DIRS[@]}"; do
      mig_regex14="${mig_regex14}${mig_regex14:+|}^${d}/"
    done
    new_migs="$( { git diff HEAD --name-status 2>/dev/null | awk '$1=="A"{print $2}'; \
                   git diff --cached --name-status 2>/dev/null | awk '$1=="A"{print $2}'; \
                   git ls-files --others --exclude-standard 2>/dev/null; } \
                 | grep -E "$mig_regex14" | sort -u || true)"
    if [ -n "$new_migs" ]; then
      grant_missing=""; grant_ok=""
      while IFS= read -r f; do
        [ -f "$f" ] || continue
        if grep -qiE 'create[[:space:]]+table' "$f"; then
          if grep -qiE 'revoke[^;]*(anon|authenticated)' "$f"; then
            grant_ok="$grant_ok $f"
          else
            grant_missing="$grant_missing $f"
          fi
        fi
      done <<< "$new_migs"
      if [ -n "$grant_missing" ]; then
        skip "⚠ 提醒：新 migration 建表但沒有 REVOKE anon/authenticated——Supabase default privileges 會自動 GRANT，只寫 GRANT 收不窄（見 DB_MIGRATION_RULES 鐵律 12；敏感表必須顯式 REVOKE 再最小 GRANT）："
        printf '%s\n' $grant_missing | sed 's/^/      /'
      elif [ -n "$grant_ok" ]; then
        # 字面偵測：只確認檔內出現 REVOKE anon/authenticated 字樣，
        # 不驗證是否逐表覆蓋（多表 migration 只 REVOKE 一張也會過）——語意覆蓋仍須人審。
        pass "新 migration 建表偵測到 REVOKE anon/authenticated 字樣（字面偵測，逐表覆蓋仍須人審）"
      fi
    fi
  fi

else
  skip ".env 追蹤檢查 skipped: not a git repository"
  skip "migration 修改檢查 skipped: not a git repository"
fi

info ""
if [ "$FAIL" -ne 0 ]; then
  printf "${RED}preflight 失敗：發現紅線，請修正後再 commit。${NC}\n"
  exit 1
fi
printf "${GREEN}preflight 通過。${NC}\n"
exit 0
