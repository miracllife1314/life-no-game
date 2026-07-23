// =====================================================================
// 後台「任務管理」分頁（任務列表 + 建立任務 Modal）—— 從 AdminDashboard.tsx 抽出，行為/UI 不變。
// =====================================================================
import { useState, useMemo } from 'react';
import { Plus, Trash2, X, Pencil } from 'lucide-react';
import { Task, Batch, TaskType, TaskTargetType } from '@/types';
import { formatBrandText } from '@/lib/brand';
import { TaskBundlesSection } from './TaskBundlesSection';


interface TasksTabProps {
  tasks: Task[];
  batches: Batch[];
  missionCategories: string[];
  isSyncing: boolean;
  onCreateTask: (taskData: Omit<Task, 'id' | 'created_at' | 'created_by'>) => Promise<void>;
  onCreateTasksBulk: (tasksData: Omit<Task, 'id' | 'created_at' | 'created_by'>[]) => Promise<boolean>;
  onDeleteTask: (taskId: string) => Promise<void>;
  onUpdateTask?: (taskId: string, updates: Partial<Task>) => Promise<boolean | void>;
}

export function TasksTab({ tasks, batches, missionCategories, isSyncing, onCreateTask, onCreateTasksBulk, onDeleteTask, onUpdateTask }: TasksTabProps) {
  const [showTaskModal, setShowTaskModal] = useState(false);
  // 編輯中的任務 id;null = 建立新任務模式
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskName, setTaskName] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskType, setTaskType] = useState<TaskType>('daily');
  const [taskScore, setTaskScore] = useState<number | string>(100);
  const [taskIsMakeup, setTaskIsMakeup] = useState(false);   // 是否為補打卡任務
  const [taskReqProof, setTaskReqProof] = useState(true);
  const [taskCategory, setTaskCategory] = useState<string>('初階');

  // 篩選與排序狀態
  const [listBatchFilter, setListBatchFilter] = useState('all');
  const [listTypeFilter, setListTypeFilter] = useState('all');
  const [listSearch, setListSearch] = useState('');
  const [listSortKey, setListSortKey] = useState('type_asc');

  const filteredTasks = useMemo(() => {
    let result = tasks.filter(t => {
      const matchBatch =
        listBatchFilter === 'all'
          ? true
          : listBatchFilter === 'global'
          ? !t.batch_id
          : t.batch_id === listBatchFilter;
      const matchType = listTypeFilter === 'all' || t.type === listTypeFilter;
      const matchSearch = !listSearch || t.name.includes(listSearch) || (t.description && t.description.includes(listSearch));
      return matchBatch && matchType && matchSearch;
    });

    return [...result].sort((a, b) => {
      if (listSortKey === 'type_asc') {
        const order = { daily: 1, weekly: 2, temporary: 3, limited: 4 };
        const typeDiff = (order[a.type] || 5) - (order[b.type] || 5);
        if (typeDiff !== 0) return typeDiff;
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      }
      if (listSortKey === 'time_desc') {
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      }
      if (listSortKey === 'time_asc') {
        return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      }
      if (listSortKey === 'score_desc') {
        return b.score - a.score;
      }
      return 0;
    });
  }, [tasks, listBatchFilter, listTypeFilter, listSearch, listSortKey]);
  const pad = (n: number) => n.toString().padStart(2, '0');
  const formatDateToLocal = (date: Date) => {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };
  const [taskStartTime, setTaskStartTime] = useState(formatDateToLocal(new Date()));
  const [taskEndTime, setTaskEndTime] = useState(formatDateToLocal(new Date(Date.now() + 604800000)));
  const [taskBatchId, setTaskBatchId] = useState('');
  const handleBatchChange = (batchId: string) => {
    setTaskBatchId(batchId);
    if (!batchId) return;
    const selectedBatch = batches.find(b => b.id === batchId);
    if (selectedBatch) {
      setTaskStartTime(formatDateToLocal(new Date(selectedBatch.start_date)));
      setTaskEndTime(formatDateToLocal(new Date(selectedBatch.end_date)));
    }
  };

  const handleTaskTypeChange = (type: TaskType) => {
    setTaskType(type);
    if (type === 'daily' && taskBatchId) {
      const selectedBatch = batches.find(b => b.id === taskBatchId);
      if (selectedBatch) {
        setTaskStartTime(formatDateToLocal(new Date(selectedBatch.start_date)));
        setTaskEndTime(formatDateToLocal(new Date(selectedBatch.end_date)));
      }
    }
  };
  // 開啟「建立新任務」(清空表單)
  const openCreateModal = () => {
    setEditingTaskId(null);
    setTaskName('');
    setTaskDesc('');
    setTaskType('daily');
    setTaskScore(100);
    setTaskIsMakeup(false);
    setTaskReqProof(true);
    setTaskBatchId('');
    setTaskCategory('初階');
    setTaskStartTime(formatDateToLocal(new Date()));
    setTaskEndTime(formatDateToLocal(new Date(Date.now() + 604800000)));
    setShowTaskModal(true);
  };

  // 開啟「編輯既有任務」(帶入該任務現有資料)
  const openEditModal = (task: Task) => {
    setEditingTaskId(task.id);
    setTaskName(task.name);
    setTaskDesc(task.description || '');
    setTaskType(task.type);
    setTaskScore(task.score);
    setTaskIsMakeup(!!task.is_makeup);
    setTaskReqProof(!!task.requires_proof);
    setTaskBatchId(task.batch_id || '__all__');   // 無期數 → 顯示為「通用」
    setTaskCategory(task.category || '初階');
    setTaskStartTime(formatDateToLocal(new Date(task.start_time)));
    setTaskEndTime(formatDateToLocal(new Date(task.end_time)));
    setShowTaskModal(true);
  };

  const handleSubmitTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskName) return;

    const currentTaskData = {
      name: taskName,
      description: taskDesc,
      type: taskType,
      score: Number(taskScore),
      is_makeup: taskIsMakeup,
      // 補打卡任務可重複提交(次數由護盾配額控制)→ 完成次數設無限
      ...(taskIsMakeup ? { max_completions: 0 } : {}),
      requires_approval: taskReqProof,
      requires_proof: taskReqProof,
      start_time: new Date(taskStartTime).toISOString(),
      end_time: new Date(taskEndTime).toISOString(),
      target_type: 'all' as TaskTargetType,
      target_team_id: null,
      target_user_id: null,
      // '__all__' 或空 → 通用(batch_id null,所有期數學員都看得到)
      batch_id: (taskBatchId && taskBatchId !== '__all__') ? taskBatchId : null,
      category: taskCategory
    };

    // 編輯模式:二次確認 → 更新既有任務(不改 publish_time)→ 成功提示。
    if (editingTaskId) {
      const ok = window.confirm(`確定要儲存「${taskName}」的修改嗎？`);
      if (!ok) return;
      const idToEdit = editingTaskId;
      setShowTaskModal(false);
      try {
        const success = onUpdateTask ? await onUpdateTask(idToEdit, currentTaskData) : false;
        if (success !== false) alert('✅ 任務已修改成功！');
      } catch (err) {
        console.error('更新任務失敗:', err);
        setShowTaskModal(true);   // 失敗時重開,讓使用者重試
      }
      return;
    }

    // 建立模式:立即關閉並清空輸入,避免非同步重渲染閃爍
    const createData = { ...currentTaskData, publish_time: new Date().toISOString() };
    setTaskName('');
    setTaskDesc('');
    setTaskScore(100);
    setTaskBatchId('');
    setTaskCategory('初階');
    setShowTaskModal(false);

    try {
      await onCreateTask(createData);
    } catch (err) {
      console.error('建立任務失敗:', err);
      // 若失敗，則恢復狀態供使用者調整
      setTaskName(createData.name);
      setTaskDesc(createData.description);
      setTaskScore(createData.score);
      setTaskBatchId(createData.batch_id || '');
      setTaskCategory(createData.category);
      setShowTaskModal(true);
    }
  };

  return (
    <>
        {/* 臨時任務套組(一鍵發布)—— 課後課/活動加分批次發布 */}
        <div className="mb-6">
          <TaskBundlesSection batches={batches} onPublish={onCreateTasksBulk} />
        </div>

        <section className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4 light:bg-white light:border-slate-200">
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 select-none pb-2 border-b border-white/5 light:border-slate-100">
            <h3 className="font-black text-white text-base light:text-slate-900 shrink-0">
              大會修行任務列表 ({filteredTasks.length} / {tasks.length})
            </h3>
            
            <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
              {/* 期數篩選 */}
              <select
                value={listBatchFilter}
                onChange={(e) => setListBatchFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-500 light:bg-slate-50 light:border-slate-300 light:text-slate-800"
              >
                <option value="all">所有期數</option>
                <option value="global">全體 (系統/大會任務)</option>
                {batches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>

              {/* 類型篩選 */}
              <select
                value={listTypeFilter}
                onChange={(e) => setListTypeFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-500 light:bg-slate-50 light:border-slate-300 light:text-slate-800"
              >
                <option value="all">所有類型</option>
                <option value="daily">每日定課</option>
                <option value="weekly">每週任務</option>
                <option value="limited">限時任務</option>
                <option value="temporary">特殊任務</option>
              </select>

              {/* 排序方式 */}
              <select
                value={listSortKey}
                onChange={(e) => setListSortKey(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-500 light:bg-slate-50 light:border-slate-300 light:text-slate-800 font-bold"
              >
                <option value="type_asc">預設 (依類型)</option>
                <option value="time_desc">發布時間 (新到舊)</option>
                <option value="time_asc">發布時間 (舊到新)</option>
                <option value="score_desc">加分值 (高到低)</option>
              </select>

              {/* 關鍵字搜尋 */}
              <input
                type="text"
                placeholder="搜尋任務名稱..."
                value={listSearch}
                onChange={(e) => setListSearch(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-500 light:bg-slate-50 light:border-slate-300 light:text-slate-800 flex-1 sm:flex-none sm:w-40"
              />

              <button
                onClick={openCreateModal}
                className="btn-action bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1 shrink-0"
              >
                <Plus size={14} />
                建立新任務
              </button>
            </div>
          </div>
          <div className="divide-y divide-white/5 max-h-96 overflow-y-auto light:divide-slate-200">
            {filteredTasks.length === 0 ? (
              <div className="text-center py-12 text-slate-500 font-bold text-sm select-none">
                💡 找不到符合條件的修行任務。
              </div>
            ) : (
              filteredTasks.map(task => (
                <div key={task.id} className="py-4 flex justify-between items-center gap-4 first:pt-0 last:pb-0">
                  <div className="flex-1">
                  <div className="flex items-center gap-2 select-none">
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded ${
                      task.type === 'daily' 
                        ? 'bg-amber-500/10 text-amber-500' 
                        : task.type === 'weekly' 
                        ? 'bg-purple-500/10 text-purple-400' 
                        : task.type === 'limited'
                        ? 'bg-rose-500/10 text-rose-400'
                        : 'bg-indigo-500/10 text-indigo-400'
                    }`}>
                      {task.type === 'daily' 
                        ? '每日定課' 
                        : task.type === 'weekly' 
                        ? '每週任務' 
                        : task.type === 'limited'
                        ? '限時任務'
                        : '特殊任務'}
                    </span>
                    <span className="text-[10px] text-slate-500 font-bold">
                      +{task.score} 分
                    </span>
                  </div>
                  <h4 className="font-bold text-white text-sm mt-1">{formatBrandText(task.name)}</h4>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-1 light:text-slate-500">{formatBrandText(task.description)}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => openEditModal(task)}
                    disabled={isSyncing}
                    className="btn-action bg-slate-900 border border-white/5 hover:border-amber-500/40 text-amber-400 p-2 rounded-xl text-xs light:bg-slate-100 light:border-slate-200"
                    title="編輯任務"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`確定要刪除發布任務「${task.name}」嗎？`)) {
                        onDeleteTask(task.id);
                      }
                    }}
                    disabled={isSyncing}
                    className="btn-action bg-slate-900 border border-white/5 hover:border-red-500/30 text-red-400 p-2 rounded-xl text-xs light:bg-slate-100 light:border-slate-200"
                    title="刪除任務"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )))}
          </div>


        </section>
      {showTaskModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="glass-panel w-full max-w-md p-5 my-auto rounded-3xl border border-white/10 shadow-2xl relative animate-in zoom-in-95 duration-200 light:bg-white light:border-slate-200">
            <div className="flex justify-between items-center mb-3 select-none">
              <h3 className="text-base font-black text-white light:text-slate-900">
                {editingTaskId ? '編輯修行任務' : '建立新修行任務'}
              </h3>
              <button 
                type="button"
                onClick={() => setShowTaskModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white light:hover:text-slate-900"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSubmitTask} className="space-y-3 text-left">
              
              {/* Group 1: 班次 */}
              <div className="space-y-2">
                <span className="text-[9px] font-black text-red-500 dark:text-red-400 uppercase tracking-widest block select-none">
                  STEP 1. 梯次與期數設定
                </span>
                <div>
                  <label className="block text-[11px] text-slate-400 light:text-slate-500 font-bold mb-1">
                    所屬期數 <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={taskBatchId}
                    onChange={e => handleBatchChange(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl py-2 px-3 text-xs outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all light:bg-slate-50 light:border-slate-200 light:text-slate-900"
                  >
                    <option value="">請選擇期數...</option>
                    <option value="__all__">🌐 全部期數(通用,所有學員都看得到)</option>
                    {batches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Group 2: 任務詳情 */}
              <div className="space-y-2 pt-2.5 border-t border-white/5 light:border-slate-100">
                <span className="text-[9px] font-black text-red-500 dark:text-red-400 uppercase tracking-widest block select-none">
                  STEP 2. 任務內容詳情
                </span>
                <div>
                  <label className="block text-[11px] text-slate-400 light:text-slate-500 font-bold mb-1">任務名稱</label>
                  <input
                    required
                    type="text"
                    value={taskName}
                    onChange={e => setTaskName(e.target.value)}
                    placeholder="例如：每日大笑與轉念"
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl py-2 px-3 text-xs outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all light:bg-slate-50 light:border-slate-200 light:text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 light:text-slate-500 font-bold mb-1">描述說明</label>
                  <textarea
                    rows={2}
                    value={taskDesc}
                    onChange={e => setTaskDesc(e.target.value)}
                    placeholder="簡述任務實行步驟..."
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl py-2 px-3 text-xs outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all light:bg-slate-50 light:border-slate-200 light:text-slate-900"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 select-none">
                  <div>
                    <label className="block text-[11px] text-slate-400 light:text-slate-500 font-bold mb-1">任務類型</label>
                    <select
                      value={taskType}
                      onChange={e => handleTaskTypeChange(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl py-2 px-2 text-[11px] outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all light:bg-slate-50 light:border-slate-200 light:text-slate-900"
                    >
                      <option value="daily">每日定課</option>
                      <option value="weekly">每週任務</option>
                      <option value="temporary">特殊任務</option>
                      <option value="limited">限時任務</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 light:text-slate-500 font-bold mb-1">任務分類</label>
                    <select
                      value={taskCategory}
                      onChange={e => setTaskCategory(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl py-2 px-2 text-[11px] outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all light:bg-slate-50 light:border-slate-200 light:text-slate-900"
                    >
                      {missionCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 light:text-slate-500 font-bold mb-1">獎勵經驗分</label>
                    <input
                      required
                      type="number"
                      onFocus={(e) => e.target.select()}
                      value={taskScore}
                      onChange={e => setTaskScore(e.target.value === '' ? '' : (Number(e.target.value) || 0))}
                      onBlur={() => { if (taskScore === '') setTaskScore(100); }}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl py-2 px-2 text-[11px] outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all light:bg-slate-50 light:border-slate-200 light:text-slate-900"
                    />
                  </div>
                </div>

                {/* 🩹 設為補打卡任務 */}
                <div className="flex items-start gap-2 p-2.5 rounded-xl bg-sky-500/5 border border-sky-500/20 light:bg-sky-50 light:border-sky-200">
                  <input
                    type="checkbox"
                    id="isMakeup"
                    checked={taskIsMakeup}
                    onChange={e => setTaskIsMakeup(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-sky-500 focus:ring-sky-500 mt-0.5 shrink-0 cursor-pointer"
                  />
                  <label htmlFor="isMakeup" className="text-[10px] text-slate-300 light:text-slate-600 font-bold leading-normal cursor-pointer">
                    🩹 設為「補打卡任務」<br />
                    <span className="font-normal text-slate-400 light:text-slate-500">
                      勾選後:此任務**不會**出現在學員一般任務區,只在學員漏打時的「補打卡」彈窗出現;審核通過會補回學員最近缺的一天(每期 5 次)。審核方式用上面的「需上傳審核證明」與否決定。
                    </span>
                  </label>
                </div>
              </div>

              {/* Group 3: 時間與審核 */}
              <div className="space-y-2 pt-2.5 border-t border-white/5 light:border-slate-100">
                <span className="text-[9px] font-black text-red-500 dark:text-red-400 uppercase tracking-widest block select-none">
                  STEP 3. 時間與審核設定
                </span>
                <div className="grid grid-cols-2 gap-2.5 select-none">
                  <div>
                    <label className="block text-[11px] text-slate-400 light:text-slate-500 font-bold mb-1">開始時間</label>
                    <input
                      required
                      type="datetime-local"
                      value={taskStartTime}
                      onChange={e => setTaskStartTime(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl py-2 px-3 text-xs outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all light:bg-slate-50 light:border-slate-200 light:text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 light:text-slate-500 font-bold mb-1">截止時間</label>
                    <input
                      required
                      type="datetime-local"
                      value={taskEndTime}
                      onChange={e => setTaskEndTime(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl py-2 px-3 text-xs outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all light:bg-slate-50 light:border-slate-200 light:text-slate-900"
                    />
                  </div>
                </div>

                <div className="flex items-start gap-2 select-none p-2.5 rounded-xl bg-slate-900/40 border border-white/5 light:bg-slate-50 light:border-slate-200">
                  <input
                    type="checkbox"
                    id="reqProof"
                    checked={taskReqProof}
                    onChange={e => setTaskReqProof(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-red-500 focus:ring-red-500 mt-0.5 shrink-0 cursor-pointer"
                  />
                  <label htmlFor="reqProof" className="text-[10px] text-slate-300 light:text-slate-600 font-bold leading-normal cursor-pointer">
                    此任務打卡時需提供文字或連結證明 (需人工審核)
                  </label>
                </div>
              </div>

              <div className="flex gap-2.5 pt-2 select-none">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="flex-1 btn-action py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-xs font-bold hover:bg-slate-800 transition-all light:bg-slate-100 light:border-slate-200 light:text-slate-600 light:hover:bg-slate-200 cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isSyncing}
                  className="flex-1 btn-action py-3 rounded-xl bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-xs font-black shadow-md shadow-red-500/10 transition-all cursor-pointer"
                >
                  {editingTaskId ? '儲存修改' : '確認發布'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
