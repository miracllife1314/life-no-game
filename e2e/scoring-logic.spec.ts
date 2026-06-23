import { test, expect } from '@playwright/test';
import { calculateLevelFromExp, getExpThresholdForLevel } from '../lib/levelLogic';

// =====================================================================
// 計分／升級「公式」守護測試（純邏輯，不連資料庫、秒跑）。
// 任何人改動等級公式而算錯，這裡會立刻擋下 → 保護「打卡加分後等級算對」。
// 公式：LV0-4 每級 600、5-9 每級 700、10-14 每級 800、15-19 每級 900、20-24 每級 1000。
// =====================================================================

test.describe('計分/升級公式', () => {
  test('經驗值 → 等級 對照正確', () => {
    expect(calculateLevelFromExp(0)).toBe(0);
    expect(calculateLevelFromExp(599)).toBe(0);
    expect(calculateLevelFromExp(600)).toBe(1);
    expect(calculateLevelFromExp(2999)).toBe(4);
    expect(calculateLevelFromExp(3000)).toBe(5);   // 5×600
    expect(calculateLevelFromExp(6500)).toBe(10);  // 3000 + 5×700
    expect(calculateLevelFromExp(10500)).toBe(15); // 6500 + 5×800
    expect(calculateLevelFromExp(15000)).toBe(20); // 10500 + 5×900
    expect(calculateLevelFromExp(20000)).toBe(25); // 15000 + 5×1000
  });

  test('等級門檻（升到該級需要多少經驗）正確', () => {
    expect(getExpThresholdForLevel(0)).toBe(0);
    expect(getExpThresholdForLevel(1)).toBe(600);
    expect(getExpThresholdForLevel(5)).toBe(3000);
    expect(getExpThresholdForLevel(10)).toBe(6500);
    expect(getExpThresholdForLevel(25)).toBe(20000);
  });

  test('加分後等級會正確跳級（模擬打卡加分）', () => {
    // 599 分時 LV0，再加 1 分(達 600) → 應升到 LV1
    expect(calculateLevelFromExp(599)).toBe(0);
    expect(calculateLevelFromExp(599 + 1)).toBe(1);
    // 2999 分 LV4，加 1 分(達 3000) → LV5
    expect(calculateLevelFromExp(2999 + 1)).toBe(5);
  });
});
