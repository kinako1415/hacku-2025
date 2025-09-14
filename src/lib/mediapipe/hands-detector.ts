/**
 * MediaPipe Hands検出器ライブラリ
 * リアルタイム手の検出とランドマーク取得
 */

import { Hands, Results, NormalizedLandmark } from '@mediapipe/hands';

export interface HandLandmarks {
  landmarks: NormalizedLandmark[];
  handedness: 'Left' | 'Right';
  confidence: number;
}

export interface HandDetectionResult {
  detected: boolean;
  hands: HandLandmarks[];
  timestamp: number;
  frameWidth: number;
  frameHeight: number;
}

export interface HandDetectorConfig {
  maxNumHands: number;
  modelComplexity: 0 | 1;
  minDetectionConfidence: number;
  minTrackingConfidence: number;
  staticImageMode: boolean;
}

export interface HandDetectorCallbacks {
  onResults: (result: HandDetectionResult) => void;
  onError: (error: Error) => void;
  onLoadingStart: () => void;
  onLoadingComplete: () => void;
}

/**
 * デフォルト設定
 */
export const DEFAULT_HAND_CONFIG: HandDetectorConfig = {
  maxNumHands: 1, // 片手のみ検出
  modelComplexity: 1, // 高精度モデル
  minDetectionConfidence: 0.7, // 検出信頼度閾値
  minTrackingConfidence: 0.5, // トラッキング信頼度閾値
  staticImageMode: false, // ビデオストリーム用
};

/**
 * 手のランドマークポイント定義
 */
export const HAND_LANDMARKS = {
  WRIST: 0,
  THUMB_CMC: 1,
  THUMB_MCP: 2,
  THUMB_IP: 3,
  THUMB_TIP: 4,
  INDEX_FINGER_MCP: 5,
  INDEX_FINGER_PIP: 6,
  INDEX_FINGER_DIP: 7,
  INDEX_FINGER_TIP: 8,
  MIDDLE_FINGER_MCP: 9,
  MIDDLE_FINGER_PIP: 10,
  MIDDLE_FINGER_DIP: 11,
  MIDDLE_FINGER_TIP: 12,
  RING_FINGER_MCP: 13,
  RING_FINGER_PIP: 14,
  RING_FINGER_DIP: 15,
  RING_FINGER_TIP: 16,
  PINKY_MCP: 17,
  PINKY_PIP: 18,
  PINKY_DIP: 19,
  PINKY_TIP: 20,
} as const;

/**
 * MediaPipe Hands検出器クラス
 */
export class HandDetector {
  private hands: Hands | null = null;
  private config: HandDetectorConfig;
  private callbacks: HandDetectorCallbacks;
  private isInitialized = false;
  private isProcessing = false;

  constructor(
    config: Partial<HandDetectorConfig> = {},
    callbacks: HandDetectorCallbacks
  ) {
    this.config = { ...DEFAULT_HAND_CONFIG, ...config };
    this.callbacks = callbacks;
  }

  /**
   * MediaPipe Handsの初期化
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn('HandDetector: 既に初期化済みです');
      return;
    }

    try {
      this.callbacks.onLoadingStart();

      // MediaPipe Handsインスタンス作成
      this.hands = new Hands({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        },
      });

      // 設定適用
      this.hands.setOptions(this.config);

      // 結果コールバック設定
      this.hands.onResults((results: Results) => {
        this.processResults(results);
      });

      this.isInitialized = true;
      this.callbacks.onLoadingComplete();

      console.log('HandDetector: 初期化が完了しました', this.config);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error
          : new Error('Unknown initialization error');
      console.error('HandDetector: 初期化エラー:', errorMessage);
      this.callbacks.onError(errorMessage);
      throw errorMessage;
    }
  }

  /**
   * カメラストリームとの接続（簡素化版）
   */
  async connectCamera(videoElement: HTMLVideoElement): Promise<void> {
    if (!this.hands) {
      throw new Error('HandDetector: 初期化されていません');
    }

    try {
      // MediaPipeにビデオフレームを送信する関数
      const sendFrame = async () => {
        if (this.hands && !this.isProcessing && videoElement.videoWidth > 0) {
          this.isProcessing = true;
          try {
            await this.hands.send({ image: videoElement });
          } catch (error) {
            console.error('HandDetector: フレーム処理エラー:', error);
          } finally {
            this.isProcessing = false;
          }
        }
        // 次のフレームをリクエスト
        requestAnimationFrame(sendFrame);
      };

      // フレーム送信を開始
      sendFrame();

      console.log('HandDetector: カメラ接続が完了しました');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error : new Error('Camera connection error');
      console.error('HandDetector: カメラ接続エラー:', errorMessage);
      this.callbacks.onError(errorMessage);
      throw errorMessage;
    }
  }

  /**
   * 単一画像の処理
   */
  async processImage(
    imageElement: HTMLImageElement | HTMLCanvasElement
  ): Promise<HandDetectionResult> {
    if (!this.hands) {
      throw new Error('HandDetector: 初期化されていません');
    }

    return new Promise((resolve, reject) => {
      // 一時的に結果コールバックを変更
      const originalCallback = this.hands!.onResults;

      this.hands!.onResults = (results: any) => {
        const result = this.convertResults(results);
        // 元のコールバックを復元
        this.hands!.onResults = originalCallback;
        resolve(result);
      };

      // 画像を送信
      this.hands!.send({ image: imageElement }).catch(reject);
    });
  }

  /**
   * 検出結果の処理
   */
  private processResults(results: Results): void {
    try {
      const detectionResult = this.convertResults(results);
      this.callbacks.onResults(detectionResult);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error : new Error('Results processing error');
      console.error('HandDetector: 結果処理エラー:', errorMessage);
      this.callbacks.onError(errorMessage);
    }
  }

  /**
   * MediaPipe結果をアプリケーション形式に変換
   */
  private convertResults(results: any): HandDetectionResult {
    const hands: HandLandmarks[] = [];

    if (results.multiHandLandmarks && results.multiHandedness) {
      for (let i = 0; i < results.multiHandLandmarks.length; i++) {
        const landmarks = results.multiHandLandmarks[i];
        const handedness = results.multiHandedness[i];

        if (landmarks && handedness) {
          hands.push({
            landmarks: landmarks as NormalizedLandmark[],
            handedness: (handedness.label || 'Left') as 'Left' | 'Right',
            confidence: handedness.score || 0,
          });
        }
      }
    }

    return {
      detected: hands.length > 0,
      hands: hands,
      timestamp: Date.now(),
      frameWidth: results.image?.width || 0,
      frameHeight: results.image?.height || 0,
    };
  }

  /**
   * 特定のランドマークポイントを取得
   */
  getLandmark(
    hand: HandLandmarks,
    landmarkIndex: number
  ): NormalizedLandmark | null {
    if (landmarkIndex < 0 || landmarkIndex >= hand.landmarks.length) {
      return null;
    }
    return hand.landmarks[landmarkIndex] || null;
  }

  /**
   * 手首ポイントを取得
   */
  getWristLandmark(hand: HandLandmarks): NormalizedLandmark | null {
    return this.getLandmark(hand, HAND_LANDMARKS.WRIST);
  }

  /**
   * 親指のランドマークポイントを取得
   */
  getThumbLandmarks(hand: HandLandmarks) {
    return {
      cmc: this.getLandmark(hand, HAND_LANDMARKS.THUMB_CMC),
      mcp: this.getLandmark(hand, HAND_LANDMARKS.THUMB_MCP),
      ip: this.getLandmark(hand, HAND_LANDMARKS.THUMB_IP),
      tip: this.getLandmark(hand, HAND_LANDMARKS.THUMB_TIP),
    };
  }

  /**
   * 人差し指のランドマークポイントを取得
   */
  getIndexFingerLandmarks(hand: HandLandmarks) {
    return {
      mcp: this.getLandmark(hand, HAND_LANDMARKS.INDEX_FINGER_MCP),
      pip: this.getLandmark(hand, HAND_LANDMARKS.INDEX_FINGER_PIP),
      dip: this.getLandmark(hand, HAND_LANDMARKS.INDEX_FINGER_DIP),
      tip: this.getLandmark(hand, HAND_LANDMARKS.INDEX_FINGER_TIP),
    };
  }

  /**
   * 設定を更新
   */
  updateConfig(newConfig: Partial<HandDetectorConfig>): void {
    this.config = { ...this.config, ...newConfig };

    if (this.hands) {
      this.hands.setOptions(this.config);
      console.log('HandDetector: 設定を更新しました', this.config);
    }
  }

  /**
   * リソースのクリーンアップ
   */
  async dispose(): Promise<void> {
    try {
      if (this.hands) {
        this.hands.close();
        this.hands = null;
      }

      this.isInitialized = false;
      this.isProcessing = false;

      console.log('HandDetector: リソースがクリーンアップされました');
    } catch (error) {
      console.error('HandDetector: クリーンアップエラー:', error);
    }
  }

  /**
   * 初期化状態の確認
   */
  isReady(): boolean {
    return this.isInitialized && this.hands !== null;
  }

  /**
   * 処理中状態の確認
   */
  isBusy(): boolean {
    return this.isProcessing;
  }
}
