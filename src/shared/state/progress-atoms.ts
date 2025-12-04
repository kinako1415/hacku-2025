/**
 * 進捗・カレンダー関連の状態管理
 * クリーンアーキテクチャ: 共有レイヤー
 * Jotai atoms for progress and calendar
 */

import { atom } from 'jotai';
import { ProgressData, CalendarRecord } from '@/shared/types/common';

/**
 * 進捗データ
 */
export const progressDataAtom = atom<ProgressData | null>(null);

/**
 * 分析期間
 */
export const analysisPeriodAtom = atom<'week' | 'month' | 'year'>('month');

/**
 * カレンダー記録
 */
export const calendarRecordsAtom = atom<CalendarRecord[]>([]);

/**
 * 表示中の年月
 */
export const currentYearAtom = atom<number>(new Date().getFullYear());
export const currentMonthAtom = atom<number>(new Date().getMonth() + 1);

/**
 * ローディング状態
 */
export const isLoadingProgressAtom = atom<boolean>(false);
export const isLoadingCalendarAtom = atom<boolean>(false);
