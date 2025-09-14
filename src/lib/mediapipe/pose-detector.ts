/**
 * MediaPipe Pose検出器ライブラリ
 * 手首の姿勢検出とランドマーク取得
 */

import { Pose, Results, NormalizedLandmark } from '@mediapipe/pose';

export interface PoseLandmarks {
  landmarks: NormalizedLandmark[];
  confidence: number;
}

export interface PoseDetectionResult {
  detected: boolean;
  pose: PoseLandmarks | null;
  timestamp: number;
  frameWidth: number;
  frameHeight: number;
}

export interface PoseDetectorConfig {
  modelComplexity: 0 | 1 | 2;
  smoothLandmarks: boolean;
  enableSegmentation: boolean;
  smoothSegmentation: boolean;
  minDetectionConfidence: number;
  minTrackingConfidence: number;
  staticImageMode: boolean;
}

export interface PoseDetectorCallbacks {
  onResults: (result: PoseDetectionResult) => void;
  onError: (error: Error) => void;
  onLoadingStart: () => void;
  onLoadingComplete: () => void;
}

/**
 * デフォルト設定（手首検出用に最適化）
 */
export const DEFAULT_POSE_CONFIG: PoseDetectorConfig = {
  modelComplexity: 1, // 中精度モデル（パフォーマンス重視）
  smoothLandmarks: true, // ランドマーク平滑化
  enableSegmentation: false, // セグメンテーション無効
  smoothSegmentation: false,
  minDetectionConfidence: 0.5, // 検出信頼度閾値
  minTrackingConfidence: 0.5, // トラッキング信頼度閾値
  staticImageMode: false, // ビデオストリーム用
};

/**
 * 手首関連のポーズランドマークポイント定義
 */
export const POSE_LANDMARKS = {
  // 手首ポイント
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,

  // 肘ポイント（参考角度計算用）
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,

  // 肩ポイント（参考角度計算用）
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,

  // 手の指先（参考用）
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
} as const;

/**
 * MediaPipe Pose検出器クラス
 */
export class PoseDetector {
  private pose: Pose | null = null;
  private config: PoseDetectorConfig;
  private callbacks: PoseDetectorCallbacks;
  private isInitialized = false;
  private isProcessing = false;

  constructor(
    config: Partial<PoseDetectorConfig> = {},
    callbacks: PoseDetectorCallbacks
  ) {
    this.config = { ...DEFAULT_POSE_CONFIG, ...config };
    this.callbacks = callbacks;
  }

  /**
   * MediaPipe Poseの初期化
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn('PoseDetector: 既に初期化済みです');
      return;
    }

    try {
      this.callbacks.onLoadingStart();

      // MediaPipe Poseインスタンス作成
      this.pose = new Pose({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
        },
      });

      // 設定適用
      this.pose.setOptions(this.config);

      // 結果コールバック設定
      this.pose.onResults((results: any) => {
        this.processResults(results);
      });

      this.isInitialized = true;
      this.callbacks.onLoadingComplete();

      console.log('PoseDetector: 初期化が完了しました', this.config);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error
          : new Error('Unknown initialization error');
      console.error('PoseDetector: 初期化エラー:', errorMessage);
      this.callbacks.onError(errorMessage);
      throw errorMessage;
    }
  }

  /**
   * カメラストリームとの接続
   */
  async connectCamera(videoElement: HTMLVideoElement): Promise<void> {
    if (!this.pose) {
      throw new Error('PoseDetector: 初期化されていません');
    }

    try {
      // MediaPipeにビデオフレームを送信する関数
      const sendFrame = async () => {
        if (this.pose && !this.isProcessing && videoElement.videoWidth > 0) {
          this.isProcessing = true;
          try {
            await this.pose.send({ image: videoElement });
          } catch (error) {
            console.error('PoseDetector: フレーム処理エラー:', error);
          } finally {
            this.isProcessing = false;
          }
        }
        // 次のフレームをリクエスト
        requestAnimationFrame(sendFrame);
      };

      // フレーム送信を開始
      sendFrame();

      console.log('PoseDetector: カメラ接続が完了しました');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error : new Error('Camera connection error');
      console.error('PoseDetector: カメラ接続エラー:', errorMessage);
      this.callbacks.onError(errorMessage);
      throw errorMessage;
    }
  }

  /**
   * 単一画像の処理
   */
  async processImage(
    imageElement: HTMLImageElement | HTMLCanvasElement
  ): Promise<PoseDetectionResult> {
    if (!this.pose) {
      throw new Error('PoseDetector: 初期化されていません');
    }

    return new Promise((resolve, reject) => {
      // 一時的に結果コールバックを変更
      const originalCallback = this.pose!.onResults;

      this.pose!.onResults = (results: any) => {
        const result = this.convertResults(results);
        // 元のコールバックを復元
        this.pose!.onResults = originalCallback;
        resolve(result);
      };

      // 画像を送信
      this.pose!.send({ image: imageElement }).catch(reject);
    });
  }

  /**
   * 検出結果の処理
   */
  private processResults(results: any): void {
    try {
      const detectionResult = this.convertResults(results);
      this.callbacks.onResults(detectionResult);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error : new Error('Results processing error');
      console.error('PoseDetector: 結果処理エラー:', errorMessage);
      this.callbacks.onError(errorMessage);
    }
  }

  /**
   * MediaPipe結果をアプリケーション形式に変換
   */
  private convertResults(results: any): PoseDetectionResult {
    let pose: PoseLandmarks | null = null;

    if (results.poseLandmarks && results.poseLandmarks.length > 0) {
      // 手首ランドマークが検出されているかチェック
      const leftWrist = results.poseLandmarks[POSE_LANDMARKS.LEFT_WRIST];
      const rightWrist = results.poseLandmarks[POSE_LANDMARKS.RIGHT_WRIST];

      if (leftWrist || rightWrist) {
        pose = {
          landmarks: results.poseLandmarks as NormalizedLandmark[],
          confidence: this.calculatePoseConfidence(results.poseLandmarks),
        };
      }
    }

    return {
      detected: pose !== null,
      pose: pose,
      timestamp: Date.now(),
      frameWidth: results.image?.width || 0,
      frameHeight: results.image?.height || 0,
    };
  }

  /**
   * ポーズ検出の信頼度計算
   */
  private calculatePoseConfidence(landmarks: any[]): number {
    // 手首、肘、肩の信頼度の平均を計算
    const keyPoints = [
      POSE_LANDMARKS.LEFT_WRIST,
      POSE_LANDMARKS.RIGHT_WRIST,
      POSE_LANDMARKS.LEFT_ELBOW,
      POSE_LANDMARKS.RIGHT_ELBOW,
      POSE_LANDMARKS.LEFT_SHOULDER,
      POSE_LANDMARKS.RIGHT_SHOULDER,
    ];

    let totalConfidence = 0;
    let validPoints = 0;

    keyPoints.forEach((pointIndex) => {
      const landmark = landmarks[pointIndex];
      if (landmark && landmark.visibility !== undefined) {
        totalConfidence += landmark.visibility;
        validPoints++;
      }
    });

    return validPoints > 0 ? totalConfidence / validPoints : 0;
  }

  /**
   * 特定のランドマークポイントを取得
   */
  getLandmark(
    pose: PoseLandmarks,
    landmarkIndex: number
  ): NormalizedLandmark | null {
    if (landmarkIndex < 0 || landmarkIndex >= pose.landmarks.length) {
      return null;
    }
    return pose.landmarks[landmarkIndex] || null;
  }

  /**
   * 左手首ランドマークを取得
   */
  getLeftWristLandmark(pose: PoseLandmarks): NormalizedLandmark | null {
    return this.getLandmark(pose, POSE_LANDMARKS.LEFT_WRIST);
  }

  /**
   * 右手首ランドマークを取得
   */
  getRightWristLandmark(pose: PoseLandmarks): NormalizedLandmark | null {
    return this.getLandmark(pose, POSE_LANDMARKS.RIGHT_WRIST);
  }

  /**
   * 手首の関節角度計算用ランドマークを取得
   */
  getWristJointLandmarks(pose: PoseLandmarks, side: 'left' | 'right') {
    if (side === 'left') {
      return {
        wrist: this.getLandmark(pose, POSE_LANDMARKS.LEFT_WRIST),
        elbow: this.getLandmark(pose, POSE_LANDMARKS.LEFT_ELBOW),
        shoulder: this.getLandmark(pose, POSE_LANDMARKS.LEFT_SHOULDER),
        index: this.getLandmark(pose, POSE_LANDMARKS.LEFT_INDEX),
      };
    } else {
      return {
        wrist: this.getLandmark(pose, POSE_LANDMARKS.RIGHT_WRIST),
        elbow: this.getLandmark(pose, POSE_LANDMARKS.RIGHT_ELBOW),
        shoulder: this.getLandmark(pose, POSE_LANDMARKS.RIGHT_SHOULDER),
        index: this.getLandmark(pose, POSE_LANDMARKS.RIGHT_INDEX),
      };
    }
  }

  /**
   * 設定を更新
   */
  updateConfig(newConfig: Partial<PoseDetectorConfig>): void {
    this.config = { ...this.config, ...newConfig };

    if (this.pose) {
      this.pose.setOptions(this.config);
      console.log('PoseDetector: 設定を更新しました', this.config);
    }
  }

  /**
   * リソースのクリーンアップ
   */
  async dispose(): Promise<void> {
    try {
      if (this.pose) {
        this.pose.close();
        this.pose = null;
      }

      this.isInitialized = false;
      this.isProcessing = false;

      console.log('PoseDetector: リソースがクリーンアップされました');
    } catch (error) {
      console.error('PoseDetector: クリーンアップエラー:', error);
    }
  }

  /**
   * 初期化状態の確認
   */
  isReady(): boolean {
    return this.isInitialized && this.pose !== null;
  }

  /**
   * 処理中状態の確認
   */
  isBusy(): boolean {
    return this.isProcessing;
  }
}
