# Storage 安全強化計畫書（proof-images / pet-images）

> 目標：補強 Supabase Storage 權限，防止學員透過 F12/API 刪除或覆蓋他人的打卡圖/神獸圖、匿名大量上傳。
> 範圍：**測試庫先做**（lwynbnphzpmbcawqvycy）。正式區未動。採「甲案：嚴格 owner/admin」。

## 現況風險（套用前）
- 兩 bucket（proof-images、pet-images）皆 public。
- 政策為「公開讀 + 任何 authenticated 可 INSERT/UPDATE/DELETE」（步驟3）。
- 實測破口：**學員 A 可刪「別人的」打卡圖（HTTP 200）**；學員可上傳/刪神獸圖（應僅管理員）。

## 目標權限
| | proof-images | pet-images |
|---|---|---|
| 讀 | 公開 | 公開 |
| 上傳 | 登入學員 | 僅管理員 |
| 覆蓋 | 擁有者(owner=auth.uid()) 或 管理員 | 僅管理員 |
| 刪除 | 擁有者 或 管理員 | 僅管理員 |

## 已執行 SQL（測試庫）
```sql
DROP POLICY IF EXISTS "imgs_public_read" ON storage.objects;
DROP POLICY IF EXISTS "imgs_auth_insert" ON storage.objects;
DROP POLICY IF EXISTS "imgs_auth_update" ON storage.objects;
DROP POLICY IF EXISTS "imgs_auth_delete" ON storage.objects;

-- proof-images
CREATE POLICY "proof_read"   ON storage.objects FOR SELECT USING (bucket_id='proof-images');
CREATE POLICY "proof_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='proof-images');
CREATE POLICY "proof_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id='proof-images' AND (owner = auth.uid() OR public.is_admin()))
  WITH CHECK (bucket_id='proof-images' AND (owner = auth.uid() OR public.is_admin()));
CREATE POLICY "proof_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id='proof-images' AND (owner = auth.uid() OR public.is_admin()));

-- pet-images（僅管理員寫/刪/覆蓋）
CREATE POLICY "pet_read"   ON storage.objects FOR SELECT USING (bucket_id='pet-images');
CREATE POLICY "pet_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='pet-images' AND public.is_admin());
CREATE POLICY "pet_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id='pet-images' AND public.is_admin()) WITH CHECK (bucket_id='pet-images' AND public.is_admin());
CREATE POLICY "pet_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id='pet-images' AND public.is_admin());
```

## 驗收結果（測試庫，已通過）
- ✅ 學員上傳自己打卡圖（200）
- 🔒 學員B 刪 A 的圖 → HTTP 400，檔案仍在
- ✅ 學員刪自己的圖（owner，200）/ 管理員刪任意（200）
- 🔒 學員上傳/刪 pet-images → 400；✅ 管理員 → 200
- security-check 16/16、test-flows 14/14

## ⚠️ 已知取捨（甲案）
- **隊長刪「隊員」見證圖**：因非 owner、非 admin → storage 刪除被擋。`removeStorageImageByUrl` 有 try/catch → 靜默失敗；見證貼文仍會從畫面移除（DB submissions 更新照常），但**圖檔可能殘留為孤兒檔**（佔空間、不再公開連結）。
  - 若要讓隊長乾淨刪自己隊員的圖（與 submissions RLS 一致），可在 proof_delete/proof_update 的條件加 `OR public.is_captain_of(<student>)`（乙案）。
- **舊檔 owner=null**：套用前上傳的舊圖 owner 可能為 null，原學員無法刪自己舊圖，但管理員仍可清理。

## Rollback（還原成步驟3「authenticated 全寫」政策）
```sql
DROP POLICY IF EXISTS "proof_read" ON storage.objects;
DROP POLICY IF EXISTS "proof_insert" ON storage.objects;
DROP POLICY IF EXISTS "proof_update" ON storage.objects;
DROP POLICY IF EXISTS "proof_delete" ON storage.objects;
DROP POLICY IF EXISTS "pet_read" ON storage.objects;
DROP POLICY IF EXISTS "pet_insert" ON storage.objects;
DROP POLICY IF EXISTS "pet_update" ON storage.objects;
DROP POLICY IF EXISTS "pet_delete" ON storage.objects;
CREATE POLICY "imgs_public_read" ON storage.objects FOR SELECT USING (bucket_id IN ('proof-images','pet-images'));
CREATE POLICY "imgs_auth_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id IN ('proof-images','pet-images'));
CREATE POLICY "imgs_auth_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id IN ('proof-images','pet-images')) WITH CHECK (bucket_id IN ('proof-images','pet-images'));
CREATE POLICY "imgs_auth_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id IN ('proof-images','pet-images'));
```
