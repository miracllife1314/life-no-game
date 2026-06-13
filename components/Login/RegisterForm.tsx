'use client';

import React, { useState } from 'react';
import { UserPlus, Sparkles, ChevronLeft, ArrowRight, Shield } from 'lucide-react';
import { UserRole } from '@/types';

interface RegisterFormProps {
  onRegister: (data: { name: string; phone: string; role: UserRole }) => Promise<void>;
  onGoToLogin: () => void;
  isSyncing: boolean;
  inviteCode?: string;
  invitedTeamName?: string;
  invitedCaptainName?: string;
  inviteError?: string;
}

export function RegisterForm({ 
  onRegister, 
  onGoToLogin, 
  isSyncing,
  inviteCode,
  invitedTeamName,
  invitedCaptainName,
  inviteError
}: RegisterFormProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // If registering via invite, role is forced to 'student'
  const activeRole = inviteCode ? 'student' : role;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || inviteError) return;

    setErrorMsg(null);
    try {
      await onRegister({ 
        name: name.trim(), 
        phone: phone.trim(), 
        role: activeRole 
      });
    } catch (err: any) {
      setErrorMsg(err.message || '註冊失敗，可能已重複註冊。');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden bg-slate-950">
      {/* Background ambient light */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md animate-in slide-in-from-bottom-6 duration-500 z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-[0_0_30px_rgba(168,85,247,0.2)] mb-4 border border-white/10">
            <UserPlus className="text-white w-10 h-10" />
          </div>
          <h1 className="text-3xl font-black tracking-widest text-white uppercase bg-clip-text">
            天命起點
          </h1>
          <p className="text-purple-400 text-xs font-bold tracking-[0.4em] uppercase mt-2">
            註冊您的修行身份
          </p>
        </div>

        {/* Glassmorphism Card */}
        <div className="glass-panel p-8 rounded-3xl border border-white/10 shadow-2xl relative">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Sparkles size={20} className="text-purple-400" />
            {inviteCode ? '受邀加入修行' : '建立全新印記'}
          </h2>

          {/* Invitation Badge Details */}
          {inviteCode && !inviteError && invitedTeamName && (
            <div className="bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border border-purple-500/30 p-5 rounded-2xl mb-6 text-center shadow-[inset_0_0_15px_rgba(168,85,247,0.1)]">
              <span className="inline-flex items-center gap-1 text-[10px] font-black tracking-widest text-purple-400 uppercase bg-purple-500/10 px-2 py-0.5 rounded-full mb-2">
                <Shield size={10} /> 專屬推薦邀請
              </span>
              <h3 className="text-lg font-black text-white">{invitedTeamName}</h3>
              {invitedCaptainName && (
                <p className="text-xs text-purple-300/80 mt-1">
                  小隊長指導：<span className="text-amber-400 font-bold">{invitedCaptainName}</span>
                </p>
              )}
            </div>
          )}

          {/* Invitation Error Display */}
          {inviteError && (
            <div className="bg-red-950/40 border border-red-500/30 p-5 rounded-2xl mb-6 text-center shadow-[inset_0_0_15px_rgba(239,68,68,0.1)] animate-pulse">
              <span className="text-[10px] font-black tracking-widest text-red-400 uppercase">邀請驗證失敗</span>
              <h3 className="text-md font-bold text-red-200 mt-1">{inviteError}</h3>
              <p className="text-xs text-red-300/60 mt-2">請聯繫小隊長或管理員確認邀請碼</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs text-slate-400 font-bold uppercase tracking-wider mb-2 text-left">
                姓名 / 代稱
              </label>
              <input
                required
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：王小明"
                style={{ backgroundColor: '#020617', color: '#ffffff', WebkitTextFillColor: '#ffffff' }}
                className="w-full border border-slate-800 rounded-2xl p-4 text-center text-lg font-bold outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all placeholder:text-slate-600"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 font-bold uppercase tracking-wider mb-2 text-left">
                手機號碼
              </label>
              <input
                required
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0912345678"
                style={{ backgroundColor: '#020617', color: '#ffffff', WebkitTextFillColor: '#ffffff' }}
                className="w-full border border-slate-800 rounded-2xl p-4 text-center text-lg font-bold outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all placeholder:text-slate-600"
              />
            </div>


            {/* Error messaging */}
            {errorMsg && (
              <div className="text-red-500 text-xs font-bold bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-center">
                {errorMsg}
              </div>
            )}

            <div className="flex gap-4 pt-2">
              <button
                type="button"
                onClick={onGoToLogin}
                className="btn-action px-5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white font-bold text-sm flex items-center justify-center gap-1 cursor-pointer"
              >
                <ChevronLeft size={16} />
                返回
              </button>
              <button
                type="submit"
                disabled={isSyncing || !!inviteError}
                className="flex-1 btn-action py-4 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-black text-sm shadow-xl shadow-purple-500/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSyncing ? '啟動中...' : '提交觀測結果'}
                <ArrowRight size={16} />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
