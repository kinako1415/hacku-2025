/**
 * 測定画面 - メイン測定ページ
 * MediaPipeを使用したリアルタイム手首・母指可動域測定
 */

'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
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
        setError(
          '初期化に失敗しました。カメラとマイクの権限を確認してください。'
        );
        setIsInitializing(false);
      }
    };

    initializePage();

    return () => {
      // クリーンアップ
      if (cameraState.stream) {
        cameraState.stream.getTracks().forEach((track) => track.stop());
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

      setCameraState((prev) => ({
        ...prev,
        stream,
        isReady: true,
        error: null,
      }));
    } catch (err) {
      console.error('カメラ初期化エラー:', err);
      setCameraState((prev) => ({
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
      await new Promise((resolve) => setTimeout(resolve, 1000));
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

    setMeasurementState((prev) => ({
      ...prev,
      isCapturing: true,
    }));

    // 測定精度の更新をシミュレート
    const accuracyInterval = setInterval(() => {
      setMeasurementState((prev) => ({
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
    setMeasurementState((prev) => ({
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
        wristFlexion: Math.round(Math.random() * 50 + 30), // 30-80度
        thumbAbduction: Math.round(Math.random() * 30 + 20), // 20-50度
        accuracyScore: measurementState.accuracy,
        measurementDate: new Date(),
      };

      // ローカルストレージに保存
      const savedMeasurements = localStorage.getItem('measurements');
      const currentMeasurements = savedMeasurements
        ? JSON.parse(savedMeasurements)
        : [];
      const updatedMeasurements = [mockResult, ...currentMeasurements].slice(
        0,
        10
      ); // 最新10件

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
   * 角度更新ハンドラ
   */
  const handleAnglesUpdate = useCallback((angles: any): void => {
    setMeasurementState((prev) => ({
      ...prev,
      currentAngles: angles,
    }));
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

  return (
    <div className={styles.measurementPage}>
      {/* ヘッダー */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>
            <span className={styles.titleIcon}>📐</span>
            AI可動域測定
          </h1>
          <nav className={styles.navigation}>
            <Link href="/calendar" className={styles.navLink}>
              📅 カレンダー
            </Link>
            <Link href="/progress" className={styles.navLink}>
              📊 進捗
            </Link>
            <Link href="/setup" className={styles.navLink}>
              ⚙️ 設定
            </Link>
          </nav>
        </div>
      </header>

      {/* エラー表示 */}
      {error && (
        <div className={styles.errorContainer}>
          <div className={styles.errorMessage}>
            <span className={styles.errorIcon}>⚠️</span>
            <p>{error}</p>
            <button
              onClick={handleResetError}
              className={styles.errorResetButton}
            >
              閉じる
            </button>
          </div>
        </div>
      )}

      <main className={styles.mainContent}>
        {/* カメラセクション */}
        <div className={styles.cameraSection}>
          <div className={styles.cameraContainer}>
            <CameraPreview
              videoRef={videoRef}
              stream={cameraState.stream}
              isReady={cameraState.isReady}
              error={cameraState.error}
            />

            <AngleOverlay
              canvasRef={canvasRef}
              isCapturing={measurementState.isCapturing}
              selectedHand={selectedHand}
              onAnglesUpdate={handleAnglesUpdate}
            />

            {/* 測定状況表示 */}
            {measurementState.isCapturing && (
              <div className={styles.measurementStatus}>
                <div className={styles.statusIndicator}>
                  <span className={styles.recordingDot}></span>
                  測定中...
                </div>
                <div className={styles.accuracyDisplay}>
                  精度: {Math.round(measurementState.accuracy * 100)}%
                </div>
              </div>
            )}
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

        {/* 測定結果セクション */}
        <div className={styles.resultsSection}>
          <div className={styles.resultsHeader}>
            <h2>📋 最近の測定結果</h2>
            {measurements.length > 0 && (
              <Link href="/progress" className={styles.viewAllLink}>
                すべて表示 →
              </Link>
            )}
          </div>

          {measurements.length > 0 ? (
            <div className={styles.measurementsList}>
              {measurements.slice(0, 5).map((measurement) => (
                <div key={measurement.id} className={styles.measurementItem}>
                  <div className={styles.measurementHeader}>
                    <span
                      className={`${styles.handBadge} ${styles[measurement.handUsed]}`}
                    >
                      {measurement.handUsed === 'right' ? '🫱 右手' : '🫲 左手'}
                    </span>
                    <span className={styles.measurementTime}>
                      {new Date(measurement.measurementDate).toLocaleString()}
                    </span>
                  </div>

                  <div className={styles.angleData}>
                    <div className={styles.angleItem}>
                      <span className={styles.angleLabel}>手首伸展</span>
                      <span className={styles.angleValue}>
                        {measurement.wristExtension}°
                      </span>
                    </div>
                    <div className={styles.angleItem}>
                      <span className={styles.angleLabel}>手首屈曲</span>
                      <span className={styles.angleValue}>
                        {measurement.wristFlexion}°
                      </span>
                    </div>
                    <div className={styles.angleItem}>
                      <span className={styles.angleLabel}>母指外転</span>
                      <span className={styles.angleValue}>
                        {measurement.thumbAbduction}°
                      </span>
                    </div>
                    <div className={styles.angleItem}>
                      <span className={styles.angleLabel}>精度</span>
                      <span
                        className={`${styles.angleValue} ${styles.accuracy}`}
                      >
                        {Math.round(measurement.accuracyScore * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.noResults}>
              <span className={styles.noResultsIcon}>📊</span>
              <h3>まだ測定結果がありません</h3>
              <p>上記のカメラを使用して可動域測定を開始してください</p>
            </div>
          )}
        </div>
      </main>

      {/* フッター */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <p>AI駆動リハビリテーション支援システム</p>
          <div className={styles.footerLinks}>
            <Link href="/setup">設定</Link>
            <Link href="/calendar">カレンダー</Link>
            <Link href="/progress">進捗分析</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
