/**
 * 測定画面 - メイン測定ページ
 * MediaPipeを使用したリアルタイム手首・母指可動域測定
 */

'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAtom } from 'jotai';
import { CameraPreview } from '@/components/camera/CameraPreview';
import { AngleOverlay } from '@/components/measurement/AngleOverlay';
import { MeasurementControls } from '@/components/measurement/MeasurementControls';
import {
  measurementStateAtom,
  currentUserAtom,
  type MeasurementState,
} from '@/stores/measurement-atoms';
import { cameraStateAtom } from '@/stores/camera-atoms';
import { useMeasurementService } from '@/hooks/useMeasurementService';
import { useMediaPipeHands } from '@/hooks/useMediaPipeHands';
import { createMotionMeasurement } from '@/lib/data-manager/models/motion-measurement';
import type {
  MotionMeasurement,
  HandType,
  CreateMotionMeasurementInput,
} from '@/lib/data-manager/models/motion-measurement';
import styles from './page.module.scss';

/**
 * メイン測定ページコンポーネント
 */
export default function MeasurementPage(): React.JSX.Element {
  // 状態管理
  const [measurementState, setMeasurementState] = useAtom(measurementStateAtom);
  const [cameraState, setCameraState] = useAtom(cameraStateAtom);
  const [currentUser] = useAtom(currentUserAtom);

  // ローカル状態
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [measurements, setMeasurements] = useState<MotionMeasurement[]>([]);
  const [selectedHand, setSelectedHand] = useState<HandType>('right');

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // カスタムフック
  const { saveMotionMeasurement, isLoading: isSaving } =
    useMeasurementService();
  const {
    handsDetector,
    isLoaded: isMediaPipeLoaded,
    error: mediaPipeError,
    detectHands,
  } = useMediaPipeHands();

  /**
   * 初期化処理
   */
  useEffect(() => {
    const initializePage = async (): Promise<void> => {
      try {
        setIsInitializing(true);
        setError(null);

        // ユーザー存在確認
        if (!currentUser) {
          setError(
            'ユーザー情報が見つかりません。セットアップページから開始してください。'
          );
          return;
        }

        // カメラの初期化
        if (!cameraState.stream) {
          await initializeCamera();
        }

        // MediaPipeの初期化を待機
        // useMediaPipeHandsフックが自動で初期化を行う
      } catch (err) {
        console.error('測定ページ初期化エラー:', err);
        setError(
          err instanceof Error
            ? err.message
            : '測定ページの初期化に失敗しました'
        );
      } finally {
        setIsInitializing(false);
      }
    };

    initializePage();
  }, [currentUser, cameraState.stream]);

  /**
   * カメラ初期化
   */
  const initializeCamera = async (): Promise<void> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: false,
      });

      setCameraState({
        ...cameraState,
        stream,
        isReady: true,
        error: null,
      });

      // ビデオ要素にストリームを設定
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'カメラの初期化に失敗しました';
      setCameraState({
        ...cameraState,
        error: errorMessage,
        isReady: false,
      });
      throw new Error(errorMessage);
    }
  };

  /**
   * 測定開始処理
   */
  const handleStartMeasurement = useCallback(async (): Promise<void> => {
    if (!currentUser || !cameraState.isReady || !isMediaPipeLoaded) {
      setError(
        '測定を開始する前に、カメラとMediaPipeが準備完了していることを確認してください'
      );
      return;
    }

    try {
      setMeasurementState({
        ...measurementState,
        isCapturing: true,
        currentAngles: null,
        accuracy: 0,
        startTime: new Date(),
      });

      setError(null);
    } catch (err) {
      console.error('測定開始エラー:', err);
      setError('測定の開始に失敗しました');
    }
  }, [
    currentUser,
    cameraState.isReady,
    isMediaPipeLoaded,
    measurementState,
    setMeasurementState,
  ]);

  /**
   * 測定停止処理
   */
  const handleStopMeasurement = useCallback(async (): Promise<void> => {
    try {
      if (!measurementState.currentAngles || !currentUser) {
        setError('保存する測定データがありません');
        return;
      }

      // 測定データの作成
      const measurementInput: CreateMotionMeasurementInput = {
        userId: currentUser.id,
        handUsed: selectedHand,
        wristAngles: measurementState.currentAngles.wrist,
        thumbAngles: measurementState.currentAngles.thumb,
        accuracy: measurementState.accuracy,
        duration: measurementState.startTime
          ? Math.round(
              (Date.now() - measurementState.startTime.getTime()) / 1000
            )
          : 0,
      };

      const measurementData = createMotionMeasurement(measurementInput);

      // データベースに保存
      await saveMotionMeasurement(measurementData);

      // 測定リストに追加
      setMeasurements((prev) => [measurementData, ...prev]);

      // 測定状態をリセット
      setMeasurementState({
        ...measurementState,
        isCapturing: false,
        currentAngles: null,
        accuracy: 0,
        startTime: null,
      });

      setError(null);
    } catch (err) {
      console.error('測定停止エラー:', err);
      setError('測定データの保存に失敗しました');
    }
  }, [
    measurementState,
    currentUser,
    selectedHand,
    saveMotionMeasurement,
    setMeasurementState,
  ]);

  /**
   * 手の選択変更
   */
  const handleHandSelection = useCallback((hand: HandType): void => {
    setSelectedHand(hand);
  }, []);

  /**
   * エラーリセット
   */
  const handleResetError = useCallback((): void => {
    setError(null);
  }, []);

  // MediaPipeエラーの監視
  useEffect(() => {
    if (mediaPipeError) {
      setError(`MediaPipe エラー: ${mediaPipeError}`);
    }
  }, [mediaPipeError]);

  // 測定が開始されている場合の検出処理
  useEffect(() => {
    if (!measurementState.isCapturing || !handsDetector || !videoRef.current) {
      return;
    }

    const detectAndMeasure = async (): Promise<void> => {
      try {
        if (videoRef.current && videoRef.current.readyState >= 2) {
          const results = await detectHands(videoRef.current);

          if (
            results &&
            results.multiHandLandmarks &&
            results.multiHandLandmarks.length > 0
          ) {
            // 角度計算とオーバーレイ描画は AngleOverlay コンポーネントで処理
            // ここでは検出状態の更新のみ
            setMeasurementState((prev: MeasurementState) => ({
              ...prev,
              accuracy: Math.min(prev.accuracy + 0.1, 1.0), // 簡易的な精度向上
            }));
          }
        }
      } catch (err) {
        console.error('手の検出エラー:', err);
      }
    };

    const intervalId = setInterval(detectAndMeasure, 100); // 10FPS
    return () => clearInterval(intervalId);
  }, [
    measurementState.isCapturing,
    handsDetector,
    detectHands,
    setMeasurementState,
  ]);

  // 読み込み中表示
  if (isInitializing) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>測定画面を初期化しています...</p>
      </div>
    );
  }

  return (
    <div className={styles.measurementPage}>
      <header className={styles.header}>
        <h1>手首・母指可動域測定</h1>
        <div className={styles.userInfo}>
          {currentUser && <span>ユーザー: {currentUser.name}</span>}
        </div>
      </header>

      {error && (
        <div className={styles.errorContainer}>
          <p className={styles.errorMessage}>{error}</p>
          <button
            onClick={handleResetError}
            className={styles.errorResetButton}
          >
            エラーを閉じる
          </button>
        </div>
      )}

      <main className={styles.mainContent}>
        <div className={styles.cameraSection}>
          <div className={styles.cameraContainer}>
            <CameraPreview
              ref={videoRef}
              stream={cameraState.stream}
              isReady={cameraState.isReady}
              error={cameraState.error}
            />

            <AngleOverlay
              ref={canvasRef}
              videoElement={videoRef.current}
              handsDetector={handsDetector}
              isCapturing={measurementState.isCapturing}
              selectedHand={selectedHand}
              onAnglesUpdate={(angles: any) => {
                setMeasurementState((prev: MeasurementState) => ({
                  ...prev,
                  currentAngles: angles,
                }));
              }}
            />
          </div>

          <MeasurementControls
            isCapturing={measurementState.isCapturing}
            isReady={cameraState.isReady && isMediaPipeLoaded}
            selectedHand={selectedHand}
            accuracy={measurementState.accuracy}
            isSaving={isSaving}
            onStartMeasurement={handleStartMeasurement}
            onStopMeasurement={handleStopMeasurement}
            onHandSelection={handleHandSelection}
          />
        </div>

        <div className={styles.resultsSection}>
          <h2>測定結果</h2>
          {measurements.length > 0 ? (
            <div className={styles.measurementsList}>
              {measurements.slice(0, 5).map((measurement) => (
                <div key={measurement.id} className={styles.measurementItem}>
                  <div className={styles.measurementHeader}>
                    <span className={styles.handUsed}>
                      {measurement.handUsed === 'right' ? '右手' : '左手'}
                    </span>
                    <span className={styles.measurementTime}>
                      {new Date(
                        measurement.measurementDate
                      ).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className={styles.angleData}>
                    <span>手首: {measurement.wristExtension}°</span>
                    <span>母指: {measurement.thumbAbduction}°</span>
                    <span>
                      精度: {Math.round(measurement.accuracyScore * 100)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className={styles.noResults}>まだ測定結果がありません</p>
          )}
        </div>
      </main>
    </div>
  );
}
