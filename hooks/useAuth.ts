import { supabase } from '@/lib/supabase';
import { Profile, UserRole, Team } from '@/types';

interface Deps {
  setIsSyncing: (v: boolean) => void;
  fetchData: (userId?: string) => Promise<Profile | null>;
  currentUser: Profile | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<Profile | null>>;
  setCurrentTeam: React.Dispatch<React.SetStateAction<Team | null>>;
  setViewState: React.Dispatch<React.SetStateAction<'login' | 'register' | 'app'>>;
  setGmMode: React.Dispatch<React.SetStateAction<boolean>>;
  setActiveTab: (tab: any) => void;
  inviteCode: string;
  setInviteCode: React.Dispatch<React.SetStateAction<string>>;
  setInvitedTeamName: React.Dispatch<React.SetStateAction<string>>;
  setInvitedCaptainName: React.Dispatch<React.SetStateAction<string>>;
  setInviteError: React.Dispatch<React.SetStateAction<string>>;
  userEnrollments: Profile[];
  USE_REAL_AUTH: boolean;
}

export function useAuth({
  setIsSyncing,
  fetchData,
  currentUser,
  setCurrentUser,
  setCurrentTeam,
  setViewState,
  setGmMode,
  setActiveTab,
  inviteCode,
  setInviteCode,
  setInvitedTeamName,
  setInvitedCaptainName,
  setInviteError,
  userEnrollments,
  USE_REAL_AUTH,
}: Deps) {
  const handleLogin = async (name: string, phone: string) => {
    setIsSyncing(true);
    try {
      const safeName = (name || '').trim();
      const safePhone = (phone || '').trim();

      let apiProfile: any = null;
      if (USE_REAL_AUTH && typeof (supabase as any)?.auth?.verifyOtp === 'function') {
        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: safeName, phone: safePhone }),
          });
          if (res.ok) {
            const { token_hash, profile: p } = await res.json();
            if (token_hash) {
              await supabase.auth.verifyOtp({ token_hash, type: 'email' });
            }
            // 後端已回傳該學員 profile → 省下前端再查一次 profiles(實測約 -339ms)
            apiProfile = p || null;
          }
        } catch (e) {
          console.warn('[auth] 後端核發 session 失敗，退回姓名+電話比對：', e);
        }
      }

      // 只有「後端沒回 profile」(USE_REAL_AUTH 關閉或 API 失敗)才退回前端自查 —— 保留安全退路
      let profile: any = apiProfile;
      if (!profile) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('name', safeName)
          .eq('phone', safePhone)
          .limit(1)
          .maybeSingle();
        if (error || !data) {
          throw new Error('姓名與手機號碼不符，請再確認後重試');
        }
        profile = data;
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('nlp_mock_user_id', profile.id);
      }

      const loadedProfile = await fetchData(profile.id);
      setViewState('app');
      if (loadedProfile && loadedProfile.role === 'admin') {
        setActiveTab('admin');
      } else {
        setActiveTab('daily');
      }
    } catch (err: any) {
      setIsSyncing(false);
      throw new Error(err.message || '登入失敗');
    }
  };

  const handleRegister = async (regData: { name: string; phone: string; role: UserRole }) => {
    setIsSyncing(true);

    const safeName = (regData.name || '').trim();
    const safePhone = (regData.phone || '').trim();
    // 重複檢查：優先走伺服器(service role，profiles 收緊 RLS 後仍可查)；API 失敗才退回前端查。
    let alreadyExists = false;
    try {
      const res = await fetch('/api/auth/check-exists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: safeName, phone: safePhone }),
      });
      if (res.ok) {
        alreadyExists = !!(await res.json()).exists;
      } else {
        const { data } = await supabase.from('profiles').select('id').eq('name', safeName).eq('phone', safePhone).limit(1);
        alreadyExists = !!(data && data.length > 0);
      }
    } catch {
      const { data } = await supabase.from('profiles').select('id').eq('name', safeName).eq('phone', safePhone).limit(1);
      alreadyExists = !!(data && data.length > 0);
    }
    if (alreadyExists) {
      setIsSyncing(false);
      throw new Error('此姓名與手機已經註冊過了。若要加入新的一期，請改用「登入」，登入後再點一次邀請連結即可加入。');
    }

    let batch_id: string | null = null;
    let team_id: string | null = null;
    let captain_id: string | null = null;

    if (inviteCode) {
      const params = new URLSearchParams(window.location.search);
      const urlBatch = params.get('batch') || '';
      const urlTeam = params.get('team') || '';
      const { data: teamsList } = await supabase.from('teams').select('*');
      const team = teamsList?.find((t: any) => t.invite_code === inviteCode && t.batch_id === urlBatch && t.id === urlTeam);
      if (team) {
        batch_id = team.batch_id || 'batch-50';
        team_id = team.id;
        captain_id = team.captain_id;
      }
    }

    const newId = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : `usr-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

    const { error } = await supabase.from('profiles').insert({
      id: newId,
      profile_id: newId,
      name: safeName,
      phone: safePhone,
      role: regData.role,
      batch_id,
      team_id,
      captain_id,
      score: 0,
      status: 'active',
      created_at: new Date().toISOString()
    });

    if (error) {
      setIsSyncing(false);
      throw new Error(error.message);
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('nlp_mock_user_id', newId);
    }
    await fetchData(newId);
    setViewState('app');
    setActiveTab('daily');
    setInviteCode('');
    setInvitedTeamName('');
    setInvitedCaptainName('');
    setInviteError('');
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('nlp_session');
      localStorage.removeItem('nlp_mock_user_id');
      // 清掉 SWR 表格快取(共用裝置隱私：下一個人登入不會先看到上一個人的快取畫面)
      Object.keys(localStorage)
        .filter((k) => k.startsWith('nlp_tables_'))
        .forEach((k) => localStorage.removeItem(k));
    }
    setCurrentUser(null);
    setCurrentTeam(null);
    setViewState('login');
    setGmMode(false);
    setActiveTab('daily');
  };

  const handleSwitchCohort = async (batchId: string) => {
    const nextEnrollment = userEnrollments.find(e => e.batch_id === batchId);
    if (nextEnrollment) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('nlp_session', JSON.stringify(nextEnrollment));
        localStorage.setItem('nlp_mock_user_id', nextEnrollment.id);
      }
      await fetchData(nextEnrollment.id);
    }
  };

  return {
    handleLogin,
    handleRegister,
    handleLogout,
    handleSwitchCohort,
  };
}
