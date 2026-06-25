-- =====================================================================
-- 盯盯隊長(唯讀檢視小組):
--   被指派此小組角色的學員,可「唯讀」檢視自己小組的指揮所
--   (只看「小隊成員清單」+「今日任務接龍」),其餘功能(審核/補簽/招募…)全部看不到。
--   資安:他角色仍是「學員」,RLS 仍會擋掉任何寫入(審核/調分/幫人打卡)。
--
-- 作法:squad_roles 加一欄 can_view_squad;建立一個「盯盯隊長」角色設成 true。
--   之後大隊長/小隊長用現有的「指派小組角色」把某成員設成「盯盯隊長」即可。
-- 冪等:可重複執行。
-- =====================================================================

-- 1) 加欄位(預設 false,既有角色不受影響)
alter table public.squad_roles
  add column if not exists can_view_squad boolean not null default false;

-- 2) 建立「盯盯隊長」角色(若尚未有同名角色)
insert into public.squad_roles (name, duties, can_view_squad)
select '盯盯隊長', array['唯讀檢視小組打卡狀態與接龍(不能操作)'], true
where not exists (select 1 from public.squad_roles where name = '盯盯隊長');

-- 3) 確保同名角色的旗標為 true(若先前已手動建過)
update public.squad_roles set can_view_squad = true where name = '盯盯隊長';

-- 驗證:應看到「盯盯隊長 | t」
-- select name, can_view_squad from public.squad_roles order by can_view_squad desc;
