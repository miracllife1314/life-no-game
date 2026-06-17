// =====================================================================
// UI 回饋（Toast 訊息 / 彩帶 / 分數浮動）—— 從 app/page.tsx 抽出，行為完全不變。
// 回傳狀態（給畫面渲染）+ 觸發函式。
// =====================================================================
import { useState } from 'react';

export interface ToastInfo {
  message: string;
  type: 'success' | 'info' | 'error';
  id: string;
}
export interface Particle {
  id: string;
  size: number;
  color: string;
  angle: number;
  speed: number;
  delay: number;
  tx: string;
  ty: string;
  rot: string;
}
export interface ScoreFloat {
  id: string;
  text: string;
}

export function useUiFeedback() {
  const [toasts, setToasts] = useState<ToastInfo[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [scoreFloats, setScoreFloats] = useState<ScoreFloat[]>([]);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { message, type, id }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const triggerConfetti = () => {
    const newParticles: Particle[] = Array.from({ length: 65 }).map((_, i) => {
      const angle = Math.random() * 360;
      const speed = Math.random() * 8 + 4;
      const tx = `${Math.cos(angle * Math.PI / 180) * speed * 22}vh`;
      const ty = `${Math.sin(angle * Math.PI / 180) * speed * 22}vh`;
      const rot = `${(Math.random() - 0.5) * 720}`;
      return {
        id: `${Date.now()}-${i}`,
        size: Math.random() * 8 + 4,
        color: ['#fbbf24', '#f59e0b', '#d97706', '#fef08a', '#fb7185', '#38bdf8', '#c084fc'][Math.floor(Math.random() * 7)],
        angle,
        speed,
        delay: Math.random() * 0.15,
        tx,
        ty,
        rot,
      };
    });
    setParticles(prev => [...prev, ...newParticles]);
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
    }, 1500);
  };

  const triggerScoreFloat = (text: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setScoreFloats(prev => [...prev, { text, id }]);
    setTimeout(() => {
      setScoreFloats(prev => prev.filter(sf => sf.id !== id));
    }, 1800);
  };

  return { toasts, particles, scoreFloats, showToast, triggerConfetti, triggerScoreFloat };
}
