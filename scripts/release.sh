#!/usr/bin/env bash
# =============================================================
# release.sh — 發版一致性閘門 + 打 tag
#
# 用法：
#   bash scripts/release.sh v1.6.3
#
# 目的：杜絕「tag 存在但文件無此版」的幽靈版本（v1.6.2 事故）。
# 只有以下五項全部滿足，才會建立 git tag：
#   1. 版號格式正確（vX.Y.Z）
#   2. 工作區乾淨（所有變更已 commit——版本不能漏東西在外）
#   3. docs/TEMPLATE_CHANGELOG.md 最新版號 ＝ 傳入版號（強制先寫 changelog 條目）
#   4. scripts/preflight-check.sh 檔頭版號 ＝ 傳入版號（強制先 bump 檔頭）
#   5. preflight 通過、且該 tag 尚未存在
#
# 本腳本**不 commit、不 push**（那是人為決定）。它只做「一致才放行打 tag」。
# 打完 tag 後，自行執行：git push origin main --tags
# =============================================================
set -u

VER="${1:-}"
RED='\033[0;31m'; GREEN='\033[0;32m'; NC='\033[0m'
die(){ printf "${RED}✗ %s${NC}\n" "$1"; exit 1; }
ok(){  printf "${GREEN}✓ %s${NC}\n" "$1"; }

# 1. 版號格式
[ -n "$VER" ] || die "用法：bash scripts/release.sh v1.6.3"
echo "$VER" | grep -qE '^v[0-9]+\.[0-9]+\.[0-9]+$' \
  || die "版號格式須為 vX.Y.Z（例 v1.6.3），你給的是：$VER"

# 必須是 git 專案
git rev-parse --git-dir >/dev/null 2>&1 || die "這裡不是 git 專案，無法打 tag"

# 2. 工作區乾淨
[ -z "$(git status --porcelain)" ] \
  || die "工作區有未提交變更——請先 commit 再發版（git status 查看）"

# 3. changelog 最新版號 ＝ VER
CH="docs/TEMPLATE_CHANGELOG.md"
[ -f "$CH" ] || die "找不到 $CH"
chlog_ver="$(grep -oE 'v[0-9]+\.[0-9]+\.[0-9]+' "$CH" 2>/dev/null | head -1 || true)"
[ "$chlog_ver" = "$VER" ] \
  || die "changelog 最新版是 ${chlog_ver:-（無）}，不是 $VER——請先在 $CH 最上面寫好 $VER 的條目"
ok "changelog 最新版 ＝ $VER"

# 4. preflight 檔頭版號 ＝ VER
PF="scripts/preflight-check.sh"
[ -f "$PF" ] || die "找不到 $PF"
header_ver="$(grep -m1 -oE '機器護欄）[[:space:]]*v[0-9]+\.[0-9]+\.[0-9]+' "$PF" 2>/dev/null | grep -oE 'v[0-9]+\.[0-9]+\.[0-9]+' || true)"
[ "$header_ver" = "$VER" ] \
  || die "preflight 檔頭是 ${header_ver:-（無）}，不是 $VER——請先改檔頭並 commit"
ok "preflight 檔頭 ＝ $VER"

# 5. tag 不可重複 + preflight 通過
git rev-parse "$VER" >/dev/null 2>&1 \
  && die "tag $VER 已存在（若確需重打，先 git tag -d $VER 並刪遠端 tag）"
bash "$PF" >/dev/null 2>&1 || die "preflight 未通過——請先修正（bash scripts/preflight-check.sh 查看）"
ok "preflight 通過、tag $VER 未重複"

# 全部一致 → 打 tag
git tag "$VER" && ok "已建立 tag $VER（指向 $(git rev-parse --short HEAD)）"
echo ""
printf "${GREEN}版本一致性通過。接下來推上遠端：${NC}\n"
echo "  git push origin main --tags"
