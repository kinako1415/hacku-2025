/**
 * 角度計算関連の型定義
 * クリーンアーキテクチャ: ドメイン層
 */

import { Point3D } from './hand-landmark';

/**
 * 角度計算結果
 */
export interface AngleCalculationResult {
  /** 計算された角度（度） */
  angle: number;
  
  /** 計算に使用したランドマーク */
  landmarks: Point3D[];
  
  /** 計算精度（0-1） */
  accuracy: number;
  
  /** 有効性フラグ */
  isValid: boolean;
}

/**
 * ベクトル（3次元）
 */
export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

/**
 * 角度計算設定
 */
export interface AngleCalculationConfig {
  /** 最小角度（度） */
  minAngle: number;
  
  /** 最大角度（度） */
  maxAngle: number;
  
  /** 精度閾値（0-1） */
  accuracyThreshold: number;
}

/**
 * 手首角度データ
 */
export interface WristAngles {
  /** 掌屈角度（0-90度） */
  palmarFlexion: number;
  
  /** 背屈角度（0-70度） */
  dorsalFlexion: number;
  
  /** 尺屈角度（0-45度） */
  ulnarDeviation: number;
  
  /** 橈屈角度（0-45度） */
  radialDeviation: number;
  
  /** 回内角度（0-90度）- 手のひらを下に向ける動作 */
  pronation?: number;
  
  /** 回外角度（0-90度）- 手のひらを上に向ける動作 */
  supination?: number;
}

/**
 * 角度検証ルール
 */
export interface AngleValidationRules {
  /** ステップごとの角度範囲 */
  ranges: Record<string, { min: number; max: number }>;
  
  /** 許容誤差（度） */
  tolerance: number;
}
