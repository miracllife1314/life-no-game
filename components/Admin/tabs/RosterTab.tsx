// =====================================================================
// 後台「學員名單」分頁 —— 從 AdminDashboard.tsx 抽出，行為/UI 完全不變。
// =====================================================================
import { useState, useEffect, useMemo } from 'react';
import { Users, Check, X, Edit2, Trash2 } from 'lucide-react';
import { Profile, Team, Batch, UserRole } from '@/types';

interface RosterTabProps {
  profiles: Profile[];
  teams: Team[];
  batches: Batch[];
  isSyncing: boolean;
  onUpdateProfile?: (profileId: string, updates: Partial<Profile>) => Promise<void>;
  onDeleteProfile?: (profileId: string) => Promise<void>;
  onHardDeleteProfile?: (profileId: string) => Promise<void>;
  onViewAsStudent?: (studentId: string) => void;
}

export function RosterTab({ profiles, teams, batches, isSyncing, onUpdateProfile, onDeleteProfile, onHardDeleteProfile, onViewAsStudent }: RosterTabProps) {
  const [rosterSearch, setRosterSearch] = useState('');
  const [rosterBatchFilter, setRosterBatchFilter] = useState('all');
  const [rosterRoleFilter, setRosterRoleFilter] = useState('all');
  const [rosterStatusFilter, setRosterStatusFilter] = useState('all');
  const [rosterSortKey, setRosterSortKey] = useState('time_desc');
  const [rosterVisibleCount, setRosterVisibleCount] = useState(50); // 分頁：先渲染前 50 筆，避免一次渲染數百列卡死
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [editingProfileData, setEditingProfileData] = useState<Partial<Profile>>({});

  // 篩選+排序後的名冊（記憶化，避免每次 render 重算）
  const rosterFiltered = useMemo(() => {
    let list = profiles
      .filter(p => rosterBatchFilter === 'all' || p.batch_id === rosterBatchFilter)
      .filter(p => rosterRoleFilter === 'all' || p.role === rosterRoleFilter)
      .filter(p => rosterStatusFilter === 'all' || p.status === rosterStatusFilter)
      .filter(p => p.name.includes(rosterSearch) || (p.phone && p.phone.includes(rosterSearch)));

    return [...list].sort((a, b) => {
      if (rosterSortKey === 'time_desc') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (rosterSortKey === 'time_asc') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      if (rosterSortKey === 'score_desc') {
        return b.score - a.score;
      }
      if (rosterSortKey === 'score_asc') {
        return a.score - b.score;
      }
      if (rosterSortKey === 'name_asc') {
        return a.name.localeCompare(b.name, 'zh-Hant');
      }
      return 0;
    });
  }, [profiles, rosterBatchFilter, rosterRoleFilter, rosterStatusFilter, rosterSearch, rosterSortKey]);

  // 切換篩選/搜尋/排序時，重置回前 50 筆
  useEffect(() => {
    setRosterVisibleCount(50);
  }, [rosterBatchFilter, rosterRoleFilter, rosterStatusFilter, rosterSearch, rosterSortKey]);

  return (
        <div className="space-y-6 animate-in fade-in duration-300 text-left">

          <div className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4 light:bg-white light:border-slate-200">
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
              <h3 className="font-black text-white text-lg flex items-center gap-2 light:text-slate-900 shrink-0">
                <Users size={20} className="text-amber-500" />
                學員名單管理 ({rosterFiltered.length} / {profiles.length} 人)
              </h3>
              
              {/* 篩選與搜尋控制區 */}
              <div className="flex flex-wrap items-center gap-2.5 w-full xl:w-auto">
                <select
                  value={rosterBatchFilter}
                  onChange={(e) => setRosterBatchFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-500 light:bg-slate-50 light:border-slate-300 light:text-slate-800"
                >
                  <option value="all">所有期數</option>
                  {batches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>

                <select
                  value={rosterRoleFilter}
                  onChange={(e) => setRosterRoleFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-500 light:bg-slate-50 light:border-slate-300 light:text-slate-800"
                >
                  <option value="all">所有角色</option>
                  <option value="student">一般學員</option>
                  <option value="captain">小隊長</option>
                  <option value="admin">大隊長</option>
                </select>

                <select
                  value={rosterStatusFilter}
                  onChange={(e) => setRosterStatusFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-500 light:bg-slate-50 light:border-slate-300 light:text-slate-800"
                >
                  <option value="all">所有狀態</option>
                  <option value="active">使用中</option>
                  <option value="ended">已結業</option>
                  <option value="inactive">已停用</option>
                </select>

                <select
                  value={rosterSortKey}
                  onChange={(e) => setRosterSortKey(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-500 light:bg-slate-50 light:border-slate-300 light:text-slate-800 font-bold"
                >
                  <option value="time_desc">註冊時間 (新到舊)</option>
                  <option value="time_asc">註冊時間 (舊到新)</option>
                  <option value="score_desc">經驗值最高</option>
                  <option value="score_asc">經驗值最低</option>
                  <option value="name_asc">姓名 A-Z/注音</option>
                </select>

                <input
                  type="text"
                  placeholder="搜尋姓名或手機..."
                  value={rosterSearch}
                  onChange={(e) => setRosterSearch(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-500 light:bg-slate-50 light:border-slate-300 light:text-slate-800 flex-1 sm:flex-none sm:w-40"
                />
              </div>
            </div>

            <div className="overflow-x-auto md:overflow-x-visible">
              <table className="w-full text-xs text-left border-collapse min-w-[800px] md:min-w-0">
                <thead>
                  <tr className="bg-slate-950/60 text-slate-450 font-bold border-b border-white/5 light:bg-slate-100 light:border-slate-300 light:text-slate-600">
                    <th className="p-3">姓名</th>
                    <th className="p-3">手機</th>
                    <th className="p-3">期數</th>
                    <th className="p-3">角色/小隊</th>
                    <th className="p-3">狀態</th>
                    <th className="p-3">經驗值</th>
                    <th className="p-3 text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {rosterFiltered
                    .slice(0, rosterVisibleCount)
                    .map(p => {
                      const isEditing = editingProfileId === p.id;
                      const batchName = batches.find(b => b.id === p.batch_id)?.name || '未指定';
                      const teamName = teams.find(t => t.id === p.team_id)?.name || '未分配';
                      return (
                        <tr key={p.id} className="border-b border-white/5 hover:bg-white/5 light:border-slate-200 light:hover:bg-slate-50">
                          {isEditing ? (
                            <>
                              <td className="p-3 sticky left-0 z-10 bg-slate-950 light:bg-white">
                                <input
                                  type="text"
                                  value={editingProfileData.name || ''}
                                  onChange={e => setEditingProfileData({ ...editingProfileData, name: e.target.value })}
                                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white outline-none focus:border-amber-500"
                                />
                              </td>
                              <td className="p-3">
                                <input
                                  type="text"
                                  value={editingProfileData.phone || ''}
                                  onChange={e => setEditingProfileData({ ...editingProfileData, phone: e.target.value })}
                                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white outline-none focus:border-amber-500"
                                />
                              </td>
                              <td className="p-3">
                                <select
                                  value={editingProfileData.batch_id || ''}
                                  onChange={e => setEditingProfileData({ ...editingProfileData, batch_id: e.target.value })}
                                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white outline-none focus:border-amber-500"
                                >
                                  <option value="">未指定</option>
                                  {batches.map(b => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="p-3">
                                <div className="space-y-1">
                                  <select
                                    value={editingProfileData.role || 'student'}
                                    onChange={e => setEditingProfileData({ ...editingProfileData, role: e.target.value as UserRole })}
                                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white outline-none focus:border-amber-500"
                                  >
                                    <option value="student">學員</option>
                                    <option value="captain">小隊長</option>
                                    <option value="admin">大隊長</option>
                                  </select>
                                  <select
                                    value={editingProfileData.team_id || ''}
                                    onChange={e => setEditingProfileData({ ...editingProfileData, team_id: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white outline-none focus:border-amber-500"
                                  >
                                    <option value="">未分配小隊</option>
                                    {teams.filter(t => !editingProfileData.batch_id || t.batch_id === editingProfileData.batch_id).map(t => (
                                      <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                  </select>
                                </div>
                              </td>
                              <td className="p-3">
                                <select
                                  value={editingProfileData.status || 'active'}
                                  onChange={e => setEditingProfileData({ ...editingProfileData, status: e.target.value as any })}
                                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white outline-none focus:border-amber-500"
                                >
                                  <option value="active">使用中</option>
                                  <option value="ended">已結業</option>
                                  <option value="inactive">已停用</option>
                                </select>
                              </td>
                              <td className="p-3 text-emerald-400 font-bold">{p.score}</td>
                              <td className="p-3 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={async () => {
                                      if (confirm(`確定要儲存學員 ${p.name} 的資料變更嗎？`)) {
                                        if (onUpdateProfile) {
                                          await onUpdateProfile(p.id, editingProfileData);
                                          setEditingProfileId(null);
                                        }
                                      }
                                    }}
                                    disabled={isSyncing}
                                    className="p-1.5 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded transition-colors"
                                  >
                                    <Check size={14} />
                                  </button>
                                  <button
                                    onClick={() => setEditingProfileId(null)}
                                    className="p-1.5 bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white rounded transition-colors"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="p-3 font-bold text-white light:text-slate-900 sticky left-0 z-10 bg-slate-950 light:bg-white">{p.name}</td>
                              <td className="p-3 text-slate-400 font-mono">{p.phone || '-'}</td>
                              <td className="p-3 text-purple-400 font-bold">{batchName}</td>
                              <td className="p-3">
                                <div className="flex flex-col gap-1">
                                  <span className={`text-[10px] px-2 py-0.5 rounded w-max font-bold ${
                                    p.role === 'admin' ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' :
                                    p.role === 'captain' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                                    'bg-slate-800 text-slate-300 light:bg-slate-200'
                                  }`}>
                                    {p.role === 'admin' ? '大隊長' : p.role === 'captain' ? '小隊長' : '學員'}
                                  </span>
                                  <span className="text-slate-500">{teamName}</span>
                                </div>
                              </td>
                              <td className="p-3">
                                <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${
                                  p.status === 'inactive' ? 'border-red-500 text-red-500' :
                                  p.status === 'ended' ? 'border-slate-500 text-slate-500' :
                                  'border-emerald-500 text-emerald-500'
                                }`}>
                                  {p.status === 'inactive' ? '停用' : p.status === 'ended' ? '結業' : '使用中'}
                                </span>
                              </td>
                              <td className="p-3 text-emerald-400 font-bold">{p.score}</td>
                              <td className="p-3 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {onViewAsStudent && p.role !== 'admin' && (
                                    <button
                                      onClick={() => onViewAsStudent(p.id)}
                                      className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 rounded transition-colors"
                                      title="以唯讀方式檢視此帳號"
                                    >
                                      👁️
                                    </button>
                                  )}
                                  <button
                                    onClick={() => {
                                      setEditingProfileId(p.id);
                                      setEditingProfileData({
                                        name: p.name,
                                        phone: p.phone,
                                        batch_id: p.batch_id,
                                        role: p.role,
                                        team_id: p.team_id,
                                        status: p.status
                                      });
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 rounded transition-colors"
                                    title="編輯"
                                  >
                                    <Edit2 size={14} />
                                  </button>
                                  <button
                                    onClick={async () => {
                                      if (confirm(`確定要將學員 ${p.name} 設為「停用」嗎？\n資料會保留但不顯示。`)) {
                                        if (onDeleteProfile) {
                                          await onDeleteProfile(p.id);
                                        }
                                      }
                                    }}
                                    disabled={isSyncing}
                                    className="p-1.5 text-slate-400 hover:text-orange-500 hover:bg-orange-500/10 rounded transition-colors"
                                    title="停用"
                                  >
                                    <X size={14} />
                                  </button>
                                  <button
                                    onClick={async () => {
                                      if (confirm(`【警告】確定要徹底刪除學員 ${p.name} 的所有資料嗎？\n這個操作無法復原，會導致連帶的小隊分數異常，強烈建議使用「停用」功能就好！\n如果堅持刪除，請按確定。`)) {
                                        if (onHardDeleteProfile) {
                                          await onHardDeleteProfile(p.id);
                                        }
                                      }
                                    }}
                                    disabled={isSyncing}
                                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                                    title="強制徹底刪除"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
            {rosterVisibleCount < rosterFiltered.length && (
              <div className="text-center pt-2">
                <button
                  onClick={() => setRosterVisibleCount(c => c + 50)}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm text-white font-bold transition-colors active:scale-95 light:bg-slate-100 light:hover:bg-slate-200 light:text-slate-700"
                >
                  載入更多（顯示 {Math.min(rosterVisibleCount, rosterFiltered.length)} / {rosterFiltered.length} 人）
                </button>
              </div>
            )}
          </div>
        </div>
  );
}
