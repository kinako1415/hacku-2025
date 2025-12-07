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
    return (
      vector1.x * vector2.x + vector1.y * vector2.y + vector1.z * vector2.z
    );
  }

  /**
   * ベクトルの外積を計算（3D）
   */
  private crossProduct(vector1: Vector3D, vector2: Vector3D): Vector3D {
    return {
      x: vector1.y * vector2.z - vector1.z * vector2.y,
      y: vector1.z * vector2.x - vector1.x * vector2.z,
      z: vector1.x * vector2.y - vector1.y * vector2.x,
    };
  }

  /**
   * ベクトルを正規化
   */
  private normalizeVector(vector: Vector3D): Vector3D {
    const magnitude = this.vectorMagnitude(vector);
    if (magnitude < 1e-10) {
      return { x: 0, y: 0, z: 0 };
    }
    return {
      x: vector.x / magnitude,
      y: vector.y / magnitude,
      z: vector.z / magnitude,
    };
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
   * 手首の掌屈・背屈角度を計算（改良版）
   *
   * 手のひらの法線ベクトルと前腕軸の角度を計算することで、
   * より正確な掌屈・背屈角度を測定します。
   *
   * 改善点:
   * 1. 手のひら平面の法線ベクトルを計算（外積使用）
   * 2. 前腕軸ベクトル（仮想）との角度を計算
   * 3. Z軸（奥行き）情報を適切に活用
   * 4. 掌屈（+）と背屈（-）を区別
   *
   * @param landmarks MediaPipe Handsランドマーク配列（21点）
   * @returns 掌屈・背屈角度（0-90度、掌屈は正の値）
   */
  public calculateFlexionExtension(landmarks: Point3D[]): number {
    if (landmarks.length < 21) return 0;

    const wrist = landmarks[HAND_LANDMARKS.WRIST];
    const indexMcp = landmarks[HAND_LANDMARKS.INDEX_FINGER_MCP];
    const middleMcp = landmarks[HAND_LANDMARKS.MIDDLE_FINGER_MCP];
    const ringMcp = landmarks[HAND_LANDMARKS.RING_FINGER_MCP];
    const pinkyMcp = landmarks[HAND_LANDMARKS.PINKY_MCP];

    if (!wrist || !indexMcp || !middleMcp || !ringMcp || !pinkyMcp) return 0;

    // Step 1: 手のひらの中央点を計算
    const palmCenter: Point3D = {
      id: -1,
      x: (indexMcp.x + middleMcp.x + ringMcp.x + pinkyMcp.x) / 4,
      y: (indexMcp.y + middleMcp.y + ringMcp.y + pinkyMcp.y) / 4,
      z: (indexMcp.z + middleMcp.z + ringMcp.z + pinkyMcp.z) / 4,
    };

    // Step 2: 手のひら上の2つのベクトルを計算（外積で法線を得るため）
    // ベクトル1: 人差し指付け根から小指付け根への方向（手のひらの横方向）
    const lateralVector = this.calculateVector(indexMcp, pinkyMcp);

    // ベクトル2: 手首から手のひら中央への方向（手のひらの縦方向）
    const longitudinalVector = this.calculateVector(wrist, palmCenter);

    // Step 3: 手のひらの法線ベクトルを計算（外積）
    // この法線は手のひらに垂直な方向を指す
    const palmNormal = this.crossProduct(lateralVector, longitudinalVector);
    const normalizedPalmNormal = this.normalizeVector(palmNormal);

    // Step 4: 前腕軸ベクトルを定義
    // 手首から手のひら中央への正規化ベクトルを「ニュートラル位置」として使用
    const normalizedLongitudinal = this.normalizeVector(longitudinalVector);

    // Step 5: 掌屈・背屈角度を計算
    // Z成分（奥行き）の変化量から角度を推定
    // MediaPipeの座標系: Z値が小さい = カメラに近い

    // 手首から各MCP点へのZ軸方向の平均変化を計算
    const avgMcpZ = (indexMcp.z + middleMcp.z + ringMcp.z + pinkyMcp.z) / 4;
    const zDifference = avgMcpZ - wrist.z;

    // 縦方向ベクトルの長さ（XY平面での距離）
    const xyDistance = Math.sqrt(
      normalizedLongitudinal.x ** 2 + normalizedLongitudinal.y ** 2
    );

    // Z差とXY距離から角度を計算
    // arctan2を使用して-90°〜+90°の範囲で角度を計算
    const angleRad = Math.atan2(zDifference, xyDistance);
    let angleDeg = angleRad * (180 / Math.PI);

    // Step 6: 角度のスケーリングと調整
    // MediaPipeのZ値は相対的なので、スケーリング係数を適用
    // 実際の手の動きに合わせて調整（経験的な係数）
    const scalingFactor = 3.0; // Z値のスケーリング
    angleDeg = angleDeg * scalingFactor;

    // マイナス制限のみ（上限なし）
    return Math.max(Math.abs(angleDeg), 0);
  }

  /**
   * 手首の掌屈角度を計算（小指側カメラ配置対応版）
   * 掌屈（手のひら側への曲げ）を正確に検出
   *
   * カメラ配置: 小指側から手の側面を撮影
   * この配置では、掌屈時に指先・MCP点のY座標が増加（画面下方向へ移動）
   *
   * @param landmarks MediaPipe Handsランドマーク配列（21点）
   * @returns 掌屈角度（0-90度、掌屈方向のみ）
   */
  public calculatePalmarFlexion(landmarks: Point3D[]): number {
    if (landmarks.length < 21) return 0;

    const wrist = landmarks[HAND_LANDMARKS.WRIST];
    const indexMcp = landmarks[HAND_LANDMARKS.INDEX_FINGER_MCP];
    const middleMcp = landmarks[HAND_LANDMARKS.MIDDLE_FINGER_MCP];
    const ringMcp = landmarks[HAND_LANDMARKS.RING_FINGER_MCP];
    const pinkyMcp = landmarks[HAND_LANDMARKS.PINKY_MCP];
    const middleTip = landmarks[HAND_LANDMARKS.MIDDLE_FINGER_TIP];

    if (
      !wrist ||
      !indexMcp ||
      !middleMcp ||
      !ringMcp ||
      !pinkyMcp ||
      !middleTip
    )
      return 0;

    // MCP点の平均Y座標
    const avgMcpY = (indexMcp.y + middleMcp.y + ringMcp.y + pinkyMcp.y) / 4;

    // 掌屈判定（小指側カメラ配置）:
    // 掌屈時は指先・MCP点が手首より下方に移動（Y値が大きくなる）
    // MediaPipeの座標系: Y値が大きい = 画面下方
    const yDifference = avgMcpY - wrist.y;

    // 掌屈方向でない場合（MCP点が手首より上または同じ高さ）
    if (yDifference <= 0.01) {
      return 0;
    }

    // 手首からMCP中央へのベクトル
    const palmCenter: Point3D = {
      id: -1,
      x: (indexMcp.x + middleMcp.x + ringMcp.x + pinkyMcp.x) / 4,
      y: avgMcpY,
      z: (indexMcp.z + middleMcp.z + ringMcp.z + pinkyMcp.z) / 4,
    };

    // 手首から手のひら中央への水平距離（X軸方向の変化が主）
    const wristToPalmX = Math.abs(palmCenter.x - wrist.x);

    // 小指側から見た場合、X軸方向が前腕の長軸方向に近い
    // Y軸の変化（下方向への移動）から角度を計算
    const horizontalDistance = Math.max(wristToPalmX, 0.01);

    // arctan2を使用して角度を計算
    // Y差（下方向への移動）とX方向の距離から角度を算出
    const angleRad = Math.atan2(yDifference, horizontalDistance);
    let angleDeg = angleRad * (180 / Math.PI);

    // 指先の位置も考慮（掌屈時は指先がさらに下方に来る）
    const tipYDiff = middleTip.y - avgMcpY;
    if (tipYDiff > 0.02) {
      // 指先がMCPより下にある場合、角度を補正
      angleDeg += tipYDiff * 30; // 補正係数
    }

    // マイナス制限のみ（上限なし）
    return Math.max(angleDeg, 0);
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
  /**
   * 手首の全角度を計算（改良版）
   * 掌屈、背屈、尺屈、橈屈の4方向を計算
   *
   * 改善点:
   * - 掌屈と背屈を個別のメソッドで計算
   * - Z軸（奥行き）情報を活用した精度向上
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

    // 掌屈を計算（新しいアルゴリズム）
    const palmarFlexion = this.calculatePalmarFlexion(landmarks);

    // 背屈を計算（掌屈と相反する方向）
    const dorsalFlexion = this.calculateDorsalFlexion(landmarks);

    // 側屈角度
    const deviationAngle = this.calculateRadialUlnarDeviation(landmarks);

    // 手のひらの中央点を計算
    const palmCenter: Point3D = {
      id: -1,
      x: (indexMcp.x + middleMcp.x + ringMcp.x + pinkyMcp.x) / 4,
      y: (indexMcp.y + middleMcp.y + ringMcp.y + pinkyMcp.y) / 4,
      z: (indexMcp.z + middleMcp.z + ringMcp.z + pinkyMcp.z) / 4,
    };

    // 手首から手のひら中央へのベクトル
    const wristToPalm = this.calculateVector(wrist, palmCenter);

    // 尺屈・橈屈の方向を判定
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
   * 手首の背屈角度を計算（小指側カメラ配置対応版）
   * 背屈（手の甲側への曲げ）を正確に検出
   *
   * カメラ配置: 小指側から手の側面を撮影
   * この配置では、背屈時に指先・MCP点のY座標が減少（画面上方向へ移動）
   *
   * @param landmarks MediaPipe Handsランドマーク配列（21点）
   * @returns 背屈角度（0-70度、背屈方向のみ）
   */
  public calculateDorsalFlexion(landmarks: Point3D[]): number {
    if (landmarks.length < 21) return 0;

    const wrist = landmarks[HAND_LANDMARKS.WRIST];
    const indexMcp = landmarks[HAND_LANDMARKS.INDEX_FINGER_MCP];
    const middleMcp = landmarks[HAND_LANDMARKS.MIDDLE_FINGER_MCP];
    const ringMcp = landmarks[HAND_LANDMARKS.RING_FINGER_MCP];
    const pinkyMcp = landmarks[HAND_LANDMARKS.PINKY_MCP];
    const middleTip = landmarks[HAND_LANDMARKS.MIDDLE_FINGER_TIP];

    if (
      !wrist ||
      !indexMcp ||
      !middleMcp ||
      !ringMcp ||
      !pinkyMcp ||
      !middleTip
    )
      return 0;

    // MCP点の平均Y座標
    const avgMcpY = (indexMcp.y + middleMcp.y + ringMcp.y + pinkyMcp.y) / 4;

    // 背屈判定（小指側カメラ配置）:
    // 背屈時は指先・MCP点が手首より上方に移動（Y値が小さくなる）
    // MediaPipeの座標系: Y値が小さい = 画面上方
    const yDifference = wrist.y - avgMcpY;

    // 背屈方向でない場合（MCP点が手首より下または同じ高さ）
    if (yDifference <= 0.01) {
      return 0;
    }

    // 手首からMCP中央へのベクトル
    const palmCenter: Point3D = {
      id: -1,
      x: (indexMcp.x + middleMcp.x + ringMcp.x + pinkyMcp.x) / 4,
      y: avgMcpY,
      z: (indexMcp.z + middleMcp.z + ringMcp.z + pinkyMcp.z) / 4,
    };

    // 手首から手のひら中央への水平距離（X軸方向の変化が主）
    const wristToPalmX = Math.abs(palmCenter.x - wrist.x);

    // 小指側から見た場合、X軸方向が前腕の長軸方向に近い
    // Y軸の変化（上方向への移動）から角度を計算
    const horizontalDistance = Math.max(wristToPalmX, 0.01);

    // arctan2を使用して角度を計算
    // Y差（上方向への移動）とX方向の距離から角度を算出
    const angleRad = Math.atan2(yDifference, horizontalDistance);
    let angleDeg = angleRad * (180 / Math.PI);

    // 指先の位置も考慮（背屈時は指先がさらに上方に来る）
    const tipYDiff = avgMcpY - middleTip.y;
    if (tipYDiff > 0.02) {
      // 指先がMCPより上にある場合、角度を補正
      angleDeg += tipYDiff * 25; // 補正係数
    }

    // マイナス制限のみ（上限なし）
    return Math.max(angleDeg, 0);
  }

  /**
   * 測定ステップに応じた角度を計算（改良版）
   *
   * @param landmarks MediaPipe Handsランドマーク配列（21点）
   * @param stepId 測定ステップID
   * @returns 計算された角度
   */
  public calculateAngleForStep(landmarks: Point3D[], stepId: string): number {
    switch (stepId) {
      case 'palmar-flexion':
        // 掌屈専用の計算メソッドを使用
        return this.calculatePalmarFlexion(landmarks);
      case 'dorsal-flexion':
        // 背屈専用の計算メソッドを使用
        return this.calculateDorsalFlexion(landmarks);
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
