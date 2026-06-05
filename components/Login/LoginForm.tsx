'use client';

import React, { useState } from 'react';
import { User, LogIn, ChevronRight, Info } from 'lucide-react';

interface LoginFormProps {
  onLogin: (name: string) => Promise<void>;
  onGoToRegister: () => void;
  isSyncing: boolean;
}

export function LoginForm({ onLogin, onGoToRegister, isSyncing }: LoginFormProps) {
  const [name, setName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setErrorMsg(null);
    try {
      await onLogin(name.trim());
    } catch (err: any) {
      setErrorMsg(err.message || '登入失敗，請確認名稱。');
    }
  };

  const handleQuickLogin = async (quickName: string) => {
    setName(quickName);
    setErrorMsg(null);
    try {
      await onLogin(quickName);
    } catch (err: any) {
      setErrorMsg(err.message || '登入失敗');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden bg-slate-950">
      {/* Background ambient light */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md animate-in slide-in-from-bottom-6 duration-500 z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-[0_0_30px_rgba(245,158,11,0.2)] mb-4 border border-white/10">
            <User className="text-white w-10 h-10" />
          </div>
          <h1 className="text-3xl font-black tracking-widest text-white uppercase bg-clip-text">
            NLP 人性溝通術
          </h1>
          <p className="text-amber-500 text-xs font-bold tracking-[0.4em] uppercase mt-2">
            課程計分與修行系統
          </p>
        </div>

        {/* Glassmorphism Card */}
        <div className="glass-panel p-8 rounded-3xl border border-white/10 shadow-2xl relative">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <LogIn size={20} className="text-amber-500" />
            連結修行印記
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">
                手機號碼 / 姓名
              </label>
              <input
                required
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="請輸入您的手機號碼或姓名"
                className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-white text-center text-lg font-bold outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all placeholder:text-slate-600"
              />
            </div>

            {errorMsg && (
              <div className="text-red-500 text-xs font-bold bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-center">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={isSyncing}
              className="w-full btn-action py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-slate-950 font-black text-lg shadow-xl shadow-amber-500/10 flex items-center justify-center gap-2"
            >
              {isSyncing ? '連接中...' : '開啟修行通道'}
              <ChevronRight size={20} />
            </button>
          </form>

          {/* Quick tester helper */}
          <div className="mt-8 pt-6 border-t border-slate-900 space-y-4">
            <div>
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5 justify-center">
                <Info size={14} className="text-slate-500" />
                快速身分測試通道 (點選直接登入)
              </h3>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleQuickLogin('林大統')}
                  type="button"
                  className="btn-action bg-slate-900 border border-white/5 hover:border-amber-500/30 text-white font-bold text-xs py-2 px-1 rounded-xl text-center cursor-pointer"
                >
                  大隊長 (Admin)
                </button>
                <button
                  onClick={() => handleQuickLogin('沈又希')}
                  type="button"
                  className="btn-action bg-slate-900 border border-white/5 hover:border-amber-500/30 text-white font-bold text-xs py-2 px-1 rounded-xl text-center cursor-pointer"
                >
                  沈又希 (小隊長)
                </button>
                <button
                  onClick={() => handleQuickLogin('林玉庭')}
                  type="button"
                  className="btn-action bg-slate-900 border border-white/5 hover:border-amber-500/30 text-white font-bold text-xs py-2 px-1 rounded-xl text-center cursor-pointer"
                >
                  林玉庭 (學員)
                </button>
              </div>
            </div>

            <div className="flex gap-2 justify-center pt-2">
              <button
                onClick={onGoToRegister}
                type="button"
                className="text-slate-500 text-xs font-bold hover:text-amber-500 transition-colors cursor-pointer"
              >
                註冊新修行者
              </button>
              <span className="text-slate-700 text-xs">•</span>
              <button
                onClick={() => {
                  if (confirm('確定要清除所有本地打卡紀錄與修改分數，並還原至 Google 試算表初始資料嗎？')) {
                    localStorage.clear();
                    window.location.reload();
                  }
                }}
                type="button"
                className="text-red-500/70 text-xs font-bold hover:text-red-500 transition-colors cursor-pointer"
              >
                重置系統資料
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
