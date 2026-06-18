-- =====================================================================
-- 第 1 階段 / 步驟 3：收緊 Storage 政策
-- =====================================================================
-- ⚠️ 只在「測試庫」執行（lwynbnphzpmbcawqvycy）。正式庫先不要動。
-- 目標：proof-images / pet-images 由「anon 也能任意寫/刪」收緊為
--       「公開讀、寫入/刪除限 authenticated（登入身分）」。
-- bucket 仍是 public → 公開 URL 顯示不受影響（見證牆/寵物圖照常顯示）。
-- 已實測：登入學員 token 可正常上傳（不會擋到打卡）。
-- =====================================================================

-- ---------- 1. 移除舊的「全開」政策 ----------
DROP POLICY IF EXISTS "proof_images_all" ON storage.objects;
DROP POLICY IF EXISTS "pet_images_all"   ON storage.objects;

-- ---------- 2. 公開讀（兩個 bucket，anon + authenticated 都可讀） ----------
DROP POLICY IF EXISTS "imgs_public_read" ON storage.objects;
CREATE POLICY "imgs_public_read" ON storage.objects
  FOR SELECT
  USING (bucket_id IN ('proof-images', 'pet-images'));

-- ---------- 3. 寫入（新增）：限登入身分 ----------
DROP POLICY IF EXISTS "imgs_auth_insert" ON storage.objects;
CREATE POLICY "imgs_auth_insert" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id IN ('proof-images', 'pet-images'));

-- ---------- 4. 覆蓋（upsert 用）：限登入身分 ----------
DROP POLICY IF EXISTS "imgs_auth_update" ON storage.objects;
CREATE POLICY "imgs_auth_update" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id IN ('proof-images', 'pet-images'))
  WITH CHECK (bucket_id IN ('proof-images', 'pet-images'));

-- ---------- 5. 刪除：限登入身分（後台刪見證牆圖片用） ----------
DROP POLICY IF EXISTS "imgs_auth_delete" ON storage.objects;
CREATE POLICY "imgs_auth_delete" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id IN ('proof-images', 'pet-images'));

-- ---------- 6. 確認結果（當「後」對照） ----------
SELECT policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY policyname;

-- =====================================================================
-- Rollback（若要還原成舊的全開政策）：
--   DROP POLICY IF EXISTS "imgs_public_read" ON storage.objects;
--   DROP POLICY IF EXISTS "imgs_auth_insert" ON storage.objects;
--   DROP POLICY IF EXISTS "imgs_auth_update" ON storage.objects;
--   DROP POLICY IF EXISTS "imgs_auth_delete" ON storage.objects;
--   CREATE POLICY "proof_images_all" ON storage.objects FOR ALL TO anon, authenticated
--     USING (bucket_id = 'proof-images') WITH CHECK (bucket_id = 'proof-images');
--   CREATE POLICY "pet_images_all" ON storage.objects FOR ALL TO anon, authenticated
--     USING (bucket_id = 'pet-images') WITH CHECK (bucket_id = 'pet-images');
-- =====================================================================
