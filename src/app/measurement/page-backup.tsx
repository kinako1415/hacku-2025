/**
 * 測定画面 - メイン測定ページ
 * MediaPipeを使用したリアルタイム手首・母指可動域測定
 */

'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Hands, Results } from '@mediapipe/hands';
import type { NormalizedLandmark } from '@mediapipe/hands';
import {
  calculateWristAngles,
  calculateThumbAngles,
} from '@/lib/motion-capture/angle-calculator';
import type { AngleData } from '@/stores/measurement-atoms';
import type {
  HandType,
  CreateMeasurementInput,
} from '@/lib/data-manager/models/motion-measurement';
import { createMeasurement } from '@/lib/data-manager/models/motion-measurement';
import { db, initializeDatabase } from '@/lib/data-manager/database';
import styles from './page.module.scss';

/**
 * 測定ステップの型定義
 */
type MeasurementStep = 'setup' | 'measuring';

/**
 * 測定フェーズの型定義
 */
type MeasurementPhase = 'flexion' | 'extension' | 'ulnarDeviation' | 'radialDeviation';

/**
 * 測定部位の型定義
 */
type MeasurementPart = 'wrist' | 'thumb' | 'finger' | 'elbow';

/**
 * 測定セットアップ状態
 */
interface MeasurementSetup {
  selectedHand: HandType;
  selectedParts: MeasurementPart[];
  cameraReady: boolean;
  step: MeasurementStep;
}

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

/**
 * カメラプレビューコンポーネント
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
 * 角度オーバーレイコンポーネント
 */
const AngleOverlay: React.FC<{
  canvasRef: React.RefObject<HTMLCanvasElement>;
  videoRef: React.RefObject<HTMLVideoElement>;
  hands: Hands | null;
  isCapturing: boolean;
  selectedHand: HandType;
  onAnglesUpdate: (angles: AngleData | null) => void;
  onHandDetected: (detected: boolean) => void;
}> = ({
  canvasRef,
  videoRef,
  hands,
  isCapturing,
  selectedHand,
  onAnglesUpdate,
  onHandDetected,
}) => {
  const animationFrameRef = useRef<number>();
  const detectionAreaRef = useRef<DetectionArea>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });

  /**
   * 手のランドマークを描画
   */
  const drawHandLandmarks = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      landmarks: NormalizedLandmark[],
      canvasWidth: number,
      canvasHeight: number
    ) => {
      // 関節点の描画
      landmarks.forEach((landmark, index) => {
        const x = landmark.x * canvasWidth;
        const y = landmark.y * canvasHeight;

        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);

        // 関節別の色分け
        if (index < 5) {
          ctx.fillStyle = '#ff6b6b'; // 親指
        } else if (index < 9) {
          ctx.fillStyle = '#4ecdc4'; // 人差し指
        } else if (index < 13) {
          ctx.fillStyle = '#45b7d1'; // 中指
        } else if (index < 17) {
          ctx.fillStyle = '#96ceb4'; // 薬指
        } else {
          ctx.fillStyle = '#ffeaa7'; // 小指
        }

        ctx.fill();

        // 関節番号の表示（デバッグ用）
        ctx.fillStyle = '#fff';
        ctx.font = '10px Arial';
        ctx.fillText(index.toString(), x + 5, y - 5);
      });

      // 手の骨格線の描画
      const connections = [
        [0, 1],
        [0, 5],
        [0, 9],
        [0, 13],
        [0, 17], // 手首から各指の根元
        [1, 2],
        [2, 3],
        [3, 4], // 親指
        [5, 6],
        [6, 7],
        [7, 8], // 人差し指
        [9, 10],
        [10, 11],
        [11, 12], // 中指
        [13, 14],
        [14, 15],
        [15, 16], // 薬指
        [17, 18],
        [18, 19],
        [19, 20], // 小指
        [5, 9],
        [9, 13],
        [13, 17], // 手のひら
      ];

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 2;

      connections.forEach(([start, end]) => {
        if (start !== undefined && end !== undefined) {
          const startPoint = landmarks[start];
          const endPoint = landmarks[end];

          if (startPoint && endPoint) {
            ctx.beginPath();
            ctx.moveTo(startPoint.x * canvasWidth, startPoint.y * canvasHeight);
            ctx.lineTo(endPoint.x * canvasWidth, endPoint.y * canvasHeight);
            ctx.stroke();
          }
        }
      });
    },
    []
  );

  /**
   * 検出エリアを描画
   */
  const drawDetectionArea = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      canvasWidth: number,
      canvasHeight: number
    ) => {
      const area = detectionAreaRef.current;
      area.width = canvasWidth * 0.6;
      area.height = canvasHeight * 0.6;
      area.x = (canvasWidth - area.width) / 2;
      area.y = (canvasHeight - area.height) / 2;

      // 検出エリアの枠を描画
      ctx.strokeStyle = '#4ecdc4';
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 5]);
      ctx.strokeRect(area.x, area.y, area.width, area.height);
      ctx.setLineDash([]);

      // 角の装飾
      const cornerSize = 20;
      ctx.strokeStyle = '#4ecdc4';
      ctx.lineWidth = 4;

      // 左上
      ctx.beginPath();
      ctx.moveTo(area.x, area.y + cornerSize);
      ctx.lineTo(area.x, area.y);
      ctx.lineTo(area.x + cornerSize, area.y);
      ctx.stroke();

      // 右上
      ctx.beginPath();
      ctx.moveTo(area.x + area.width - cornerSize, area.y);
      ctx.lineTo(area.x + area.width, area.y);
      ctx.lineTo(area.x + area.width, area.y + cornerSize);
      ctx.stroke();

      // 左下
      ctx.beginPath();
      ctx.moveTo(area.x, area.y + area.height - cornerSize);
      ctx.lineTo(area.x, area.y + area.height);
      ctx.lineTo(area.x + cornerSize, area.y + area.height);
      ctx.stroke();

      // 右下
      ctx.beginPath();
      ctx.moveTo(area.x + area.width - cornerSize, area.y + area.height);
      ctx.lineTo(area.x + area.width, area.y + area.height);
      ctx.lineTo(area.x + area.width, area.y + area.height - cornerSize);
      ctx.stroke();

      // 指示テキスト
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(area.x, area.y - 40, area.width, 30);

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(
        `${selectedHand === 'right' ? '右手' : '左手'}をこの枠内に入れてください`,
        area.x + area.width / 2,
        area.y - 15
      );
      ctx.textAlign = 'left';
    },
    [selectedHand]
  );

  /**
   * 手が検出エリア内にあるかチェック
   */
  const isHandInDetectionArea = useCallback(
    (
      landmarks: NormalizedLandmark[],
      canvasWidth: number,
      canvasHeight: number
    ): boolean => {
      const area = detectionAreaRef.current;

      // 手首の位置（ランドマーク0）で判定
      const wrist = landmarks[0];
      if (!wrist) return false;

      const x = wrist.x * canvasWidth;
      const y = wrist.y * canvasHeight;

      return (
        x >= area.x &&
        x <= area.x + area.width &&
        y >= area.y &&
        y <= area.y + area.height
      );
    },
    []
  );

  /**
   * 角度情報を描画
   */
  const drawAngleInfo = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      angles: AngleData,
      canvasWidth: number,
      canvasHeight: number
    ) => {
      const padding = 20;
      const lineHeight = 25;
      let yOffset = padding;

      // 背景の描画
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(padding - 10, padding - 15, 250, 200);

      // 角度情報のテキスト描画
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px Arial';
      ctx.fillText(
        `${selectedHand === 'right' ? '右手' : '左手'} 測定中`,
        padding,
        yOffset
      );
      yOffset += lineHeight + 5;

      ctx.font = '12px Arial';

      // 手首角度
      ctx.fillStyle = '#4ecdc4';
      ctx.fillText('手首角度:', padding, yOffset);
      yOffset += lineHeight;

      ctx.fillStyle = '#fff';
      ctx.fillText(
        `屈曲: ${angles.wrist.flexion.toFixed(1)}°`,
        padding + 10,
        yOffset
      );
      yOffset += lineHeight - 5;
      ctx.fillText(
        `伸展: ${angles.wrist.extension.toFixed(1)}°`,
        padding + 10,
        yOffset
      );
      yOffset += lineHeight - 5;
      ctx.fillText(
        `橈屈: ${angles.wrist.radialDeviation.toFixed(1)}°`,
        padding + 10,
        yOffset
      );
      yOffset += lineHeight - 5;
      ctx.fillText(
        `尺屈: ${angles.wrist.ulnarDeviation.toFixed(1)}°`,
        padding + 10,
        yOffset
      );
      yOffset += lineHeight + 5;

      // 母指角度
      ctx.fillStyle = '#ff6b6b';
      ctx.fillText('母指角度:', padding, yOffset);
      yOffset += lineHeight;

      ctx.fillStyle = '#fff';
      ctx.fillText(
        `屈曲: ${angles.thumb.flexion.toFixed(1)}°`,
        padding + 10,
        yOffset
      );
      yOffset += lineHeight - 5;
      ctx.fillText(
        `伸展: ${angles.thumb.extension.toFixed(1)}°`,
        padding + 10,
        yOffset
      );
      yOffset += lineHeight - 5;
      ctx.fillText(
        `外転: ${angles.thumb.abduction.toFixed(1)}°`,
        padding + 10,
        yOffset
      );
      yOffset += lineHeight - 5;
      ctx.fillText(
        `内転: ${angles.thumb.adduction.toFixed(1)}°`,
        padding + 10,
        yOffset
      );
    },
    [selectedHand]
  );

  /**
   * MediaPipeの結果処理
   */
  const handleResults = useCallback(
    (results: Results) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Canvasをクリア
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 検出エリアを描画
      drawDetectionArea(ctx, canvas.width, canvas.height);

      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];

        if (landmarks) {
          // 手が検出エリア内にあるかチェック
          const inDetectionArea = isHandInDetectionArea(
            landmarks as NormalizedLandmark[],
            canvas.width,
            canvas.height
          );

          if (inDetectionArea) {
            onHandDetected(true);

            // 手のランドマークを描画
            drawHandLandmarks(
              ctx,
              landmarks as NormalizedLandmark[],
              canvas.width,
              canvas.height
            );

            try {
              // 角度計算（型変換を追加）
              const wristAngles = calculateWristAngles(landmarks as any);
              const thumbAngles = calculateThumbAngles(landmarks as any);

              const angleData: AngleData = {
                wrist: wristAngles,
                thumb: thumbAngles,
              };

              // 角度情報を描画
              drawAngleInfo(ctx, angleData, canvas.width, canvas.height);

              // 親コンポーネントに角度データを通知
              onAnglesUpdate(angleData);
            } catch (error) {
              console.error('角度計算エラー:', error);
              onAnglesUpdate(null);
            }
          } else {
            // 手は検出されているが、エリア外
            onHandDetected(false);
            onAnglesUpdate(null);

            // 警告メッセージ
            ctx.fillStyle = 'rgba(255, 165, 0, 0.8)';
            ctx.fillRect(0, canvas.height - 60, canvas.width, 60);

            ctx.fillStyle = '#fff';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(
              '手を枠内に移動してください',
              canvas.width / 2,
              canvas.height - 30
            );
            ctx.textAlign = 'left';
          }
        }
      } else {
        // 手が検出されない
        onHandDetected(false);
        onAnglesUpdate(null);

        // 検出待ちメッセージ
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, canvas.height - 60, canvas.width, 60);

        ctx.fillStyle = '#fff';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(
          `${selectedHand === 'right' ? '右手' : '左手'}を画面内に入れてください`,
          canvas.width / 2,
          canvas.height - 30
        );
        ctx.textAlign = 'left';
      }
    },
    [
      canvasRef,
      drawDetectionArea,
      isHandInDetectionArea,
      drawHandLandmarks,
      drawAngleInfo,
      onHandDetected,
      onAnglesUpdate,
      selectedHand,
    ]
  );

  /**
   * アニメーションループ
   */
  const processFrame = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || !hands || !isCapturing) {
      return;
    }

    // Canvasサイズをビデオに合わせる
    if (
      canvas.width !== video.videoWidth ||
      canvas.height !== video.videoHeight
    ) {
      canvas.width = video.videoWidth || video.clientWidth;
      canvas.height = video.videoHeight || video.clientHeight;
    }

    try {
      // MediaPipeで手の検出を実行
      await hands.send({ image: video });
    } catch (error) {
      console.error('MediaPipe処理エラー:', error);
    }

    // 次のフレームをスケジュール
    if (isCapturing) {
      animationFrameRef.current = requestAnimationFrame(processFrame);
    }
  }, [videoRef, canvasRef, hands, isCapturing]);

  /**
   * MediaPipe結果ハンドラーの設定
   */
  useEffect(() => {
    if (hands) {
      hands.onResults(handleResults);
    }
  }, [hands, handleResults]);

  /**
   * 測定開始/停止時のアニメーション制御
   */
  useEffect(() => {
    if (isCapturing) {
      processFrame();
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      // Canvasをクリア
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isCapturing, processFrame]);

  return <canvas ref={canvasRef} className={styles.angleOverlay} />;
};

/**
 * メイン測定ページコンポーネント
 */
const MeasurementPage: React.FC = () => {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // フェーズ定義
  const MEASUREMENT_PHASES: PhaseInfo[] = [
    {
      id: 'flexion',
      name: '掌屈',
      description: '手のひらを下に向けて曲げてください',
      targetAngle: 'flexion',
      normalRange: { min: 0, max: 90 },
      instruction: '手首を手のひら側に最大まで曲げてください（正常関節可動域 : 90°）',
    },
    {
      id: 'extension',
      name: '背屈',
      description: '手の甲を上に向けて反らしてください',
      targetAngle: 'extension',
      normalRange: { min: 0, max: 70 },
      instruction: '手首を手の甲側に最大まで反らしてください（正常関節可動域 : 70°）',
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

  // 状態管理
  const [selectedHand, setSelectedHand] = useState<HandType>('right');
  const [measurementState, setMeasurementState] = useState<MeasurementState>({
    isCapturing: false,
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

  // 精度の移動平均用の履歴
  const accuracyHistoryRef = useRef<number[]>([]);
  const ACCURACY_HISTORY_SIZE = 10; // 過去10フレームの平均を取る

  /**
   * MediaPipeの初期化
   */
  const initializeMediaPipe = useCallback(async () => {
    try {
      const handsDetector = new Hands({
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });

      handsDetector.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.5,
      });

      setHands(handsDetector);
      setMediaPipeReady(true);
      console.log('MediaPipe初期化完了');
    } catch (error) {
      console.error('MediaPipe初期化エラー:', error);
      setCameraError('AI手首検出の初期化に失敗しました');
    }
  }, []);

  /**
   * カメラアクセスの初期化
   */
  const initializeCamera = useCallback(async () => {
    try {
      const constraints = {
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setCameraStream(stream);
      setCameraReady(true);
      setCameraError(null);
      console.log('カメラアクセス成功');
    } catch (error) {
      console.error('カメラアクセスエラー:', error);
      setCameraError('カメラへのアクセスが拒否されました');
    }
  }, []);

  /**
   * 角度データの更新
   */
  const handleAnglesUpdate = useCallback((angles: AngleData | null) => {
    const rawAccuracy = angles ? calculateMeasurementAccuracy(angles) : 0;

    // 精度の移動平均を計算
    accuracyHistoryRef.current.push(rawAccuracy);
    if (accuracyHistoryRef.current.length > ACCURACY_HISTORY_SIZE) {
      accuracyHistoryRef.current.shift();
    }

    const smoothedAccuracy =
      accuracyHistoryRef.current.reduce((sum, acc) => sum + acc, 0) /
      accuracyHistoryRef.current.length;

    setMeasurementState((prev) => ({
      ...prev,
      currentAngles: angles,
      accuracy: smoothedAccuracy,
      lastUpdateTime: Date.now(),
    }));
  }, []);

  /**
   * 精度履歴をリセット
   */
  const resetAccuracyHistory = useCallback(() => {
    accuracyHistoryRef.current = [];
  }, []);

  /**
   * 測定精度を計算
   */
  const calculateMeasurementAccuracy = useCallback(
    (angles: AngleData): number => {
      if (!angles) return 0;

      // 各角度の有効性と信頼度を評価
      const wristValidityScore =
        (isValidAngleRange(angles.wrist.flexion, 0, 90) ? 0.25 : 0) +
        (isValidAngleRange(angles.wrist.extension, 0, 70) ? 0.25 : 0) +
        (isValidAngleRange(angles.wrist.radialDeviation, 0, 25) ? 0.25 : 0) +
        (isValidAngleRange(angles.wrist.ulnarDeviation, 0, 45) ? 0.25 : 0);

      const thumbValidityScore =
        (isValidAngleRange(angles.thumb.flexion, 0, 90) ? 0.25 : 0) +
        (isValidAngleRange(angles.thumb.extension, 0, 50) ? 0.25 : 0) +
        (isValidAngleRange(angles.thumb.abduction, 0, 60) ? 0.25 : 0) +
        (isValidAngleRange(angles.thumb.adduction, 0, 30) ? 0.25 : 0);

      // 手の検出安定性（検出状態が継続している時間）
      const detectionStabilityScore = measurementState.handDetected ? 0.2 : 0;

      // 角度の一貫性評価（急激な変化がないか）
      const consistencyScore = 0.1; // 基本的な一貫性スコア

      // 検出エリア内での手の位置安定性
      const positionStabilityScore = measurementState.handDetected ? 0.2 : 0;

      // 総合精度計算（0-1の範囲）
      const totalAccuracy =
        (wristValidityScore + thumbValidityScore) * 0.5 + // 角度の有効性 50%
        detectionStabilityScore + // 検出安定性 20%
        consistencyScore + // 一貫性 10%
        positionStabilityScore; // 位置安定性 20%

      // 0から1の範囲でクランプし、パーセンテージに変換しない（0-1のまま保持）
      return Math.min(Math.max(totalAccuracy, 0.3), 0.95); // 最低30%、最高95%
    },
    [measurementState.handDetected]
  );

  /**
   * 角度が有効な範囲内かチェック
   */
  const isValidAngleRange = useCallback(
    (angle: number, min: number, max: number): boolean => {
      return !isNaN(angle) && angle >= min && angle <= max;
    },
    []
  );

  /**
   * 手の検出状態の更新
   */
  const handleHandDetected = useCallback(
    (detected: boolean) => {
      setMeasurementState((prev) => {
        // 手が検出されなくなった場合は精度を0にリセット
        if (!detected) {
          resetAccuracyHistory();
        }

        return {
          ...prev,
          handDetected: detected,
          accuracy: detected ? prev.accuracy : 0,
        };
      });
    },
    [resetAccuracyHistory]
  );

  /**
   * 測定開始/停止
   */
  const handleCaptureToggle = useCallback(() => {
    setMeasurementState((prev) => {
      const newIsCapturing = !prev.isCapturing;

      // 測定開始時に精度履歴をリセット
      if (newIsCapturing) {
        resetAccuracyHistory();
      }

      return {
        ...prev,
        isCapturing: newIsCapturing,
      };
    });
  }, [resetAccuracyHistory]);

  /**
   * 手の選択変更
   */
  const handleHandChange = useCallback((hand: HandType) => {
    setSelectedHand(hand);
  }, []);

  /**
   * 測定結果の保存
   */
  const handleSaveMeasurement = useCallback(async () => {
    if (!measurementState.currentAngles) {
      alert('測定データがありません');
      return;
    }

    try {
      // データベースに保存するための測定データを準備
      const measurementInput: CreateMeasurementInput = {
        userId: 'default-user', // 実際の実装ではログインユーザーIDを使用
        measurementDate: new Date(),
        handUsed: selectedHand,
        wristFlexion: measurementState.currentAngles.wrist.flexion,
        wristExtension: measurementState.currentAngles.wrist.extension,
        wristUlnarDeviation:
          measurementState.currentAngles.wrist.ulnarDeviation || 0,
        wristRadialDeviation:
          measurementState.currentAngles.wrist.radialDeviation || 0,
        thumbFlexion: measurementState.currentAngles.thumb.flexion || 0,
        thumbExtension: measurementState.currentAngles.thumb.extension || 0,
        thumbAdduction: measurementState.currentAngles.thumb.adduction || 0,
        thumbAbduction: measurementState.currentAngles.thumb.abduction,
        accuracyScore: measurementState.accuracy / 100, // パーセントから0-1の範囲に変換
      };

      // データベースに測定結果を保存
      const measurementData = createMeasurement(measurementInput);
      await db.measurements.add(measurementData);

      // 保存後の確認
      const allMeasurements = await db.measurements.toArray();
      console.log('測定結果が保存されました:', measurementData);
      console.log('全測定データ:', allMeasurements);

      alert(`測定結果を保存しました (ID: ${measurementData.id})`);

      // 進捗ページに移動
      router.push('/progress');
    } catch (error) {
      console.error('測定結果の保存に失敗:', error);
      alert('測定結果の保存に失敗しました。もう一度お試しください。');
    }
  }, [measurementState, selectedHand, router]);

  /**
   * リセット
   */
  const handleReset = useCallback(() => {
    resetAccuracyHistory();
    setMeasurementState((prev) => ({
      ...prev,
      isCapturing: false,
      currentAngles: null,
      accuracy: 0,
      handDetected: false,
      currentPhase: 'flexion',
      phaseResults: {
        flexion: 0,
        extension: 0,
        ulnarDeviation: 0,
        radialDeviation: 0,
      },
      isPhaseComplete: false,
    }));
  }, [resetAccuracyHistory]);

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
  }, [measurementState.currentPhase, MEASUREMENT_PHASES]);

  /**
   * 測定完了処理
   */
  const handleCompleteMeasurement = useCallback(async () => {
    await handleSaveMeasurement();
  }, [handleSaveMeasurement]);

  /**
   * 現在の角度を取得（フェーズに応じて）
   */
  const getCurrentAngle = useCallback(() => {
    if (!measurementState.currentAngles?.wrist) return 0;
    
    const currentPhase = MEASUREMENT_PHASES.find(
      (phase) => phase.id === measurementState.currentPhase
    );
    
    if (!currentPhase) return 0;
    
    return measurementState.currentAngles.wrist[currentPhase.targetAngle] || 0;
  }, [measurementState.currentAngles, measurementState.currentPhase, MEASUREMENT_PHASES]);

  /**
   * フェーズプログレス計算
   */
  const getPhaseProgress = useCallback(() => {
    const currentPhaseIndex = MEASUREMENT_PHASES.findIndex(
      (phase) => phase.id === measurementState.currentPhase
    );
    return ((currentPhaseIndex + 1) / MEASUREMENT_PHASES.length) * 100;
  }, [measurementState.currentPhase, MEASUREMENT_PHASES]);

  /**
   * 最終フェーズかチェック
   */
  const isLastPhase = useCallback(() => {
    const currentPhaseIndex = MEASUREMENT_PHASES.findIndex(
      (phase) => phase.id === measurementState.currentPhase
    );
    return currentPhaseIndex === MEASUREMENT_PHASES.length - 1;
  }, [measurementState.currentPhase, MEASUREMENT_PHASES]);

  /**
   * 初期化処理
   */
  useEffect(() => {
    const initialize = async () => {
      try {
        await initializeDatabase();
        console.log('データベースが初期化されました');
      } catch (error) {
        console.error('データベース初期化エラー:', error);
      }

      initializeCamera();
      initializeMediaPipe();
    };

    initialize();

    return () => {
      // クリーンアップ
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [initializeCamera, initializeMediaPipe]);

  const currentPhaseInfo = MEASUREMENT_PHASES.find(
    (phase) => phase.id === measurementState.currentPhase
  );

  return (
    <div className={styles.measurementPage}>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>
          <span className={styles.titleIcon}>📏</span>
          可動域測定 - フェーズベース測定
        </h1>
      </div>

      <div className={styles.content}>
        <div className={styles.cameraSection}>
          <div className={styles.cameraContainer}>
            <CameraPreview
              videoRef={videoRef}
              stream={cameraStream}
              isReady={cameraReady && mediaPipeReady}
              error={cameraError}
            />

            {cameraReady && mediaPipeReady && (
              <AngleOverlay
                canvasRef={canvasRef}
                videoRef={videoRef}
                hands={hands}
                isCapturing={measurementState.isCapturing}
                selectedHand={selectedHand}
                onAnglesUpdate={handleAnglesUpdate}
                onHandDetected={handleHandDetected}
              />
            )}
          </div>

          <div className={styles.statusIndicator}>
            <div
              className={`${styles.statusItem} ${cameraReady ? styles.ready : styles.notReady}`}
            >
              📷 カメラ: {cameraReady ? '準備完了' : '準備中...'}
            </div>
            <div
              className={`${styles.statusItem} ${mediaPipeReady ? styles.ready : styles.notReady}`}
            >
              🤖 AI検出: {mediaPipeReady ? '準備完了' : '準備中...'}
            </div>
            <div
              className={`${styles.statusItem} ${measurementState.handDetected ? styles.detecting : styles.notDetecting}`}
            >
              ✋ 手の検出: {measurementState.handDetected ? '検出中' : '未検出'}
            </div>
          </div>
        </div>

        <div className={styles.controlsSection}>
          {/* フェーズベース測定UI */}
          {currentPhaseInfo && measurementState.isCapturing && (
            <PhaseDisplay
              currentPhase={currentPhaseInfo}
              currentAngle={getCurrentAngle()}
              phaseProgress={getPhaseProgress()}
              totalPhases={MEASUREMENT_PHASES.length}
              currentPhaseNumber={MEASUREMENT_PHASES.findIndex(p => p.id === measurementState.currentPhase) + 1}
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

          {/* 測定開始前のコントロール */}
          {!measurementState.isCapturing && (
            <MeasurementControls
              selectedHand={selectedHand}
              isCapturing={measurementState.isCapturing}
              isReady={cameraReady && mediaPipeReady}
              accuracy={measurementState.accuracy}
              isSaving={false}
              onStartMeasurement={handleCaptureToggle}
              onStopMeasurement={handleCaptureToggle}
              onSaveMeasurement={handleSaveMeasurement}
              onHandSelection={handleHandChange}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default MeasurementPage;
