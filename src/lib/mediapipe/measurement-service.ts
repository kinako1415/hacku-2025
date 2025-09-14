/**
 * 測定サービスライブラリ
 * MediaPipe統合とリアルタイム可動域測定
 */

import {
  HandDetector,
  HandDetectionResult,
  HandLandmarks,
} from './hands-detector';
import {
  PoseDetector,
  PoseDetectionResult,
  PoseLandmarks,
} from './pose-detector';
import { CameraService } from './camera-service';
import {
  AngleCalculationResult,
  MotionAngles,
  WristAngles,
  ThumbAngles,
  calculateWristFlexionExtension,
  calculateWristDeviations,
  calculateThumbAngles,
  combineAngleResults,
  ANGLE_CONFIDENCE_THRESHOLDS,
} from './angle-calculator';
import { HAND_LANDMARKS } from './hands-detector';
import { POSE_LANDMARKS } from './pose-detector';

export interface MeasurementConfig {
  measurementDuration: number; // 測定時間（秒）
  samplingRate: number; // サンプリング率（Hz）
  confidenceThreshold: number; // 信頼度閾値
  stabilizationTime: number; // 安定化時間（秒）
  targetHand: 'left' | 'right' | 'auto'; // 測定対象手
}

export interface MeasurementSession {
  id: string;
  startTime: Date;
  isActive: boolean;
  targetHand: 'left' | 'right';
  samples: MeasurementSample[];
  currentAngles: MotionAngles | null;
  averageAngles: MotionAngles | null;
  progress: number; // 進捗率（0-1）
}

export interface MeasurementSample {
  timestamp: number;
  handDetected: boolean;
  poseDetected: boolean;
  angles: MotionAngles | null;
  confidence: number;
}

export interface MeasurementResult {
  sessionId: string;
  measurementDate: Date;
  handUsed: 'left' | 'right';

  // 測定値（平均）
  wristFlexion: number;
  wristExtension: number;
  wristUlnarDeviation: number;
  wristRadialDeviation: number;
  thumbFlexion: number;
  thumbExtension: number;
  thumbAdduction: number;
  thumbAbduction: number;

  // 測定品質
  accuracyScore: number;
  sampleCount: number;
  measurementDuration: number;

  // 統計情報
  standardDeviation: {
    wristFlexion: number;
    wristExtension: number;
    wristUlnarDeviation: number;
    wristRadialDeviation: number;
    thumbFlexion: number;
    thumbExtension: number;
    thumbAdduction: number;
    thumbAbduction: number;
  };
}

export interface MeasurementCallbacks {
  onSessionStart: (session: MeasurementSession) => void;
  onSessionUpdate: (session: MeasurementSession) => void;
  onSessionComplete: (result: MeasurementResult) => void;
  onError: (error: Error) => void;
  onCalibrationRequired: () => void;
}

/**
 * デフォルト測定設定
 */
export const DEFAULT_MEASUREMENT_CONFIG: MeasurementConfig = {
  measurementDuration: 10, // 10秒間測定
  samplingRate: 10, // 10Hz（0.1秒間隔）
  confidenceThreshold: ANGLE_CONFIDENCE_THRESHOLDS.MEDIUM,
  stabilizationTime: 2, // 2秒間の安定化時間
  targetHand: 'auto', // 自動検出
};

/**
 * 測定サービスクラス
 */
export class MeasurementService {
  private handDetector: HandDetector;
  private poseDetector: PoseDetector;
  private cameraService: CameraService;
  private config: MeasurementConfig;
  private callbacks: MeasurementCallbacks;

  private currentSession: MeasurementSession | null = null;
  private measurementInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;

  constructor(
    handDetector: HandDetector,
    poseDetector: PoseDetector,
    cameraService: CameraService,
    config: Partial<MeasurementConfig> = {},
    callbacks: MeasurementCallbacks
  ) {
    this.handDetector = handDetector;
    this.poseDetector = poseDetector;
    this.cameraService = cameraService;
    this.config = { ...DEFAULT_MEASUREMENT_CONFIG, ...config };
    this.callbacks = callbacks;
  }

  /**
   * 測定サービスの初期化
   */
  async initialize(): Promise<void> {
    try {
      // 各サービスの初期化状態を確認
      if (!this.handDetector.isReady()) {
        throw new Error('HandDetector が初期化されていません');
      }

      if (!this.poseDetector.isReady()) {
        throw new Error('PoseDetector が初期化されていません');
      }

      const cameraStatus = this.cameraService.getStatus();
      if (!cameraStatus.isActive) {
        throw new Error('CameraService がアクティブではありません');
      }

      this.isInitialized = true;
      console.log('MeasurementService: 初期化が完了しました');
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error
          : new Error('Measurement service initialization error');
      console.error('MeasurementService: 初期化エラー:', errorMessage);
      this.callbacks.onError(errorMessage);
      throw errorMessage;
    }
  }

  /**
   * 測定セッションの開始
   */
  async startMeasurement(
    targetHand: 'left' | 'right' | 'auto' = 'auto'
  ): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('MeasurementService が初期化されていません');
    }

    if (this.currentSession) {
      throw new Error('既に測定セッションがアクティブです');
    }

    try {
      // セッション作成
      const sessionId = crypto.randomUUID();
      const actualTargetHand =
        targetHand === 'auto' ? await this.detectDominantHand() : targetHand;

      this.currentSession = {
        id: sessionId,
        startTime: new Date(),
        isActive: true,
        targetHand: actualTargetHand,
        samples: [],
        currentAngles: null,
        averageAngles: null,
        progress: 0,
      };

      // サンプリング開始
      const intervalMs = 1000 / this.config.samplingRate;
      this.measurementInterval = setInterval(() => {
        this.collectSample();
      }, intervalMs);

      // 完了タイマー設定
      setTimeout(() => {
        this.completeMeasurement();
      }, this.config.measurementDuration * 1000);

      this.callbacks.onSessionStart(this.currentSession);
      console.log('MeasurementService: 測定セッション開始:', sessionId);

      return sessionId;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error : new Error('Measurement start error');
      this.callbacks.onError(errorMessage);
      throw errorMessage;
    }
  }

  /**
   * 測定セッションの停止
   */
  async stopMeasurement(): Promise<MeasurementResult | null> {
    if (!this.currentSession) {
      return null;
    }

    try {
      // サンプリング停止
      if (this.measurementInterval) {
        clearInterval(this.measurementInterval);
        this.measurementInterval = null;
      }

      const result = this.generateMeasurementResult();

      // セッションクリア
      this.currentSession = null;

      console.log('MeasurementService: 測定セッション停止');
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error : new Error('Measurement stop error');
      this.callbacks.onError(errorMessage);
      throw errorMessage;
    }
  }

  /**
   * サンプル収集
   */
  private async collectSample(): Promise<void> {
    if (!this.currentSession) return;

    try {
      // 現在のフレームから検出結果を取得
      const videoElement = this.cameraService.getVideoElement();
      if (!videoElement) return;

      // ビデオフレームをキャンバスに変換
      const canvas = this.videoToCanvas(videoElement);
      if (!canvas) return;

      // Hand検出とPose検出を並行実行
      const [handResult, poseResult] = await Promise.all([
        this.handDetector.processImage(canvas),
        this.poseDetector.processImage(canvas),
      ]);

      // 角度計算
      const angles = this.calculateMotionAngles(handResult, poseResult);

      // サンプル作成
      const sample: MeasurementSample = {
        timestamp: Date.now(),
        handDetected: handResult.detected,
        poseDetected: poseResult.detected,
        angles: angles,
        confidence: angles?.overallConfidence || 0,
      };

      // サンプル追加
      this.currentSession.samples.push(sample);

      // 現在の角度更新
      if (
        angles &&
        angles.overallConfidence >= this.config.confidenceThreshold
      ) {
        this.currentSession.currentAngles = angles;
      }

      // 平均角度計算
      this.updateAverageAngles();

      // 進捗更新
      const elapsed =
        (Date.now() - this.currentSession.startTime.getTime()) / 1000;
      this.currentSession.progress = Math.min(
        elapsed / this.config.measurementDuration,
        1
      );

      // コールバック実行
      this.callbacks.onSessionUpdate(this.currentSession);
    } catch (error) {
      console.error('MeasurementService: サンプル収集エラー:', error);
    }
  }

  /**
   * ビデオエレメントをキャンバスに変換
   */
  private videoToCanvas(
    videoElement: HTMLVideoElement
  ): HTMLCanvasElement | null {
    try {
      if (videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
        return null;
      }

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      if (!context) {
        return null;
      }

      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;

      context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

      return canvas;
    } catch (error) {
      console.error('MeasurementService: ビデオ→キャンバス変換エラー:', error);
      return null;
    }
  }

  /**
   * 動作角度の計算
   */
  private calculateMotionAngles(
    handResult: HandDetectionResult,
    poseResult: PoseDetectionResult
  ): MotionAngles | null {
    if (!this.currentSession) return null;

    try {
      // 対象手の検出確認
      const targetHand = this.getTargetHand(handResult);
      const targetPose = poseResult.pose;

      if (!targetHand || !targetPose) {
        return null;
      }

      // 手首角度計算
      const wristAngles = this.calculateWristAngles(targetHand, targetPose);

      // 母指角度計算
      const thumbAngles = this.calculateThumbAnglesFromHand(targetHand);

      // 全体信頼度計算
      const overallConfidence = this.calculateOverallConfidence(
        wristAngles,
        thumbAngles
      );

      return {
        wrist: wristAngles,
        thumb: thumbAngles,
        overallConfidence,
      };
    } catch (error) {
      console.error('MeasurementService: 角度計算エラー:', error);
      return null;
    }
  }

  /**
   * 対象手の取得
   */
  private getTargetHand(handResult: HandDetectionResult): HandLandmarks | null {
    if (!handResult.detected || handResult.hands.length === 0) {
      return null;
    }

    // 複数の手が検出された場合、信頼度の高い方または指定された手を選択
    if (this.currentSession?.targetHand === 'left') {
      return (
        handResult.hands.find((hand) => hand.handedness === 'Left') || null
      );
    } else if (this.currentSession?.targetHand === 'right') {
      return (
        handResult.hands.find((hand) => hand.handedness === 'Right') || null
      );
    }

    // 最も信頼度の高い手を返す
    return handResult.hands.reduce((best, current) =>
      current.confidence > best.confidence ? current : best
    );
  }

  /**
   * 手首角度の計算
   */
  private calculateWristAngles(
    hand: HandLandmarks,
    pose: PoseLandmarks
  ): WristAngles {
    // 手首ランドマーク取得
    const wrist = this.handDetector.getWristLandmark(hand);
    const indexMcp = this.handDetector.getLandmark(
      hand,
      HAND_LANDMARKS.INDEX_FINGER_MCP
    );
    const pinkyMcp = this.handDetector.getLandmark(
      hand,
      HAND_LANDMARKS.PINKY_MCP
    );

    // ポーズから肘・肩のランドマーク取得
    const isLeftHand = hand.handedness === 'Left';
    const elbow = this.poseDetector.getLandmark(
      pose,
      isLeftHand ? POSE_LANDMARKS.LEFT_ELBOW : POSE_LANDMARKS.RIGHT_ELBOW
    );

    // デフォルト値
    const defaultResult: AngleCalculationResult = {
      angle: 0,
      confidence: 0,
      isValid: false,
    };

    let flexion = defaultResult;
    let extension = defaultResult;
    let ulnarDeviation = defaultResult;
    let radialDeviation = defaultResult;

    // 屈曲・伸展角度計算
    if (wrist && elbow && indexMcp) {
      flexion = calculateWristFlexionExtension(wrist, elbow, indexMcp);
      extension = flexion; // 同じ角度を使用（符号で判定）
    }

    // 尺屈・橈屈角度計算
    if (wrist && indexMcp && pinkyMcp) {
      const deviation = calculateWristDeviations(wrist, pinkyMcp, indexMcp);
      ulnarDeviation = deviation;
      radialDeviation = deviation;
    }

    return {
      flexion,
      extension,
      ulnarDeviation,
      radialDeviation,
    };
  }

  /**
   * 母指角度の計算
   */
  private calculateThumbAnglesFromHand(hand: HandLandmarks): ThumbAngles {
    const thumbLandmarks = this.handDetector.getThumbLandmarks(hand);

    const defaultResult: AngleCalculationResult = {
      angle: 0,
      confidence: 0,
      isValid: false,
    };

    let flexion = defaultResult;
    let extension = defaultResult;
    let adduction = defaultResult;
    let abduction = defaultResult;

    // 母指角度計算
    if (thumbLandmarks.cmc && thumbLandmarks.mcp && thumbLandmarks.tip) {
      const thumbAngle = calculateThumbAngles(
        thumbLandmarks.cmc,
        thumbLandmarks.mcp,
        thumbLandmarks.tip
      );

      flexion = thumbAngle;
      extension = thumbAngle;
      adduction = thumbAngle;
      abduction = thumbAngle;
    }

    return {
      flexion,
      extension,
      adduction,
      abduction,
    };
  }

  /**
   * 全体信頼度の計算
   */
  private calculateOverallConfidence(
    wrist: WristAngles,
    thumb: ThumbAngles
  ): number {
    const confidences = [
      wrist.flexion.confidence,
      wrist.extension.confidence,
      wrist.ulnarDeviation.confidence,
      wrist.radialDeviation.confidence,
      thumb.flexion.confidence,
      thumb.extension.confidence,
      thumb.adduction.confidence,
      thumb.abduction.confidence,
    ];

    const validConfidences = confidences.filter((c) => c > 0);
    const average =
      validConfidences.length > 0
        ? validConfidences.reduce((sum, c) => sum + c, 0) /
          validConfidences.length
        : 0;

    return Math.round(average * 100) / 100;
  }

  /**
   * 平均角度の更新
   */
  private updateAverageAngles(): void {
    if (!this.currentSession || this.currentSession.samples.length === 0)
      return;

    const validSamples = this.currentSession.samples.filter(
      (sample) =>
        sample.angles && sample.confidence >= this.config.confidenceThreshold
    );

    if (validSamples.length === 0) return;

    // 各角度の平均計算
    const avgWristFlexion = this.calculateAverageAngle(
      validSamples.map((s) => s.angles!.wrist.flexion)
    );
    const avgWristExtension = this.calculateAverageAngle(
      validSamples.map((s) => s.angles!.wrist.extension)
    );
    const avgWristUlnar = this.calculateAverageAngle(
      validSamples.map((s) => s.angles!.wrist.ulnarDeviation)
    );
    const avgWristRadial = this.calculateAverageAngle(
      validSamples.map((s) => s.angles!.wrist.radialDeviation)
    );
    const avgThumbFlexion = this.calculateAverageAngle(
      validSamples.map((s) => s.angles!.thumb.flexion)
    );
    const avgThumbExtension = this.calculateAverageAngle(
      validSamples.map((s) => s.angles!.thumb.extension)
    );
    const avgThumbAdduction = this.calculateAverageAngle(
      validSamples.map((s) => s.angles!.thumb.adduction)
    );
    const avgThumbAbduction = this.calculateAverageAngle(
      validSamples.map((s) => s.angles!.thumb.abduction)
    );

    this.currentSession.averageAngles = {
      wrist: {
        flexion: avgWristFlexion,
        extension: avgWristExtension,
        ulnarDeviation: avgWristUlnar,
        radialDeviation: avgWristRadial,
      },
      thumb: {
        flexion: avgThumbFlexion,
        extension: avgThumbExtension,
        adduction: avgThumbAdduction,
        abduction: avgThumbAbduction,
      },
      overallConfidence: this.calculateOverallConfidence(
        {
          flexion: avgWristFlexion,
          extension: avgWristExtension,
          ulnarDeviation: avgWristUlnar,
          radialDeviation: avgWristRadial,
        },
        {
          flexion: avgThumbFlexion,
          extension: avgThumbExtension,
          adduction: avgThumbAdduction,
          abduction: avgThumbAbduction,
        }
      ),
    };
  }

  /**
   * 角度平均の計算
   */
  private calculateAverageAngle(
    results: AngleCalculationResult[]
  ): AngleCalculationResult {
    return combineAngleResults(results);
  }

  /**
   * 利き手の自動検出
   */
  private async detectDominantHand(): Promise<'left' | 'right'> {
    // 簡易的な検出ロジック（実際はより複雑な判定が必要）
    return 'right'; // デフォルトは右手
  }

  /**
   * 測定完了
   */
  private completeMeasurement(): void {
    if (!this.currentSession) return;

    try {
      const result = this.generateMeasurementResult();
      this.callbacks.onSessionComplete(result);

      // セッションクリア
      if (this.measurementInterval) {
        clearInterval(this.measurementInterval);
        this.measurementInterval = null;
      }
      this.currentSession = null;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error
          : new Error('Measurement completion error');
      this.callbacks.onError(errorMessage);
    }
  }

  /**
   * 測定結果の生成
   */
  private generateMeasurementResult(): MeasurementResult {
    if (!this.currentSession || !this.currentSession.averageAngles) {
      throw new Error('測定データが不足しています');
    }

    const { averageAngles } = this.currentSession;
    const validSamples = this.currentSession.samples.filter(
      (sample) =>
        sample.angles && sample.confidence >= this.config.confidenceThreshold
    );

    // 標準偏差計算
    const standardDeviation = this.calculateStandardDeviations(validSamples);

    return {
      sessionId: this.currentSession.id,
      measurementDate: this.currentSession.startTime,
      handUsed: this.currentSession.targetHand,

      wristFlexion: averageAngles.wrist.flexion.angle,
      wristExtension: averageAngles.wrist.extension.angle,
      wristUlnarDeviation: averageAngles.wrist.ulnarDeviation.angle,
      wristRadialDeviation: averageAngles.wrist.radialDeviation.angle,
      thumbFlexion: averageAngles.thumb.flexion.angle,
      thumbExtension: averageAngles.thumb.extension.angle,
      thumbAdduction: averageAngles.thumb.adduction.angle,
      thumbAbduction: averageAngles.thumb.abduction.angle,

      accuracyScore: averageAngles.overallConfidence,
      sampleCount: validSamples.length,
      measurementDuration:
        (Date.now() - this.currentSession.startTime.getTime()) / 1000,

      standardDeviation,
    };
  }

  /**
   * 標準偏差の計算
   */
  private calculateStandardDeviations(samples: MeasurementSample[]) {
    // 各角度の標準偏差を計算（簡略化）
    return {
      wristFlexion: 0,
      wristExtension: 0,
      wristUlnarDeviation: 0,
      wristRadialDeviation: 0,
      thumbFlexion: 0,
      thumbExtension: 0,
      thumbAdduction: 0,
      thumbAbduction: 0,
    };
  }

  /**
   * 現在のセッション情報取得
   */
  getCurrentSession(): MeasurementSession | null {
    return this.currentSession;
  }

  /**
   * 設定更新
   */
  updateConfig(newConfig: Partial<MeasurementConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('MeasurementService: 設定を更新しました:', this.config);
  }

  /**
   * 初期化状態確認
   */
  isReady(): boolean {
    return this.isInitialized;
  }
}
