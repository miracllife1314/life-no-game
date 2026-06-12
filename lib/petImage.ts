import { useEffect, useState } from 'react';

// 解析神獸圖片網址內的「手動」位置微調參數（仍保留，作為自動置中失敗時的備援）
//   #x=-30  向左移 30px（正值向右）；#y=20 向下移（負值向上）
export function parsePetOffset(url?: string | null): { x: number; y: number } {
  let x = 0, y = 0;
  if (url) {
    const mx = url.match(/[#&?]x=(-?[0-9.]+)/i);
    if (mx) { const p = parseFloat(mx[1]); if (!isNaN(p)) x = p; }
    const my = url.match(/[#&?]y=(-?[0-9.]+)/i);
    if (my) { const p = parseFloat(my[1]); if (!isNaN(p)) y = p; }
  }
  return { x, y };
}

// 簡單記憶體快取，避免同一張圖重複裁切
const trimCache = new Map<string, string>();

/**
 * 上傳前處理：偵測主體（非透明區）→ 裁掉透明邊 → 置中到「方形」畫布 → 縮到最大邊長。
 * 回傳處理後的 PNG Blob；若圖非透明（裁不出主體）或失敗則回傳 null（呼叫端可改用原檔）。
 * 只在瀏覽器執行；處理的是使用者自己上傳的檔案（同源），不會有 CORS 問題。
 */
export function trimCenterSquare(srcUrl: string, maxSide = 512, padFraction = 0.08): Promise<Blob | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(null);
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const w = img.width, h = img.height;
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const ctx = c.getContext('2d', { willReadFrequently: true });
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, w, h).data;

        let minX = w, minY = h, maxX = -1, maxY = -1;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            if (data[(y * w + x) * 4 + 3] > 20) {
              if (x < minX) minX = x; if (x > maxX) maxX = x;
              if (y < minY) minY = y; if (y > maxY) maxY = y;
            }
          }
        }
        if (maxX < minX || maxY < minY) return resolve(null);   // 沒有不透明像素 → 非透明圖，無法裁切
        const bw = maxX - minX + 1, bh = maxY - minY + 1;

        const pad = Math.round(Math.max(bw, bh) * padFraction);
        const side = Math.max(bw, bh) + pad * 2;          // 方形邊長
        const outSide = Math.min(side, maxSide);
        const scale = outSide / side;

        const out = document.createElement('canvas');
        out.width = outSide; out.height = outSide;
        const octx = out.getContext('2d');
        if (!octx) return resolve(null);
        const dw = bw * scale, dh = bh * scale;
        const dx = (outSide - dw) / 2, dy = (outSide - dh) / 2;   // 主體置中
        octx.drawImage(c, minX, minY, bw, bh, dx, dy, dw, dh);
        out.toBlob((b) => resolve(b), 'image/png');
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = srcUrl;
  });
}

/**
 * 自動置中：偵測 PNG 主體（非透明區域）的範圍，裁掉周圍透明邊，
 * 讓主體填滿並自然置中。回傳可直接用於 <img src> 的 data URL；
 * 載入中或失敗（如非透明圖、CORS 被擋）時回傳原圖。
 */
export function useTrimmedPetImage(url?: string | null): string {
  const clean = url || '';
  const [out, setOut] = useState<string>(() => trimCache.get(clean) || clean);

  useEffect(() => {
    if (!clean) { setOut(''); return; }
    // 使用者若手動指定了 #x=/#y=，尊重手動值，不自動裁切
    const manual = parsePetOffset(clean);
    if (manual.x || manual.y) { setOut(clean); return; }
    // 已快取
    const cached = trimCache.get(clean);
    if (cached) { setOut(cached); return; }

    setOut(clean); // 先顯示原圖，裁切完成後再替換
    if (typeof window === 'undefined') return;

    let cancelled = false;
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    // 用乾淨網址(去掉 #fragment) + 強制防快取參數，避免拿到「非跨域」的快取造成畫布污染
    const base = clean.split('#')[0];
    const corsUrl = clean.startsWith('data:')
      ? clean
      : base + (base.includes('?') ? '&' : '?') + 'corscb=' + Math.random().toString(36).substring(2, 8) + Date.now().toString(36);
    img.onload = () => {
      if (cancelled) return;
      try {
        const maxDim = 420;
        const sc = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * sc));
        const h = Math.max(1, Math.round(img.height * sc));
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const ctx = c.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, w, h);
        const data = ctx.getImageData(0, 0, w, h).data;

        let minX = w, minY = h, maxX = -1, maxY = -1;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            if (data[(y * w + x) * 4 + 3] > 16) {
              if (x < minX) minX = x; if (x > maxX) maxX = x;
              if (y < minY) minY = y; if (y > maxY) maxY = y;
            }
          }
        }
        if (maxX < minX || maxY < minY) return;           // 全透明，放棄
        const bw = maxX - minX + 1, bh = maxY - minY + 1;
        if (bw > w * 0.93 && bh > h * 0.93) return;        // 主體已幾乎填滿，免裁

        // 以原圖解析度裁切（保留畫質），四周加 6% 留白
        const inv = 1 / sc;
        const pad = Math.round(Math.max(bw, bh) * inv * 0.06);
        const sx = Math.max(0, Math.round(minX * inv) - pad);
        const sy = Math.max(0, Math.round(minY * inv) - pad);
        const sw = Math.min(img.width - sx, Math.round(bw * inv) + pad * 2);
        const sh = Math.min(img.height - sy, Math.round(bh * inv) + pad * 2);

        const o = document.createElement('canvas');
        o.width = sw; o.height = sh;
        const octx = o.getContext('2d');
        if (!octx) return;
        octx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
        const result = o.toDataURL('image/png');
        trimCache.set(clean, result);
        if (!cancelled) setOut(result);
      } catch {
        // CORS 污染畫布或其他錯誤 → 維持原圖
      }
    };
    img.onerror = () => {};
    img.src = corsUrl;
    return () => { cancelled = true; };
  }, [clean]);

  return out;
}
