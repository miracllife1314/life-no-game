# TECH STACK — 技術棧

> 預設方向：**Supabase + Next.js**，但**可替換**，不綁定單一技術棧。
> 版本以 `package.json` 與實際程式碼為準；本檔為填寫模板。
> 技術特有規則集中在**技術套件**：預設套件見 `docs/tech-packs/nextjs-supabase-vercel.md`
> （含換技術棧 Swap Checklist）；換棧時新建對應套件檔，不預先建立空套件。

| 項目 | 預設方向 | 本專案實際採用 | 備註 |
|---|---|---|---|
| Frontend framework | Next.js（App Router） | `<frontend_framework>` | 版本以 package.json 為準 |
| Backend / API | Next.js Route Handlers / Server Actions | `<backend_api>` | server-only 邏輯放後端 |
| Database | Supabase（PostgreSQL） | `<database>` | 啟用 RLS |
| Auth | Supabase Auth | `<auth>` | OTP / magic link / password |
| Storage | Supabase Storage | `<storage>` | 檔案權限走 policy |
| Deployment | Vercel | `<deployment>` | production / staging 分離 |
| CSS / UI system | `<css_system>`（Tailwind / CSS variables） | `<css_system>` | 顏色走 design token |
| Testing tools | `<testing_tools>` | `<testing_tools>` | 單元 / E2E |
| Package manager | `<package_manager>`（npm / pnpm / yarn） | `<package_manager>` | 全專案統一一種 |
| Node version | `<node_version>` | `<node_version>` | 以 `.nvmrc` / package.json engines 為準 |

## 填寫規則

1. 開新專案時，請把「本專案實際採用」欄填成實際值。
2. 若更換技術棧（例如換 DB 或部署平台），必須同步更新本檔與 `docs/DEPLOYMENT.md`。
3. 不得在本檔寫死任何機密（key、密碼、連線字串）；機密只進 `.env`，範本見 `.env.example`。
4. 版本號一律「以 package.json 與實際程式碼為準」，本檔僅作導覽，不作為版本權威來源。
