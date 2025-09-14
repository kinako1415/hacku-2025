/**
 * 測定画面 - メイン測定ページ
 * MediaPipeを使用したリアルタイム手首・母指可動域測定
 */

'use client';

import React, { useEffect, useState, useRef, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MeasurementControls } from '@/components/measurement/MeasurementControls';
import styles from './page.module.scss';

/**
 * 測定データの型定義
 */
interface MeasurementResult {
  id: string;
  handUsed: 'left' | 'right';
  wristExtension: number;
  wristFlexion: number;
  thumbAbduction: number;
  accuracyScore: number;
  measurementDate: Date;
}

/**
 * 測定状態の型定義
 */
interface MeasurementState {
  isCapturing: boolean;
  currentAngles: any;
  accuracy: number;
}

/**
 * カメラプレビューコンポーネント（一時的な実装）
 */
const CameraPreview: React.FC<{
  videoRef: React.RefObject<HTMLVideoElement>;
  stream: MediaStream | null;
  isReady: boolean;
  error: string | null;
}> = ({ videoRef, stream, isReady, error }) => {
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [videoRef, stream]);

  if (error) {
    return (
      <div className={styles.cameraError}>
        <span>📷</span>
        <p>{error}</p>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className={styles.cameraLoading}>
        <div className={styles.spinner}></div>
        <p>カメラを準備中...</p>
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      className={styles.cameraVideo}
      autoPlay
      playsInline
      muted
    />
  );
};

/**
 * 角度オーバーレイコンポーネント（一時的な実装）
 */
const AngleOverlay: React.FC<{
  canvasRef: React.RefObject<HTMLCanvasElement>;
  isCapturing: boolean;
  selectedHand: 'left' | 'right';
  onAnglesUpdate: (angles: any) => void;
}> = ({ canvasRef, isCapturing, selectedHand, onAnglesUpdate }) => {
  useEffect(() => {
    if (isCapturing && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // 簡単な角度表示のシミュレーション
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'rgba(33, 150, 243, 0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.strokeStyle = '#2196f3';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2, 50, 0, Math.PI * 2);
        ctx.stroke();
        
        // モック角度データを送信
        onAnglesUpdate({
          wristExtension: Math.random() * 60 + 20,
          wristFlexion: Math.random() * 60 + 20,
          thumbAbduction: Math.random() * 40 + 10,
        });
      }
    }
  }, [isCapturing, canvasRef, onAnglesUpdate]);

  return (
    <canvas
      ref={canvasRef}
      className={styles.angleOverlay}
      width={640}
      height={480}
    />
  );
};

/**
 * メイン測定ページコンポーネント
 */
export default function MeasurementPage(): React.JSX.Element {
  const router = useRouter();
  
  // 状態管理
  const [measurementState, setMeasurementState] = useState<MeasurementState>({
    isCapturing: false,
    currentAngles: null,
    accuracy: 0,
  });
  
  const [cameraState, setCameraState] = useState({
    isReady: false,
    stream: null as MediaStream | null,
    error: null as string | null,
  });

  // ローカル状態
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [measurements, setMeasurements] = useState<MeasurementResult[]>([]);
  const [selectedHand, setSelectedHand] = useState<'left' | 'right'>('right');
  const [isSaving, setIsSaving] = useState(false);
  const [isMediaPipeLoaded, setIsMediaPipeLoaded] = useState(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  /**
   * ページ初期化
   */
  useEffect(() => {
    const initializePage = async (): Promise<void> => {
      try {
        setIsInitializing(true);
        
        // カメラ初期化
        await initializeCamera();
        
        // MediaPipe初期化
        await initializeMediaPipe();
        
        setIsInitializing(false);
      } catch (err) {
        console.error('初期化エラー:', err);
        setError('初期化に失敗しました。カメラとマイクの権限を確認してください。');
        setIsInitializing(false);
      }
    };

    initializePage();

    return () => {
      // クリーンアップ
      if (cameraState.stream) {
        cameraState.stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  /**
   * カメラ初期化
   */
  const initializeCamera = async (): Promise<void> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
      });

      setCameraState(prev => ({
        ...prev,
        stream,
        isReady: true,
        error: null,
      }));

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('カメラ初期化エラー:', err);
      setCameraState(prev => ({
        ...prev,
        error: 'カメラにアクセスできません',
        isReady: false,
      }));
      throw err;
    }
  };

  /**
   * MediaPipe初期化
   */
  const initializeMediaPipe = async (): Promise<void> => {
    try {
      // MediaPipeの初期化は実際の実装で行う
      // 現在はモックとして設定
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsMediaPipeLoaded(true);
    } catch (err) {
      console.error('MediaPipe初期化エラー:', err);
      throw err;
    }
  };

  /**
   * 測定開始
   */
  const handleStartMeasurement = useCallback((): void => {
    if (!cameraState.isReady || !isMediaPipeLoaded) {
      setError('カメラまたはMediaPipeが準備できていません');
      return;
    }

    setMeasurementState(prev => ({
      ...prev,
      isCapturing: true,
    }));

    // 測定精度の更新をシミュレート
    const accuracyInterval = setInterval(() => {
      setMeasurementState(prev => ({
        ...prev,
        accuracy: Math.random() * 0.3 + 0.7, // 70-100%
      }));
    }, 100);

    // 測定状態に interval ID を保存
    (window as any).accuracyInterval = accuracyInterval;
  }, [cameraState.isReady, isMediaPipeLoaded]);

  /**
   * 測定停止
   */
  const handleStopMeasurement = useCallback(async (): Promise<void> => {
    setMeasurementState(prev => ({
      ...prev,
      isCapturing: false,
    }));

    // accuracy interval をクリア
    if ((window as any).accuracyInterval) {
      clearInterval((window as any).accuracyInterval);
      (window as any).accuracyInterval = null;
    }

    // 測定結果を保存
    await saveMeasurementResult();
  }, []);

  /**
   * 測定結果保存
   */
  const saveMeasurementResult = async (): Promise<void> => {
    try {
      setIsSaving(true);

      // モック測定データ
      const mockResult: MeasurementResult = {
        id: `measurement_${Date.now()}`,
        handUsed: selectedHand,
        wristExtension: Math.round(Math.random() * 50 + 30), // 30-80度
        thumbAbduction: Math.round(Math.random() * 30 + 20), // 20-50度
        accuracyScore: measurementState.accuracy,
        measurementDate: new Date(),
      };

      // ローカルストレージに保存
      const savedMeasurements = localStorage.getItem('measurements');
      const currentMeasurements = savedMeasurements ? JSON.parse(savedMeasurements) : [];
      const updatedMeasurements = [mockResult, ...currentMeasurements].slice(0, 10); // 最新10件
      
      localStorage.setItem('measurements', JSON.stringify(updatedMeasurements));
      setMeasurements(updatedMeasurements);

      setIsSaving(false);
    } catch (err) {
      console.error('測定結果保存エラー:', err);
      setError('測定結果の保存に失敗しました');
      setIsSaving(false);
    }
  };

  /**
   * 手の選択
   */
  const handleHandSelection = useCallback((hand: 'left' | 'right'): void => {
    setSelectedHand(hand);
  }, []);

  /**
   * エラーリセット
   */
  const handleResetError = useCallback((): void => {
    setError(null);
  }, []);

  /**
   * 保存済み測定データを読み込み
   */
  useEffect(() => {
    const savedMeasurements = localStorage.getItem('measurements');
    if (savedMeasurements) {
      try {
        const parsedMeasurements = JSON.parse(savedMeasurements);
        setMeasurements(parsedMeasurements);
      } catch (err) {
        console.error('測定データ読み込みエラー:', err);
      }
    }
  }, []);

  // 初期化中の表示
  if (isInitializing) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}>
          <div className={styles.spinner}></div>
          <h2>AI測定システムを準備中...</h2>
          <p>カメラとMediaPipeを初期化しています</p>
        </div>
      </div>
    );
  }
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
