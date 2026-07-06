// =====================================================================
// 後台「小隊分配」分頁（快速指派小隊長 / 學員分隊 / 新增帳號 / 隊伍設定 /
//   小隊職責與備註）—— 從 AdminDashboard.tsx 抽出，行為/UI 完全不變。
// =====================================================================
import { useState, useEffect } from 'react';
import { Settings, ShieldCheck, UserPlus } from 'lucide-react';
import { Profile, Team, Batch, StudentNote, CaptainCandidate, UserRole } from '@/types';

const QUEST_ROLES_DEFS = [
  { id: 'role-lantern', name: '提燈人', duties: ['協助引導隊員打卡', '記錄分享會要點'] },
  { id: 'role-dawn', name: '破曉行者', duties: ['帶頭進行每日打卡', '每日分享轉念心法'] },
  { id: 'role-guardian', name: '金剛護法', duties: ['維護學習紀律', '協助解答技術問題'] }
];

const DEFAULT_CHARACTERS: Record<string, string> = {};

interface TeamsTabProps {
  profiles: Profile[];
  teams: Team[];
  batches: Batch[];
  captainCandidates: CaptainCandidate[];
  notes: StudentNote[];
  currentUserId?: string;
  isSyncing: boolean;
  onAssignTeam: (studentId: string, teamId: string | null, role: UserRole, batchId?: string | null, divisionName?: string | null, directorId?: string | null, status?: 'active' | 'ended' | 'inactive') => Promise<void>;
  onUpdateTeamSettings?: (teamId: string, settings: Partial<Team>) => Promise<void>;
  onSaveNote?: (studentId: string, noteText: string) => Promise<void>;
  onAddProfile?: (profileData: { name: string; phone: string; role: UserRole; batchId: string; teamId: string; divisionName?: string | null; directorId?: string | null }) => Promise<void>;
  onQuickAssignCaptain?: (batchId: string, captainProfileId: string, teamId: string, directorId: string | null) => Promise<void>;
  showToast?: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export function TeamsTab({ profiles, teams, batches, captainCandidates, notes, currentUserId, isSyncing, onAssignTeam, onUpdateTeamSettings, onSaveNote, onAddProfile, onQuickAssignCaptain, showToast }: TeamsTabProps) {
  // --- Team assignment State ---
  const [assignStudentId, setAssignStudentId] = useState('');
  const [assignTeamId, setAssignTeamId] = useState('');
  const [assignCohortId, setAssignCohortId] = useState('');
  const [assignBatchId, setAssignBatchId] = useState('');

  // --- Quick Captain Assignment State ---
  const [quickBatchId, setQuickBatchId] = useState('');
  const [quickCaptainId, setQuickCaptainId] = useState('');
  const [quickTeamId, setQuickTeamId] = useState('');
  const [quickDirectorId, setQuickDirectorId] = useState('');
  const [assignRole, setAssignRole] = useState<UserRole>('student');
  const [assignDivisionName, setAssignDivisionName] = useState('');
  const [assignDirectorId, setAssignDirectorId] = useState('');
  const [assignStatus, setAssignStatus] = useState<'active' | 'ended' | 'inactive'>('active');

  // --- Role Assignment & Notes State ---
  const [adminNoteText, setAdminNoteText] = useState('');
  const [squadRolesMap, setSquadRolesMap] = useState<Record<string, string[]>>({});

  const [roleSettingStudentId, setRoleSettingStudentId] = useState('');

  // --- Add Profile Form State ---
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfilePhone, setNewProfilePhone] = useState('');
  const [newProfileBatchId, setNewProfileBatchId] = useState('');
  const [newProfileTeamId, setNewProfileTeamId] = useState('');
  const [newProfileRole, setNewProfileRole] = useState<UserRole>('captain');
  const [newProfileDivisionName, setNewProfileDivisionName] = useState('');
  const [newProfileDirectorId, setNewProfileDirectorId] = useState('');
  const [newProfileError, setNewProfileError] = useState<string | null>(null);
  const [newProfileSuccess, setNewProfileSuccess] = useState<string | null>(null);

  const [teamsFilterBatchId, setTeamsFilterBatchId] = useState<string>('全部');
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);

  // When roleSettingStudentId changes, load note and roles
  useEffect(() => {
    if (roleSettingStudentId) {
      const student = profiles.find(p => p.id === roleSettingStudentId);
      // Load Note
      if (student && currentUserId) {
        const note = notes.find(n => n.student_id === roleSettingStudentId && n.captain_id === currentUserId)?.note || '';
        setAdminNoteText(note);
      } else {
        setAdminNoteText('');
      }

      // Load Roles from localStorage
      if (student && student.team_id) {
        const key = `nlp_captain_settings_${student.team_id}`;
        const stored = localStorage.getItem(key);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (parsed.squadRoles) {
              setSquadRolesMap(parsed.squadRoles);
            } else {
              setSquadRolesMap({});
            }
          } catch (e) {
            setSquadRolesMap({});
          }
        } else {
          setSquadRolesMap({});
        }
      } else {
        setSquadRolesMap({});
      }
    }
  }, [roleSettingStudentId, profiles, notes, currentUserId]);

  const handleAdminNoteBlur = async () => {
    if (!roleSettingStudentId || !onSaveNote) return;
    try {
      await onSaveNote(roleSettingStudentId, adminNoteText);
    } catch (err) {
      console.error('Error saving note:', err);
    }
  };

  const handleAdminRoleChange = (roleId: string) => {
    if (!roleSettingStudentId) return;
    const student = profiles.find(p => p.id === roleSettingStudentId);
    if (!student || !student.team_id) return;

    const nextSquadRoles = { ...squadRolesMap };
    if (roleId) {
      nextSquadRoles[roleSettingStudentId] = [roleId];
    } else {
      delete nextSquadRoles[roleSettingStudentId];
    }
    setSquadRolesMap(nextSquadRoles);

    // Save to localStorage immediately
    const key = `nlp_captain_settings_${student.team_id}`;
    const stored = localStorage.getItem(key);
    const parsed = stored ? JSON.parse(stored) : {};
    parsed.squadRoles = nextSquadRoles;
    localStorage.setItem(key, JSON.stringify(parsed));
  };

  const handleAddProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName.trim() || !newProfilePhone.trim()) return;
    setNewProfileError(null);
    setNewProfileSuccess(null);
    if (onAddProfile) {
      try {
        await onAddProfile({
          name: newProfileName.trim(),
          phone: newProfilePhone.trim(),
          role: newProfileRole,
          batchId: newProfileBatchId,
          teamId: newProfileTeamId,
          divisionName: newProfileRole === 'admin' ? newProfileDivisionName.trim() : null,
          directorId: newProfileRole === 'captain' ? newProfileDirectorId : null
        });
        setNewProfileSuccess(`🎉 成功新增 ${newProfileRole === 'captain' ? '小隊長' : newProfileRole === 'admin' ? '大隊長' : '學員'}：${newProfileName}`);
        setNewProfileName('');
        setNewProfilePhone('');
        setNewProfileBatchId('');
        setNewProfileTeamId('');
        setNewProfileRole('captain');
        setNewProfileDivisionName('');
        setNewProfileDirectorId('');
      } catch (err: any) {
        setNewProfileError(err.message || '新增失敗');
      }
    }
  };

  const handleQuickAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickBatchId || !quickCaptainId || !quickTeamId || !onQuickAssignCaptain) return;
    if (!confirm('確定要執行小隊長快速指派與綁定大隊嗎？')) return;
    try {
      await onQuickAssignCaptain(quickBatchId, quickCaptainId, quickTeamId, quickDirectorId || null);
      setQuickCaptainId('');
      setQuickTeamId('');
      setQuickDirectorId('');
    } catch (err: any) {
      console.error(err);
      alert(err.message || '指派小隊長失敗');
    }
  };

  const handleAssignTeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignStudentId) return;
    if (!confirm('確定要儲存此學員的小隊與角色分配變更嗎？')) return;
    await onAssignTeam(
      assignStudentId,
      assignTeamId || null,
      assignRole,
      assignBatchId || null,
      assignRole === 'admin' ? assignDivisionName.trim() : null,
      assignRole === 'captain' ? assignDirectorId : null,
      assignStatus
    );
    setAssignStudentId('');
    setAssignTeamId('');
    setAssignBatchId('');
    setAssignDivisionName('');
    setAssignDirectorId('');
    setAssignStatus('active');
  };

  const handleAssignBatchChange = (batchId: string) => {
    setAssignBatchId(batchId);
    setAssignTeamId('');
    setAssignStudentId('');
    setAssignDivisionName('');
    setAssignDirectorId('');
    setAssignStatus('active');
  };

  return (
        <div className="space-y-6">
          {/* ⚡ 快速期數小隊長指派 (小隊長綁定小隊與大隊) */}
          <section className="glass-panel p-6 rounded-3xl border border-amber-500/20 bg-amber-500/[0.01] space-y-4 light:bg-white light:border-slate-200 shadow-lg shadow-amber-500/[0.02] text-left">
            <h3 className="font-black text-white text-base select-none flex items-center gap-2 light:text-slate-900">
              <ShieldCheck className="text-amber-500" size={18} />
              ⚡ 快速期數小隊長指派 (小隊長綁定小隊與大隊)
            </h3>
            
            <form onSubmit={handleQuickAssignSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-xs text-slate-400 font-bold mb-1.5 light:text-slate-500">1. 選擇班次期數 (Batch)</label>
                <select
                  required
                  value={quickBatchId}
                  onChange={e => {
                    setQuickBatchId(e.target.value);
                    setQuickTeamId('');
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-500 light:bg-slate-50 light:border-slate-200 light:text-slate-900 cursor-pointer"
                >
                  <option value="">請選擇期數...</option>
                  {batches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 font-bold mb-1.5 light:text-slate-500">2. 安排指派小隊 (Team)</label>
                <select
                  required
                  disabled={!quickBatchId}
                  value={quickTeamId}
                  onChange={e => {
                    const selectedTeamId = e.target.value;
                    setQuickTeamId(selectedTeamId);
                    
                    // Auto-fill existing captain & director if set
                    const currentTeam = teams.find(t => t.id === selectedTeamId);
                    if (currentTeam && currentTeam.captain_id) {
                      setQuickCaptainId(currentTeam.captain_id);
                      const capProfile = profiles.find(p => p.profile_id === currentTeam.captain_id && p.batch_id === quickBatchId);
                      if (capProfile && capProfile.director_id) {
                        setQuickDirectorId(capProfile.director_id);
                      } else {
                        setQuickDirectorId('');
                      }
                    } else {
                      setQuickCaptainId('');
                      setQuickDirectorId('');
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-500 disabled:opacity-50 disabled:cursor-not-allowed light:bg-slate-50 light:border-slate-200 light:text-slate-900 cursor-pointer"
                >
                  {!quickBatchId ? (
                    <option value="">請先選擇期數...</option>
                  ) : (
                    <>
                      <option value="">請選擇指派小隊...</option>
                      {teams
                        .filter(t => t.batch_id === quickBatchId)
                        .map(t => {
                          const cap = profiles.find(p => p.profile_id === t.captain_id && p.batch_id === quickBatchId);
                          const teamLabel = t.custom_name ? `${t.name} (${t.custom_name})` : t.name;
                          const capLabel = cap ? `(小隊長: ${cap.name})` : '(無小隊長)';
                          return (
                            <option key={t.id} value={t.id}>
                              {teamLabel} {capLabel}
                            </option>
                          );
                        })}
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 font-bold mb-1.5 light:text-slate-500">3. 選擇小隊長候選人 (Captain Candidate)</label>
                <select
                  required
                  disabled={!quickTeamId}
                  value={quickCaptainId}
                  onChange={e => setQuickCaptainId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-500 disabled:opacity-50 disabled:cursor-not-allowed light:bg-slate-50 light:border-slate-200 light:text-slate-900 cursor-pointer"
                >
                  {!quickTeamId ? (
                    <option value="">請先選擇小隊...</option>
                  ) : (
                    <>
                      <option value="">請選擇小隊長候選人...</option>
                      {captainCandidates
                        .filter(c => c.status === 'eligible' || c.profile_id === quickCaptainId)
                        .filter(c => {
                          if (quickBatchId) {
                            const isAlreadyCaptain = teams.some(t => t.batch_id === quickBatchId && t.captain_id === c.profile_id && t.id !== quickTeamId);
                            return !isAlreadyCaptain;
                          }
                          return true;
                        })
                        .map(c => (
                          <option key={c.id} value={c.profile_id}>
                            {c.name} ({c.phone ? `*${c.phone.slice(-3)}` : '無手機'})
                          </option>
                        ))}
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 font-bold mb-1.5 light:text-slate-500">4. 綁定所屬大隊長 (Director - 選填)</label>
                <div className="flex gap-2">
                  <select
                    value={quickDirectorId}
                    onChange={e => setQuickDirectorId(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-500 light:bg-slate-50 light:border-slate-200 light:text-slate-900 cursor-pointer"
                  >
                    <option value="">無 / 未指派...</option>
                    {profiles
                      .filter(p => p.role === 'admin')
                      .map(p => (
                        <option key={p.id} value={p.id}>
                          👑 {p.name} {p.division_name ? `(${p.division_name})` : ''}
                        </option>
                      ))}
                  </select>
                  
                  <button
                    type="submit"
                    disabled={isSyncing || !quickBatchId || !quickCaptainId || !quickTeamId}
                    className="btn-action bg-amber-500 hover:bg-amber-600 text-slate-950 px-4 py-3 rounded-xl text-xs font-black shadow-lg shadow-amber-500/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                  >
                    儲存指派
                  </button>
                </div>
              </div>
            </form>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 新增修行人員 / 小隊長 */}
            <section className="glass-panel p-6 rounded-3xl border border-white/5 space-y-6 light:bg-white light:border-slate-200">
              <h3 className="font-black text-white text-base select-none flex items-center gap-2">
                <UserPlus className="text-amber-500" size={18} />
                管理員新增修行者 / 小隊長
              </h3>
              <form onSubmit={handleAddProfileSubmit} className="space-y-4 select-none">
                <div>
                  <label className="block text-xs text-slate-405 font-bold mb-1.5">姓名</label>
                  <input
                    required
                    type="text"
                    value={newProfileName}
                    onChange={e => setNewProfileName(e.target.value)}
                    placeholder="輸入真實姓名"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-405 font-bold mb-1.5">手機號碼</label>
                  <input
                    required
                    type="tel"
                    value={newProfilePhone}
                    onChange={e => setNewProfilePhone(e.target.value)}
                    placeholder="輸入手機號碼"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-405 font-bold mb-1.5">指定期數</label>
                    <select
                      required
                      value={newProfileBatchId}
                      onChange={e => {
                        setNewProfileBatchId(e.target.value);
                        setNewProfileTeamId('');
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-500"
                    >
                      <option value="">請選擇...</option>
                      {batches.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-405 font-bold mb-1.5">指定小隊</label>
                    <select
                      disabled={!newProfileBatchId}
                      value={newProfileTeamId}
                      onChange={e => setNewProfileTeamId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {!newProfileBatchId ? (
                        <option value="">請先選擇期數...</option>
                      ) : (
                        <>
                          <option value="">無 / 未分配</option>
                          {teams
                            .filter(t => t.batch_id === newProfileBatchId)
                            .map(t => {
                              const cap = profiles.find(p => p.profile_id === t.captain_id && p.batch_id === newProfileBatchId);
                              const teamLabel = t.custom_name ? `${t.name} (${t.custom_name})` : t.name;
                              return (
                                <option key={t.id} value={t.id}>
                                  {teamLabel} {cap ? `(小隊長: ${cap.name})` : '(無小隊長)'}
                                </option>
                              );
                            })}
                        </>
                      )}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-405 font-bold mb-1.5">指定角色</label>
                  <select
                    value={newProfileRole}
                    onChange={e => setNewProfileRole(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-500"
                  >
                    <option value="admin">大隊長 (admin)</option>
                    <option value="captain">小隊長 (captain)</option>
                    <option value="student">一般學員 (student)</option>
                  </select>
                </div>

                {newProfileRole === 'admin' && (
                  <div>
                    <label className="block text-xs text-slate-405 font-bold mb-1.5">大隊名稱</label>
                    <input
                      required
                      type="text"
                      value={newProfileDivisionName}
                      onChange={e => setNewProfileDivisionName(e.target.value)}
                      placeholder="例如：定洋大隊"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-500"
                    />
                  </div>
                )}

                {newProfileRole === 'captain' && (
                  <div>
                    <label className="block text-xs text-slate-405 font-bold mb-1.5">指派大隊長</label>
                    <select
                      value={newProfileDirectorId}
                      onChange={e => setNewProfileDirectorId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-500"
                    >
                      <option value="">無 / 未指派...</option>
                      {profiles
                        .filter(p => p.role === 'admin')
                        .map(p => (
                          <option key={p.id} value={p.id}>
                            👑 {p.name} {p.division_name ? `(${p.division_name})` : ''}
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                {newProfileError && (
                  <div className="text-red-500 text-xs font-bold bg-red-500/10 border border-red-500/20 p-3 rounded-xl text-center">
                    {newProfileError}
                  </div>
                )}
                {newProfileSuccess && (
                  <div className="text-emerald-550 text-xs font-bold bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl text-center">
                    {newProfileSuccess}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSyncing}
                  className="btn-action bg-amber-500 hover:bg-amber-600 text-slate-950 py-3 px-6 rounded-xl text-xs font-black shadow-lg shadow-amber-500/10"
                >
                  新增修行者
                </button>
              </form>
            </section>

            {/* 角色與分配變更 */}
            <section className="glass-panel p-6 rounded-3xl border border-white/5 space-y-6 light:bg-white light:border-slate-200">
              <h3 className="font-black text-white text-base select-none">
                學員小隊分配與角色變更
              </h3>
              <form onSubmit={handleAssignTeamSubmit} className="space-y-4 select-none">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 font-bold mb-1.5">選擇期數 (Batch)</label>
                    <select
                      value={assignBatchId}
                      onChange={e => handleAssignBatchChange(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-500"
                    >
                      <option value="">請選擇期數...</option>
                      {batches.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 font-bold mb-1.5">選擇小隊 (Team)</label>
                    <select
                      value={assignTeamId}
                      onChange={e => setAssignTeamId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">無 (獨立修行者)</option>
                      {teams
                        .filter(t => !assignBatchId || t.batch_id === assignBatchId)
                        .map(t => {
                          const cap = profiles.find(p => p.profile_id === t.captain_id && (!assignBatchId || p.batch_id === assignBatchId));
                          const teamLabel = t.custom_name ? `${t.name} (${t.custom_name})` : t.name;
                          return (
                            <option key={t.id} value={t.id}>
                              {teamLabel} {cap ? `(小隊長: ${cap.name})` : '(無小隊長)'}
                            </option>
                          );
                        })}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 font-bold mb-1.5">選擇修行者 (Practitioner)</label>
                    <select
                      required
                      value={assignStudentId}
                      onChange={e => {
                        const studentId = e.target.value;
                        setAssignStudentId(studentId);
                        const profile = profiles.find(p => p.id === studentId);
                        if (profile) {
                          setAssignRole(profile.role);
                          setAssignDivisionName(profile.division_name || '');
                          setAssignDirectorId(profile.director_id || '');
                          setAssignStatus(profile.status || 'active');
                          if (profile.batch_id) setAssignBatchId(profile.batch_id);
                        } else {
                          setAssignDivisionName('');
                          setAssignDirectorId('');
                          setAssignStatus('active');
                        }
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">請選擇...</option>
                      {profiles
                        .filter(p => !assignBatchId || p.batch_id === assignBatchId || !p.batch_id)
                        .map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.role === 'admin' ? '大隊長' : p.role === 'captain' ? '小隊長' : '學員'})
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 font-bold mb-1.5">變更角色 (Role)</label>
                    <select
                      disabled={!assignStudentId}
                      value={assignRole}
                      onChange={e => setAssignRole(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="student">學員 (student)</option>
                      <option value="captain">小隊長 (captain)</option>
                      <option value="admin">大隊長 (admin)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 font-bold mb-1.5">期數狀態 (Status)</label>
                    <select
                      disabled={!assignStudentId}
                      value={assignStatus}
                      onChange={e => setAssignStatus(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="active">進行中 (active)</option>
                      <option value="ended">已結束 (ended)</option>
                      <option value="inactive">已停用 (inactive)</option>
                    </select>
                  </div>

                  {assignRole === 'admin' && (
                    <div className="md:col-span-2">
                      <label className="block text-xs text-slate-400 font-bold mb-1.5">大隊名稱</label>
                      <input
                        required
                        type="text"
                        value={assignDivisionName}
                        onChange={e => setAssignDivisionName(e.target.value)}
                        placeholder="例如：定洋大隊"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-500"
                      />
                    </div>
                  )}

                  {assignRole === 'captain' && (
                    <div className="md:col-span-2">
                      <label className="block text-xs text-slate-400 font-bold mb-1.5">指派大隊長</label>
                      <select
                        value={assignDirectorId}
                        onChange={e => setAssignDirectorId(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-500"
                      >
                        <option value="">無 / 未指派...</option>
                        {profiles
                          .filter(p => p.role === 'admin')
                          .map(p => (
                            <option key={p.id} value={p.id}>
                              👑 {p.name} {p.division_name ? `(${p.division_name})` : ''}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={isSyncing || !assignStudentId}
                  className="btn-action bg-red-500 hover:bg-red-600 text-white py-3 px-6 rounded-xl text-xs font-black shadow-lg shadow-red-500/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  儲存分配變更
                </button>
              </form>
            </section>

            <section className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4 light:bg-white light:border-slate-200">
              <h3 className="font-black text-white text-base flex items-center gap-2 select-none light:text-slate-900">
                <Settings size={18} className="text-amber-500" />
                小隊成員備註與職責指派
              </h3>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">
                    選擇修行學員
                  </label>
                  <select
                    value={roleSettingStudentId}
                    onChange={(e) => setRoleSettingStudentId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-500 transition-all light:bg-slate-50 light:border-slate-300 light:text-slate-800"
                  >
                    <option value="">請選擇學員...</option>
                    {profiles.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.role === 'captain' ? '(小隊長)' : p.role === 'admin' ? '(大隊長)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {roleSettingStudentId && (() => {
                  const student = profiles.find(p => p.id === roleSettingStudentId);
                  const isCaptain = student?.role === 'captain';

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-white/5 light:border-slate-200 animate-in fade-in duration-200">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">
                          編輯角色與備註（如：嫦娥(抱抱)）
                        </label>
                        <input
                          type="text"
                          value={adminNoteText}
                          placeholder={DEFAULT_CHARACTERS[student?.name || ''] || "例如：如來佛祖(大隊長)"}
                          onBlur={handleAdminNoteBlur}
                          onChange={(e) => setAdminNoteText(e.target.value)}
                          className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-300 outline-none focus:border-amber-500 transition-all light:bg-slate-50 light:border-slate-300 light:text-slate-800"
                        />
                        <p className="text-[9px] text-slate-500 italic">備註輸入後移開焦點（Blur）將自動同步與儲存</p>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">
                          指派小組職責 {isCaptain && <span className="text-amber-500">(小隊長為系統預設角色)</span>}
                        </label>
                        {isCaptain ? (
                          <div className="w-full text-xs bg-slate-950/40 border border-white/5 rounded-xl px-3 py-2.5 text-slate-500 font-bold select-none light:bg-slate-100 light:border-slate-250">
                            👑 系統預設：小隊長
                          </div>
                        ) : (
                          <select
                            value={squadRolesMap[roleSettingStudentId]?.[0] || ''}
                            onChange={(e) => handleAdminRoleChange(e.target.value)}
                            className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-300 font-bold outline-none focus:border-teal-500 transition-all light:bg-slate-50 light:border-slate-300 light:text-slate-800"
                          >
                            <option value="">未分配職責</option>
                            {QUEST_ROLES_DEFS.map(role => (
                              <option key={role.id} value={role.id}>
                                🛡️ {role.name} ({role.duties.join(' · ')})
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </section>
          </div>

          {/* 小隊與小隊長指派控制台 */}
          <section className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4 light:bg-white light:border-slate-200">
            <h3 className="font-black text-white text-base select-none light:text-slate-900 flex items-center gap-2">
              🛡️ 小隊與小隊長指派控制台 (批次管理)
            </h3>
            
            {teamsFilterBatchId === '全部' ? (
              <div className="text-center py-6 text-slate-500 font-bold select-none text-xs">
                💡 請在上方篩選特定期數以指派小隊長。
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teams
                  .filter(t => t.batch_id === teamsFilterBatchId)
                  .map(t => {
                    const memberCount = profiles.filter(p => p.team_id === t.id && p.role === 'student' && p.batch_id === teamsFilterBatchId && p.status !== 'inactive').length;
                    return (
                      <div key={t.id} className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-3 relative light:bg-slate-50 light:border-slate-200 select-none text-left">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-white text-sm light:text-slate-900">
                              {t.custom_name ? `${t.name} (${t.custom_name})` : t.name}
                            </h4>
                            <div className="flex gap-3 text-[10px] text-slate-400 mt-1 light:text-slate-500 font-mono">
                              <span>成員：{memberCount} 人</span>
                              <span>代碼：{t.invite_code}</span>
                              <span className={t.invite_enabled ? 'text-emerald-400' : 'text-red-400'}>
                                {t.invite_enabled ? '已招募' : '關閉'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 pt-2 border-t border-white/5 light:border-slate-200">
                          <button
                            type="button"
                            onClick={() => {
                              const url = `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/?invite=${t.invite_code || ''}&batch=${t.batch_id || ''}&team=${t.id || ''}`;
                              navigator.clipboard?.writeText(url).then(() => {
                                setCopiedInviteId(t.id);
                                setTimeout(() => setCopiedInviteId(null), 2000);
                                if (showToast) {
                                  showToast('✓ 邀請連結已複製到剪貼簿！', 'success');
                                }
                              }).catch(() => { window.prompt('複製此邀請連結：', url); });
                            }}
                            className={`w-full btn-action flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-black transition-all cursor-pointer ${copiedInviteId === t.id ? 'bg-emerald-600 text-white' : 'bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 border border-amber-500/20'}`}
                          >
                            {copiedInviteId === t.id ? '✓ 已複製邀請連結' : '🔗 複製邀請連結'}
                          </button>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] text-slate-400 font-bold select-none light:text-slate-500">
                              👤 小隊長:
                            </span>
                            <select
                              value={t.captain_id || ''}
                              disabled={isSyncing}
                              onChange={async (e) => {
                                if (!confirm('確定要變更此小隊的小隊長指派嗎？')) return;
                                if (onUpdateTeamSettings) {
                                  try {
                                    await onUpdateTeamSettings(t.id, { captain_id: e.target.value || null });
                                    alert('成功更新小隊長指派！');
                                  } catch (err: any) {
                                    alert(err.message || '指派小隊長失敗');
                                  }
                                }
                              }}
                              className="bg-slate-900 border border-slate-800 text-amber-500 rounded px-1.5 py-0.5 text-[10px] font-black outline-none cursor-pointer light:bg-slate-100 light:border-slate-300"
                            >
                              <option value="">-- 未指派 --</option>
                              {captainCandidates
                                .filter(c => c.status === 'eligible' || c.profile_id === t.captain_id)
                                .filter(c => {
                                  const isCaptainOfOtherTeam = teams.some(team => team.batch_id === t.batch_id && team.captain_id === c.profile_id && team.id !== t.id);
                                  return !isCaptainOfOtherTeam;
                                })
                                .map(c => (
                                  <option key={c.id} value={c.profile_id}>
                                    {c.name}
                                  </option>
                                ))}
                            </select>
                          </div>

                          {t.captain_id && (() => {
                            const cap = profiles.find(p => p.profile_id === t.captain_id && p.batch_id === teamsFilterBatchId);
                            if (!cap) return null;
                            return (
                              <div className="flex items-center gap-1.5 flex-wrap animate-in slide-in-from-top-1 duration-200">
                                <span className="text-[10px] text-slate-400 font-bold select-none light:text-slate-500">
                                  👑 所屬大隊:
                                </span>
                                <select
                                  value={cap.director_id || ''}
                                  disabled={isSyncing}
                                  onChange={async (e) => {
                                    if (!confirm('確定要變更此小隊長所屬的大隊嗎？')) return;
                                    if (onAssignTeam) {
                                      try {
                                        await onAssignTeam(
                                          cap.id,
                                          t.id,
                                          'captain',
                                          t.batch_id,
                                          null,
                                          e.target.value || null,
                                          cap.status
                                        );
                                        alert('成功變更大隊！');
                                      } catch (err: any) {
                                        alert(err.message || '變更大隊失敗');
                                      }
                                    }
                                  }}
                                  className="bg-slate-900 border border-slate-800 text-purple-400 rounded px-1.5 py-0.5 text-[10px] font-black outline-none cursor-pointer light:bg-slate-100 light:border-slate-300"
                                >
                                  <option value="">-- 未指定大隊 --</option>
                                  {profiles
                                    .filter(p => p.role === 'admin')
                                    .map(p => (
                                      <option key={p.id} value={p.id}>
                                        👑 {p.name} {p.division_name ? `(${p.division_name})` : ''}
                                      </option>
                                    ))}
                                </select>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    );
                  })}
                {teams.filter(t => t.batch_id === teamsFilterBatchId).length === 0 && (
                  <div className="col-span-full text-center py-6 text-slate-500 font-bold text-xs">
                    本期數下尚無任何小隊。
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Roster list overview */}
          <section className="glass-panel p-6 rounded-3xl border border-white/5 space-y-3 light:bg-white light:border-slate-200">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 select-none">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                目前名冊概覽
              </h4>
              
              {/* Batch Filter Pills */}
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-[10px] text-slate-400 font-bold">期數篩選:</span>
                {['全部', ...batches.map(b => b.id)].map(batchId => {
                  const label = batchId === '全部' ? '全部' : (batches.find(b => b.id === batchId)?.name || batchId);
                  const isActive = teamsFilterBatchId === batchId;
                  return (
                    <button
                      key={batchId}
                      type="button"
                      onClick={() => setTeamsFilterBatchId(batchId)}
                      className={`py-1 px-2.5 rounded-lg text-[9px] font-black transition-all cursor-pointer ${
                        isActive
                          ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                          : 'bg-slate-900 border border-white/5 text-slate-400 hover:text-white light:bg-slate-100 light:border-slate-300 light:text-slate-500'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-slate-950/60 border border-white/5 rounded-2xl overflow-x-auto light:bg-slate-50 light:border-slate-300">
              <table className="w-full text-left text-xs border-collapse [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap">
                <thead>
                  <tr className="border-b border-white/5 text-slate-300 font-bold uppercase light:border-slate-200 select-none">
                    <th className="p-3 sticky left-0 z-10 bg-slate-950 light:bg-slate-50">姓名</th>
                    <th className="p-3">手機</th>
                    <th className="p-3">角色</th>
                    <th className="p-3">所屬大隊長</th>
                    <th className="p-3">所屬班次</th>
                    <th className="p-3">所屬分隊</th>
                    <th className="p-3">狀態</th>
                    <th className="p-3 text-right">當前經驗</th>
                    <th className="p-3 text-center">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 light:divide-slate-200">
                  {profiles
                    .filter(p => teamsFilterBatchId === '全部' || p.batch_id === teamsFilterBatchId)
                    .map(p => {
                      const team = teams.find(t => t.id === p.team_id);
                      const batch = batches.find(b => b.id === p.batch_id);
                      return (
                        <tr key={p.id} className="bg-slate-950/60 light:bg-slate-50">
                          <td className="p-3 font-bold text-white sticky left-0 z-10 bg-slate-950 light:bg-slate-50 light:text-slate-900">{p.name}</td>
                          <td className="p-3 text-slate-200 light:text-slate-800 font-mono">{p.phone || '—'}</td>
                          <td className="p-3 text-slate-200 light:text-slate-800 select-none">
                            {p.role === 'admin' ? '🔴 大隊長' : p.role === 'captain' ? '🟡 小隊長' : '🟢 學員'}
                          </td>
                          <td className="p-3 text-slate-400 light:text-slate-600 select-none">
                            {p.role === 'admin'
                              ? (p.division_name || '—')
                              : p.role === 'captain'
                              ? (p.director_id ? (profiles.find(leader => leader.id === p.director_id)?.name || '未填寫') : '—')
                              : '—'}
                          </td>
                          <td className="p-3 text-slate-200 light:text-slate-800 select-none">{batch ? batch.name : '—'}</td>
                          <td className="p-3 text-slate-200 light:text-slate-800 select-none font-bold">
                            {team ? (
                              (() => {
                                // 只顯示「第X隊」：去掉期數前綴、不顯示組別與小隊長
                                const short = batch && team.name.startsWith(batch.name)
                                  ? team.name.replace(batch.name, '').trim()
                                  : (team.name.replace(/(NLP|揚升).*?期/i, '').trim() || team.name);
                                return short;
                              })()
                            ) : '—'}
                          </td>
                          <td className="p-3 text-slate-200 light:text-slate-800 select-none">
                            {(!p.status || p.status === 'active') ? (
                              <span className="text-emerald-400 font-black">進行中</span>
                            ) : p.status === 'ended' ? (
                              <span className="text-slate-400 font-bold">已結束</span>
                            ) : (
                              <span className="text-red-400 font-bold">已停用</span>
                            )}
                          </td>
                          <td className="p-3 text-right font-black text-amber-500 select-none">{p.score.toLocaleString()}</td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => {
                                setAssignStudentId(p.id);
                                setAssignRole(p.role);
                                setAssignDivisionName(p.division_name || '');
                                setAssignDirectorId(p.director_id || '');
                                setAssignStatus(p.status || 'active');
                                if (p.batch_id) setAssignBatchId(p.batch_id);
                                if (p.team_id) setAssignTeamId(p.team_id);
                                window.scrollTo({ top: 300, behavior: 'smooth' });
                              }}
                              className="bg-amber-500/20 hover:bg-amber-500 text-amber-500 hover:text-slate-950 font-bold py-1 px-3 rounded-lg text-xs transition-colors outline-none cursor-pointer"
                            >
                              編輯
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
  );
}
