#!/usr/bin/env bash
# =============================================================
# install-hooks.sh — 把 preflight-check.sh 掛成 git pre-commit hook
#
# 用途：在「複製出去的新專案」裡執行一次，讓每次 git commit
#       都自動跑紅線掃描（scripts/preflight-check.sh）。
#
# 用法：
#   1. 先在新專案 git init
#   2. bash scripts/install-hooks.sh
#
# 母模板資料夾（非 Git）不需要執行；git 應在新專案裡才 init。
# =============================================================

set -euo pipefail

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[0;33m'; NC='\033[0m'

# 移動到專案根目錄（本腳本位於 scripts/ 下）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

# 1. 必須是 Git 專案
if [ ! -d ".git" ] || ! git rev-parse --git-dir >/dev/null 2>&1; then
  printf "${RED}✗ 這裡不是 Git 專案。${NC}\n"
  printf "  請先在專案根目錄執行：${YELLOW}git init${NC}，再重跑本腳本。\n"
  exit 1
fi

# 2. preflight 腳本要存在
if [ ! -f "scripts/preflight-check.sh" ]; then
  printf "${RED}✗ 找不到 scripts/preflight-check.sh，無法安裝 hook。${NC}\n"
  exit 1
fi

HOOK_DIR="$(git rev-parse --git-path hooks)"
HOOK_FILE="$HOOK_DIR/pre-commit"
mkdir -p "$HOOK_DIR"

# 3. 若已有 pre-commit 且非本工具產生，先備份
if [ -f "$HOOK_FILE" ] && ! grep -q "preflight-check.sh" "$HOOK_FILE" 2>/dev/null; then
  cp "$HOOK_FILE" "$HOOK_FILE.bak"
  printf "${YELLOW}- 既有 pre-commit 已備份為 pre-commit.bak${NC}\n"
fi

# 4. 寫入 pre-commit hook（快檢層：preflight + tsc + eslint，約 5 秒）
cat > "$HOOK_FILE" <<'HOOK'
#!/usr/bin/env bash
# 由 scripts/install-hooks.sh 產生。
# 快慢分層（見 docs/DEPLOYMENT.md）：pre-commit 只跑輕量快檢，完整 build 在 pre-push。
if [ -f "scripts/preflight-check.sh" ]; then
  bash scripts/preflight-check.sh || {
    echo ""
    echo "commit 已被 preflight 擋下。修正紅線後再 commit；"
    echo "確認為誤報時，可用 git commit --no-verify 略過（請謹慎）。"
    exit 1
  }
fi
# 輕量型別/排版快檢（存在才跑；抓 95% Vercel 會擋的錯，tsc 抓不到排版故補 lint）
if [ -f "tsconfig.json" ] && command -v npx >/dev/null 2>&1; then
  npx tsc --noEmit || { echo "tsc 型別檢查未過，commit 已擋下。"; exit 1; }
fi
if [ -f "package.json" ] && grep -q '"lint"' package.json; then
  npm run lint --silent || { echo "eslint 未過（含排版，Vercel 會當 build 失敗），commit 已擋下。"; exit 1; }
fi
exit 0
HOOK
chmod +x "$HOOK_FILE"

# 5. 寫入 pre-push hook（慢檢層：完整 build，攔 Vercel 靜默失敗）
PUSH_HOOK="$HOOK_DIR/pre-push"
if [ -f "$PUSH_HOOK" ] && ! grep -q "install-hooks.sh" "$PUSH_HOOK" 2>/dev/null; then
  cp "$PUSH_HOOK" "$PUSH_HOOK.bak"
  printf "${YELLOW}- 既有 pre-push 已備份為 pre-push.bak${NC}\n"
fi
cat > "$PUSH_HOOK" <<'HOOK'
#!/usr/bin/env bash
# 由 scripts/install-hooks.sh 產生。
# 完整 build 放 pre-push（不放 pre-commit）：push 即部署觸發點，
# Vercel 把排版錯誤當 build 失敗且「靜默不部署」，必須在推之前本機攔下。

# 工作區乾淨檢查（build 之前）：build 驗證的是「工作區」、push 送出的是「HEAD」——
# 工作區不乾淨時，「本機 build 綠」不代表「推上去的版本會綠」，且容易推出舊版。
if [ -n "$(git status --porcelain)" ]; then
  echo "pre-push 擋下：工作區有未 commit 的變更（未 add / 未 commit / untracked）："
  git status --short
  echo ""
  echo "請自行 commit 或 stash 後再推（本 hook 不會代你 add / commit）。"
  exit 1
fi

if [ -f "package.json" ] && grep -q '"build"' package.json; then
  echo "pre-push：執行完整 build（攔 Vercel 靜默失敗）..."
  npm run build || {
    echo ""
    echo "build 失敗，push 已擋下——推上去 Vercel 也只會靜默失敗、繼續服務舊版。"
    echo "修好再推；緊急時可 git push --no-verify（請謹慎）。"
    exit 1
  }
fi
exit 0
HOOK
chmod +x "$PUSH_HOOK"

printf "${GREEN}✓ 已安裝雙層 hook（快慢分層，見 docs/DEPLOYMENT.md）：${NC}\n"
printf "  pre-commit：preflight + tsc + eslint（約 5 秒快檢）\n"
printf "  pre-push ：完整 npm run build（無 build script 自動略過）\n"
printf "  誤報時可用 ${YELLOW}--no-verify${NC} 略過（請謹慎）。\n"
