/**
 * 測定画面 - メイン測定ページ
 * 添付画像のUIに合わせた測定開始画面
 */

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.scss';
import {
  db,
  MeasurementSession as DBMeasurementSession,
  MeasurementResult as DBMeasurementResult,
} from '@/lib/database/measurement-db';
import {
  calculateWristAngle,
  validateLandmarks,
  Point3D,
} from '@/lib/utils/angle-calculator';
import { useMeasurementService } from '@/hooks/useMeasurementService';
import {
  createMeasurement,
  CreateMeasurementInput,
} from '@/lib/data-manager/models/motion-measurement';

/**
 * MediaPipe 型定義
 */
interface Hands {
  setOptions(options: any): void;
  onResults(callback: (results: any) => void): void;
  send(data: { image: HTMLVideoElement }): Promise<void>;
  close(): void;
}

interface MediaPipeHands {
  Hands: new (config: any) => Hands;
}

/**
 * 手のランドマーク座標
 */
interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

/**
 * 測定結果データ
 */
interface MeasurementResult {
  id: string;
  timestamp: number;
  hand: HandSelection;
  stepId: string;
  stepName: string;
  angle: number;
  targetAngle: number;
  isCompleted: boolean;
  landmarks?: Array<{ x: number; y: number; z: number }>;
}

/**
 * 測定セッション
 */
export interface MeasurementSession {
  id?: number;
  sessionId: string;
  startTime: number;
  endTime?: number;
  hand: 'left' | 'right';
  isCompleted: boolean;
  totalSteps: number;
  completedSteps: number;
}

/**
 * カメラセットアップ状態
 */
interface CameraState {
  stream: MediaStream | null;
  isReady: boolean;
  error: string | null;
}

/**
 * 手の選択
 */
type HandSelection = 'left' | 'right';

/**
 * 測定フェーズ
 */
type MeasurementPhase = 'preparation' | 'measuring' | 'complete';

/**
 * 測定ステップ
 */
interface MeasurementStep {
  id: string;
  name: string;
  instruction: string;
  description: string;
  targetAngle: number;
}

/**
 * 画面表示ステップ
 */
type DisplayStep = 'instructions' | 'selection' | 'measurement';

/**
 * 測定セットアップ状態
 */
interface MeasurementSetup {
  selectedHand: HandSelection | null;
  currentStep: DisplayStep;
  currentMeasurementStep: number;
  currentAngle: number;
  phase: MeasurementPhase;
  sessionId: string | null;
  mediaPipeReady: boolean;
  isCapturing: boolean;
  countdown: number | null;
  isPhotoTaken: boolean;
}

/**
 * 測定ステップ定義
 */
const measurementSteps: MeasurementStep[] = [
  {
    id: 'palmar-flexion',
    name: '掌屈',
    instruction: '手のひら側に手首を曲げてください',
    description: '手首を手のひら側に最大まで曲げてください（0-90°）',
    targetAngle: 90,
  },
  {
    id: 'dorsal-flexion',
    name: '背屈',
    instruction: '手の甲側に手首を曲げてください',
    description: '手首を手の甲側に最大まで曲げてください（0-70°）',
    targetAngle: 70,
  },
  {
    id: 'ulnar-deviation',
    name: '尺屈',
    instruction: '小指側に手首を曲げてください',
    description: '手首を小指側に最大まで曲げてください',
    targetAngle: 55,
  },
  {
    id: 'radial-deviation',
    name: '橈屈',
    instruction: '親指側に手首を曲げてください',
    description: '手首を親指側に最大まで曲げてください',
    targetAngle: 25,
  },
];

/**
 * 説明セクションコンポーネント
 */
const InstructionsSection: React.FC<{
  onNext: () => void;
}> = ({ onNext }) => {
  return (
    <div className={styles.instructionsSection}>
      <div className={styles.instructionsBody}>
        <h1 className={styles.title}>説明</h1>

        <div className={styles.instructionsContent}>
          <div className={styles.instructionItem}>
            <div className={styles.stepHeader}>
              <div className={styles.stepNumber}>1</div>
              <h3 className={styles.stepTitle}>準備</h3>
            </div>
            <p className={styles.stepDescription}>
              明るい場所で、手首と親指がはっきり映るように撮影してください。
              <br />
              時計や指輪は外し、スマホやPCは固定して映しましょう。
              <br />
            </p>
          </div>

          <div className={styles.instructionItem}>
            <div className={styles.stepHeader}>
              <div className={styles.stepNumber}>2</div>
              <h3 className={styles.stepTitle}>姿勢</h3>
            </div>
            <p className={styles.stepDescription}>
              椅子に座り、腕を机などで安定させます。カメラから40～70cm離れ、
              <br />
              手首から指先までを正面から画面に収めてください。
              <br />
            </p>
          </div>

          <div className={styles.instructionItem}>
            <div className={styles.stepHeader}>
              <div className={styles.stepNumber}>3</div>
              <h3 className={styles.stepTitle}>測定動作</h3>
            </div>
            <p className={styles.stepDescription}>
              画面の指示に従い、手首(掌屈・背屈・尺屈・橈屈）をゆっくり最大まで動かしてください。
              <br />
              測定中はカメラから手が外れないよう注意してください。
            </p>
          </div>

          <div className={styles.instructionItem}>
            <div className={styles.stepHeader}>
              <div className={styles.stepNumber}>4</div>
              <h3 className={styles.stepTitle}>注意点</h3>
            </div>
            <p className={styles.stepDescription}>
              手ブレは測定精度を下げます。強い痛みがあれば中止し、値がずれたら再測定してください。
              <br />
              うまく測れない場合はガイダンスを確認してください。
            </p>
          </div>
        </div>
      </div>
      {/* 次へボタン - instructionsContentの外に移動 */}
      <div className={styles.instructionsNext}>
        <button className={styles.nextButton} onClick={onNext}>
          測定へ進む →
        </button>
      </div>
    </div>
  );
};

/**
 * 手首選択コンポーネント
 */
const HandSelectionSection: React.FC<{
  selectedHand: HandSelection | null;
  onHandSelect: (hand: HandSelection) => void;
}> = ({ selectedHand, onHandSelect }) => {
  return (
    <div className={styles.handSelectionSection}>
      <h2 className={styles.selectionTitle}>
        測定部位を選択してください
        <span className={styles.selectionNote}> *どちらか選択してください</span>
      </h2>

      <div className={styles.handCards}>
        <div
          className={`${styles.handCard} ${selectedHand === 'right' ? styles.selected : ''}`}
          onClick={() => onHandSelect('right')}
        >
          <h3 className={styles.handTitle}>右手首</h3>
          <p className={styles.handDescription}>右手首の可動域を測定します</p>
          <div className={styles.movementTags}>
            <span className={styles.tag}>掌屈</span>
            <span className={styles.tag}>背屈</span>
            <span className={styles.tag}>尺屈</span>
            <span className={styles.tag}>橈屈</span>
          </div>
        </div>

        <div
          className={`${styles.handCard} ${selectedHand === 'left' ? styles.selected : ''}`}
          onClick={() => onHandSelect('left')}
        >
          <h3 className={styles.handTitle}>左手首</h3>
          <p className={styles.handDescription}>左手首の可動域を測定します</p>
          <div className={styles.movementTags}>
            <span className={styles.tag}>掌屈</span>
            <span className={styles.tag}>背屈</span>
            <span className={styles.tag}>尺屈</span>
            <span className={styles.tag}>橈屈</span>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * 測定実行画面コンポーネント
 */
const MeasurementExecution: React.FC<{
  setup: MeasurementSetup;
  onBack: () => void;
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  onNextStep: () => void;
  onStopMeasurement: () => void;
  onStartCapture: () => void;
  onRetake: () => void;
}> = ({
  setup,
  onBack,
  videoRef,
  canvasRef,
  onNextStep,
  onStopMeasurement,
  onStartCapture,
  onRetake,
}) => {
  const currentStep = measurementSteps[setup.currentMeasurementStep];

  if (!currentStep) {
    return <div>測定ステップが見つかりません</div>;
  }

  return (
    <div className={styles.measurementExecution}>
      {/* 測定部位タグ */}
      <div className={styles.measurementTags}>
        {measurementSteps.map((step, index) => (
          <span
            key={step.id}
            className={`${styles.measurementTag} ${
              index === setup.currentMeasurementStep ? styles.active : ''
            } ${index < setup.currentMeasurementStep ? styles.completed : ''}`}
          >
            {step.name}
          </span>
        ))}
      </div>

      {/* 現在のステップ表示 */}
      <div className={styles.currentStep}>
        <h2 className={styles.stepLabel}>
          step{setup.currentMeasurementStep + 1}. {currentStep.name}
        </h2>
      </div>

      {/* ビデオとキャンバス - MediaPipe用（非表示） */}
      <div className={styles.hiddenVideoContainer}>
        <video
          ref={videoRef}
          className={styles.hiddenVideo}
          autoPlay
          playsInline
          muted
          style={{ transform: 'scaleX(-1)' }} // ミラー表示
        />
        <canvas
          ref={canvasRef}
          className={styles.hiddenCanvas}
          style={{ transform: 'scaleX(-1)' }} // ミラー表示に合わせる
        />
      </div>

      {/* 角度表示 */}
      <div className={styles.angleDisplay}>
        <span className={styles.angleValue}>{setup.currentAngle}°</span>
      </div>

      {/* 指示テキスト */}
      <div className={styles.instructionText}>
        <p className={styles.mainInstruction}>{currentStep.instruction}</p>
        <p className={styles.subInstruction}>{currentStep.description}</p>
        <div className={styles.statusContainer}>
          {!setup.mediaPipeReady ? (
            <p className={styles.loadingStatus}>MediaPipe初期化中...</p>
          ) : setup.currentAngle > 0 ? (
            <p className={styles.detectedStatus}>✓ 手を検出中 - 測定中</p>
          ) : (
            <p className={styles.waitingStatus}>手をカメラに向けてください</p>
          )}
        </div>
      </div>

      {/* コントロールボタン */}
      <div className={styles.controls}>
        <button className={styles.stopButton} onClick={onStopMeasurement}>
          測定終了
        </button>
        {!setup.isPhotoTaken ? (
          <button
            className={styles.nextPhaseButton}
            onClick={onStartCapture}
            disabled={setup.countdown !== null}
          >
            {setup.countdown !== null
              ? `撮影中... ${setup.countdown}`
              : '撮影する'}
          </button>
        ) : (
          <>
            <button className={styles.nextPhaseButton} onClick={onRetake}>
              撮り直す
            </button>
            <button className={styles.nextPhaseButton} onClick={onNextStep}>
              {setup.currentMeasurementStep < measurementSteps.length - 1
                ? '次のフェーズ'
                : '完了'}
            </button>
          </>
        )}
      </div>

      {/* 戻るボタン */}
      <button className={styles.backButton} onClick={onBack}>
        ← 戻る
      </button>
    </div>
  );
};

/**
 * 測定情報コンポーネント
 */
const MeasurementInfoSection: React.FC<{
  selectedHand: HandSelection | null;
  onCameraTest: () => void;
  onStartMeasurement: () => void;
}> = ({ selectedHand, onCameraTest, onStartMeasurement }) => {
  return (
    <div className={styles.measurementInfoSection}>
      <h2 className={styles.infoSectionTitle}>測定について</h2>

      <div className={styles.infoGrid}>
        <div className={styles.infoItem}>
          <h3 className={styles.infoItemTitle}>所要時間</h3>
          <p className={styles.infoItemText}>各部位約3〜5分程度</p>
        </div>

        <div className={styles.infoItem}>
          <h3 className={styles.infoItemTitle}>準備</h3>
          <p className={styles.infoItemText}>
            カメラが使用できる環境でご利用ください
          </p>
        </div>

        <div className={styles.infoItem}>
          <h3 className={styles.infoItemTitle}>測定方法</h3>
          <p className={styles.infoItemText}>
            画面の指示に従って手を動かすだけ
          </p>
        </div>
      </div>

      {/* ボタンセクション */}
      <div className={styles.bottomSection}>
        <button className={styles.testButton} onClick={onCameraTest}>
          カメラをテストする
        </button>
        <button
          className={styles.startButton}
          onClick={onStartMeasurement}
          disabled={!selectedHand}
        >
          測定へ進む →
        </button>
      </div>
    </div>
  );
};

/**
 * カメラプレビューコンポーネント
 */
const CameraPreview: React.FC<{
  cameraState: CameraState;
  isInactive?: boolean;
  videoRef?: React.RefObject<HTMLVideoElement>;
  canvasRef?: React.RefObject<HTMLCanvasElement>;
}> = ({ cameraState, isInactive = false, videoRef, canvasRef }) => {
  if (cameraState.error) {
    return (
      <div className={styles.cameraError}>
        <div className={styles.errorMessage}>カメラアクセスに失敗しました</div>
      </div>
    );
  }

  return (
    <div
      className={`${styles.cameraContainer} ${isInactive ? styles.inactive : ''}`}
    >
      {/* 背景カメラ（UI装飾用・引き延ばし） */}
      {cameraState.isReady && cameraState.stream && (
        <video
          className={styles.backgroundCameraVideo}
          autoPlay
          playsInline
          muted
          ref={(video) => {
            if (video && cameraState.stream && !videoRef) {
              video.srcObject = cameraState.stream;
            }
          }}
        />
      )}

      {/* 点線の枠（absolute配置） */}
      <div className={styles.dashedFrame}></div>

      {/* 指示テキスト - アクティブ時のみ表示 */}
      {!isInactive && (
        <div className={styles.frameInstruction}>枠内に手を入れてください</div>
      )}

      <div className={styles.cameraFrame}>
        <div className={styles.frameInner}>
          {cameraState.isReady ? (
            <>
              {/* 測定用カメラ（適切なアスペクト比保持） */}
              <video
                className={styles.measurementCameraVideo}
                autoPlay
                playsInline
                muted
                ref={
                  videoRef ||
                  ((video) => {
                    // videoRefが渡されていない場合のみ、独自にストリーム設定
                    if (video && cameraState.stream && !videoRef) {
                      video.srcObject = cameraState.stream;
                    }
                  })
                }
              />
              {/* 測定用キャンバス（MediaPipe描画用） */}
              {canvasRef && (
                <canvas
                  ref={canvasRef}
                  className={styles.measurementCanvas}
                  style={{ transform: 'scaleX(-1)' }} // ミラー表示に合わせる
                />
              )}
            </>
          ) : (
            <div className={styles.cameraPlaceholder}>
              <span>カメラ準備中...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * 測定結果表示コンポーネント
 */
const MeasurementResultSection: React.FC<{
  results: DBMeasurementResult[];
  onSave: () => void;
  onRetry: () => void;
}> = ({ results, onSave, onRetry }) => {
  // 各ステップの最大角度を計算
  const maxAngles = measurementSteps.map((step) => {
    const stepResults = results.filter((r) => r.stepId === step.id);
    if (stepResults.length === 0) {
      return { name: step.name, angle: 0 };
    }
    const maxAngle = Math.max(...stepResults.map((r) => r.angle));
    return { name: step.name, angle: Math.round(maxAngle) };
  });

  return (
    <div className={styles.resultSection}>
      <h1 className={styles.resultTitle}>測定結果</h1>
      <div className={styles.resultSummary}>
        {maxAngles.map((result) => (
          <div key={result.name} className={styles.resultItem}>
            <span className={styles.resultName}>{result.name}</span>
            <span className={styles.resultAngle}>{result.angle}°</span>
          </div>
        ))}
      </div>
      <div className={styles.resultControls}>
        <button className={styles.retryButton} onClick={onRetry}>
          最初からやり直す
        </button>
        <button className={styles.saveButton} onClick={onSave}>
          結果を保存して終了
        </button>
      </div>
    </div>
  );
};

/**
 * メイン測定ページコンポーネント
 */
const MeasurementPage: React.FC = () => {
  const router = useRouter();
  const { saveMotionMeasurement } = useMeasurementService();

  const [measurementResults, setMeasurementResults] = useState<
    DBMeasurementResult[]
  >([]);

  // 測定セットアップ状態管理
  const [setup, setSetup] = useState<MeasurementSetup>({
    selectedHand: null,
    currentStep: 'instructions',
    currentMeasurementStep: 0,
    currentAngle: 0,
    phase: 'preparation',
    sessionId: null,
    mediaPipeReady: false,
    isCapturing: false,
    countdown: null,
    isPhotoTaken: false,
  });

  // カメラ状態管理
  const [cameraState, setCameraState] = useState<CameraState>({
    stream: null,
    isReady: false,
    error: null,
  });

  // MediaPipe関連のref
  const videoRef = useRef<HTMLVideoElement>(null);
  const handsRef = useRef<Hands | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();

  // 最後の角度更新時刻
  const lastAngleUpdateRef = useRef<number>(0);

  // 最新のsetup状態を参照するためのref
  const setupRef = useRef(setup);

  // setupRefを常に最新の状態に更新
  useEffect(() => {
    setupRef.current = setup;
  }, [setup]);

  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * ランドマークをキャンバスに描画
   */
  const drawLandmarks = useCallback((results: any) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;

    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // キャンバスのサイズをビデオと合わせる
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    // キャンバスをクリア
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];

      // ランドマークを描画
      ctx.fillStyle = '#FF0000'; // 赤色のドット
      ctx.strokeStyle = '#00FF00'; // 緑色の線
      ctx.lineWidth = 2;

      // 各ランドマークを描画
      landmarks.forEach((landmark: any, index: number) => {
        const x = landmark.x * canvas.width;
        const y = landmark.y * canvas.height;

        // ランドマークの点を描画
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.fill();

        // ランドマークの番号を描画
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '12px Arial';
        ctx.fillText(index.toString(), x + 8, y - 8);
        ctx.fillStyle = '#FF0000';
      });

      // 手の骨格線を描画
      drawHandConnections(ctx, landmarks, canvas.width, canvas.height);
    }
  }, []);

  /**
   * 測定結果をデータベースに保存
   */
  const saveMeasurementToDatabase = useCallback(
    async (angle: number, landmarks: Point3D[]) => {
      const { sessionId, selectedHand, currentMeasurementStep } =
        setupRef.current;
      if (!sessionId || !selectedHand) return;

      const currentStep = measurementSteps[currentMeasurementStep];
      if (!currentStep) return;

      try {
        await db.saveMeasurementResult({
          sessionId: sessionId,
          hand: selectedHand,
          stepId: currentStep.id,
          stepName: currentStep.name,
          angle,
          targetAngle: currentStep.targetAngle,
          isCompleted: false,
          landmarks,
        });
      } catch (error) {
        console.error('測定結果の保存エラー:', error);
      }
    },
    []
  );

  /**
   * 手の検出結果を処理
   */
  const processHandResults = useCallback(
    (results: any) => {
      drawLandmarks(results);

      if (!setupRef.current.isCapturing) {
        return;
      }

      if (
        !results.multiHandLandmarks ||
        results.multiHandLandmarks.length === 0
      ) {
        setSetup((prev) => ({ ...prev, currentAngle: 0 }));
        return;
      }

      const landmarks: Point3D[] = results.multiHandLandmarks[0];

      if (!validateLandmarks(landmarks)) {
        setSetup((prev) => ({ ...prev, currentAngle: 0 }));
        return;
      }

      const currentStep =
        measurementSteps[setupRef.current.currentMeasurementStep];
      if (!currentStep) {
        return;
      }

      const angle = calculateWristAngle(landmarks, currentStep.id);

      const now = performance.now();
      if (now - lastAngleUpdateRef.current > 100) {
        setSetup((prev) => ({
          ...prev,
          currentAngle: Math.round(angle),
        }));
        lastAngleUpdateRef.current = now;

        saveMeasurementToDatabase(angle, landmarks);
      }
    },
    [drawLandmarks, saveMeasurementToDatabase]
  );

  /**
   * MediaPipe Handsの初期化
   */
  const initializeMediaPipe = useCallback(async () => {
    try {
      console.log('MediaPipe初期化開始...');

      // MediaPipeライブラリの動的読み込み
      const { Hands } = await import('@mediapipe/hands');

      if (!videoRef.current) {
        console.error('Video element not found');
        return;
      }

      const hands = new Hands({
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.3, // さらに低い閾値に変更
        minTrackingConfidence: 0.2, // さらに低い閾値に変更
      });

      hands.onResults((results) => {
        if (setupRef.current.currentStep === 'measurement') {
          processHandResults(results);
        }
      });

      handsRef.current = hands;

      setSetup((prev) => ({ ...prev, mediaPipeReady: true }));
      console.log('MediaPipe Hands初期化完了');
    } catch (error) {
      console.error('MediaPipe初期化エラー:', error);
      setSetup((prev) => ({ ...prev, mediaPipeReady: false }));
    }
  }, [processHandResults]);

  /**
   * 手の骨格線を描画
   */
  const drawHandConnections = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      landmarks: any[],
      width: number,
      height: number
    ) => {
      // MediaPipe Handsの接続定義
      const connections: [number, number][] = [
        // 親指
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 4],
        // 人差し指
        [0, 5],
        [5, 6],
        [6, 7],
        [7, 8],
        // 中指
        [0, 9],
        [9, 10],
        [10, 11],
        [11, 12],
        // 薬指
        [0, 13],
        [13, 14],
        [14, 15],
        [15, 16],
        // 小指
        [0, 17],
        [17, 18],
        [18, 19],
        [19, 20],
        // 指の付け根を繋ぐ
        [5, 9],
        [9, 13],
        [13, 17],
      ];

      ctx.strokeStyle = '#00FF00';
      ctx.lineWidth = 2;

      connections.forEach(([start, end]) => {
        if (landmarks[start] && landmarks[end]) {
          const startX = landmarks[start].x * width;
          const startY = landmarks[start].y * height;
          const endX = landmarks[end].x * width;
          const endY = landmarks[end].y * height;

          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.stroke();
        }
      });
    },
    []
  );

  /**
   * 測定セッションを開始
   */
  const startMeasurementSession = useCallback(async () => {
    if (!setup.selectedHand) return;

    try {
      const sessionId = await db.startSession(setup.selectedHand);
      setSetup((prev) => ({
        ...prev,
        sessionId,
        phase: 'measuring',
        isCapturing: true,
      }));
    } catch (error) {
      console.error('セッション開始エラー:', error);
    }
  }, [setup.selectedHand]);

  /**
   * MediaPipeでの検出を開始
   */
  const startMeasurementWithMediaPipe = useCallback(async () => {
    console.log('MediaPipe測定開始');

    if (!handsRef.current || !videoRef.current || !cameraState.stream) {
      console.error(
        'MediaPipe、ビデオ、またはカメラストリームが準備できていません'
      );
      return;
    }

    // ビデオエレメントにストリームを設定
    videoRef.current.srcObject = cameraState.stream;

    // ビデオの読み込みを待つ
    const onVideoLoaded = async () => {
      console.log('ビデオ読み込み完了');

      await startMeasurementSession();
      startDetection();
    };

    videoRef.current.addEventListener('loadeddata', onVideoLoaded, {
      once: true,
    });
  }, [startMeasurementSession, cameraState.stream]);

  /**
   * MediaPipeでの検出を開始
   */
  const startDetection = useCallback(async () => {
    console.log('MediaPipe検出開始');

    if (!handsRef.current || !videoRef.current) {
      console.error('MediaPipeまたはビデオが準備できていません');
      return;
    }

    let frameCount = 0;
    const detectFrame = async () => {
      if (
        videoRef.current &&
        handsRef.current &&
        setupRef.current.currentStep === 'measurement'
      ) {
        try {
          frameCount++;
          if (frameCount % 30 === 0) {
            // 30フレームごとにログ出力
          }

          // MediaPipeに画像を送信
          await handsRef.current.send({ image: videoRef.current });
        } catch (error) {
          console.error('MediaPipe送信エラー:', error);
        }
      } else {
        console.log('検出条件が満たされていません');
      }

      // 測定画面にいる間は常に検出を続ける
      if (setupRef.current.currentStep === 'measurement') {
        animationFrameRef.current = requestAnimationFrame(detectFrame);
      }
    };

    // 最初のフレームを送信
    detectFrame();
  }, []);

  /**
   * 測定を停止
   */
  const stopMeasurement = useCallback(async () => {
    // カメラストリームを停止
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
    }

    // アニメーションフレームをキャンセル
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    if (setupRef.current.sessionId) {
      try {
        // セッションを完了としてマーク
        await db.completeSession(setupRef.current.sessionId);
        // 最終結果を取得
        const finalResults = await db.getSessionResults(
          setupRef.current.sessionId
        );
        setMeasurementResults(finalResults);
      } catch (error) {
        console.error('結果の取得またはセッション完了エラー:', error);
      }
    }

    setSetup((prev) => ({
      ...prev,
      isCapturing: false,
      phase: 'complete',
    }));
  }, []);

  /**
   * 次の測定ステップに進む
   */
  const nextMeasurementStep = useCallback(() => {
    if (setup.currentMeasurementStep < measurementSteps.length - 1) {
      setSetup((prev) => ({
        ...prev,
        currentMeasurementStep: prev.currentMeasurementStep + 1,
        currentAngle: 0,
        isPhotoTaken: false,
        countdown: null,
        isCapturing: true,
      }));
    } else {
      stopMeasurement();
    }
  }, [setup.currentMeasurementStep, stopMeasurement]);

  // MediaPipe初期化のuseEffect
  useEffect(() => {
    if (setup.currentStep === 'measurement' && !setup.mediaPipeReady) {
      initializeMediaPipe();
    }
  }, [setup.currentStep, setup.mediaPipeReady, initializeMediaPipe]);

  // MediaPipe測定開始のuseEffect
  useEffect(() => {
    if (
      setup.currentStep === 'measurement' &&
      setup.mediaPipeReady &&
      cameraState.isReady &&
      !animationFrameRef.current // 既に検出が開始されていない場合のみ
    ) {
      console.log('MediaPipe測定開始の条件を満たしました');
      startMeasurementWithMediaPipe();
    }
  }, [
    setup.currentStep,
    setup.mediaPipeReady,
    cameraState.isReady,
    startMeasurementWithMediaPipe,
  ]);

  // ビデオ読み込み完了時にキャンバスサイズを調整
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) return;

    const handleVideoLoaded = () => {
      console.log('ビデオ読み込み完了、キャンバスサイズを調整');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
    };

    video.addEventListener('loadedmetadata', handleVideoLoaded);
    video.addEventListener('loadeddata', handleVideoLoaded);

    return () => {
      video.removeEventListener('loadedmetadata', handleVideoLoaded);
      video.removeEventListener('loadeddata', handleVideoLoaded);
    };
  }, [setup.currentStep]);

  // クリーンアップのuseEffect
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  /**
   * 手の選択ハンドラー
   */
  const handleHandSelect = (hand: HandSelection) => {
    setSetup((prev) => ({ ...prev, selectedHand: hand }));
  };

  /**
   * 次のステップへ進む
   */
  const handleNextStep = () => {
    setSetup((prev) => ({ ...prev, currentStep: 'selection' }));
  };

  /**
   * カメラ初期化
   */
  const initializeCamera = async () => {
    try {
      console.log('カメラ初期化開始...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
      });

      setCameraState({
        stream,
        isReady: true,
        error: null,
      });
    } catch (error) {
      console.error('カメラ初期化エラー:', error);
      setCameraState({
        stream: null,
        isReady: false,
        error: 'カメラへのアクセスを許可してください',
      });
    }
  };

  /**
   * カメラテスト
   */
  const handleCameraTest = () => {
    initializeCamera();
  };

  /**
   * 測定開始
   */
  const handleStartMeasurement = () => {
    if (setup.selectedHand) {
      console.log('測定画面に遷移します');
      setSetup((prev) => ({
        ...prev,
        currentStep: 'measurement',
        currentAngle: 0, // MediaPipeからリアルタイム取得
        isCapturing: true, // 最初からキャプチャを開始
      }));
    } else {
      console.log('手が選択されていません');
    }
  };

  /**
   * 測定画面から戻る
   */
  const handleBackFromMeasurement = () => {
    setSetup((prev) => ({ ...prev, currentStep: 'selection' }));
  };

  // カウントダウン
  const handleStartCapture = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    // カウントダウン
    setSetup((prev) => ({ ...prev, countdown: 5, isCapturing: true }));

    countdownIntervalRef.current = setInterval(() => {
      setSetup((prev) => {
        if (prev.countdown === null) {
          if (countdownIntervalRef.current)
            clearInterval(countdownIntervalRef.current);
          return prev;
        }
        if (prev.countdown <= 1) {
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
          }
          return {
            ...prev,
            countdown: null,
            isPhotoTaken: true,
            isCapturing: false,
          };
        }
        return { ...prev, countdown: prev.countdown - 1 };
      });
    }, 1000);
  };

  const handleRetake = () => {
    setSetup((prev) => ({
      ...prev,
      isPhotoTaken: false,
      countdown: null,
      currentAngle: 0,
      isCapturing: true,
    }));
  };

  const handleSave = async () => {
    // 各ステップの最大角度を計算
    const maxAnglesMap = new Map<string, number>();
    measurementSteps.forEach((step) => {
      const stepResults = measurementResults.filter(
        (r) => r.stepId === step.id
      );
      if (stepResults.length > 0) {
        const maxAngle = Math.max(...stepResults.map((r) => r.angle));
        maxAnglesMap.set(step.id, Math.round(maxAngle));
      } else {
        maxAnglesMap.set(step.id, 0); // データがない場合は0
      }
    });

    // MotionMeasurementオブジェクトを構築
    const motionMeasurementInput: CreateMeasurementInput = {
      userId: 'test-user-id', // TODO: 実際のユーザーIDに置き換える
      measurementDate: new Date(),
      wristFlexion: maxAnglesMap.get('palmar-flexion') || 0,
      wristExtension: maxAnglesMap.get('dorsal-flexion') || 0,
      wristUlnarDeviation: maxAnglesMap.get('ulnar-deviation') || 0,
      wristRadialDeviation: maxAnglesMap.get('radial-deviation') || 0,
      thumbFlexion: 0, // TODO: 親指の測定ステップが追加されたら更新
      thumbExtension: 0, // TODO: 親指の測定ステップが追加されたら更新
      thumbAdduction: 0, // TODO: 親指の測定ステップが追加されたら更新
      thumbAbduction: 0, // TODO: 親指の測定ステップが追加されたら更新
      accuracyScore: 1.0, // TODO: 実際の精度スコアを計算して設定
      handUsed: setup.selectedHand || 'right', // 選択された手、デフォルトは右手
    };

    try {
      const finalMotionMeasurement = createMeasurement(motionMeasurementInput);
      await saveMotionMeasurement(finalMotionMeasurement);
      console.log('最終測定結果を保存しました:', finalMotionMeasurement);
      router.push('/progress');
    } catch (error) {
      console.error('最終測定結果の保存に失敗しました:', error);
      // エラーメッセージをユーザーに表示するなどの処理
      alert('測定結果の保存に失敗しました。');
    }
  };

  const handleRetry = () => {
    setSetup({
      selectedHand: null,
      currentStep: 'instructions',
      currentMeasurementStep: 0,
      currentAngle: 0,
      phase: 'preparation',
      sessionId: null,
      mediaPipeReady: false,
      isCapturing: false,
      countdown: null,
      isPhotoTaken: false,
    });
    setMeasurementResults([]);
    // カメラを再初期化
    initializeCamera();
  };

  /**
   * 初期化
   */
  useEffect(() => {
    // カメラを自動で初期化
    initializeCamera();

    return () => {
      // クリーンアップ
      if (cameraState.stream) {
        cameraState.stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return (
    <div className={styles.measurementPage}>
      {/* メインコンテンツエリア */}
      <div className={styles.mainContent}>
        {/* 左側: コンテンツセクション */}
        <div className={styles.leftContent}>
          {setup.phase === 'complete' ? (
            <MeasurementResultSection
              results={measurementResults}
              onSave={handleSave}
              onRetry={handleRetry}
            />
          ) : setup.currentStep === 'instructions' ? (
            <InstructionsSection onNext={handleNextStep} />
          ) : setup.currentStep === 'measurement' ? (
            <MeasurementExecution
              setup={setup}
              onBack={handleBackFromMeasurement}
              videoRef={videoRef}
              canvasRef={canvasRef}
              onNextStep={nextMeasurementStep}
              onStopMeasurement={stopMeasurement}
              onStartCapture={handleStartCapture}
              onRetake={handleRetake}
            />
          ) : (
            <>
              <HandSelectionSection
                selectedHand={setup.selectedHand}
                onHandSelect={handleHandSelect}
              />
              <MeasurementInfoSection
                selectedHand={setup.selectedHand}
                onCameraTest={handleCameraTest}
                onStartMeasurement={handleStartMeasurement}
              />
            </>
          )}
        </div>

        {/* 右側: カメラセクション */}
        <div className={styles.rightContent}>
          {/* ヘッダー - アクティブ時のみ表示 */}
          {!(setup.currentStep === 'instructions' || !setup.selectedHand) && (
            <div className={styles.cameraHeader}>
              <span className={styles.statusBadge}>
                {cameraState.isReady ? '測定中' : 'カメラ準備中'}
              </span>
            </div>
          )}
          <CameraPreview
            cameraState={cameraState}
            isInactive={
              setup.currentStep === 'instructions' || !setup.selectedHand
            }
            {...(setup.currentStep === 'measurement'
              ? { videoRef, canvasRef }
              : {})}
          />
        </div>
      </div>
    </div>
  );
};

export default MeasurementPage;
