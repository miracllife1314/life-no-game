// =====================================================================
// 後台「手動調分 / 學員備註 / 小隊職責」分頁 —— 從 AdminDashboard.tsx 抽出，行為/UI 不變。
// =====================================================================
import { useState, useEffect } from 'react';
import { Edit2, Plus, Settings, Shield, Trash2 } from 'lucide-react';
import { Profile, Team, SquadRoleDef, StudentNote } from '@/types';

interface AdjustTabProps {
  profiles: Profile[];
  teams: Team[];
  squadRoles: SquadRoleDef[];
  notes: StudentNote[];
  isSyncing: boolean;
  onManualAdjustScore: (studentId: string, amount: number, reason: string) => Promise<void>;
  onSaveNote?: (studentId: string, noteText: string) => Promise<void>;
  onUpdateProfile?: (profileId: string, updates: Partial<Profile>) => Promise<void>;
  onCreateSquadRole?: (data: Omit<SquadRoleDef, 'id' | 'created_at'>) => Promise<void>;
  onUpdateSquadRole?: (id: string, updates: Partial<SquadRoleDef>) => Promise<void>;
  onDeleteSquadRole?: (id: string) => Promise<void>;
}

export function AdjustTab({ profiles, teams, squadRoles, notes, isSyncing, onManualAdjustScore, onSaveNote, onUpdateProfile, onCreateSquadRole, onUpdateSquadRole, onDeleteSquadRole }: AdjustTabProps) {
  // Duty Assignment State
  const [selectedSettingMemberId, setSelectedSettingMemberId] = useState<string>('');
  const [savingMemberId, setSavingMemberId] = useState<string | null>(null);
  const [notesMap, setNotesMap] = useState<Record<string, string>>({});

  useEffect(() => {
    const map: Record<string, string> = {};
    profiles.forEach(member => {
      // the note should belong to this member. Admin can act as the captain, or we just get any note since it's global
      const note = notes?.find(n => n.student_id === member.id)?.note || '';
      map[member.id] = note;
    });
    setNotesMap(map);
  }, [notes, profiles]);

  // Squad Role Editing state
  const [editingSquadRoleId, setEditingSquadRoleId] = useState<string | null>(null);
  const [editingSquadRoleName, setEditingSquadRoleName] = useState("");
  const [editingSquadRoleDuties, setEditingSquadRoleDuties] = useState("");
  const handleNoteChangeLocal = (memberId: string, value: string) => {
    setNotesMap(prev => ({ ...prev, [memberId]: value }));
  };

  const handleNoteBlur = async (memberId: string) => {
    const noteText = notesMap[memberId] || '';
    try {
      if (onSaveNote) await onSaveNote(memberId, noteText);
    } catch (err) {
      console.error('Error auto-saving note:', err);
    }
  };

  const handleSystemRoleChange = async (memberId: string, newRole: string) => {
    setSavingMemberId(memberId);
    try {
      if (onUpdateProfile) {
        await onUpdateProfile(memberId, { role: newRole as any });
      }
    } catch (err) {
      console.error('Error saving system role:', err);
    } finally {
      setSavingMemberId(null);
    }
  };
  // --- Score adjust State ---
  const [adjustStudentId, setAdjustStudentId] = useState('');
  const [adjustAmount, setAdjustAmount] = useState<string>('100');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustMessage, setAdjustMessage] = useState('');



  // --- Handlers ---

  const handleAdjustScoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustStudentId || !adjustReason) return;
    const amountNum = Number(adjustAmount);
    // 大額調分（超過 5000）先確認，避免手滑打錯
    if (Math.abs(amountNum) > 5000 && !window.confirm(`確定要調整 ${amountNum > 0 ? '+' : ''}${amountNum} 分嗎？這是一個很大的數字，請確認沒有打錯。`)) {
      return;
    }
    const studentName = profiles.find(p => p.id === adjustStudentId)?.name || '學員';
    try {
      await onManualAdjustScore(adjustStudentId, amountNum, adjustReason);
      // 只有真的成功才顯示成功訊息
      setAdjustMessage(`🎉 成功對 ${studentName} 調整分數：${amountNum > 0 ? '+' : ''}${amountNum}`);
      setAdjustStudentId('');
      setAdjustReason('');
      setTimeout(() => setAdjustMessage(''), 3000);
    } catch (err: any) {
      setAdjustMessage(`❌ 調分失敗：${err?.message || '請稍後再試'}`);
      setTimeout(() => setAdjustMessage(''), 5000);
    }
  };

  return (
        <div className="space-y-6">
          <section className="glass-panel p-6 rounded-3xl border border-white/5 space-y-6 light:bg-white light:border-slate-200">
            <h3 className="font-black text-white text-base select-none">
              手動增減個別學員經驗值
            </h3>

            <form onSubmit={handleAdjustScoreSubmit} className="space-y-4 max-w-md select-none">
              <div>
                <label className="block text-xs text-slate-400 font-bold mb-1.5">選擇學員</label>
                <select
                  required
                  value={adjustStudentId}
                  onChange={e => setAdjustStudentId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none"
                >
                  <option value="">請選擇學員...</option>
                  {profiles.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (經驗：{p.score})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 font-bold mb-1.5">調整數值 (正負皆可)</label>
                  <input
                    required
                    type="number"
                    onFocus={(e) => e.target.select()}
                    value={adjustAmount}
                    onChange={e => setAdjustAmount(e.target.value)}
                    placeholder="例如：500 或 -200"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-500 font-bold mb-1.5 pt-6 leading-relaxed">
                    ※ 扣減請輸入負數值，如 -200
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 font-bold mb-1.5">調整原因</label>
                <input
                  required
                  type="text"
                  value={adjustReason}
                  onChange={e => setAdjustReason(e.target.value)}
                  placeholder="例如：實體研討會擔任志工表率、遲到扣分..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white outline-none focus:border-red-500"
                />
              </div>

              {adjustMessage && (
                <p className="text-xs font-black text-amber-500 bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl text-center">
                  {adjustMessage}
                </p>
              )}

              <button
                type="submit"
                disabled={isSyncing || !adjustStudentId || !adjustReason}
                className="btn-action bg-red-500 hover:bg-red-600 text-white py-3 px-6 rounded-xl text-xs font-black"
              >
                確認調整分數
              </button>
            </form>
          </section>

          {/* ⚙️ 系統職稱設定 */}
          <section className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4 text-left light:bg-white light:border-slate-200">
            <h3 className="text-sm font-black text-white border-b border-white/5 pb-3 flex items-center gap-2 select-none light:border-slate-200 light:text-slate-900">
              <Settings size={16} className="text-amber-500" />
              系統職稱設定
            </h3>

            <div className="space-y-4">
              <div className="space-y-1.5 max-w-md">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">
                  選擇學員
                </label>
                <select
                  value={selectedSettingMemberId}
                  onChange={(e) => setSelectedSettingMemberId(e.target.value)}
                  className="w-full text-xs bg-slate-900 border border-white/5 rounded-xl px-3 py-2.5 text-slate-300 font-bold outline-none focus:border-amber-500 focus:bg-slate-950 transition-all light:bg-white light:border-slate-350 light:text-slate-800"
                >
                  <option value="">-- 請選擇學員 --</option>
                  {profiles.map(member => {
                    const t = teams.find(t => t.id === member.team_id);
                    return (
                      <option key={member.id} value={member.id}>
                        {member.name} ({member.role === 'admin' ? '大隊長' : member.role === 'captain' ? '小隊長' : '一般學員'}) {t ? `[${t.name}]` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {selectedSettingMemberId && (() => {
                const member = profiles.find(m => m.id === selectedSettingMemberId);
                if (!member) return null;
                const noteText = notesMap[member.id] || '';
                const currentSystemRole = member.role || 'student';
                const currentRole = member.squad_role || '';

                return (
                  <div className="pt-4 border-t border-white/5 light:border-slate-200 animate-in fade-in duration-200 max-w-sm">
                    {/* System Role Selection */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">
                        設定修行定位 (系統職稱)
                      </label>
                      <select
                        value={currentSystemRole}
                        onChange={(e) => handleSystemRoleChange(member.id, e.target.value)}
                        className="w-full text-xs bg-slate-900 border border-white/5 rounded-xl px-3 py-2.5 text-amber-400 font-bold outline-none focus:border-amber-500 focus:bg-slate-950 transition-all light:bg-white light:border-amber-300 light:text-amber-700"
                      >
                        <option value="student">一般學員</option>
                        <option value="captain">小隊長</option>
                        <option value="admin">大隊長</option>
                      </select>
                    </div>
                  </div>
                );
              })()}
            </div>
          </section>

          {/* 🛡️ 小隊職責自訂管理 */}
          <section className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4 text-left light:bg-white light:border-slate-200">
            <h3 className="text-sm font-black text-white border-b border-white/5 pb-3 flex items-center gap-2 select-none light:border-slate-200 light:text-slate-900">
              <Shield size={16} className="text-teal-500" />
              自訂小隊職責管理
            </h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {squadRoles.map(role => (
                  <div key={role.id} className="bg-slate-950/40 p-4 rounded-xl border border-white/5 flex flex-col justify-between light:bg-slate-50 light:border-slate-200">
                    {editingSquadRoleId === role.id ? (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={editingSquadRoleName}
                          onChange={e => setEditingSquadRoleName(e.target.value)}
                          className="w-full text-xs bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white outline-none focus:border-teal-500"
                          placeholder="角色名稱"
                        />
                        <input
                          type="text"
                          value={editingSquadRoleDuties}
                          onChange={e => setEditingSquadRoleDuties(e.target.value)}
                          className="w-full text-xs bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white outline-none focus:border-teal-500"
                          placeholder="職責說明 (用逗號分隔)"
                        />
                        <div className="flex justify-end gap-2 mt-2">
                          <button
                            onClick={() => setEditingSquadRoleId(null)}
                            className="text-[10px] text-slate-400 hover:text-white px-2 py-1"
                          >
                            取消
                          </button>
                          <button
                            onClick={() => {
                              if (onUpdateSquadRole && editingSquadRoleName.trim()) {
                                onUpdateSquadRole(role.id, {
                                  name: editingSquadRoleName.trim(),
                                  duties: editingSquadRoleDuties.split(',').map(d => d.trim()).filter(d => d)
                                });
                                setEditingSquadRoleId(null);
                              }
                            }}
                            className="text-[10px] bg-teal-600 text-white hover:bg-teal-500 px-3 py-1 rounded"
                          >
                            儲存
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div>
                          <h4 className="font-bold text-teal-400 text-sm mb-1">{role.name}</h4>
                          {role.duties.length > 0 && (
                            <ul className="list-disc list-inside text-xs text-slate-400 space-y-0.5">
                              {role.duties.map((duty, idx) => (
                                <li key={idx}>{duty}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <div className="mt-3 flex justify-end gap-2">
                          <button 
                            onClick={() => {
                              setEditingSquadRoleId(role.id);
                              setEditingSquadRoleName(role.name);
                              setEditingSquadRoleDuties(role.duties.join(', '));
                            }}
                            disabled={isSyncing}
                            className="text-[10px] text-teal-500 hover:text-teal-400 flex items-center gap-1 bg-teal-500/10 px-2 py-1 rounded"
                          >
                            <Edit2 size={12} /> 編輯
                          </button>
                          <button 
                            onClick={() => {
                              if (window.confirm(`確定要刪除職責「${role.name}」嗎？這會移除所有已指派此職責的學員設定。`)) {
                                if (onDeleteSquadRole) onDeleteSquadRole(role.id);
                              }
                            }}
                            disabled={isSyncing}
                            className="text-[10px] text-red-500 hover:text-red-400 flex items-center gap-1 bg-red-500/10 px-2 py-1 rounded"
                          >
                            <Trash2 size={12} /> 刪除
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>

              <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 space-y-3 mt-4 light:bg-slate-100 light:border-slate-200">
                <h4 className="text-xs font-bold text-slate-300 light:text-slate-700">新增小隊職責</h4>
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    const form = e.target as HTMLFormElement;
                    const name = (form.elements.namedItem('roleName') as HTMLInputElement).value.trim();
                    const dutiesStr = (form.elements.namedItem('duties') as HTMLInputElement).value;
                    const duties = dutiesStr.split(',').map(d => d.trim()).filter(d => d);
                    
                    if (name && onCreateSquadRole) {
                      onCreateSquadRole({ name, duties });
                      form.reset();
                    }
                  }}
                  className="space-y-3"
                >
                  <div>
                    <input 
                      type="text" 
                      name="roleName" 
                      placeholder="角色名稱（如：康樂股長）" 
                      required
                      className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-300 outline-none focus:border-teal-500 light:bg-white light:border-slate-300 light:text-slate-800"
                    />
                  </div>
                  <div>
                    <input 
                      type="text" 
                      name="duties" 
                      placeholder="職責說明（選填，多個職責請用逗號分隔）" 
                      className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-300 outline-none focus:border-teal-500 light:bg-white light:border-slate-300 light:text-slate-800"
                    />
                  </div>
                  <button 
                    type="submit" 
                    disabled={isSyncing}
                    className="w-full btn-action bg-teal-600 hover:bg-teal-500 text-white text-xs py-2 rounded-lg font-bold flex items-center justify-center gap-1"
                  >
                    <Plus size={14} /> 新增職責
                  </button>
                </form>
              </div>
            </div>
          </section>
        </div>
  );
}
