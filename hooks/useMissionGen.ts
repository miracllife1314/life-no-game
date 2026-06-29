// =====================================================================
// 任務產生：批次任務範本(規則)儲存並自動排程 / 依預覽產生任務
//   —— 從 app/page.tsx 抽出，行為完全不變。
// =====================================================================
import { supabase } from '@/lib/supabase';
import { getMondayOfWeek } from '@/lib/helpers';
import { Batch, MissionTemplate, BatchMissionTemplate, Mission } from '@/types';

interface Deps {
  setIsSyncing: (v: boolean) => void;
  fetchData: () => Promise<any>;
  batches: Batch[];
  missionTemplates: MissionTemplate[];
}

export function useMissionGen({ setIsSyncing, fetchData, batches, missionTemplates }: Deps) {
  const handleSaveBatchMissionTemplates = async (
    batchId: string,
    rules: Omit<BatchMissionTemplate, 'id' | 'created_at' | 'updated_at'>[]
  ) => {
    // 1. Delete existing rules for this cohort
    const { error: delRulesErr } = await supabase.from('batch_mission_templates').delete().eq('batch_id', batchId);
    if (delRulesErr) { console.error(delRulesErr); alert('清除任務範本規則失敗：' + delRulesErr.message); return; }

    // 2. Insert new ones if any
    if (rules.length > 0) {
      const { error: insRulesErr } = await supabase.from('batch_mission_templates').insert(
        rules.map(r => ({
          ...r,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }))
      );
      if (insRulesErr) { console.error(insRulesErr); alert('儲存任務範本規則失敗：' + insRulesErr.message); return; }
    }

    // 3. Clear existing missions for this cohort that DO NOT have student submissions yet
    const { data: currentMissions } = await supabase.from('missions').select('id').eq('batch_id', batchId);
    if (currentMissions && currentMissions.length > 0) {
      const { data: subs } = await supabase.from('submissions').select('mission_id');
      const submittedMissionIds = new Set((subs || []).map((s: any) => s.mission_id));

      const missionsToDelete = currentMissions
        .map((m: any) => m.id)
        .filter((id: string) => !submittedMissionIds.has(id));

      if (missionsToDelete.length > 0) {
        const { error: delMisErr } = await supabase.from('missions').delete().in('id', missionsToDelete);
        if (delMisErr) { console.error(delMisErr); alert('清除舊任務失敗：' + delMisErr.message); return; }
      }
    }

    // 4. Auto-generate missions for this batch so user doesn't have to confirm manually
    const batch = batches.find(b => b.id === batchId);
    if (batch && rules.length > 0) {
      const startDate = new Date(batch.start_date);
      const endDate = new Date(batch.end_date);
      const previews: any[] = [];

      rules.filter(r => r.is_enabled).forEach((rule: any) => {
        const template = missionTemplates.find((t: any) => t.id === rule.template_id);
        if (!template) return;

        const type = template.mission_type;
        const points = template.points;
        const title = template.title;
        const desc = template.description;
        const reviewType = template.review_type;
        const category = template.category;
        const maxCompletions = template.max_completions;

        if (type === 'daily') {
          let cur = new Date(startDate);
          while (cur <= endDate) {
            const dayStr = cur.toISOString().substring(0, 10);
            previews.push({
              batch_id: batchId,
              template_id: rule.template_id,
              title,
              description: desc,
              mission_type: type,
              points,
              publish_at: `${dayStr} 00:00:00`,
              deadline_at: `${dayStr} 23:59:59`,  // 每日任務維持整天可做(中午到期只套用在限時/週/特殊)
              status: 'scheduled',
              review_type: reviewType,
              category: category,
              max_completions: maxCompletions,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
            cur.setDate(cur.getDate() + 1);
          }
        } else if (type === 'weekly') {
          const firstMonday = getMondayOfWeek(batch.start_date);
          const weekOffset = rule.week_offset !== null ? rule.week_offset : 1;
          const dayOffset = rule.day_offset !== null ? rule.day_offset : 1;

          if (weekOffset === 0) {
            const lastMonday = getMondayOfWeek(batch.end_date);
            const totalWeeks = Math.round((lastMonday.getTime() - firstMonday.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;

            for (let w = 1; w <= totalWeeks; w++) {
              const publishDate = new Date(firstMonday);
              publishDate.setUTCDate(firstMonday.getUTCDate() + (w - 1) * 7 + (dayOffset - 1));

              const deadlineDate = new Date(publishDate);
              deadlineDate.setUTCDate(publishDate.getUTCDate() + 6);

              const pubStr = publishDate.toISOString().substring(0, 10);
              const deadStr = deadlineDate.toISOString().substring(0, 10);

              previews.push({
                batch_id: batchId,
                template_id: rule.template_id,
                title,
                description: desc,
                mission_type: type,
                points,
                publish_at: `${pubStr} 00:00:00`,
                deadline_at: `${deadStr} 12:00:00`,
                status: 'scheduled',
                review_type: reviewType,
                category: category,
                max_completions: maxCompletions,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });
            }
          } else {
            const publishDate = new Date(firstMonday);
            publishDate.setUTCDate(firstMonday.getUTCDate() + (weekOffset - 1) * 7 + (dayOffset - 1));

            const deadlineDate = new Date(publishDate);
            deadlineDate.setUTCDate(publishDate.getUTCDate() + 6);

            const pubStr = publishDate.toISOString().substring(0, 10);
            const deadStr = deadlineDate.toISOString().substring(0, 10);

            previews.push({
              batch_id: batchId,
              template_id: rule.template_id,
              title,
              description: desc,
              mission_type: type,
              points,
              publish_at: `${pubStr} 00:00:00`,
              deadline_at: `${deadStr} 12:00:00`,
              status: 'scheduled',
              review_type: reviewType,
              category: category,
              max_completions: maxCompletions,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          }
        } else if (type === 'special') {
          const dayStr = startDate.toISOString().substring(0, 10);
          previews.push({
            batch_id: batchId,
            template_id: rule.template_id,
            title,
            description: desc,
            mission_type: type,
            points,
            publish_at: `${dayStr} 00:00:00`,
            deadline_at: batch.end_date.substring(0, 10) + ' 12:00:00',
            status: 'scheduled',
            review_type: reviewType,
            category: category,
            max_completions: maxCompletions,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        } else if (type === 'limited') {
          const offset = rule.day_offset !== null ? Math.max(0, rule.day_offset - 1) : 0;
          const duration = rule.duration_days !== null ? rule.duration_days : 1;

          const pubDate = new Date(startDate);
          pubDate.setDate(pubDate.getDate() + offset);

          const deadDate = new Date(pubDate);
          deadDate.setDate(deadDate.getDate() + duration);

          const pubStr = pubDate.toISOString().substring(0, 10);
          const deadStr = deadDate.toISOString().substring(0, 10);

          previews.push({
            batch_id: batchId,
            template_id: rule.template_id,
            title,
            description: desc,
            mission_type: type,
            points,
            publish_at: `${pubStr} 00:00:00`,
            deadline_at: `${deadStr} 12:00:00`,
            status: 'scheduled',
            review_type: reviewType,
            category: category,
            max_completions: maxCompletions,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
      });

      if (previews.length > 0) {
        const { data: existingMissions } = await supabase.from('missions').select('*').eq('batch_id', batchId);
        // 去重以「範本 + 發布日期(YYYY-MM-DD)」為 key —— 不可用完整 publish_at：
        // DB 存回的時間字串格式(含時區)與前端組的字串不同，會比不到 → 重套用就重複新增。
        // 與 handleGenerateMissions 的去重邏輯一致。
        const existingKeys = new Set((existingMissions || []).map((m: any) => `${m.template_id}_${String(m.publish_at).substring(0, 10)}`));

        const missionsToInsert = previews.filter(p => !existingKeys.has(`${p.template_id}_${String(p.publish_at).substring(0, 10)}`));
        if (missionsToInsert.length > 0) {
          const { error: insMisErr } = await supabase.from('missions').insert(missionsToInsert);
          if (insMisErr) { console.error(insMisErr); alert('產生任務失敗：' + insMisErr.message); return; }
        }
      }
    }

    await fetchData();
  };

  const handleGenerateMissions = async (
    batchId: string,
    previews: Array<{
      templateId: string;
      title: string;
      description: string;
      type: 'daily' | 'weekly' | 'special' | 'limited';
      points: number;
      publishAt: string;
      deadlineAt: string;
      reviewType: 'auto' | 'leader' | 'admin';
      category?: string;
      maxCompletions?: number;
    }>
  ) => {
    setIsSyncing(true);
    let successCount = 0;
    let skipCount = 0;

    try {
      // 1. Fetch existing missions for the batch
      const { data: existing } = await supabase.from('missions').select('*').eq('batch_id', batchId);
      // 用「發布日期(YYYY-MM-DD)」當去重 key：不受 DB(+00:00) 與預覽字串時區解讀差異影響
      const existingSet = new Set(
        (existing || []).map((m: any) => `${m.batch_id}_${m.template_id}_${String(m.publish_at).substring(0, 10)}`)
      );

      const newMissions: Omit<Mission, 'id' | 'created_at' | 'updated_at'>[] = [];

      previews.forEach(p => {
        const key = `${batchId}_${p.templateId}_${String(p.publishAt).substring(0, 10)}`;
        if (existingSet.has(key)) {
          skipCount++;
        } else {
          newMissions.push({
            batch_id: batchId,
            template_id: p.templateId,
            title: p.title,
            description: p.description,
            mission_type: p.type,
            points: p.points,
            publish_at: p.publishAt,
            deadline_at: p.deadlineAt,
            status: 'scheduled',
            review_type: p.reviewType,
            category: p.category,
            max_completions: p.maxCompletions
          });
          successCount++;
        }
      });

      // 1b. 確保 4 個「進化任務」存在（隱藏任務，學員到 5 級走進化流程才會用到）
      //     改由此處集中發布，取代過去「每次載入頁面就寫入」造成的重複與變慢問題。
      const EVOLVE_TEMPLATE_IDS = ['temp-evolve-dragon', 'temp-evolve-lion', 'temp-evolve-fox', 'temp-evolve-spirit'];
      const targetBatch = batches.find(b => b.id === batchId);
      EVOLVE_TEMPLATE_IDS.forEach(tid => {
        const alreadyExists = (existing || []).some((m: any) => m.template_id === tid);
        if (alreadyExists) return;
        const template = missionTemplates.find(t => t.id === tid);
        if (!template) return;
        newMissions.push({
          batch_id: batchId,
          template_id: tid,
          title: template.title,
          description: template.description,
          mission_type: template.mission_type,
          points: template.points,
          publish_at: targetBatch?.start_date || new Date().toISOString(),
          deadline_at: targetBatch?.end_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'active',
          review_type: template.review_type,
          category: template.category || '神獸進化',
          max_completions: template.max_completions ?? 1
        });
        successCount++;
      });

      // 2. Insert batch missions
      if (newMissions.length > 0) {
        await supabase.from('missions').insert(
          newMissions.map(m => ({
            ...m,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }))
        );
      }

      await fetchData();
    } catch (err) {
      console.error('產生任務失敗:', err);
      throw err;   // 丟給呼叫端,讓它顯示「失敗」而非用部分結果跳「成功」
    } finally {
      setIsSyncing(false);
    }

    return { successCount, skipCount };
  };

  return { handleSaveBatchMissionTemplates, handleGenerateMissions };
}
