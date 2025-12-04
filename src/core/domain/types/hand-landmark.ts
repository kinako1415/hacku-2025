/**
 * MediaPipe Hands関連の型定義
 * クリーンアーキテクチャ: ドメイン層
 */

/**
 * 3次元座標点
 */
export interface Point3D {
  /** ランドマークID（0-20） */
  id: number;
  
  /** X座標（正規化 0-1） */
  x: number;
  
  /** Y座標（正規化 0-1） */
  y: number;
  
  /** Z座標（相対深度） */
  z: number;
  
  /** 可視性スコア（0-1） */
  visibility?: number;
}

/**
 * 手のランドマーク定数
 * MediaPipe Handsの21個のランドマーク
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
 * 手の検出結果
 */
export interface HandLandmarks {
  /** ランドマーク配列（21点） */
  landmarks: Point3D[];
  
  /** 検出された手の種類 */
  handedness: 'left' | 'right';
  
  /** 検出信頼度（0-1） */
  confidence: number;
}

/**
 * MediaPipe設定
 */
export interface MediaPipeConfig {
  /** 最大検出手数 */
  maxNumHands: number;
  
  /** モデル複雑度（0, 1） */
  modelComplexity: 0 | 1;
  
  /** 最小検出信頼度（0-1） */
  minDetectionConfidence: number;
  
  /** 最小トラッキング信頼度（0-1） */
  minTrackingConfidence: number;
  
  /** セルフィーモード */
  selfieMode: boolean;
}

/**
 * 品質指標
 */
export interface QualityMetrics {
  /** 手の可視性（0-1） */
  handVisibility: number;
  
  /** ランドマーク安定性（0-1） */
  landmarkStability: number;
  
  /** カメラノイズレベル（0-1） */
  cameraNoise: number;
  
  /** 照明条件（0-1） */
  lightingCondition?: number;
  
  /** モーションブラー（0-1） */
  motionBlur?: number;
}
