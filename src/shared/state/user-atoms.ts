/**
 * ユーザー関連の状態管理
 * クリーンアーキテクチャ: 共有レイヤー
 * Jotai atoms for user state
 */

import { atom } from 'jotai';
import { User } from '@/shared/types/common';

/**
 * 現在のユーザー
 */
export const currentUserAtom = atom<User | null>(null);

/**
 * ユーザーID
 */
export const userIdAtom = atom<string>((get) => {
  const user = get(currentUserAtom);
  return user?.id || '';
});

/**
 * ユーザー名
 */
export const userNameAtom = atom<string>((get) => {
  const user = get(currentUserAtom);
  return user?.name || 'ゲスト';
});

/**
 * ログイン状態
 */
export const isLoggedInAtom = atom<boolean>((get) => {
  const user = get(currentUserAtom);
  return user !== null;
});
