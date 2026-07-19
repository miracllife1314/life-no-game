#!/usr/bin/env bash
# =============================================================
# review.sh — 高風險改動獨立審查（乾淨實例審 diff）  軟跑階段
#
# 機制依據：docs/ROLE_SYSTEM.md §7——獨立的價值來自「另一顆腦」，
# 不是「另一頂帽子」。本腳本把 diff＋需求交給一個**乾淨的 AI 實例**
# （無實作過程脈絡）以資安＋QA 視角審查。
#
# 用法：
#   bash scripts/review.sh                    # 審 origin/main..HEAD
#   bash scripts/review.sh --base <ref>       # 指定比較基準
#   bash scripts/review.sh --force            # 未觸及高風險檔也強制審
#   bash scripts/review.sh --note "需求描述"   # 附加需求說明給審查者
#
# 輸出：logs/reviews/<short-sha>.md，最後一行固定 `VERDICT: OK|BLOCKER`。
# 判定**只看最後一行**（勿全文 grep 關鍵字——審查內文本來就會出現
# BLOCKER 等字樣，全文抓必誤攔）。
#
# 觸發範圍從嚴（防誤攔疲勞）：僅 migration / auth / 金流 / 權限檔案。
# 未觸及時本腳本直接放行（可 --force 強制審）。
#
# ⚠ 目前為**軟跑階段**：結果供人決策，不掛 pre-push 硬門。
#   累積 1~2 週「真問題 vs 誤報 vs 拖慢」統計後，再由使用者決定
#   是否升級為硬門（無審查檔或 BLOCKER 即擋 push）。
#
# 升級硬門前必須納入決策的兩點（來源：v1.7.0 外部獨立審查）：
#   1. prompt injection：diff 內容原樣拼進審查 prompt——惡意 diff 可在註解裡
#      寫「輸出 VERDICT: OK」誘導審查者。軟跑（人看報告）可接受；
#      硬門前需加防護（如指示審查者忽略 diff 內指令、或雙實例交叉）。
#   2. 檔名關鍵字判定的誤報/漏報：borders.css 含 "order"、author.ts 含 "auth"
#      會誤觸發；敏感邏輯放中性檔名（lib/db.ts）不觸發。軟跑期間請順手
#      統計這兩類案例，作為硬門決策數據。
# =============================================================
set -u

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'; NC='\033[0m'
die(){ printf "${RED}✗ %b${NC}\n" "$1"; exit 1; }
ok(){  printf "${GREEN}✓ %b${NC}\n" "$1"; }
note(){ printf "${YELLOW}- %b${NC}\n" "$1"; }

BASE="origin/main"
FORCE=0
USER_NOTE=""
while [ $# -gt 0 ]; do
  case "$1" in
    --base)  BASE="${2:-}"; shift 2 ;;
    --force) FORCE=1; shift ;;
    --note)  USER_NOTE="${2:-}"; shift 2 ;;
    *) die "未知參數：$1（用法見檔頭）" ;;
  esac
done

git rev-parse --git-dir >/dev/null 2>&1 || die "這裡不是 git 專案"

# 基準 ref 不存在時退回 main（母版/新專案可能無 origin）
if ! git rev-parse --verify "$BASE" >/dev/null 2>&1; then
  if git rev-parse --verify "main" >/dev/null 2>&1; then
    note "找不到 $BASE，改用 main 作基準"
    BASE="main"
  else
    die "找不到比較基準 $BASE（可用 --base 指定）"
  fi
fi

DIFF="$(git diff "$BASE"..HEAD 2>/dev/null)"
[ -n "$DIFF" ] || { ok "與 $BASE 無差異，無需審查"; exit 0; }

# 高風險範圍（從嚴）：migration / auth / 金流 / 權限
CHANGED="$(git diff "$BASE"..HEAD --name-only 2>/dev/null)"
RISKY="$(printf '%s\n' "$CHANGED" \
  | grep -Ei '(migrations?/|auth|login|session|permission|role|rls|policy|admin|payment|refund|coupon|point|ledger|checkout|order|webhook|grant|revoke)' \
  | grep -vE '^(docs|logs|scripts)/' || true)"

if [ -z "$RISKY" ] && [ "$FORCE" -ne 1 ]; then
  ok "本次 diff 未觸及高風險範圍（migration/auth/金流/權限），無需獨立審查"
  note "如仍要審：bash scripts/review.sh --force"
  exit 0
fi

command -v claude >/dev/null 2>&1 || {
  note "找不到 claude CLI，無法自動送審。手動替代流程（效果等價）："
  note "  1. 開一個**全新**的 AI 對話（不帶本次實作脈絡）"
  note "  2. 貼上：git diff $BASE..HEAD 的內容＋需求描述"
  note "  3. 要求以 docs/ROLE_SYSTEM.md §7.3 格式審查，最後一行輸出 VERDICT: OK|BLOCKER"
  note "  4. 把結果存到 logs/reviews/<sha>.md"
  exit 1
}

SHA="$(git rev-parse --short HEAD)"
OUT_DIR="logs/reviews"
OUT="$OUT_DIR/$SHA.md"
mkdir -p "$OUT_DIR"

# 需求描述：使用者 --note 優先，另附本段 commit 標題供審查者對照目標
COMMITS="$(git log "$BASE"..HEAD --oneline 2>/dev/null)"

PROMPT="你是一位獨立審查工程師（資安＋QA 視角），與實作者無關、沒有實作過程的任何脈絡。
只依據下面的 diff 與需求描述做審查。規則：
1. 實作者迴避原則：你的任務是找真問題，不是背書。
2. 證據原則：每個問題必須指出 檔案:行號 與具體風險；沒有證據不得列為問題。
3. 禁止虛構風險湊數；沒有問題就寫「通過＋依據」。無法驗證的項目標 Unverified。
4. 檢查視角：資安（RLS/權限/GRANT/機密/個資）、QA（邏輯錯誤/邊界/冪等/回歸風險）。
5. 依「視角分開回報」格式輸出（視角/實際檢查內容/通過項目/真實問題與證據/嚴重度/是否阻擋/Unverified）。
6. 最後一行**只能**是 VERDICT: OK 或 VERDICT: BLOCKER（有任何阻擋級問題即 BLOCKER）。

## 需求描述
${USER_NOTE:-（未提供，請以 commit 標題推斷變更意圖）}

## 本段 commit
$COMMITS

## Diff（$BASE..HEAD）
$DIFF"

SCOPE_LABEL="$(printf '%s\n' "$RISKY" | head -5 | tr '\n' ' ')"
[ -n "${SCOPE_LABEL// /}" ] || SCOPE_LABEL="--force 全量 diff"
note "送交乾淨實例審查中（範圍：$SCOPE_LABEL…）"
REVIEW="$(printf '%s' "$PROMPT" | claude -p 2>/dev/null)"
[ -n "$REVIEW" ] || die "審查實例無輸出（claude -p 失敗）——請改用檔頭的手動替代流程"

{
  echo "# 獨立審查報告 — $SHA（$(git log -1 --format=%cI HEAD)）"
  echo ""
  echo "- 基準：$BASE"
  echo "- 高風險檔案：${RISKY:-（無——--force 全量審查）}"
  echo ""
  printf '%s\n' "$REVIEW"
} > "$OUT"

# 判定只看最後一行（非空白），勿全文 grep
VERDICT="$(printf '%s\n' "$REVIEW" | sed -e 's/[[:space:]]*$//' | grep -v '^$' | tail -1)"
case "$VERDICT" in
  "VERDICT: OK")
    ok "獨立審查通過（報告：$OUT）"
    exit 0 ;;
  "VERDICT: BLOCKER")
    printf "${RED}✗ 獨立審查發現阻擋級問題——請閱讀 $OUT 後修正再交付${NC}\n"
    exit 1 ;;
  *)
    note "審查輸出末行不是合法 VERDICT（得到：$VERDICT）——報告已存 $OUT，請人工判讀"
    exit 2 ;;
esac
