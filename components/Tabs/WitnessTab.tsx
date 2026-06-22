'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Profile, Task, Submission, Batch, Team } from '@/types';
import {
  BookOpen, ImageIcon, Quote, Search,
  CheckCircle2, Calendar, Heart,
  MessageCircle, Send, X, ChevronDown, ChevronUp,
  Sparkles, ZoomIn, Plus, Loader2, ChevronLeft
} from 'lucide-react';
import { supabase, uploadProofImage } from '@/lib/supabase';

interface WitnessComment {
  id: string;
  submissionId: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
}

interface WitnessTabProps {
  profiles: Profile[];
  tasks: Task[];
  submissions: Submission[];
  currentUserId: string;
  onRefresh?: () => Promise<void>;
  batches: Batch[];
  teams?: Team[];
  onHideWitness?: (subId: string) => Promise<void>;
  onDeleteWitness?: (subId: string) => Promise<void>;
}

const CAPTAIN_MANUAL       = '由小隊長於指揮所手動設定打卡';


const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 450;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.4);
        resolve(compressedBase64);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

export function WitnessTab({ profiles, tasks, submissions, currentUserId, onRefresh, batches, teams, onHideWitness, onDeleteWitness }: WitnessTabProps) {
  const [category,     setCategory]     = useState<'all' | 'current' | 'mission' | 'sharing' | 'hidden'>('all');
  const [searchQuery,  setSearchQuery]  = useState('');
  const [likes,        setLikes]        = useState<Record<string, string[]>>({});
  const [comments,     setComments]     = useState<WitnessComment[]>([]);
  const [sortBy,       setSortBy]       = useState<'newest' | 'popular'>('newest');
  const [scopeFilter,  setScopeFilter]  = useState<'all' | 'myTeam'>('all');
  const [openComments, setOpenComments] = useState<string | null>(null); // submissionId
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({});
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number>(0);
  const [expandedText, setExpandedText] = useState<Set<string>>(new Set());
  const [hiddenIds,    setHiddenIds]    = useState<string[]>([]);
  const [taskFilter,   setTaskFilter]   = useState<string>('all'); // 隱藏(管理)區：依任務篩選
  const [batchFilter,  setBatchFilter]  = useState<string>('all'); // 隱藏(管理)區：依期數篩選
  // 每次只渲染前 N 筆見證卡片（資料仍全載，僅畫面分頁，避免一次塞太多 DOM）
  const PAGE_SIZE = 20;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const commentInputRef = useRef<HTMLInputElement>(null);

  // Custom post form state
  const [customText, setCustomText] = useState('');
  const [customImgs, setCustomImgs] = useState<string[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  // 從資料庫載入按讚/留言（跨裝置共享）
  const loadSocial = async () => {
    try {
      const [likeRes, commentRes] = await Promise.all([
        supabase.from('witness_likes').select('submission_id, user_id'),
        supabase.from('witness_comments').select('*').order('created_at', { ascending: true }),
      ]);
      const likeMap: Record<string, string[]> = {};
      (likeRes.data || []).forEach((r: any) => {
        (likeMap[r.submission_id] = likeMap[r.submission_id] || []).push(r.user_id);
      });
      setLikes(likeMap);
      setComments((commentRes.data || []).map((r: any) => ({
        id: r.id,
        submissionId: r.submission_id,
        userId: r.user_id,
        userName: r.user_name,
        text: r.content,
        createdAt: r.created_at,
      })));
    } catch (e) { console.error('載入見證互動失敗', e); }
  };

  // on mount：載入互動資料 + 本機隱藏清單
  useEffect(() => {
    loadSocial();
    try {
      setHiddenIds(JSON.parse(localStorage.getItem('nlp_witness_hidden') || '[]'));
    } catch (e) {}
  }, []);

  const currentUser = profiles.find(p => p.id === currentUserId);

  // 取一筆見證所屬的「任務名稱」：批次任務用 mission.title，舊任務 fallback 到 tasks 表（task_id / mission_id）。
  // 用名稱當分組鍵 → 同一個任務跨天/跨期會併成一項，方便管理員挑單一任務看「誰上傳」。
  const taskNameOfSub = (s: any): string =>
    s.mission_id === 'task-custom-post'
      ? '自由分享貼文'
      : (s.mission?.title
          || tasks.find(t => t.id === s.task_id)?.name
          || tasks.find(t => t.id === s.mission_id)?.name
          || s.mission?.template?.title
          || '（其他／未知任務）');

  // 取一筆見證所屬的「任務種類（分類）」：批次任務優先用 mission.category，
  // 沒有就退回任務型態的中文（每日／每週／特殊／限時），自由分享另計。用種類當分組鍵。
  const taskCategoryOfSub = (s: any): string => {
    if (s.mission_id === 'task-custom-post') return '自由分享';
    const cat = s.mission?.category
      || (tasks.find(t => t.id === s.task_id) as any)?.category
      || (tasks.find(t => t.id === s.mission_id) as any)?.category;
    if (cat && String(cat).trim()) return String(cat).trim();
    const type = s.mission?.mission_type
      || (tasks.find(t => t.id === s.task_id) as any)?.type
      || (tasks.find(t => t.id === s.mission_id) as any)?.type;
    const map: Record<string, string> = { daily: '每日任務', weekly: '每週任務', special: '特殊加碼', limited: '限時挑戰' };
    return map[type as string] || '其他';
  };

  // 取該見證作者所屬「小隊名稱」（優先自訂名）。若小隊名含完整期數前綴則去掉，避免與期數徽章重複。
  const teamNameOfStudent = (studentId: string) => {
    const p = profiles.find(pp => pp.id === studentId);
    if (!p?.team_id) return '';
    const tm = (teams || []).find(t => t.id === p.team_id);
    if (!tm) return '';
    let nm = (tm.custom_name || tm.name || '').trim();
    const batchName = batches.find(b => b.id === p.batch_id)?.name?.trim();
    if (batchName && nm.startsWith(batchName)) {
      const stripped = nm.slice(batchName.length).trim();
      if (stripped) nm = stripped;
    }
    return nm;
  };

  // 取該見證所屬任務的審核方式：auto=免審核（不進管理區）。自由分享貼文視為非 auto。
  const reviewTypeOfSub = (s: any): string =>
    s.mission_id === 'task-custom-post'
      ? 'leader'
      : (s.mission?.review_type
          || (tasks.find(t => t.id === s.task_id) as any)?.review_type
          || (tasks.find(t => t.id === s.mission_id) as any)?.review_type
          || 'leader');

  const currentBatchId = useMemo(() => {
    return currentUser?.batch_id || (batches.find(b => b.status === 'active')?.id) || batches[0]?.id || '';
  }, [currentUser, batches]);

  // All approved submissions with real proof
  const baseItems = useMemo(() =>
    submissions
      .filter(s => s.status === 'approved' && s.proof_text !== CAPTAIN_MANUAL)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [submissions]
  );

  const witnessItems = useMemo(() => {
    return baseItems.filter(s =>
      s.share_to_witness !== false &&
      (s.mission_id === 'task-custom-post' || s.share_to_witness === true) &&
      !hiddenIds.includes(s.id)
    );
  }, [baseItems, hiddenIds]);

  const filtered = useMemo(() => {
    let sourceItems = baseItems;

    if (category === 'hidden') {
      // 管理/上架區：顯示「目前不在牆上」的所有已通過見證（含純文字、無照片），
      // 供管理員審閱後上架（復原顯示＝+200 入選見證牆獎勵）或清理照片。
      // 放寬：只要有心得文字或照片就列出（排除無內容的純簽到）。
      sourceItems = sourceItems.filter(s =>
        (s.share_to_witness === false || hiddenIds.includes(s.id)) &&
        (!!s.proof_image_url || (!!s.proof_text && s.proof_text.trim() !== '') || s.mission_id === 'task-custom-post') &&
        (s.mission_id === 'task-custom-post' || reviewTypeOfSub(s) !== 'auto') // 免審核(auto)的不進管理區
      );
    } else {
      // Normal witness wall logic
      sourceItems = sourceItems.filter(s =>
        s.share_to_witness !== false &&
        (s.mission_id === 'task-custom-post' || s.share_to_witness === true) &&
        !hiddenIds.includes(s.id)
      );
    }

    // 1. Filter by category (for non-hidden tabs)
    let result = sourceItems.filter(s => {
      const profile = profiles.find(p => p.id === s.student_id);
      const studentBatchId = profile?.batch_id || '';

      if (category === 'current') {
        return studentBatchId === currentBatchId;
      } else if (category === 'mission') {
        return studentBatchId === currentBatchId && s.mission_id !== 'task-custom-post';
      } else if (category === 'sharing') {
        return studentBatchId === currentBatchId && s.mission_id === 'task-custom-post';
      }
      return true; // 'all' or 'hidden'
    });

    // 1b. 隱藏(管理)區專屬：依任務 / 期數 篩選
    if (category === 'hidden') {
      result = result.filter(s => {
        const profile = profiles.find(p => p.id === s.student_id);
        const matchTask  = taskFilter  === 'all' || taskNameOfSub(s) === taskFilter;
        const matchBatch = batchFilter === 'all' || (profile?.batch_id || '') === batchFilter;
        return matchTask && matchBatch;
      });
    }

    // 2. Filter by search & team scope
    result = result.filter(s => {
      const profile = profiles.find(p => p.id === s.student_id);
      const task    = tasks.find(t => t.id === s.mission_id);
      
      const matchSearch = !searchQuery ||
        profile?.name.includes(searchQuery) ||
        task?.name.includes(searchQuery) ||
        s.proof_text?.includes(searchQuery);
      
      const matchScope  = scopeFilter === 'all' || 
        (currentUser?.team_id && profile?.team_id === currentUser.team_id);
      
      return matchSearch && matchScope;
    });

    // 3. Sort
    if (sortBy === 'popular') {
      result = [...result].sort((a, b) => {
        const likesA = likes[a.id]?.length || 0;
        const likesB = likes[b.id]?.length || 0;
        if (likesB !== likesA) {
          return likesB - likesA;
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    } else {
      result = [...result].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return result;
  }, [baseItems, category, currentBatchId, searchQuery, scopeFilter, sortBy, profiles, tasks, currentUser, likes, hiddenIds, taskFilter, batchFilter]);

  // 隱藏(管理)區可篩選的「任務 / 期數」選項（只列實際有資料的，避免下拉爆滿）
  const hiddenFilterOptions = useMemo(() => {
    const notOnWall = baseItems.filter(s =>
      (s.share_to_witness === false || hiddenIds.includes(s.id)) &&
      (!!s.proof_image_url || (!!s.proof_text && s.proof_text.trim() !== '') || s.mission_id === 'task-custom-post') &&
      (s.mission_id === 'task-custom-post' || reviewTypeOfSub(s) !== 'auto')
    );
    const names = new Set<string>();
    const batchIds = new Set<string>();
    notOnWall.forEach(s => {
      names.add(taskNameOfSub(s));
      const p = profiles.find(pp => pp.id === s.student_id);
      if (p?.batch_id) batchIds.add(p.batch_id);
    });
    const taskOpts = Array.from(names).sort((a, b) => a.localeCompare(b, 'zh-Hant'));
    const batchOpts = Array.from(batchIds)
      .filter(id => id !== 'batch-50')                                  // 隱藏預設期數 batch-50
      .map(id => ({ id, name: batches.find(b => b.id === id)?.name || '' }))
      .filter(o => o.name && o.name !== 'batch-50')                     // 只列有正式名稱的期數
      .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant'));
    return { taskOpts, batchOpts };
  }, [baseItems, hiddenIds, profiles, tasks, batches, teams]);

  // 切換分類/搜尋/排序/篩選時，回到第一頁
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [category, searchQuery, scopeFilter, sortBy, taskFilter, batchFilter]);
  // 離開/切換分頁時重置隱藏區的任務/期數篩選
  useEffect(() => { setTaskFilter('all'); setBatchFilter('all'); }, [category]);

  // ── like toggle ───────────────────────────────────────────────────
  const handleToggleLike = async (subId: string) => {
    const arr = likes[subId] || [];
    const liked = arr.includes(currentUserId);

    // 樂觀更新 UI
    setLikes(prev => {
      const currentArr = prev[subId] || [];
      const next = currentArr.includes(currentUserId)
        ? currentArr.filter(id => id !== currentUserId)
        : [...currentArr, currentUserId];
      return { ...prev, [subId]: next };
    });

    try {
      if (liked) {
        await supabase
          .from('witness_likes')
          .delete()
          .eq('submission_id', subId)
          .eq('user_id', currentUserId);
      } else {
        await supabase
          .from('witness_likes')
          .insert({
            submission_id: subId,
            user_id: currentUserId,
          });
      }
    } catch (e) {
      console.error('更新按讚失敗', e);
    }
  };

  // ── comment submit ────────────────────────────────────────────────
  const handleSubmitComment = async (subId: string) => {
    const text = (commentDraft[subId] || '').trim();
    if (!text || !currentUser) return;
    const newCommentId = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2, 11);

    const newComment: WitnessComment = {
      id: newCommentId,
      submissionId: subId,
      userId: currentUserId,
      userName: currentUser.name,
      text,
      createdAt: new Date().toISOString()
    };

    // 樂觀更新 UI
    setComments(prev => [...prev, newComment]);
    setCommentDraft(prev => ({ ...prev, [subId]: '' }));

    try {
      await supabase
        .from('witness_comments')
        .insert({
          id: newCommentId,
          submission_id: subId,
          user_id: currentUserId,
          user_name: currentUser.name,
          content: text,
          created_at: newComment.createdAt
        });
    } catch (e) {
      console.error('發布留言失敗', e);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedText(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handlePublishCustomPost = async () => {
    if (!customText.trim() && customImgs.length === 0) return;
    if (!currentUser) return;
    setIsPublishing(true);
    setPublishError(null);

    try {
      // 1. Guarantee that the custom task exists to satisfy foreign key constraints
      await supabase.from('tasks').upsert({
        id: 'task-custom-post',
        name: '自由分享',
        description: '自主發表的見證心得',
        type: 'special',
        score: 0,
        requires_approval: false
      });

      // 2. Insert the custom post as an approved submission
      // 先把每張 base64 圖片上傳到 Storage，避免多張大圖塞進單一 DB 欄位導致存入失敗
      const uploadedImgs = (await Promise.all(customImgs.map(img => uploadProofImage(img)))).filter(Boolean);
      const submissionData = {
        mission_id: 'task-custom-post',
        student_id: currentUserId,
        proof_text: customText.trim() || null,
        proof_image_url: uploadedImgs.join('|') || null,
        proof_link: null,
        status: 'approved',
        score_awarded: 0,
        share_to_witness: true,
        reviewed_by: 'system',
        reviewed_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      };

      const { error: insertError } = await supabase.from('submissions').insert(submissionData);
      if (insertError) {
        console.error('Error publishing custom witness post:', insertError);
        // supabase insert 失敗不會 throw，錯誤在回傳值裡。安全鎖擋下通常代表登入身分失效/未綁定 → 引導重新登入
        if (/\[安全\]|只能為自己|row-level security/i.test(insertError.message || '')) {
          setPublishError('您的登入似乎已過期，請重新登入後再發佈 🙏');
        } else {
          setPublishError(`發佈失敗：${insertError.message}`);
        }
        return;
      }

      // Reset form
      setCustomText('');
      setCustomImgs([]);

      // Refresh parent state
      if (onRefresh) {
        await onRefresh();
      }
    } catch (err: any) {
      console.error('Error publishing custom witness post:', err);
      setPublishError(`發佈失敗：${err?.message || '請稍後再試，或重新登入'}`);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-5 animate-in fade-in duration-300">

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="glass-panel p-5 rounded-3xl border border-purple-500/10 relative overflow-hidden light:bg-white light:border-slate-200">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />
        <div className="relative flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500/30 to-indigo-500/20 border border-purple-500/20 flex items-center justify-center">
              <BookOpen size={20} className="text-purple-300" />
            </div>
            <div>
              <h2 className="text-base font-black text-white light:text-slate-900">見證分享牆</h2>
              <p className="text-[10px] text-slate-400 mt-0.5 font-medium light:text-slate-500">
                已審核修行見證： <span className="text-purple-400 font-black">{witnessItems.length}</span> 則
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            {[
              { label: '分享者', value: new Set(witnessItems.map(s => s.student_id)).size, color: 'text-emerald-400' },
              { label: '含圖片', value: witnessItems.filter(s => s.proof_image_url).length, color: 'text-sky-400' }
            ].map(stat => (
              <div key={stat.label} className="bg-slate-900/60 border border-white/5 px-3 py-1.5 rounded-xl text-center light:bg-slate-50">
                <div className={`text-sm font-black leading-none ${stat.color}`}>{stat.value}</div>
                <div className="text-[9px] text-slate-400 mt-0.5 font-bold">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Category Switcher Tabs ───────────────────────────────────── */}
      <div className="flex flex-wrap bg-slate-900/60 p-1 rounded-2xl border border-white/5 gap-1 select-none light:bg-slate-100 light:border-slate-200">
        {[
          { id: 'all', label: '全部見證' },
          { id: 'current', label: '當期見證' },
          { id: 'mission', label: '任務見證' },
          { id: 'sharing', label: '分享見證' },
          ...(currentUser?.role === 'admin' ? [{ id: 'hidden', label: '已隱藏(管理)' }] : [])
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setCategory(tab.id as any);
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer text-center ${
              category === tab.id
                ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white light:text-slate-500 light:hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Search & Filters (Clean, Minimal & Flat) ────────────────── */}
      <div className="space-y-3 p-1">
        {/* Sleek Search Input */}
        <div className="relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={category === 'sharing' ? '搜尋成員或分享內容...' : '搜尋成員或關鍵字...'}
            className="w-full bg-slate-900 border border-white/10 rounded-2xl pl-9 pr-4 py-2 text-xs text-slate-100 outline-none focus:border-purple-500/50 focus:bg-slate-950 transition-all placeholder:text-slate-500 light:bg-white light:border-slate-300 light:text-slate-900 font-medium"
          />
        </div>

        {/* Small Inline Scope & Sort Selectors (No clunky layout box) */}
        <div className="flex items-center justify-between gap-3 text-[11px] select-none">
          {/* Scope Segment */}
          <div className="flex bg-slate-950 p-0.5 rounded-xl border border-white/5 light:bg-slate-200">
            {[
              { key: 'all', label: '所有人' },
              { key: 'myTeam', label: '僅我小隊' }
            ].map(opt => {
              const isActive = scopeFilter === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => setScopeFilter(opt.key as any)}
                  className={`py-1 px-3 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                    isActive
                      ? 'bg-purple-500 text-white shadow-md font-black'
                      : 'text-slate-400 hover:text-white light:text-slate-500 light:hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* Sort Segment */}
          <div className="flex bg-slate-950 p-0.5 rounded-xl border border-white/5 light:bg-slate-200">
            {[
              { key: 'newest', label: '最新發布' },
              { key: 'popular', label: '最受歡迎' }
            ].map(opt => {
              const isActive = sortBy === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => setSortBy(opt.key as any)}
                  className={`py-1 px-3 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                    isActive
                      ? 'bg-purple-500 text-white shadow-md font-black'
                      : 'text-slate-400 hover:text-white light:text-slate-500 light:hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 🗂️ 隱藏(管理)區專屬：依期數 / 任務 篩選 */}
      {category === 'hidden' && (
        <div className="flex flex-wrap items-center gap-2 p-1">
          <span className="text-[10px] font-black text-slate-400 light:text-slate-500">篩選</span>
          <select
            value={batchFilter}
            onChange={e => setBatchFilter(e.target.value)}
            className="bg-slate-900 border border-white/10 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-slate-100 outline-none focus:border-purple-500/50 cursor-pointer light:bg-white light:border-slate-300 light:text-slate-900"
          >
            <option value="all">全部期數</option>
            {hiddenFilterOptions.batchOpts.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <select
            value={taskFilter}
            onChange={e => setTaskFilter(e.target.value)}
            className="bg-slate-900 border border-white/10 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-slate-100 outline-none focus:border-purple-500/50 cursor-pointer max-w-[200px] light:bg-white light:border-slate-300 light:text-slate-900"
          >
            <option value="all">全部任務</option>
            {hiddenFilterOptions.taskOpts.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          {(taskFilter !== 'all' || batchFilter !== 'all') && (
            <button
              onClick={() => { setTaskFilter('all'); setBatchFilter('all'); }}
              className="text-[10px] font-black text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 px-2.5 py-1.5 rounded-xl cursor-pointer transition-colors light:bg-slate-100 light:hover:bg-slate-200 light:text-slate-600"
            >
              清除
            </button>
          )}
          <span className="text-[10px] font-black text-purple-400 ml-auto">共 {filtered.length} 筆</span>
        </div>
      )}

      {/* 📝 FB/IG-style Post Form */}
      {currentUser && (
        <div className="glass-panel p-4 rounded-3xl border border-purple-500/10 space-y-4 text-left light:bg-white light:border-slate-200 shadow-sm">
          <div className="flex gap-3">
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center font-black text-sm shrink-0 select-none">
              {currentUser.name.substring(0, 1)}
            </div>
            
            {/* Textarea */}
            <div className="flex-1">
              <textarea
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="寫下你的心得或見證，向大家分享你的轉念喜悅..."
                className="w-full bg-slate-900 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white placeholder:text-slate-500 outline-none focus:border-purple-500/50 focus:bg-slate-950 transition-all resize-none h-20 light:bg-slate-100 light:border-slate-300 light:text-slate-900 light:placeholder:text-slate-400 font-medium select-text"
                style={{userSelect:'text', WebkitUserSelect:'text'}}
              />
            </div>
          </div>

          {/* Image Upload Row (Supports up to 3 images) */}
          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              {/* Image Previews */}
              {customImgs.map((img, idx) => (
                <div key={idx} className="relative w-14 h-14 rounded-xl overflow-hidden border border-white/10 light:border-slate-300">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                  <button
                    onClick={() => setCustomImgs(prev => prev.filter((_, i) => i !== idx))}
                    className="absolute top-0.5 right-0.5 bg-black/75 hover:bg-black text-white p-0.5 rounded-full cursor-pointer"
                  >
                    <X size={8} />
                  </button>
                </div>
              ))}

              {/* Upload Button */}
              {customImgs.length < 3 && (
                <label className="flex flex-col items-center justify-center w-14 h-14 rounded-xl bg-slate-900 border border-dashed border-white/10 text-slate-400 cursor-pointer hover:border-purple-500/30 hover:text-purple-300 transition-all light:bg-slate-50 light:border-slate-300">
                  <Plus size={14} />
                  <span className="text-[8px] mt-1 font-bold">上傳 ({customImgs.length}/3)</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={async (e) => {
                      const files = e.target.files;
                      if (files) {
                        const remaining = 3 - customImgs.length;
                        const filesToUpload = Array.from(files).slice(0, remaining);
                        if (files.length > remaining) {
                          alert('最多只能上傳 3 張圖片');
                        }
                        for (const file of filesToUpload) {
                          try {
                            const base64 = await compressImage(file);
                            setCustomImgs(prev => [...prev, base64]);
                          } catch (err) {
                            console.error(err);
                          }
                        }
                      }
                    }}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Submit Button */}
            <button
              onClick={handlePublishCustomPost}
              disabled={isPublishing || (customText.trim() === '' && customImgs.length === 0)}
              className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 active:scale-95 transition-all text-white font-black text-xs rounded-xl shadow-lg shadow-purple-600/10 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPublishing ? (
                <><Loader2 size={12} className="animate-spin" /> 發佈中...</>
              ) : (
                <><Send size={12} /> 發佈分享</>
              )}
            </button>
          </div>
          {publishError && (
            <p className="mt-3 text-center text-[11px] font-bold text-rose-400 light:text-rose-600">
              {publishError}
            </p>
          )}
        </div>
      )}

      {/* ── Instagram-Style Feed Cards ────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="w-16 h-16 rounded-3xl bg-purple-500/10 border border-purple-500/15 flex items-center justify-center">
            <Quote size={26} className="text-purple-400/40" />
          </div>
          <p className="text-sm font-black text-slate-500">
            {searchQuery ? '找不到符合的見證分享' : '尚無見證分享'}
          </p>
          <p className="text-xs text-slate-600">
            {searchQuery ? '請嘗試其他搜尋條件' : '成員完成含證明的任務並通過審核後，心得將會顯示於此。'}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {filtered.slice(0, visibleCount).map(s => {
            const profile     = profiles.find(p => p.id === s.student_id);
            const task        = tasks.find(t => t.id === s.mission_id);
            const isMine      = s.student_id === currentUserId;
            const likeArr     = likes[s.id] || [];
            const liked       = likeArr.includes(currentUserId);
            const cardComments = comments.filter(c => c.submissionId === s.id);
            const isOpen      = openComments === s.id;
            const isExpanded  = expandedText.has(s.id);
            const longText    = (s.proof_text || '').length > 100;

            const dateStr = new Date(s.created_at).toLocaleDateString('zh-TW', { month: 'long', day: 'numeric' });
            const timeStr = new Date(s.created_at).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });

            const studentBatch = batches.find(b => b.id === profile?.batch_id);
            // 隱藏預設期數 batch-50(無正式名稱),不顯示醜 id
            const studentBatchName = (studentBatch && studentBatch.name && studentBatch.name !== 'batch-50' && profile?.batch_id !== 'batch-50')
              ? studentBatch.name : '';
            const studentTeamName = teamNameOfStudent(s.student_id);

            return (
              <div
                key={s.id}
                className={`relative glass-panel rounded-3xl overflow-hidden shadow-sm ${
                  isMine ? 'border-purple-500/30' : 'hover:border-purple-500/15'
                }`}
              >
                {/* Glow */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-purple-500/4 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                <div className="relative p-5 space-y-4">

                  {/* ── IG Header (Avatar + User Name & Cohort Badge + Date) ── */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* Avatar (Circle) */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm shrink-0 select-none ${
                        isMine
                          ? 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-md'
                          : 'bg-slate-800 text-slate-300 border border-white/5 light:bg-slate-100 light:text-slate-600 light:border-slate-200'
                      }`}>
                        {profile?.name?.substring(0, 1) || '?'}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-extrabold text-white text-sm light:text-slate-900">{profile?.name || '未知'}</span>
                          {isMine && (
                            <span className="text-[9px] font-black bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded-md border border-purple-500/20">
                              我
                            </span>
                          )}
                          {studentBatchName && (
                            <span className="text-[9px] font-black bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded-md">
                              {studentBatchName}
                            </span>
                          )}
                          {studentTeamName && (
                            <span className="text-[9px] font-black bg-sky-500/10 text-sky-400 border border-sky-500/20 px-1.5 py-0.5 rounded-md">
                              {studentTeamName}
                            </span>
                          )}
                          {category === 'hidden' && (
                            <span className="text-[9px] font-black bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded-md">
                              {taskNameOfSub(s)}
                            </span>
                          )}
                        </div>
                        <span className="text-[9px] text-slate-400 font-medium font-mono light:text-slate-500 block mt-0.5">
                          {dateStr} {timeStr}
                        </span>
                      </div>
                    </div>
                    {/* XP Badge and Admin Actions */}
                    <div className="flex flex-col items-end gap-1.5">
                      <div className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/15">
                        +{s.score_awarded} 經驗
                      </div>
                      {(currentUser?.role === 'admin' || (isMine && s.mission_id === 'task-custom-post')) && (
                        <div className="flex gap-1">
                          {onHideWitness && category !== 'hidden' && (
                            <button
                              onClick={() => {
                                if (window.confirm('確定要從見證牆隱藏這筆資料嗎？')) {
                                  // 同步記錄到本機隱藏清單，讓它仍會出現在「已隱藏」分頁可供復原
                                  try {
                                    const hIds = JSON.parse(localStorage.getItem('nlp_witness_hidden') || '[]');
                                    if (!hIds.includes(s.id)) {
                                      const next = [...hIds, s.id];
                                      localStorage.setItem('nlp_witness_hidden', JSON.stringify(next));
                                      setHiddenIds(next);
                                    }
                                  } catch { /* 忽略 */ }
                                  onHideWitness(s.id);
                                }
                              }}
                              className="text-[10px] font-bold text-slate-400 hover:text-orange-400 bg-slate-800/50 hover:bg-slate-800 px-2 py-0.5 rounded cursor-pointer transition-colors light:bg-slate-100 light:hover:bg-slate-200"
                            >
                              隱藏
                            </button>
                          )}
                          {currentUser?.role === 'admin' && category === 'hidden' && (
                            <button
                              onClick={async () => {
                                if (window.confirm('確定要復原並重新顯示這筆資料嗎？')) {
                                  // Restore by setting share_to_witness back to true and removing from hiddenIds
                                  try {
                                    await supabase.from('submissions').update({ share_to_witness: true }).eq('id', s.id);
                                    if (onRefresh) await onRefresh();
                                    
                                    // Remove from localStorage if it exists
                                    const hIds = JSON.parse(localStorage.getItem('nlp_witness_hidden') || '[]');
                                    const nextHidden = hIds.filter((hId: string) => hId !== s.id);
                                    localStorage.setItem('nlp_witness_hidden', JSON.stringify(nextHidden));
                                    setHiddenIds(nextHidden);
                                  } catch (err) {
                                    console.error(err);
                                  }
                                }
                              }}
                              className="text-[10px] font-bold text-slate-400 hover:text-emerald-400 bg-slate-800/50 hover:bg-slate-800 px-2 py-0.5 rounded cursor-pointer transition-colors light:bg-slate-100 light:hover:bg-slate-200"
                            >
                              復原顯示
                            </button>
                          )}
                          {currentUser?.role === 'admin' && onDeleteWitness && (
                            <button
                              onClick={() => {
                                const isPost = s.mission_id === 'task-custom-post';
                                const msg = isPost
                                  ? '確定要永久刪除這則分享貼文嗎？\n（不影響任何任務分數，刪除後無法恢復）'
                                  : '確定要刪除這張照片以釋放空間嗎？\n（任務完成與經驗都會保留，只移除照片，無法恢復）';
                                if (window.confirm(msg)) {
                                  onDeleteWitness(s.id);
                                }
                              }}
                              className="text-[10px] font-bold text-slate-400 hover:text-red-400 bg-slate-800/50 hover:bg-slate-800 px-2 py-0.5 rounded cursor-pointer transition-colors light:bg-slate-100 light:hover:bg-slate-200"
                            >
                              刪除
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ── IG Body: Image Collage (Grid Collage) ── */}
                  {s.proof_image_url && (() => {
                    const arr = s.proof_image_url.split('|');
                    return (
                      <div className={`grid gap-1.5 rounded-2xl overflow-hidden ${
                        arr.length === 1 
                          ? 'grid-cols-1' 
                          : arr.length === 2 
                          ? 'grid-cols-2' 
                          : 'grid-cols-3'
                      }`}>
                        {arr.map((url, imgIdx) => (
                          <div
                            key={imgIdx}
                            className={`relative w-full rounded-2xl overflow-hidden cursor-zoom-in group border border-white/5 light:border-slate-200 ${
                              arr.length > 1 ? 'aspect-square' : ''
                            }`}
                            onClick={() => {
                              setLightboxImages(arr);
                              setLightboxIndex(imgIdx);
                            }}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={url}
                              alt={`見證圖片 ${imgIdx + 1}`}
                              className={`w-full object-cover transition-transform duration-500 group-hover:scale-102 ${
                                arr.length === 1 ? 'max-h-96 object-contain bg-slate-950/60' : 'h-full'
                              }`}
                              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <ZoomIn size={18} className="text-white drop-shadow-md" />
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  {/* ── IG Description Caption (Bold username + caption text) ── */}
                  {s.proof_text && (
                    <div className="text-sm text-slate-200 leading-relaxed light:text-slate-700">
                      <span className="font-extrabold text-white mr-2 light:text-slate-900 select-all">
                        {profile?.name || '未知'}
                      </span>
                      <span className={isExpanded ? '' : 'line-clamp-3'}>
                        {s.proof_text}
                      </span>
                      {longText && (
                        <button
                          onClick={() => toggleExpand(s.id)}
                          className="inline-block ml-1 font-black text-purple-400 hover:text-purple-300 text-xs cursor-pointer"
                        >
                          {isExpanded ? '收起' : '...展開全文'}
                        </button>
                      )}
                    </div>
                  )}

                  {/* ── IG Actions Row (Like & Comment buttons below the post content) ── */}
                  <div className="flex items-center gap-4 py-1 select-none">
                    {/* Heart Like */}
                    <button
                      onClick={() => handleToggleLike(s.id)}
                      className={`flex items-center gap-1.5 text-xs font-black transition-all active:scale-90 select-none cursor-pointer ${
                        liked ? 'text-rose-400' : 'text-slate-400 hover:text-rose-400'
                      }`}
                    >
                      <Heart
                        size={22}
                        className={`transition-all ${liked ? 'fill-rose-400 text-rose-400 drop-shadow-[0_0_6px_rgba(251,113,133,0.7)]' : ''}`}
                      />
                      <span>{likeArr.length > 0 ? likeArr.length : ''}</span>
                    </button>

                    {/* Message Comments */}
                    <button
                      onClick={() => {
                        setOpenComments(isOpen ? null : s.id);
                        setTimeout(() => commentInputRef.current?.focus(), 100);
                      }}
                      className={`flex items-center gap-1.5 text-xs font-black transition-colors select-none cursor-pointer ${
                        isOpen ? 'text-purple-400' : 'text-slate-400 hover:text-purple-400'
                      }`}
                    >
                      <MessageCircle size={22} />
                      <span>{cardComments.length > 0 ? cardComments.length : ''}</span>
                    </button>
                  </div>

                  {/* ── IG Footer: Task Category & Verification Status ── */}
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold border-t border-white/5 pt-2 light:border-slate-100">
                    <span className="flex items-center gap-1 text-purple-400/80">
                      <Sparkles size={11} />
                      {taskCategoryOfSub(s)}
                    </span>
                    <span className="flex items-center gap-1 text-emerald-500/80">
                      <CheckCircle2 size={11} />
                      已通過審核
                    </span>
                  </div>

                  {/* ── Comments section ── */}
                  {isOpen && (
                    <div className="space-y-3 animate-in slide-in-from-top-2 duration-200 pt-2">
                      {/* Existing comments */}
                      {cardComments.length > 0 && (
                        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                          {cardComments.map(c => {
                            const isMyComment = c.userId === currentUserId;
                            return (
                              <div key={c.id} className="flex items-start gap-2.5 group/comment">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-[11px] shrink-0 ${
                                  isMyComment
                                    ? 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white'
                                    : 'bg-slate-800 text-slate-400 border border-white/5 light:bg-slate-200 light:text-slate-600'
                                }`}>
                                  {c.userName.substring(0, 1)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="bg-slate-900/80 border border-white/5 rounded-2xl rounded-tl-md px-3 py-2 light:bg-slate-100 light:border-slate-200">
                                    <div className="flex items-center gap-2 mb-0.5">
                                      <span className="text-[10px] font-black text-white light:text-slate-900">{c.userName}</span>
                                      <span className="text-[9px] text-slate-600 font-mono">
                                        {new Date(c.createdAt).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-300 leading-relaxed light:text-slate-700">{c.text}</p>
                                  </div>
                                </div>
                                {/* Delete own comment */}
                                {isMyComment && (
                                  <button
                                    onClick={async () => {
                                      // 樂觀更新 UI
                                      setComments(prev => prev.filter(x => x.id !== c.id));
                                      try {
                                        await supabase
                                          .from('witness_comments')
                                          .delete()
                                          .eq('id', c.id);
                                      } catch (e) {
                                        console.error('刪除留言失敗', e);
                                      }
                                    }}
                                    className="opacity-0 group-hover/comment:opacity-100 transition-opacity mt-1 text-slate-600 hover:text-red-400 cursor-pointer"
                                  >
                                    <X size={12} />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* New comment input */}
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-[11px] shrink-0 bg-gradient-to-br from-purple-500 to-indigo-600 text-white`}>
                           {currentUser?.name.substring(0, 1) || '?'}
                        </div>
                        <div className="flex-1 relative">
                          <input
                            ref={commentInputRef}
                            type="text"
                            value={commentDraft[s.id] || ''}
                            onChange={e => setCommentDraft(prev => ({ ...prev, [s.id]: e.target.value }))}
                            onKeyDown={e => { if (e.key === 'Enter') handleSubmitComment(s.id); }}
                            placeholder="寫下你的回應..."
                            className="w-full bg-slate-900/80 border border-white/5 rounded-2xl pl-3.5 pr-10 py-2 text-xs text-slate-300 outline-none focus:border-purple-500/40 focus:bg-slate-900 transition-all placeholder:text-slate-600 light:bg-slate-100 light:border-slate-200 light:text-slate-800 select-text"
                            style={{userSelect:'text', WebkitUserSelect:'text'}}
                          />
                          <button
                            onClick={() => handleSubmitComment(s.id)}
                            disabled={!(commentDraft[s.id] || '').trim()}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-purple-400 hover:text-purple-300 disabled:text-slate-700 disabled:cursor-not-allowed transition-colors cursor-pointer"
                          >
                            <Send size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            );
          })}

          {filtered.length > visibleCount && (
            <button
              onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
              className="w-full py-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-sm font-black text-purple-300 hover:bg-purple-500/15 active:scale-[0.98] transition-all"
            >
              載入更多（還有 {filtered.length - visibleCount} 則）
            </button>
          )}
        </div>
      )}

      {/* ── Enhanced Lightbox (IG Carousel style with high visibility floating buttons) ── */}
      {lightboxImages.length > 0 && (
        <div
          className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 flex items-center justify-center p-4 select-none animate-in fade-in duration-200"
          onClick={() => setLightboxImages([])}
        >
          {/* Circular Back Button (Top-Left) - HIGH VISIBILITY WHITE BG / BLACK TEXT */}
          <button
            onClick={() => setLightboxImages([])}
            className="absolute top-5 left-5 px-4 py-2.5 rounded-full flex items-center gap-1.5 text-xs font-black shadow-2xl cursor-pointer hover:scale-105 active:scale-95 transition-all z-[60] lightbox-header-btn-back"
          >
            <ChevronLeft size={16} />
            <span className="font-extrabold pr-0.5">返回見證牆</span>
          </button>

          {/* Close Circular Button (Top-Right) - HIGH VISIBILITY WHITE BG / BLACK TEXT */}
          <button
            onClick={() => setLightboxImages([])}
            className="absolute top-5 right-5 p-2.5 rounded-full flex items-center justify-center shadow-2xl cursor-pointer hover:scale-105 active:scale-95 transition-all z-[60] lightbox-header-btn-close"
          >
            <X size={16} />
          </button>

          {/* Carousel Prev Button */}
          {lightboxImages.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex(prev => (prev - 1 + lightboxImages.length) % lightboxImages.length);
              }}
              className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 p-3 rounded-full flex items-center justify-center shadow-xl cursor-pointer hover:scale-110 active:scale-90 transition-all z-[60] lightbox-force-btn"
            >
              <ChevronLeft size={20} />
            </button>
          )}

          {/* Carousel Next Button */}
          {lightboxImages.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex(prev => (prev + 1) % lightboxImages.length);
              }}
              className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 p-3 rounded-full flex items-center justify-center shadow-xl cursor-pointer hover:scale-110 active:scale-90 transition-all z-[60] lightbox-force-btn"
            >
              <ChevronLeft size={20} className="rotate-180" />
            </button>
          )}

          {/* Image Containment View */}
          <div className="relative flex flex-col items-center gap-2 max-w-full max-h-[70vh]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxImages[lightboxIndex]}
              alt={`放大圖片 ${lightboxIndex + 1}`}
              className="max-w-full max-h-[60vh] rounded-2xl shadow-2xl object-contain animate-in zoom-in-95 duration-200"
              onClick={e => e.stopPropagation()}
            />
            {lightboxImages.length > 1 && (
              <span className="text-xs font-mono font-black text-slate-400 bg-black/60 px-3 py-1 rounded-full border border-white/5 mt-1 select-none">
                {lightboxIndex + 1} / {lightboxImages.length}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
