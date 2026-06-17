// =====================================================================
// 後台「任務管理」分頁（任務列表 + 建立任務 Modal）—— 從 AdminDashboard.tsx 抽出，行為/UI 不變。
// =====================================================================
import { useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { Task, Batch, TaskType, TaskTargetType } from '@/types';

interface TasksTabProps {
  tasks: Task[];
  batches: Batch[];
  missionCategories: string[];
  isSyncing: boolean;
  onCreateTask: (taskData: Omit<Task, 'id' | 'created_at' | 'created_by'>) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
}

export function TasksTab({ tasks, batches, missionCategories, isSyncing, onCreateTask, onDeleteTask }: TasksTabProps) {
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskName, setTaskName] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskType, setTaskType] = useState<TaskType>('daily');
  const [taskScore, setTaskScore] = useState(100);
  const [taskReqProof, setTaskReqProof] = useState(true);
  const [taskCategory, setTaskCategory] = useState<string>('初階');
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
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskName) return;

    // 立即關閉對話框並清空輸入，避免非同步載入重渲染時閃爍
    const currentTaskData = {
      name: taskName,
      description: taskDesc,
      type: taskType,
      score: Number(taskScore),
      requires_approval: taskReqProof,
      requires_proof: taskReqProof,
      publish_time: new Date().toISOString(),
      start_time: new Date(taskStartTime).toISOString(),
      end_time: new Date(taskEndTime).toISOString(),
      target_type: 'all' as TaskTargetType,
      target_team_id: null,
      target_user_id: null,
      batch_id: taskBatchId || null,
      category: taskCategory
    };

    setTaskName('');
    setTaskDesc('');
    setTaskScore(100);
    setTaskBatchId('');
    setTaskCategory('初階');
    setShowTaskModal(false);

    try {
      await onCreateTask(currentTaskData);
    } catch (err) {
      console.error('建立任務失敗:', err);
      // 若失敗，則恢復狀態供使用者調整
      setTaskName(currentTaskData.name);
      setTaskDesc(currentTaskData.description);
      setTaskScore(currentTaskData.score);
      setTaskBatchId(currentTaskData.batch_id || '');
      setTaskCategory(currentTaskData.category);
      setShowTaskModal(true);
    }
  };

  return (
    <>
        <section className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4 light:bg-white light:border-slate-200">
          <div className="flex justify-between items-center select-none">
            <h3 className="font-black text-white text-base">
              大會修行任務列表 ({tasks.length})
            </h3>
            <button
              onClick={() => setShowTaskModal(true)}
              className="btn-action bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1"
            >
              <Plus size={14} />
              建立新任務
            </button>
          </div>
          <div className="divide-y divide-white/5 max-h-96 overflow-y-auto light:divide-slate-200">
            {[...tasks].sort((a, b) => {
              const order = { daily: 1, weekly: 2, temporary: 3, limited: 4 };
              const typeDiff = (order[a.type] || 5) - (order[b.type] || 5);
              if (typeDiff !== 0) return typeDiff;
              return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
            }).map(task => (
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
                  <h4 className="font-bold text-white text-sm mt-1">{task.name}</h4>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-1 light:text-slate-500">{task.description}</p>
                </div>

                <button
                  onClick={() => onDeleteTask(task.id)}
                  disabled={isSyncing}
                  className="btn-action bg-slate-900 border border-white/5 hover:border-red-500/30 text-red-400 p-2 rounded-xl text-xs"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>


        </section>
      {showTaskModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="glass-panel w-full max-w-md p-5 my-auto rounded-3xl border border-white/10 shadow-2xl relative animate-in zoom-in-95 duration-200 light:bg-white light:border-slate-200">
            <div className="flex justify-between items-center mb-3 select-none">
              <h3 className="text-base font-black text-white light:text-slate-900">
                建立新修行任務
              </h3>
              <button 
                type="button"
                onClick={() => setShowTaskModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white light:hover:text-slate-900"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleCreateTask} className="space-y-3 text-left">
              
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
                      onChange={e => setTaskScore(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl py-2 px-2 text-[11px] outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all light:bg-slate-50 light:border-slate-200 light:text-slate-900"
                    />
                  </div>
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
                  確認發布
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
