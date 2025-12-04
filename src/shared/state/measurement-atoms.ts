/**
 * 測定関連の状態管理
 * クリーンアーキテクチャ: 共有レイヤー
 * Jotai atoms for measurement state
 */

import { atom } from 'jotai';
import { MeasurementSession, MeasurementResult } from '@/core/domain/types/measurement';

/**
 * 現在の測定セッション
 */
export const currentSessionAtom = atom<MeasurementSession | null>(null);

/**
 * 現在のステップ（0-3）
 */
export const currentStepAtom = atom<number>(0);

/**
 * 測定結果配列
 */
export const measurementResultsAtom = atom<MeasurementResult[]>([]);

/**
 * 測定中フラグ
 */
export const isMeasuringAtom = atom<boolean>(false);

/**
 * カメラ準備完了フラグ
 */
export const cameraReadyAtom = atom<boolean>(false);

/**
 * 測定進捗率（0-100%）
 */
export const measurementProgressAtom = atom<number>((get) => {
  const session = get(currentSessionAtom);
  if (!session) return 0;
  return (session.completedSteps / session.totalSteps) * 100;
});

/**
 * 測定完了フラグ
 */
export const isMeasurementCompleteAtom = atom<boolean>((get) => {
  const session = get(currentSessionAtom);
  return session?.status === 'completed';
});
