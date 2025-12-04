/**
 * 測定キャプチャページ - 実際の測定を行う画面
 * 既存のフェーズベース測定機能を使用
 */

'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Hands, Results } from '@mediapipe/hands';
import type { NormalizedLandmark } from '@mediapipe/hands';
import { angleCalculator } from '@/core/infrastructure/mediapipe/angle-calculator';

// 互換性のためのラッパー関数
const calculateWristAngles = (landmarks: any) => {
  const convertedLandmarks = landmarks.map((lm: any, index: number) => ({ ...lm, id: index }));
  return angleCalculator.calculateWristAngles(convertedLandmarks);
};

const calculateThumbAngles = (landmarks: any) => {
  // 母指角度は現在未実装のため、ダミーデータを返す
  return {
    flexion: 0,
    extension: 0,
    abduction: 0,
    adduction: 0,
  };
};
import type { AngleData } from '@/stores/measurement-atoms';
import type {
  HandType,
  CreateMeasurementInput,
} from '@/lib/data-manager/models/motion-measurement';
import { createMeasurement } from '@/lib/data-manager/models/motion-measurement';
import { db, initializeDatabase } from '@/lib/data-manager/database';
import PhaseDisplay from '@/components/measurement/PhaseDisplay';
import styles from './page.module.scss';

/**
 * 測定フェーズの型定義
 */
type MeasurementPhase =
  | 'flexion'
  | 'extension'
  | 'ulnarDeviation'
  | 'radialDeviation';

/**
 * フェーズ情報の型定義
 */
interface PhaseInfo {
  id: MeasurementPhase;
  name: string;
  description: string;
  targetAngle: keyof AngleData['wrist'];
  normalRange: { min: number; max: number };
  instruction: string;
}

/**
 * 測定状態
 */
interface MeasurementState {
  isCapturing: boolean;
  currentAngles: AngleData | null;
  accuracy: number;
  handDetected: boolean;
  lastUpdateTime: number;
  currentPhase: MeasurementPhase;
  phaseResults: Record<MeasurementPhase, number>;
  isPhaseComplete: boolean;
}

/**
 * 検出エリアの座標
 */
interface DetectionArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

const MeasurementCapturePage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedHand = (searchParams?.get('hand') as HandType) || 'right';

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const detectionAreaRef = useRef<DetectionArea>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });

  // 測定フェーズ定義
  const MEASUREMENT_PHASES: PhaseInfo[] = [
    {
      id: 'flexion',
      name: '掌屈',
      description: '手のひら側に手首を曲げてください',
      targetAngle: 'flexion',
      normalRange: { min: 0, max: 90 },
      instruction: '手首を手のひら側に最大まで曲げてください（正常関節可動域 : 90°）',
    },
    {
      id: 'extension',
      name: '背屈',
      description: '手の甲側に手首を曲げてください',
      targetAngle: 'extension',
      normalRange: { min: 0, max: 70 },
      instruction: '手首を手の甲側に最大まで曲げてください（正常関節可動域 : 70°）',
    },
    {
      id: 'ulnarDeviation',
      name: '尺屈',
      description: '小指側に手首を曲げてください',
      targetAngle: 'ulnarDeviation',
      normalRange: { min: 0, max: 55 },
      instruction: '手首を小指側に最大まで曲げてください（正常関節可動域 : 55°）',
    },
    {
      id: 'radialDeviation',
      name: '橈屈',
      description: '親指側に手首を曲げてください',
      targetAngle: 'radialDeviation',
      normalRange: { min: 0, max: 25 },
      instruction: '手首を親指側に最大まで曲げてください（正常関節可動域 : 25°）',
    },
  ];

  // State
  const [measurementState, setMeasurementState] = useState<MeasurementState>({
    isCapturing: true, // 自動で測定開始
    currentAngles: null,
    accuracy: 0,
    handDetected: false,
    lastUpdateTime: Date.now(),
    currentPhase: 'flexion',
    phaseResults: {
      flexion: 0,
      extension: 0,
      ulnarDeviation: 0,
      radialDeviation: 0,
    },
    isPhaseComplete: false,
  });

  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [hands, setHands] = useState<Hands | null>(null);
  const [mediaPipeReady, setMediaPipeReady] = useState(false);

  // 精度履歴管理
  const accuracyHistoryRef = useRef<number[]>([]);
  const ACCURACY_HISTORY_SIZE = 10;

  /**
   * MediaPipe初期化
   */
  const initializeMediaPipe = useCallback(async () => {
    try {
      console.log('MediaPipe初期化開始...');

      // ブラウザがWebAssemblyをサポートしているかチェック
      if (typeof WebAssembly === 'undefined') {
        throw new Error('WebAssembly is not supported in this browser');
      }

      const handsDetector = new Hands({
        locateFile: (file) => {
          // より安定したCDNを使用
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`;
        },
      });

      // より保守的な設定を使用
      handsDetector.setOptions({
        maxNumHands: 1,
        modelComplexity: 0, // 最軽量モデル
        minDetectionConfidence: 0.8,
        minTrackingConfidence: 0.5,
      });

      // 結果処理の設定
      handsDetector.onResults(handleResults);

      setHands(handsDetector);
      setMediaPipeReady(true);
      console.log('MediaPipe初期化完了');
    } catch (error) {
      console.error('MediaPipe初期化エラー:', error);
      setMediaPipeReady(false);
      setCameraError('手の検出機能の初期化に失敗しました');
    }
  }, []);

  /**
   * カメラ初期化
   */
  const initializeCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
      });

      setCameraStream(stream);
      setCameraReady(true);
      setCameraError(null);
    } catch (error) {
      console.error('カメラ初期化エラー:', error);
      setCameraError('カメラへのアクセスを許可してください');
    }
  }, []);

  /**
   * MediaPipe結果処理
   */
  const handleResults = useCallback(
    (results: Results) => {
      if (!canvasRef.current || !videoRef.current) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // キャンバスをクリア
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 手が検出された場合
      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];
        const handedness = results.multiHandedness?.[0]?.label || 'Right';

        // 選択した手と一致するかチェック
        const detectedHand = handedness === 'Right' ? 'right' : 'left';
        if (detectedHand !== selectedHand) {
          setMeasurementState((prev) => ({ ...prev, handDetected: false }));
          return;
        }

        // 角度計算
        const wristAngles = calculateWristAngles(landmarks as any);
        const thumbAngles = calculateThumbAngles(landmarks as any);

        const angleData: AngleData = {
          wrist: wristAngles,
          thumb: thumbAngles,
        };

        // 手描画
        drawHand(ctx, landmarks as NormalizedLandmark[]);

        // 状態更新
        setMeasurementState((prev) => ({
          ...prev,
          currentAngles: angleData,
          handDetected: true,
          lastUpdateTime: Date.now(),
        }));
      } else {
        setMeasurementState((prev) => ({ ...prev, handDetected: false }));
      }
    },
    [selectedHand]
  );

  /**
   * 手の描画
   */
  const drawHand = (
    ctx: CanvasRenderingContext2D,
    landmarks: NormalizedLandmark[]
  ) => {
    const canvas = ctx.canvas;

    // ランドマーク描画
    landmarks.forEach((landmark, index) => {
      const x = landmark.x * canvas.width;
      const y = landmark.y * canvas.height;

      ctx.beginPath();
      ctx.arc(x, y, 5, 0, 2 * Math.PI);
      ctx.fillStyle = '#4299e1';
      ctx.fill();

      // インデックス表示（デバッグ用）
      if (index % 4 === 0) {
        ctx.fillStyle = '#2d3748';
        ctx.font = '12px Arial';
        ctx.fillText(index.toString(), x + 8, y - 8);
      }
    });

    // 接続線描画
    const connections = [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4], // 親指
      [0, 5],
      [5, 6],
      [6, 7],
      [7, 8], // 人差し指
      [0, 9],
      [9, 10],
      [10, 11],
      [11, 12], // 中指
      [0, 13],
      [13, 14],
      [14, 15],
      [15, 16], // 薬指
      [0, 17],
      [17, 18],
      [18, 19],
      [19, 20], // 小指
    ];

    ctx.strokeStyle = '#4299e1';
    ctx.lineWidth = 2;
    connections.forEach(([start, end]) => {
      if (
        start !== undefined &&
        end !== undefined &&
        landmarks[start] &&
        landmarks[end]
      ) {
        const startPoint = landmarks[start];
        const endPoint = landmarks[end];

        ctx.beginPath();
        ctx.moveTo(startPoint.x * canvas.width, startPoint.y * canvas.height);
        ctx.lineTo(endPoint.x * canvas.width, endPoint.y * canvas.height);
        ctx.stroke();
      }
    });
  };

  /**
   * フレーム処理
   */
  const processFrame = useCallback(async () => {
    if (videoRef.current && hands && measurementState.isCapturing) {
      await hands.send({ image: videoRef.current });
    }
    animationFrameRef.current = requestAnimationFrame(processFrame);
  }, [hands, measurementState.isCapturing]);

  /**
   * 次のフェーズに進む
   */
  const handleNextPhase = useCallback(() => {
    const currentPhaseIndex = MEASUREMENT_PHASES.findIndex(
      (phase) => phase.id === measurementState.currentPhase
    );

    if (currentPhaseIndex < MEASUREMENT_PHASES.length - 1) {
      const nextPhase = MEASUREMENT_PHASES[currentPhaseIndex + 1];
      if (nextPhase) {
        setMeasurementState((prev) => ({
          ...prev,
          currentPhase: nextPhase.id,
          isPhaseComplete: false,
        }));
      }
    }
  }, [measurementState.currentPhase]);

  /**
   * 測定完了
   */
  const handleCompleteMeasurement = useCallback(async () => {
    try {
      const measurementData = createMeasurement({
        userId: 'user-001', // デフォルトユーザー
        measurementDate: new Date(),
        handUsed: selectedHand,
        wristFlexion: measurementState.phaseResults.flexion,
        wristExtension: measurementState.phaseResults.extension,
        wristUlnarDeviation: measurementState.phaseResults.ulnarDeviation,
        wristRadialDeviation: measurementState.phaseResults.radialDeviation,
        thumbFlexion: measurementState.currentAngles?.thumb?.flexion || 0,
        thumbExtension: measurementState.currentAngles?.thumb?.extension || 0,
        thumbAdduction: measurementState.currentAngles?.thumb?.adduction || 0,
        thumbAbduction: measurementState.currentAngles?.thumb?.abduction || 0,
        accuracyScore: measurementState.accuracy,
      });

      // タイムゾーンに依存しないようにYYYY-MM-DD形式の文字列で比較
      const targetDate = new Date(measurementData.measurementDate);
      const targetDateString = `${targetDate.getFullYear()}-${String(
        targetDate.getMonth() + 1
      ).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;

      const existing = await db.measurements
        .where('userId')
        .equals(measurementData.userId)
        .filter((m) => {
          const recordDate = new Date(m.measurementDate);
          const recordDateString = `${recordDate.getFullYear()}-${String(
            recordDate.getMonth() + 1
          ).padStart(2, '0')}-${String(recordDate.getDate()).padStart(2, '0')}`;
          return recordDateString === targetDateString;
        })
        .first();

      // 既存データがあれば、そのIDを新しいデータに引き継ぐ
      if (existing?.id) {
        measurementData.id = existing.id;
      }

      // putメソッドで保存（存在すれば更新、なければ新規作成）
      await db.measurements.put(measurementData);

      // 進捗ページに移動
      router.push('/progress');
    } catch (error) {
      console.error('測定保存エラー:', error);
    }
  }, [measurementState, selectedHand, router]);

  /**
   * 現在の角度取得
   */
  const getCurrentAngle = useCallback(() => {
    if (!measurementState.currentAngles?.wrist) return 0;

    const currentPhase = MEASUREMENT_PHASES.find(
      (phase) => phase.id === measurementState.currentPhase
    );

    if (!currentPhase) return 0;

    return measurementState.currentAngles.wrist[currentPhase.targetAngle] || 0;
  }, [measurementState.currentAngles, measurementState.currentPhase]);

  /**
   * フェーズプログレス計算
   */
  const getPhaseProgress = useCallback(() => {
    const currentPhaseIndex = MEASUREMENT_PHASES.findIndex(
      (phase) => phase.id === measurementState.currentPhase
    );
    return ((currentPhaseIndex + 1) / MEASUREMENT_PHASES.length) * 100;
  }, [measurementState.currentPhase]);

  /**
   * 最終フェーズかチェック
   */
  const isLastPhase = useCallback(() => {
    const currentPhaseIndex = MEASUREMENT_PHASES.findIndex(
      (phase) => phase.id === measurementState.currentPhase
    );
    return currentPhaseIndex === MEASUREMENT_PHASES.length - 1;
  }, [measurementState.currentPhase]);

  // 初期化
  useEffect(() => {
    const initialize = async () => {
      try {
        await initializeDatabase();
        await initializeCamera();

        // カメラが準備完了後にMediaPipeを初期化
        if (cameraReady) {
          setTimeout(() => {
            initializeMediaPipe();
          }, 2000); // 2秒遅延
        }
      } catch (error) {
        console.error('初期化エラー:', error);
      }
    };

    initialize();

    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [initializeCamera, initializeMediaPipe, cameraReady]);

  // フレーム処理開始
  useEffect(() => {
    if (cameraReady && mediaPipeReady) {
      processFrame();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [cameraReady, mediaPipeReady, processFrame]);

  // ビデオにストリーム設定
  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream]);

  const currentPhaseInfo = MEASUREMENT_PHASES.find(
    (phase) => phase.id === measurementState.currentPhase
  );

  return (
    <div className={styles.capturePage}>
      {/* カメラセクション */}
      <div className={styles.cameraSection}>
        <div className={styles.cameraContainer}>
          <video
            ref={videoRef}
            className={styles.cameraVideo}
            autoPlay
            playsInline
            muted
          />
          <canvas
            ref={canvasRef}
            className={styles.overlay}
            width={640}
            height={480}
          />

          {!mediaPipeReady && (
            <div className={styles.errorOverlay}>
              <div style={{ textAlign: 'center', color: 'white' }}>
                <p>AI手検出を初期化中...</p>
                <p
                  style={{ fontSize: '0.9rem', opacity: 0.8, marginTop: '8px' }}
                >
                  しばらくお待ちください
                </p>
                <button
                  onClick={() => router.push('/progress')}
                  style={{
                    marginTop: '16px',
                    padding: '8px 16px',
                    backgroundColor: '#3182ce',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  デモ結果を表示
                </button>
              </div>
            </div>
          )}

          {cameraError && (
            <div className={styles.errorOverlay}>
              <p>{cameraError}</p>
            </div>
          )}
        </div>
      </div>

      {/* 測定コントロールセクション */}
      <div className={styles.controlSection}>
        {currentPhaseInfo && mediaPipeReady && (
          <PhaseDisplay
            currentPhase={currentPhaseInfo}
            currentAngle={getCurrentAngle()}
            phaseProgress={getPhaseProgress()}
            totalPhases={MEASUREMENT_PHASES.length}
            currentPhaseNumber={
              MEASUREMENT_PHASES.findIndex(
                (p) => p.id === measurementState.currentPhase
              ) + 1
            }
            isComplete={isLastPhase()}
            onNext={handleNextPhase}
            onComplete={handleCompleteMeasurement}
            status={
              !measurementState.handDetected
                ? 'invalid'
                : measurementState.isPhaseComplete
                  ? 'complete'
                  : 'measuring'
            }
          />
        )}

        {!mediaPipeReady && (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <h2>AI手検出を初期化中...</h2>
            <p>MediaPipe Handsライブラリを読み込んでいます</p>
            <div style={{ marginTop: '20px' }}>
              <button
                onClick={() => router.push('/progress')}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#3182ce',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                }}
              >
                デモ結果を表示
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MeasurementCapturePage;
