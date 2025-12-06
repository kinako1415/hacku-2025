/**
 * 測定関連の状態管理アトム (Jotai)
 */

import { atom } from 'jotai';
import type { User } from '@/lib/data-manager/models/user';

/**
 * 測定状態の型定義
 */
export interface MeasurementState {
  isCapturing: boolean;
  currentAngles: {
    wrist: {
      flexion: number;
      extension: number;
      radialDeviation: number;
      ulnarDeviation: number;
    };
    thumb: {
      abduction: number;
      adduction: number;
      flexion: number;
      extension: number;
    };
  } | null;
  accuracy: number;
  startTime: Date | null;
}

/**
 * 角度データの型定義
 */
export interface AngleData {
  wrist: {
    flexion: number;
    extension: number;
    radialDeviation: number;
    ulnarDeviation: number;
  };
  thumb: {
    abduction: number;
    adduction: number;
    flexion: number;
    extension: number;
  };
}

/**
 * 測定状態アトム
 */
export const measurementStateAtom = atom<MeasurementState>({
  isCapturing: false,
  currentAngles: null,
  accuracy: 0,
  startTime: null,
});

/**
 * 現在のユーザーアトム
 */
export const currentUserAtom = atom<User | null>(null);

/**
 * 測定準備完了状態の派生アトム
 */
export const isReadyToMeasureAtom = atom((get) => {
  const measurementState = get(measurementStateAtom);
  const currentUser = get(currentUserAtom);

  return currentUser !== null && !measurementState.isCapturing;
});

/**
 * 測定中状態の派生アトム
 */
export const isMeasuringAtom = atom((get) => {
  const measurementState = get(measurementStateAtom);
  return measurementState.isCapturing;
});

/**
 * 測定精度の派生アトム（パーセンテージ）
 */
export const accuracyPercentageAtom = atom((get) => {
  const measurementState = get(measurementStateAtom);
  return Math.round(measurementState.accuracy * 100);
});

/**
 * 現在の角度データの派生アトム（表示用フォーマット）
 */
export const formattedAnglesAtom = atom((get) => {
  const measurementState = get(measurementStateAtom);

  if (!measurementState.currentAngles) {
    return null;
  }

  return {
    wrist: {
      flexion: Math.round(measurementState.currentAngles.wrist.flexion),
      extension: Math.round(measurementState.currentAngles.wrist.extension),
      radialDeviation: Math.round(
        measurementState.currentAngles.wrist.radialDeviation
      ),
      ulnarDeviation: Math.round(
        measurementState.currentAngles.wrist.ulnarDeviation
      ),
    },
    thumb: {
      abduction: Math.round(measurementState.currentAngles.thumb.abduction),
      adduction: Math.round(measurementState.currentAngles.thumb.adduction),
      flexion: Math.round(measurementState.currentAngles.thumb.flexion),
      extension: Math.round(measurementState.currentAngles.thumb.extension),
    },
  };
});

/**
 * 測定時間の派生アトム（秒）
 */
export const measurementDurationAtom = atom((get) => {
  const measurementState = get(measurementStateAtom);

  if (!measurementState.startTime || !measurementState.isCapturing) {
    return 0;
  }

  return Math.floor((Date.now() - measurementState.startTime.getTime()) / 1000);
});

/**
 * 測定可能な精度に達しているかの派生アトム
 */
export const hasAcceptableAccuracyAtom = atom((get) => {
  const measurementState = get(measurementStateAtom);
  return measurementState.accuracy >= 0.7; // 70%以上で測定可能
});

/**
 * 測定データが有効かの派生アトム
 */
export const hasValidMeasurementDataAtom = atom((get) => {
  const measurementState = get(measurementStateAtom);
  const hasAcceptableAccuracy = get(hasAcceptableAccuracyAtom);

  return measurementState.currentAngles !== null && hasAcceptableAccuracy;
});

/**
 * ユーザー情報設定用の書き込み可能アトム
 */
export const setCurrentUserAtom = atom(null, (get, set, user: User | null) => {
  set(currentUserAtom, user);
});

/**
 * 測定開始用の書き込み可能アトム
 */
export const startMeasurementAtom = atom(null, (get, set) => {
  const currentState = get(measurementStateAtom);

  set(measurementStateAtom, {
    ...currentState,
    isCapturing: true,
    currentAngles: null,
    accuracy: 0,
    startTime: new Date(),
  });
});

/**
 * 測定停止用の書き込み可能アトム
 */
export const stopMeasurementAtom = atom(null, (get, set) => {
  const currentState = get(measurementStateAtom);

  set(measurementStateAtom, {
    ...currentState,
    isCapturing: false,
    startTime: null,
  });
});

/**
 * 角度データ更新用の書き込み可能アトム
 */
export const updateAnglesAtom = atom(
  null,
  (get, set, angles: AngleData | null) => {
    const currentState = get(measurementStateAtom);

    set(measurementStateAtom, {
      ...currentState,
      currentAngles: angles,
    });
  }
);

/**
 * 精度更新用の書き込み可能アトム
 */
export const updateAccuracyAtom = atom(null, (get, set, accuracy: number) => {
  const currentState = get(measurementStateAtom);

  set(measurementStateAtom, {
    ...currentState,
    accuracy: Math.max(0, Math.min(1, accuracy)), // 0-1の範囲にクランプ
  });
});

/**
 * 測定状態リセット用の書き込み可能アトム
 */
export const resetMeasurementStateAtom = atom(null, (get, set) => {
  set(measurementStateAtom, {
    isCapturing: false,
    currentAngles: null,
    accuracy: 0,
    startTime: null,
  });
});
