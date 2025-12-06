/**
 * 測定統合サービス
 * MeasurementControlsコンポーネントとMediaPipeサービスを統合
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { HandType } from '@/lib/data-manager/models/motion-measurement';

/**
 * 測定統合フックの設定
 */
interface MeasurementIntegrationConfig {
  measurementDuration?: number;
  samplingRate?: number;
  confidenceThreshold?: number;
  stabilizationTime?: number;
}

/**
 * 測定セッション（簡略版）
 */
interface SimpleMeasurementSession {
  id: string;
  startTime: Date;
  isActive: boolean;
  targetHand: 'left' | 'right';
  progress: number;
  accuracy: number;
}

/**
 * 測定統合フックの状態
 */
interface MeasurementIntegrationState {
  isReady: boolean;
  isCapturing: boolean;
  isSaving: boolean;
  selectedHand: HandType;
  accuracy: number;
  currentSession: SimpleMeasurementSession | null;
  error: string | null;
  cameraPermission: 'granted' | 'denied' | 'prompt';
}

/**
 * 測定統合フック
 * 測定コンポーネントとMediaPipeサービスを統合
 */
export const useMeasurementIntegration = (
  config: MeasurementIntegrationConfig = {}
) => {
  const [state, setState] = useState<MeasurementIntegrationState>({
    isReady: false,
    isCapturing: false,
    isSaving: false,
    selectedHand: 'right',
    accuracy: 0,
    currentSession: null,
    error: null,
    cameraPermission: 'prompt',
  });

  // 模擬的なサービス参照
  const isInitializedRef = useRef(false);

  // サービス初期化（模擬版）
  const initializeServices = useCallback(async () => {
    try {
      // 実際の実装では MediaPipe と Camera サービスを初期化
      // 現在は模擬実装
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // カメラ権限をチェック
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((track) => track.stop());

      isInitializedRef.current = true;
      setState((prev) => ({
        ...prev,
        isReady: true,
        cameraPermission: 'granted',
        error: null,
      }));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : '初期化に失敗しました';
      setState((prev) => ({
        ...prev,
        isReady: false,
        cameraPermission: 'denied',
        error: errorMessage,
      }));
    }
  }, []);

  // 測定開始
  const startMeasurement = useCallback(async () => {
    if (!isInitializedRef.current || !state.isReady) {
      setState((prev) => ({
        ...prev,
        error: 'サービスが初期化されていません',
      }));
      return;
    }

    try {
      setState((prev) => ({ ...prev, isCapturing: true, error: null }));

      // 模擬セッション作成
      const session: SimpleMeasurementSession = {
        id: `session-${Date.now()}`,
        startTime: new Date(),
        isActive: true,
        targetHand: state.selectedHand,
        progress: 0,
        accuracy: 0,
      };

      setState((prev) => ({
        ...prev,
        currentSession: session,
      }));

      // 測定プログレス監視（模擬）
      const progressInterval = setInterval(() => {
        setState((prev) => {
          if (!prev.currentSession || !prev.isCapturing) {
            clearInterval(progressInterval);
            return prev;
          }

          const newProgress = Math.min(prev.currentSession.progress + 0.02, 1);
          const newAccuracy = Math.min(
            newProgress * 0.8 + Math.random() * 0.2,
            1
          );

          return {
            ...prev,
            accuracy: newAccuracy,
            currentSession: {
              ...prev.currentSession,
              progress: newProgress,
              accuracy: newAccuracy,
            },
          };
        });
      }, 100);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : '測定開始に失敗しました';
      setState((prev) => ({
        ...prev,
        isCapturing: false,
        error: errorMessage,
      }));
    }
  }, [state.isReady, state.selectedHand]);

  // 測定停止
  const stopMeasurement = useCallback(async () => {
    if (!state.currentSession) {
      return null;
    }

    try {
      setState((prev) => ({ ...prev, isSaving: true }));

      // 測定結果を保存（模擬）
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const result = {
        sessionId: state.currentSession.id,
        accuracy: state.accuracy,
        measurements: [],
      };

      setState((prev) => ({
        ...prev,
        isCapturing: false,
        isSaving: false,
        currentSession: null,
        accuracy: 0,
      }));

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : '測定停止に失敗しました';
      setState((prev) => ({
        ...prev,
        isSaving: false,
        error: errorMessage,
      }));
      return null;
    }
  }, [state.currentSession, state.accuracy]);

  // 手の選択変更
  const handleHandSelection = useCallback(
    (hand: HandType) => {
      if (state.isCapturing) {
        setState((prev) => ({
          ...prev,
          error: '測定中は手の変更はできません',
        }));
        return;
      }

      setState((prev) => ({
        ...prev,
        selectedHand: hand,
        error: null,
      }));
    },
    [state.isCapturing]
  );

  // エラークリア
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  // サービス終了処理
  const cleanup = useCallback(async () => {
    try {
      if (state.isCapturing) {
        await stopMeasurement();
      }

      isInitializedRef.current = false;
      setState({
        isReady: false,
        isCapturing: false,
        isSaving: false,
        selectedHand: 'right',
        accuracy: 0,
        currentSession: null,
        error: null,
        cameraPermission: 'prompt',
      });
    } catch (error) {
      console.error('クリーンアップエラー:', error);
    }
  }, [state.isCapturing, stopMeasurement]);

  // 初期化処理
  useEffect(() => {
    initializeServices();

    return () => {
      cleanup();
    };
  }, [initializeServices, cleanup]);

  // カメラ権限監視
  useEffect(() => {
    const checkCameraPermission = async () => {
      try {
        const permissions = await navigator.permissions.query({
          name: 'camera' as PermissionName,
        });
        setState((prev) => ({
          ...prev,
          cameraPermission:
            permissions.state === 'granted'
              ? 'granted'
              : permissions.state === 'denied'
                ? 'denied'
                : 'prompt',
        }));

        permissions.addEventListener('change', () => {
          setState((prev) => ({
            ...prev,
            cameraPermission:
              permissions.state === 'granted'
                ? 'granted'
                : permissions.state === 'denied'
                  ? 'denied'
                  : 'prompt',
          }));
        });
      } catch (error) {
        console.warn('カメラ権限の確認に失敗:', error);
      }
    };

    checkCameraPermission();
  }, []);

  return {
    // 状態
    ...state,

    // アクション
    startMeasurement,
    stopMeasurement,
    handleHandSelection,
    clearError,
    cleanup,
  };
};
