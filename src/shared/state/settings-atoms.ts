/**
 * アプリ設定関連の状態管理
 * クリーンアーキテクチャ: 共有レイヤー
 * Jotai atoms for app settings
 */

import { atom } from 'jotai';
import { UserSettings } from '@/shared/types/common';

/**
 * アプリ設定
 */
export const settingsAtom = atom<UserSettings>({
  dominantHand: 'right',
  notifications: true,
  theme: 'auto',
});

/**
 * 利き手設定
 */
export const dominantHandAtom = atom(
  (get) => get(settingsAtom).dominantHand,
  (get, set, newHand: 'left' | 'right') => {
    const current = get(settingsAtom);
    set(settingsAtom, { ...current, dominantHand: newHand });
  }
);

/**
 * 通知設定
 */
export const notificationsAtom = atom(
  (get) => get(settingsAtom).notifications,
  (get, set, enabled: boolean) => {
    const current = get(settingsAtom);
    set(settingsAtom, { ...current, notifications: enabled });
  }
);

/**
 * テーマ設定
 */
export const themeAtom = atom(
  (get) => get(settingsAtom).theme,
  (get, set, theme: 'light' | 'dark' | 'auto') => {
    const current = get(settingsAtom);
    set(settingsAtom, { ...current, theme });
  }
);

/**
 * ダークモード判定
 */
export const isDarkModeAtom = atom<boolean>((get) => {
  const theme = get(themeAtom);
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  // auto: システム設定に従う
  if (typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  return false;
});
