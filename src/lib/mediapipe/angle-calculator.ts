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

export const calculateFlexionExtension = (landmarks: Point3D[]): number => {
  const convertedLandmarks = landmarks.map((lm, index) => ({
    ...lm,
    id: index,
  }));
  return angleCalculator.calculateFlexionExtension(convertedLandmarks);
};

export const calculateRadialUlnarDeviation = (landmarks: Point3D[]): number => {
  const convertedLandmarks = landmarks.map((lm, index) => ({
    ...lm,
    id: index,
  }));
  return angleCalculator.calculateRadialUlnarDeviation(convertedLandmarks);
};

// その他の関数も同様にラップ
export const landmarkToPoint3D = (landmark: NormalizedLandmark): Point3D => {
  return {
    x: landmark.x,
    y: landmark.y,
    z: landmark.z || 0,
  };
};
