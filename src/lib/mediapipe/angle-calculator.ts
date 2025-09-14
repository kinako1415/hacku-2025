/**
 * 角度計算ライブラリ
 * 3D/2Dポイント間の角度計算とリハビリテーション用角度測定
 */

import { NormalizedLandmark } from '@mediapipe/hands';

export interface Point2D {
  x: number;
  y: number;
}

export interface Point3D extends Point2D {
  z: number;
}

export interface AngleCalculationResult {
  angle: number; // 度数法（0-180°）
  confidence: number; // 計算信頼度（0-1）
  isValid: boolean; // 計算結果の有効性
}

export interface WristAngles {
  flexion: AngleCalculationResult; // 掌屈角度
  extension: AngleCalculationResult; // 背屈角度
  ulnarDeviation: AngleCalculationResult; // 尺屈角度
  radialDeviation: AngleCalculationResult; // 橈屈角度
}

export interface ThumbAngles {
  flexion: AngleCalculationResult; // 屈曲角度
  extension: AngleCalculationResult; // 伸展角度
  adduction: AngleCalculationResult; // 内転角度
  abduction: AngleCalculationResult; // 外転角度
}

export interface MotionAngles {
  wrist: WristAngles;
  thumb: ThumbAngles;
  overallConfidence: number; // 全体信頼度
}

/**
 * 角度計算の信頼度閾値
 */
export const ANGLE_CONFIDENCE_THRESHOLDS = {
  HIGH: 0.8, // 高信頼度
  MEDIUM: 0.6, // 中信頼度
  LOW: 0.4, // 低信頼度
  MIN_ACCEPTABLE: 0.3, // 最低許容信頼度
} as const;

/**
 * 2点間の距離を計算
 */
export const calculateDistance2D = (p1: Point2D, p2: Point2D): number => {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
};

/**
 * 3点間の距離を計算
 */
export const calculateDistance3D = (p1: Point3D, p2: Point3D): number => {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  const dz = p1.z - p2.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

/**
 * 3点による角度計算（2D）
 * @param vertex 頂点（角度の中心点）
 * @param point1 第1点
 * @param point2 第2点
 * @returns 角度（度数法、0-180°）
 */
export const calculateAngle2D = (
  vertex: Point2D,
  point1: Point2D,
  point2: Point2D
): AngleCalculationResult => {
  try {
    // ベクトル計算
    const vector1 = { x: point1.x - vertex.x, y: point1.y - vertex.y };
    const vector2 = { x: point2.x - vertex.x, y: point2.y - vertex.y };

    // ベクトルの大きさ
    const magnitude1 = Math.sqrt(vector1.x ** 2 + vector1.y ** 2);
    const magnitude2 = Math.sqrt(vector2.x ** 2 + vector2.y ** 2);

    // ゼロベクトルチェック
    if (magnitude1 < 1e-10 || magnitude2 < 1e-10) {
      return {
        angle: 0,
        confidence: 0,
        isValid: false,
      };
    }

    // 内積計算
    const dotProduct = vector1.x * vector2.x + vector1.y * vector2.y;

    // コサイン値計算
    const cosine = dotProduct / (magnitude1 * magnitude2);

    // コサイン値の範囲を制限（-1から1）
    const clampedCosine = Math.max(-1, Math.min(1, cosine));

    // 角度計算（ラジアンから度数法に変換）
    const angleRad = Math.acos(clampedCosine);
    const angleDeg = angleRad * (180 / Math.PI);

    // 信頼度計算（ベクトルの長さに基づく）
    const minLength = Math.min(magnitude1, magnitude2);
    const confidence = Math.min(1, minLength / 0.1); // 0.1を基準長さとする

    return {
      angle: Math.round(angleDeg * 100) / 100, // 小数点2桁で丸める
      confidence: Math.round(confidence * 100) / 100,
      isValid: confidence >= ANGLE_CONFIDENCE_THRESHOLDS.MIN_ACCEPTABLE,
    };
  } catch (error) {
    console.error('角度計算エラー:', error);
    return {
      angle: 0,
      confidence: 0,
      isValid: false,
    };
  }
};

/**
 * 3点による角度計算（3D）
 */
export const calculateAngle3D = (
  vertex: Point3D,
  point1: Point3D,
  point2: Point3D
): AngleCalculationResult => {
  try {
    // ベクトル計算
    const vector1 = {
      x: point1.x - vertex.x,
      y: point1.y - vertex.y,
      z: point1.z - vertex.z,
    };
    const vector2 = {
      x: point2.x - vertex.x,
      y: point2.y - vertex.y,
      z: point2.z - vertex.z,
    };

    // ベクトルの大きさ
    const magnitude1 = Math.sqrt(
      vector1.x ** 2 + vector1.y ** 2 + vector1.z ** 2
    );
    const magnitude2 = Math.sqrt(
      vector2.x ** 2 + vector2.y ** 2 + vector2.z ** 2
    );

    // ゼロベクトルチェック
    if (magnitude1 < 1e-10 || magnitude2 < 1e-10) {
      return {
        angle: 0,
        confidence: 0,
        isValid: false,
      };
    }

    // 内積計算
    const dotProduct =
      vector1.x * vector2.x + vector1.y * vector2.y + vector1.z * vector2.z;

    // コサイン値計算
    const cosine = dotProduct / (magnitude1 * magnitude2);

    // コサイン値の範囲を制限
    const clampedCosine = Math.max(-1, Math.min(1, cosine));

    // 角度計算
    const angleRad = Math.acos(clampedCosine);
    const angleDeg = angleRad * (180 / Math.PI);

    // 信頼度計算
    const minLength = Math.min(magnitude1, magnitude2);
    const confidence = Math.min(1, minLength / 0.1);

    return {
      angle: Math.round(angleDeg * 100) / 100,
      confidence: Math.round(confidence * 100) / 100,
      isValid: confidence >= ANGLE_CONFIDENCE_THRESHOLDS.MIN_ACCEPTABLE,
    };
  } catch (error) {
    console.error('3D角度計算エラー:', error);
    return {
      angle: 0,
      confidence: 0,
      isValid: false,
    };
  }
};

/**
 * MediaPipeランドマークを2Dポイントに変換
 */
export const landmarkToPoint2D = (landmark: NormalizedLandmark): Point2D => {
  return {
    x: landmark.x,
    y: landmark.y,
  };
};

/**
 * MediaPipeランドマークを3Dポイントに変換
 */
export const landmarkToPoint3D = (landmark: NormalizedLandmark): Point3D => {
  return {
    x: landmark.x,
    y: landmark.y,
    z: landmark.z || 0,
  };
};

/**
 * 手首屈曲・伸展角度の計算
 * @param wrist 手首ランドマーク
 * @param forearm 前腕基準点（肘など）
 * @param fingers 指先基準点（中指など）
 */
export const calculateWristFlexionExtension = (
  wrist: NormalizedLandmark,
  forearm: NormalizedLandmark,
  fingers: NormalizedLandmark
): AngleCalculationResult => {
  const wristPoint = landmarkToPoint2D(wrist);
  const forearmPoint = landmarkToPoint2D(forearm);
  const fingersPoint = landmarkToPoint2D(fingers);

  return calculateAngle2D(wristPoint, forearmPoint, fingersPoint);
};

/**
 * 手首尺屈・橈屈角度の計算
 * @param wrist 手首ランドマーク
 * @param ulnar 尺側基準点
 * @param radial 橈側基準点
 */
export const calculateWristDeviations = (
  wrist: NormalizedLandmark,
  ulnar: NormalizedLandmark,
  radial: NormalizedLandmark
): AngleCalculationResult => {
  const wristPoint = landmarkToPoint2D(wrist);
  const ulnarPoint = landmarkToPoint2D(ulnar);
  const radialPoint = landmarkToPoint2D(radial);

  return calculateAngle2D(wristPoint, ulnarPoint, radialPoint);
};

/**
 * 母指角度の計算
 * @param thumbBase 母指基部（CMC関節）
 * @param thumbMid 母指中間（MCP関節）
 * @param thumbTip 母指先端
 */
export const calculateThumbAngles = (
  thumbBase: NormalizedLandmark,
  thumbMid: NormalizedLandmark,
  thumbTip: NormalizedLandmark
): AngleCalculationResult => {
  const basePoint = landmarkToPoint2D(thumbBase);
  const midPoint = landmarkToPoint2D(thumbMid);
  const tipPoint = landmarkToPoint2D(thumbTip);

  return calculateAngle2D(midPoint, basePoint, tipPoint);
};

/**
 * 複数の角度結果の統合と信頼度計算
 */
export const combineAngleResults = (
  results: AngleCalculationResult[]
): AngleCalculationResult => {
  const validResults = results.filter((result) => result.isValid);

  if (validResults.length === 0) {
    return {
      angle: 0,
      confidence: 0,
      isValid: false,
    };
  }

  // 加重平均で角度を計算
  let totalWeightedAngle = 0;
  let totalWeight = 0;

  validResults.forEach((result) => {
    totalWeightedAngle += result.angle * result.confidence;
    totalWeight += result.confidence;
  });

  const averageAngle = totalWeight > 0 ? totalWeightedAngle / totalWeight : 0;
  const averageConfidence = totalWeight / validResults.length;

  return {
    angle: Math.round(averageAngle * 100) / 100,
    confidence: Math.round(averageConfidence * 100) / 100,
    isValid: averageConfidence >= ANGLE_CONFIDENCE_THRESHOLDS.MIN_ACCEPTABLE,
  };
};

/**
 * 角度の有効性判定
 */
export const isAngleValid = (
  result: AngleCalculationResult,
  minConfidence: number = ANGLE_CONFIDENCE_THRESHOLDS.MEDIUM
): boolean => {
  return result.isValid && result.confidence >= minConfidence;
};

/**
 * 角度変化の計算
 */
export const calculateAngleChange = (
  current: number,
  previous: number
): number => {
  return Math.round((current - previous) * 100) / 100;
};

/**
 * 角度変化率の計算（%）
 */
export const calculateAngleChangePercentage = (
  current: number,
  previous: number
): number => {
  if (previous === 0) return 0;
  return (
    Math.round(((current - previous) / Math.abs(previous)) * 100 * 100) / 100
  );
};
