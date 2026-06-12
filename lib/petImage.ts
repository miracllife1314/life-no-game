// 解析神獸圖片網址內的位置微調參數，用來把「主體不在畫布正中央」的圖喬到置中。
// 在 image_url 後面加：
//   #x=-30   向左移 30px（正值向右）
//   #y=20    向下移 20px（負值向上）
//   （可與 #zoom= 併用，例如  ...png#zoom=1.4&x=-20&y=10 ）
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
