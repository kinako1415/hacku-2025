/**
 * 統一角度計算ライブラリ
 * クリーンアーキテクチャ: インフラ層
 * 
 * 3つの既存angle-calculatorから最適な機能を統合:
 * - mediapipe/angle-calculator.ts: 信頼度計算、詳細な型定義
 * - motion-capture/angle-calculator.ts: 平滑化機能、WristAngles/ThumbAngles型
 * - utils/angle-calculator.ts: シンプルな計算、実用的な実装
 */

import { Point3D, HAND_LANDMARKS } from '@/core/domain/types/hand-landmark';
import {
  AngleCalculationResult,
  Vector3D,
  WristAngles,
} from '@/core/domain/types/angle';

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
 * 角度計算クラス
 * 全ての角度計算ロジックを統一的に提供
 */
export class AngleCalculator {
  /**
   * 2点間のベクトルを計算
   */
  private calculateVector(point1: Point3D, point2: Point3D): Vector3D {
    return {
      x: point2.x - point1.x,
      y: point2.y - point1.y,
      z: point2.z - point1.z,
    };
  }

  /**
   * ベクトルの大きさを計算
   */
  private vectorMagnitude(vector: Vector3D): number {
    return Math.sqrt(vector.x ** 2 + vector.y ** 2 + vector.z ** 2);
  }

  /**
   * ベクトルの内積を計算
   */
  private dotProduct(vector1: Vector3D, vector2: Vector3D): number {
    return vector1.x * vector2.x + vector1.y * vector2.y + vector1.z * vector2.z;
  }

  /**
   * 3点から角度を計算（中点が頂点）
   * @param vertex 頂点（角度の中心点）
   * @param point1 第1点
   * @param point2 第2点
   * @returns 角度計算結果（角度、信頼度、有効性）
   */
  public calculateAngle3Points(
    vertex: Point3D,
    point1: Point3D,
    point2: Point3D
  ): AngleCalculationResult {
    try {
      const vector1 = this.calculateVector(vertex, point1);
      const vector2 = this.calculateVector(vertex, point2);

      const magnitude1 = this.vectorMagnitude(vector1);
      const magnitude2 = this.vectorMagnitude(vector2);

      // ゼロベクトルチェック
      if (magnitude1 < 1e-10 || magnitude2 < 1e-10) {
        return {
          angle: 0,
          landmarks: [vertex, point1, point2],
          accuracy: 0,
          isValid: false,
        };
      }

      // 内積計算
      const dot = this.dotProduct(vector1, vector2);

      // コサイン値計算
      const cosAngle = dot / (magnitude1 * magnitude2);

      // コサイン値の範囲を制限（-1から1）
      const clampedCosAngle = Math.max(-1, Math.min(1, cosAngle));

      // 角度計算（ラジアンから度数法に変換）
      const angleRad = Math.acos(clampedCosAngle);
      const angleDeg = angleRad * (180 / Math.PI);

      // 信頼度計算（ベクトルの長さに基づく）
      const minLength = Math.min(magnitude1, magnitude2);
      const accuracy = Math.min(1, minLength / 0.1); // 0.1を基準長さとする

      return {
        angle: Math.round(angleDeg * 100) / 100, // 小数点2桁で丸める
        landmarks: [vertex, point1, point2],
        accuracy: Math.round(accuracy * 100) / 100,
        isValid: accuracy >= ANGLE_CONFIDENCE_THRESHOLDS.MIN_ACCEPTABLE,
      };
    } catch (error) {
      console.error('角度計算エラー:', error);
      return {
        angle: 0,
        landmarks: [vertex, point1, point2],
        accuracy: 0,
        isValid: false,
      };
    }
  }

  /**
   * 手首の掌屈・背屈角度を計算
   * Y軸との角度で測定
   * 
   * @param landmarks MediaPipe Handsランドマーク配列（21点）
   * @returns 掌屈・背屈角度（0-90度）
   */
  public calculateFlexionExtension(landmarks: Point3D[]): number {
    if (landmarks.length < 21) return 0;

    const wrist = landmarks[HAND_LANDMARKS.WRIST];
    const middleFingerMcp = landmarks[HAND_LANDMARKS.MIDDLE_FINGER_MCP];

    if (!wrist || !middleFingerMcp) return 0;

    // 手首から中指付け根への方向ベクトル
    const wristToMiddle = this.calculateVector(wrist, middleFingerMcp);

    // ベクトルの長さ
    const length = this.vectorMagnitude(wristToMiddle);
    if (length === 0) return 0;

    // Y方向の成分から角度を計算
    const angle = Math.asin(Math.abs(wristToMiddle.y) / length) * (180 / Math.PI);

    // 0-90度の範囲に制限
    return Math.min(Math.max(angle, 0), 90);
  }

  /**
   * 手首の尺屈・橈屈角度を計算
   * 手のひらの中心から手首までのベクトルと垂直ベクトルとの角度で測定
   * 
   * @param landmarks MediaPipe Handsランドマーク配列（21点）
   * @returns 尺屈・橈屈角度
   */
  public calculateRadialUlnarDeviation(landmarks: Point3D[]): number {
    if (landmarks.length < 21) return 0;

    const wrist = landmarks[HAND_LANDMARKS.WRIST];
    const indexMcp = landmarks[HAND_LANDMARKS.INDEX_FINGER_MCP];
    const middleMcp = landmarks[HAND_LANDMARKS.MIDDLE_FINGER_MCP];
    const ringMcp = landmarks[HAND_LANDMARKS.RING_FINGER_MCP];
    const pinkyMcp = landmarks[HAND_LANDMARKS.PINKY_MCP];

    if (!wrist || !indexMcp || !middleMcp || !ringMcp || !pinkyMcp) return 0;

    // 手のひらの中心を計算（4つの指の付け根の平均位置）
    const palmCenter: Point3D = {
      id: -1,
      x: (indexMcp.x + middleMcp.x + ringMcp.x + pinkyMcp.x) / 4,
      y: (indexMcp.y + middleMcp.y + ringMcp.y + pinkyMcp.y) / 4,
      z: (indexMcp.z + middleMcp.z + ringMcp.z + pinkyMcp.z) / 4,
    };

    // 手のひらの中心から手首へのベクトル
    const palmToWrist = this.calculateVector(palmCenter, wrist);

    // 垂直ベクトル（Y軸の負方向、中指を上に向けた方向）
    const verticalVector: Vector3D = { x: 0, y: -1, z: 0 };

    // ベクトルの長さ
    const palmToWristLength = this.vectorMagnitude(palmToWrist);
    if (palmToWristLength === 0) return 0;

    // 内積計算
    const dot = this.dotProduct(palmToWrist, verticalVector);

    // 角度計算
    const cosAngle = dot / palmToWristLength;
    const angle =
      Math.acos(Math.max(-1, Math.min(1, cosAngle))) * (180 / Math.PI) * -1 +
      180;

    return angle;
  }

  /**
   * 手首の全角度を計算
   * 掌屈、背屈、尺屈、橈屈の4方向を計算
   * 
   * @param landmarks MediaPipe Handsランドマーク配列（21点）
   * @returns 手首の4方向角度
   */
  public calculateWristAngles(landmarks: Point3D[]): WristAngles {
    if (landmarks.length < 21) {
      return {
        palmarFlexion: 0,
        dorsalFlexion: 0,
        ulnarDeviation: 0,
        radialDeviation: 0,
      };
    }

    const wrist = landmarks[HAND_LANDMARKS.WRIST];
    const indexMcp = landmarks[HAND_LANDMARKS.INDEX_FINGER_MCP];
    const middleMcp = landmarks[HAND_LANDMARKS.MIDDLE_FINGER_MCP];
    const ringMcp = landmarks[HAND_LANDMARKS.RING_FINGER_MCP];
    const pinkyMcp = landmarks[HAND_LANDMARKS.PINKY_MCP];

    if (!wrist || !indexMcp || !middleMcp || !ringMcp || !pinkyMcp) {
      return {
        palmarFlexion: 0,
        dorsalFlexion: 0,
        ulnarDeviation: 0,
        radialDeviation: 0,
      };
    }

    // 手のひらの中央点を計算
    const palmCenter: Point3D = {
      id: -1,
      x: (indexMcp.x + middleMcp.x + ringMcp.x + pinkyMcp.x) / 4,
      y: (indexMcp.y + middleMcp.y + ringMcp.y + pinkyMcp.y) / 4,
      z: (indexMcp.z + middleMcp.z + ringMcp.z + pinkyMcp.z) / 4,
    };

    // 手首から手のひら中央へのベクトル
    const wristToPalm = this.calculateVector(wrist, palmCenter);

    // 垂直ベクトル
    const verticalVector: Vector3D = { x: 0, y: -1, z: 0 };

    // 屈曲・伸展角度
    const flexionExtensionAngle = this.calculateFlexionExtension(landmarks);

    // 側屈角度
    const deviationAngle = this.calculateRadialUlnarDeviation(landmarks);

    // 方向を判定
    const palmarFlexion = wristToPalm.y > 0 ? flexionExtensionAngle : 0;
    const dorsalFlexion = wristToPalm.y < 0 ? flexionExtensionAngle : 0;
    const ulnarDeviation = wristToPalm.x < 0 ? deviationAngle : 0;
    const radialDeviation = wristToPalm.x > 0 ? deviationAngle : 0;

    return {
      palmarFlexion,
      dorsalFlexion,
      ulnarDeviation,
      radialDeviation,
    };
  }

  /**
   * 測定ステップに応じた角度を計算
   * 
   * @param landmarks MediaPipe Handsランドマーク配列（21点）
   * @param stepId 測定ステップID
   * @returns 計算された角度
   */
  public calculateAngleForStep(landmarks: Point3D[], stepId: string): number {
    switch (stepId) {
      case 'palmar-flexion':
      case 'dorsal-flexion':
        return this.calculateFlexionExtension(landmarks);
      case 'ulnar-deviation':
      case 'radial-deviation':
        return this.calculateRadialUlnarDeviation(landmarks);
      default:
        return 0;
    }
  }

  /**
   * ランドマークデータの有効性をチェック
   * 
   * @param landmarks MediaPipe Handsランドマーク配列
   * @returns 有効性フラグ
   */
  public validateLandmarks(landmarks: Point3D[]): boolean {
    if (!landmarks || landmarks.length < 21) {
      console.warn('ランドマーク数が不足:', landmarks?.length || 0);
      return false;
    }

    // 主要なランドマークが存在するかチェック
    const requiredLandmarks = [
      HAND_LANDMARKS.WRIST,
      HAND_LANDMARKS.THUMB_CMC,
      HAND_LANDMARKS.INDEX_FINGER_MCP,
      HAND_LANDMARKS.MIDDLE_FINGER_MCP,
      HAND_LANDMARKS.PINKY_MCP,
    ];

    return requiredLandmarks.every((index) => {
      const landmark = landmarks[index];
      return (
        landmark &&
        typeof landmark.x === 'number' &&
        typeof landmark.y === 'number' &&
        typeof landmark.z === 'number' &&
        !isNaN(landmark.x) &&
        !isNaN(landmark.y) &&
        !isNaN(landmark.z)
      );
    });
  }
}

/**
 * 角度データの平滑化クラス
 * 移動平均による角度の平滑化を実装
 */
export class AngleSmoothing {
  private history: number[] = [];
  private readonly maxHistory: number;

  constructor(maxHistory: number = 5) {
    this.maxHistory = maxHistory;
  }

  /**
   * 新しい角度を追加
   */
  public addAngle(angle: number): void {
    this.history.push(angle);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
  }

  /**
   * 平滑化された角度を取得
   */
  public getSmoothedAngle(): number | null {
    if (this.history.length === 0) {
      return null;
    }
    const sum = this.history.reduce((acc, val) => acc + val, 0);
    return sum / this.history.length;
  }

  /**
   * 履歴をリセット
   */
  public reset(): void {
    this.history = [];
  }
}

// デフォルトエクスポート：シングルトンインスタンス
export const angleCalculator = new AngleCalculator();
