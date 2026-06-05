'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Profile, Task, Submission } from '@/types';
import {
  BookOpen, ImageIcon, Quote, Search,
  Filter, CheckCircle2, Calendar, Heart,
  MessageCircle, Send, X, ChevronDown, ChevronUp,
  Sparkles, ZoomIn, Plus, Loader2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

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
}

const STORAGE_KEY_LIKES    = 'nlp_witness_likes';    // { [submissionId]: string[] (userIds) }
const STORAGE_KEY_COMMENTS = 'nlp_witness_comments'; // WitnessComment[]
const CAPTAIN_MANUAL       = '由小隊長於指揮所手動設定打卡';

// ── persistence helpers ─────────────────────────────────────────────
function loadLikes(): Record<string, string[]> {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY_LIKES) || '{}'); } catch { return {}; }
}
function saveLikes(likes: Record<string, string[]>) {
  if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY_LIKES, JSON.stringify(likes));
}
function loadComments(): WitnessComment[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY_COMMENTS) || '[]'); } catch { return []; }
}
function saveComments(comments: WitnessComment[]) {
  if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY_COMMENTS, JSON.stringify(comments));
}
// ───────────────────────────────────────────────────────────────────

const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 600;
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
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
        resolve(compressedBase64);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

export function WitnessTab({ profiles, tasks, submissions, currentUserId, onRefresh }: WitnessTabProps) {
  const [searchQuery,  setSearchQuery]  = useState('');
  const [filterTask,   setFilterTask]   = useState<string>('all');
  const [likes,        setLikes]        = useState<Record<string, string[]>>({});
  const [comments,     setComments]     = useState<WitnessComment[]>([]);
  const [sortBy,       setSortBy]       = useState<'newest' | 'popular'>('newest');
  const [scopeFilter,  setScopeFilter]  = useState<'all' | 'myTeam'>('all');
  const [openComments, setOpenComments] = useState<string | null>(null); // submissionId
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({});
  const [lightboxSrc,  setLightboxSrc]  = useState<string | null>(null);
  const [expandedText, setExpandedText] = useState<Set<string>>(new Set());
  const [hiddenIds,    setHiddenIds]    = useState<string[]>([]);
  const commentInputRef = useRef<HTMLInputElement>(null);

  // Custom post form state
  const [customText, setCustomText] = useState('');
  const [customImg, setCustomImg] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);

  // load from localStorage on mount
  useEffect(() => {
    setLikes(loadLikes());
    setComments(loadComments());
    try {
      setHiddenIds(JSON.parse(localStorage.getItem('nlp_witness_hidden') || '[]'));
    } catch (e) {}
  }, []);

  const currentUser = profiles.find(p => p.id === currentUserId);

  // All approved submissions with real proof and not hidden by captain
  const witnessItems = useMemo(() =>
    submissions
      .filter(s =>
        s.status === 'approved' &&
        s.proof_text !== CAPTAIN_MANUAL &&
        (s.proof_text || s.proof_image_url) &&
        !hiddenIds.includes(s.id)
      )
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [submissions, hiddenIds]
  );

  const tasksWithWitness = useMemo(() => {
    const ids = new Set(witnessItems.map(s => s.mission_id));
    return tasks.filter(t => ids.has(t.id));
  }, [witnessItems, tasks]);

  const filtered = useMemo(() => {
    let result = witnessItems.filter(s => {
      const profile = profiles.find(p => p.id === s.student_id);
      const task    = tasks.find(t => t.id === s.mission_id);
      
      const matchTask   = filterTask === 'all' || s.mission_id === filterTask;
      const matchSearch = !searchQuery ||
        profile?.name.includes(searchQuery) ||
        task?.name.includes(searchQuery) ||
        s.proof_text?.includes(searchQuery);
      
      const matchScope  = scopeFilter === 'all' || 
        (currentUser?.team_id && profile?.team_id === currentUser.team_id);
      
      return matchTask && matchSearch && matchScope;
    });

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
  }, [witnessItems, filterTask, searchQuery, scopeFilter, sortBy, profiles, tasks, currentUser, likes]);

  // ── like toggle ───────────────────────────────────────────────────
  const handleToggleLike = (subId: string) => {
    setLikes(prev => {
      const arr = prev[subId] || [];
      const next = arr.includes(currentUserId)
        ? arr.filter(id => id !== currentUserId)
        : [...arr, currentUserId];
      const updated = { ...prev, [subId]: next };
      saveLikes(updated);
      return updated;
    });
  };

  // ── comment submit ────────────────────────────────────────────────
  const handleSubmitComment = (subId: string) => {
    const text = (commentDraft[subId] || '').trim();
    if (!text || !currentUser) return;
    const newComment: WitnessComment = {
      id: Math.random().toString(36).substring(2, 11),
      submissionId: subId,
      userId: currentUserId,
      userName: currentUser.name,
      text,
      createdAt: new Date().toISOString()
    };
    setComments(prev => {
      const updated = [...prev, newComment];
      saveComments(updated);
      return updated;
    });
    setCommentDraft(prev => ({ ...prev, [subId]: '' }));
  };

  const toggleExpand = (id: string) => {
    setExpandedText(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handlePublishCustomPost = async () => {
    if (!customText.trim() && !customImg) return;
    if (!currentUser) return;
    setIsPublishing(true);

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
      const submissionData = {
        mission_id: 'task-custom-post',
        student_id: currentUserId,
        proof_text: customText.trim() || null,
        proof_image_url: customImg || null,
        proof_link: null,
        status: 'approved',
        score_awarded: 0,
        reviewed_by: 'system',
        reviewed_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      };

      await supabase.from('submissions').insert(submissionData);
      
      // Reset form
      setCustomText('');
      setCustomImg('');
      
      // Refresh parent state
      if (onRefresh) {
        await onRefresh();
      }
    } catch (err) {
      console.error('Error publishing custom witness post:', err);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="glass-panel p-6 rounded-4xl border border-purple-500/20 relative overflow-hidden light:bg-white light:border-purple-500/30">
        <div className="absolute -top-10 -right-10 w-52 h-52 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500/30 to-indigo-500/20 border border-purple-500/30 flex items-center justify-center">
              <BookOpen size={22} className="text-purple-300" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white light:text-slate-900">見證分享牆</h2>
              <p className="text-xs text-slate-400 mt-0.5 font-medium light:text-slate-500">
                所有通過審核的修行見證，共 <span className="text-purple-400 font-black">{witnessItems.length}</span> 則
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-3 md:ml-auto">
            {[
              { label: '見證數', value: witnessItems.length, color: 'text-purple-400' },
              { label: '分享者', value: new Set(witnessItems.map(s => s.student_id)).size, color: 'text-emerald-400' },
              { label: '含圖片', value: witnessItems.filter(s => s.proof_image_url).length, color: 'text-sky-400' }
            ].map(stat => (
              <div key={stat.label} className="bg-slate-900 border border-white/5 px-4 py-2.5 rounded-2xl text-center">
                <div className={`text-lg font-black leading-none ${stat.color}`}>{stat.value}</div>
                <div className="text-xs text-slate-300 mt-0.5 font-bold">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Search & Filter ───────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="搜尋成員、任務或關鍵字..."
              className="w-full bg-slate-800 border border-white/10 rounded-2xl pl-9 pr-4 py-2.5 text-sm text-slate-100 outline-none focus:border-purple-500/50 focus:bg-slate-900 transition-all placeholder:text-slate-400 light:bg-white light:border-slate-300 light:text-slate-900 light:placeholder:text-stone-500"
            />
          </div>
          <div className="relative">
            <Filter size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <select
              value={filterTask}
              onChange={e => setFilterTask(e.target.value)}
              className="w-full sm:w-auto bg-slate-800 border border-white/10 rounded-2xl pl-8 pr-8 py-2.5 text-sm text-slate-100 font-bold outline-none cursor-pointer appearance-none hover:border-purple-500/40 transition-all light:bg-white light:border-slate-300 light:text-slate-900"
            >
              <option value="all">全部任務</option>
              {tasksWithWitness.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Sort and Scope Segments */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-slate-900/50 border border-white/5 p-2 rounded-2xl select-none">
          {/* Scope Filter */}
          <div className="flex items-center gap-1.5 justify-between sm:justify-start">
            <span className="text-xs font-black text-slate-200 px-1 uppercase tracking-wider shrink-0 light:text-slate-700">範圍篩選</span>
            <div className="flex bg-slate-950 p-0.5 rounded-xl border border-white/5 w-fit light:bg-slate-200">
              {[
                { key: 'all', label: '所有人' },
                { key: 'myTeam', label: '僅我小隊' }
              ].map(opt => {
                const isActive = scopeFilter === opt.key;
                return (
                  <button
                    key={opt.key}
                    onClick={() => setScopeFilter(opt.key as any)}
                    className={`py-1.5 px-3 rounded-lg text-sm font-black transition-all cursor-pointer text-center ${
                      isActive
                        ? 'bg-purple-500 text-white shadow-md'
                        : 'text-slate-200 hover:text-white hover:bg-slate-700 light:text-slate-700 light:hover:text-slate-900 light:hover:bg-slate-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-1.5 justify-between sm:justify-start">
            <span className="text-xs font-black text-slate-200 px-1 uppercase tracking-wider shrink-0 light:text-slate-700">排序方式</span>
            <div className="flex bg-slate-950 p-0.5 rounded-xl border border-white/5 w-fit light:bg-slate-200">
              {[
                { key: 'newest', label: '最新發布' },
                { key: 'popular', label: '最受歡迎' }
              ].map(opt => {
                const isActive = sortBy === opt.key;
                return (
                  <button
                    key={opt.key}
                    onClick={() => setSortBy(opt.key as any)}
                    className={`py-1.5 px-3 rounded-lg text-sm font-black transition-all cursor-pointer text-center ${
                      isActive
                        ? 'bg-purple-500 text-white shadow-md'
                        : 'text-slate-200 hover:text-white hover:bg-slate-700 light:text-slate-700 light:hover:text-slate-900 light:hover:bg-slate-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 📝 FB-style Post Form */}
      {currentUser && (
        <div className="glass-panel p-5 rounded-3xl border border-purple-500/20 space-y-4 text-left light:bg-white light:border-slate-200">
          <div className="flex gap-3">
            {/* Avatar */}
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center font-black text-sm shrink-0 select-none">
              {currentUser.name.substring(0, 1)}
            </div>
            
            {/* Textarea */}
            <div className="flex-1">
              <textarea
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="寫下你的心得或見證，向大家分享你的轉念喜悅..."
                className="w-full bg-slate-900 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white placeholder:text-slate-500 outline-none focus:border-purple-500/50 focus:bg-slate-950 transition-all resize-none h-24 light:bg-slate-100 light:border-slate-300 light:text-slate-900 light:placeholder:text-slate-400 font-medium"
              />
            </div>
          </div>

          {/* Image Preview & Upload Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            {/* File Input and Preview */}
            <div className="flex items-center gap-3">
              {customImg ? (
                <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-white/10 light:border-slate-300">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={customImg} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setCustomImg('')}
                    className="absolute top-0.5 right-0.5 bg-black/75 hover:bg-black text-white p-0.5 rounded-full"
                  >
                    <X size={10} />
                  </button>
                </div>
              ) : (
                <label className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-white/5 text-[11px] font-bold text-slate-300 cursor-pointer hover:border-purple-500/30 hover:text-purple-300 transition-all">
                  <ImageIcon size={14} className="text-purple-400" />
                  <span>新增圖片</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          const base64 = await compressImage(file);
                          setCustomImg(base64);
                        } catch (err) {
                          console.error(err);
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
              disabled={isPublishing || (!customText.trim() && !customImg)}
              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 active:scale-95 transition-all text-white font-black text-xs rounded-xl shadow-lg shadow-purple-600/10 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPublishing ? (
                <><Loader2 size={13} className="animate-spin" /> 發佈中...</>
              ) : (
                <><Send size={13} /> 發佈分享</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Cards ─────────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="w-16 h-16 rounded-3xl bg-purple-500/10 border border-purple-500/15 flex items-center justify-center">
            <Quote size={26} className="text-purple-400/40" />
          </div>
          <p className="text-sm font-black text-slate-500">
            {searchQuery || filterTask !== 'all' ? '找不到符合的見證分享' : '尚無見證分享'}
          </p>
          <p className="text-xs text-slate-600">
            {searchQuery || filterTask !== 'all' ? '請嘗試其他搜尋條件' : '成員完成含證明的任務並通過審核後，心得將會顯示於此。'}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {filtered.map(s => {
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

            return (
              <div
                key={s.id}
                className={`relative glass-panel rounded-3xl overflow-hidden ${
                  isMine ? 'border-purple-500/30 shadow-[0_0_24px_rgba(168,85,247,0.08)]' : 'hover:border-purple-500/15'
                }`}
              >
                {/* glow */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-purple-500/4 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                <div className="relative p-5 space-y-4">

                  {/* ── Top row: avatar + name + task + date ── */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 select-none ${
                        isMine
                          ? 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white'
                          : 'bg-slate-800 text-slate-300 border border-white/5 light:bg-slate-200 light:text-slate-600'
                      }`}>
                        {profile?.name?.substring(0, 1) || '?'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-white text-sm light:text-slate-900">{profile?.name || '未知'}</span>
                          {isMine && <span className="text-[9px] font-black bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded-md border border-purple-500/20">我</span>}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Sparkles size={9} className="text-purple-400" />
                          <span className="text-[10px] font-black text-purple-300 truncate max-w-[180px]">{task?.name || '未知任務'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 space-y-1">
                      <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono justify-end">
                        <Calendar size={10} /> {dateStr} {timeStr}
                      </div>
                      <div className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/15 inline-block">
                        +{s.score_awarded} 修為
                      </div>
                    </div>
                  </div>

                  {/* ── Image ── */}
                  {s.proof_image_url && (
                    <div
                      className="relative w-full rounded-2xl overflow-hidden cursor-zoom-in group border border-white/5 light:border-slate-200"
                      onClick={() => setLightboxSrc(s.proof_image_url!)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={s.proof_image_url}
                        alt="見證圖片"
                        className="w-full max-h-80 object-contain bg-slate-950/60 rounded-2xl transition-transform duration-500 group-hover:scale-102"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-end p-3">
                        <div 
                          style={{ color: '#ffffff', backgroundColor: 'rgba(15, 23, 42, 0.85)', borderColor: 'rgba(255, 255, 255, 0.2)', borderWidth: '1px' }}
                          className="rounded-xl px-2.5 py-1.5 flex items-center gap-1.5 text-[10px] font-bold select-none"
                        >
                          <ZoomIn size={12} className="text-white" /> <span className="text-white">點擊放大</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── Proof text ── */}
                  {s.proof_text && (
                    <div className="pl-4 border-l-2 border-purple-500/30 space-y-1">
                      <p className={`text-sm text-slate-300 leading-relaxed italic transition-all light:text-slate-700 ${isExpanded ? '' : 'line-clamp-3'}`}>
                        {s.proof_text}
                      </p>
                      {longText && (
                        <button
                          onClick={() => toggleExpand(s.id)}
                          className="flex items-center gap-1 text-[10px] font-black text-purple-400 hover:text-purple-300 transition-colors"
                        >
                          {isExpanded ? <><ChevronUp size={11} /> 收起</> : <><ChevronDown size={11} /> 展開全文</>}
                        </button>
                      )}
                    </div>
                  )}

                  {/* ── Action bar: like + comment ── */}
                  <div className="flex items-center gap-4 pt-1 border-t border-white/5 light:border-slate-100">
                    {/* Like */}
                    <button
                      onClick={() => handleToggleLike(s.id)}
                      className={`flex items-center gap-1.5 text-xs font-black transition-all active:scale-90 select-none ${
                        liked ? 'text-rose-400' : 'text-slate-500 hover:text-rose-400'
                      }`}
                    >
                      <Heart
                        size={16}
                        className={`transition-all ${liked ? 'fill-rose-400 text-rose-400 drop-shadow-[0_0_6px_rgba(251,113,133,0.7)]' : ''}`}
                      />
                      <span>{likeArr.length > 0 ? likeArr.length : ''}</span>
                      {likeArr.length > 0 && (
                        <span className="text-[10px] text-slate-500 font-normal">
                          {likeArr.includes(currentUserId) && likeArr.length === 1
                            ? '你按了讚'
                            : likeArr.includes(currentUserId)
                              ? `你和其他 ${likeArr.length - 1} 人`
                              : `${likeArr.length} 人`}
                        </span>
                      )}
                      {likeArr.length === 0 && <span>讚</span>}
                    </button>

                    {/* Comment toggle */}
                    <button
                      onClick={() => {
                        setOpenComments(isOpen ? null : s.id);
                        setTimeout(() => commentInputRef.current?.focus(), 100);
                      }}
                      className={`flex items-center gap-1.5 text-xs font-black transition-colors select-none ${
                        isOpen ? 'text-purple-400' : 'text-slate-500 hover:text-purple-400'
                      }`}
                    >
                      <MessageCircle size={16} />
                      {cardComments.length > 0 ? `${cardComments.length} 則留言` : '留言'}
                    </button>

                    {/* Approved */}
                    <div className="ml-auto flex items-center gap-1 text-[10px] text-slate-600 font-bold">
                      <CheckCircle2 size={11} className="text-emerald-500/50" />
                      已通過審核
                    </div>
                  </div>

                  {/* ── Comments section ── */}
                  {isOpen && (
                    <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">
                      {/* Existing comments */}
                      {cardComments.length > 0 && (
                        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                          {cardComments.map(c => {
                            const isMyComment = c.userId === currentUserId;
                            return (
                              <div key={c.id} className="flex items-start gap-2.5 group/comment">
                                <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-[11px] shrink-0 ${
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
                                    onClick={() => {
                                      setComments(prev => {
                                        const updated = prev.filter(x => x.id !== c.id);
                                        saveComments(updated);
                                        return updated;
                                      });
                                    }}
                                    className="opacity-0 group-hover/comment:opacity-100 transition-opacity mt-1 text-slate-600 hover:text-red-400"
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
                        <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-[11px] shrink-0 bg-gradient-to-br from-purple-500 to-indigo-600 text-white`}>
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
                            className="w-full bg-slate-900/80 border border-white/5 rounded-2xl pl-3.5 pr-10 py-2 text-xs text-slate-300 outline-none focus:border-purple-500/40 focus:bg-slate-900 transition-all placeholder:text-slate-600 light:bg-slate-100 light:border-slate-200 light:text-slate-800"
                          />
                          <button
                            onClick={() => handleSubmitComment(s.id)}
                            disabled={!(commentDraft[s.id] || '').trim()}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-purple-400 hover:text-purple-300 disabled:text-slate-700 disabled:cursor-not-allowed transition-colors"
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
        </div>
      )}

      {/* ── Lightbox ─────────────────────────────────────────────────── */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxSrc(null)}
        >
          <button
            onClick={() => setLightboxSrc(null)}
            style={{
              color: '#ffffff',
              backgroundColor: 'rgba(15, 23, 42, 0.95)',
              borderColor: 'rgba(255, 255, 255, 0.3)',
              borderWidth: '1px'
            }}
            className="absolute top-5 right-5 px-4 py-2 rounded-full flex items-center gap-1.5 font-black text-xs shadow-xl cursor-pointer select-none z-[60] hover:bg-slate-900 transition-all"
          >
            <X size={16} className="text-white" /> <span className="text-white">關閉返回見證牆</span>
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxSrc}
            alt="放大圖片"
            className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl object-contain animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
