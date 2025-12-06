/**
 * レガシーラッパー: src/lib/mediapipe/angle-calculator.ts
 * 後方互換性のため、既存の呼び出しコードを新実装にリダイレクト
 *
 * ⚠️ このファイルは後方互換性のために残されています
 * 新しいコードでは直接 @/core/infrastructure/mediapipe/angle-calculator を使用してください
 */

import { angleCalculator } from '@/core/infrastructure/mediapipe/angle-calculator';
import { NormalizedLandmark } from '@mediapipe/hands';

// 型定義の再エクスポート（既存コードとの互換性）
export interface Point2D {
  x: number;
  y: number;
}

// ローカル型定義（id不要）
export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface AngleCalculationResult {
  angle: number;
  confidence: number;
  isValid: boolean;
}

// measurement-service.tsで使用される型定義
export interface WristAngles {
  flexion: AngleCalculationResult;
  extension: AngleCalculationResult;
  ulnarDeviation: AngleCalculationResult;
  radialDeviation: AngleCalculationResult;
}

export interface ThumbAngles {
  flexion: AngleCalculationResult;
  extension: AngleCalculationResult;
  adduction: AngleCalculationResult;
  abduction: AngleCalculationResult;
  // 後方互換性のため残す
  cmcFlexion?: number;
  mcpFlexion?: number;
  ipFlexion?: number;
}

export interface MotionAngles {
  wrist: WristAngles;
  thumb: ThumbAngles;
  timestamp: number;
  overallConfidence?: number;
}

// レガシー関数のラッパー
export const calculateAngle3D = (
  vertex: Point3D,
  point1: Point3D,
  point2: Point3D
): AngleCalculationResult => {
  const result = angleCalculator.calculateAngle3Points(
    { ...vertex, id: 0 },
    { ...point1, id: 1 },
    { ...point2, id: 2 }
  );

  return {
    angle: result.angle,
    confidence: result.accuracy,
    isValid: result.isValid,
  };
};

// measurement-service.tsでの使用に合わせた3引数版
export const calculateWristFlexionExtension = (
  wrist: Point3D,
  elbow: Point3D,
  indexMcp: Point3D
): AngleCalculationResult => {
  return calculateAngle3D(wrist, elbow, indexMcp);
};

export const calculateWristDeviations = (
  wrist: Point3D,
  pinkyMcp: Point3D,
  indexMcp: Point3D
): AngleCalculationResult => {
  return calculateAngle3D(wrist, pinkyMcp, indexMcp);
};

// その他の関数も同様にラップ
export const landmarkToPoint3D = (landmark: NormalizedLandmark): Point3D => {
  return {
    x: landmark.x,
    y: landmark.y,
    z: landmark.z || 0,
  };
};

// measurement-service.tsでの使用に合わせた3引数版
export const calculateThumbAngles = (
  cmc: Point3D,
  mcp: Point3D,
  tip: Point3D
): ThumbAngles => {
  // CMC-MCP-TIP の角度を計算
  const cmcMcpTipAngle = calculateAngle3D(mcp, cmc, tip);
  
  return {
    flexion: cmcMcpTipAngle,
    extension: cmcMcpTipAngle,
    adduction: cmcMcpTipAngle,
    abduction: cmcMcpTipAngle,
    cmcFlexion: cmcMcpTipAngle.angle,
    mcpFlexion: cmcMcpTipAngle.angle,
    ipFlexion: cmcMcpTipAngle.angle,
  };
};

// 複数のAngleCalculationResultを平均化
export const combineAngleResults = (
  results: AngleCalculationResult[]
): AngleCalculationResult => {
  if (results.length === 0) {
    return {
      angle: 0,
      confidence: 0,
      isValid: false,
    };
  }

  const validResults = results.filter((r) => r.isValid);
  if (validResults.length === 0) {
    return {
      angle: 0,
      confidence: 0,
      isValid: false,
    };
  }

  const avgAngle =
    validResults.reduce((sum, r) => sum + r.angle, 0) / validResults.length;
  const avgConfidence =
    validResults.reduce((sum, r) => sum + r.confidence, 0) /
    validResults.length;

  return {
    angle: avgAngle,
    confidence: avgConfidence,
    isValid: true,
  };
};

// WristAnglesとThumbAnglesを組み合わせてMotionAnglesを作成
export const combineMotionAngles = (
  wrist: WristAngles,
  thumb: ThumbAngles
): MotionAngles => {
  return {
    wrist,
    thumb,
    timestamp: Date.now(),
  };
};

export const ANGLE_CONFIDENCE_THRESHOLDS = {
  high: 0.9,
  medium: 0.7,
  low: 0.5,
};
