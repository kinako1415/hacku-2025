/**
 * ユニットテスト: 角度計算精度
 *
 * テスト対象:
 * - 3点ベクトル角度計算の精度
 * - エッジケースの処理
 * - 手首と親指の関節角度計算
 * - MediaPipeランドマークデータの処理
 */

import { describe, test, expect, beforeEach } from '@jest/globals';

// テスト対象の型定義
interface Point3D {
  x: number;
  y: number;
  z: number;
}

interface Point2D {
  x: number;
  y: number;
}

// 角度計算関数（実装予定のもの）
const calculateAngle3D = (
  p1: Point3D,
  vertex: Point3D,
  p2: Point3D
): number => {
  // ベクトル計算
  const v1 = {
    x: p1.x - vertex.x,
    y: p1.y - vertex.y,
    z: p1.z - vertex.z,
  };

  const v2 = {
    x: p2.x - vertex.x,
    y: p2.y - vertex.y,
    z: p2.z - vertex.z,
  };

  // 内積
  const dotProduct = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;

  // ベクトルの大きさ
  const magnitude1 = Math.sqrt(v1.x ** 2 + v1.y ** 2 + v1.z ** 2);
  const magnitude2 = Math.sqrt(v2.x ** 2 + v2.y ** 2 + v2.z ** 2);

  // ゼロベクトルチェック
  if (magnitude1 === 0 || magnitude2 === 0) {
    return 0;
  }

  // コサイン値
  const cosineValue = dotProduct / (magnitude1 * magnitude2);

  // 数値誤差で範囲外になることを防ぐ
  const clampedCosine = Math.max(-1, Math.min(1, cosineValue));

  // ラジアンから度に変換
  return Math.acos(clampedCosine) * (180 / Math.PI);
};

const calculateAngle2D = (
  p1: Point2D,
  vertex: Point2D,
  p2: Point2D
): number => {
  const v1 = {
    x: p1.x - vertex.x,
    y: p1.y - vertex.y,
  };

  const v2 = {
    x: p2.x - vertex.x,
    y: p2.y - vertex.y,
  };

  const dotProduct = v1.x * v2.x + v1.y * v2.y;
  const magnitude1 = Math.sqrt(v1.x ** 2 + v1.y ** 2);
  const magnitude2 = Math.sqrt(v2.x ** 2 + v2.y ** 2);

  if (magnitude1 === 0 || magnitude2 === 0) {
    return 0;
  }

  const cosineValue = dotProduct / (magnitude1 * magnitude2);
  const clampedCosine = Math.max(-1, Math.min(1, cosineValue));

  return Math.acos(clampedCosine) * (180 / Math.PI);
};

// 手首屈曲角度計算（特定のランドマークを使用）
const calculateWristFlexionAngle = (landmarks: Point3D[]): number => {
  // MediaPipeのランドマークインデックス
  const WRIST = 0;
  const MIDDLE_FINGER_MCP = 9; // 中指の付け根
  const MIDDLE_FINGER_TIP = 12; // 中指の先端

  if (landmarks.length < 21) {
    throw new Error('Invalid landmarks: 21 points required');
  }

  const wrist = landmarks[WRIST];
  const mcp = landmarks[MIDDLE_FINGER_MCP];
  const tip = landmarks[MIDDLE_FINGER_TIP];

  if (!wrist || !mcp || !tip) {
    throw new Error('Required landmarks not found');
  }

  return calculateAngle3D(tip, wrist, mcp);
};

// 親指関節角度計算
const calculateThumbJointAngle = (landmarks: Point3D[]): number => {
  // MediaPipeのランドマークインデックス
  const THUMB_CMC = 1; // 親指の手根中手関節
  const THUMB_MCP = 2; // 親指の中手指節関節
  const THUMB_IP = 3; // 親指の指節間関節

  if (landmarks.length < 21) {
    throw new Error('Invalid landmarks: 21 points required');
  }

  const cmc = landmarks[THUMB_CMC];
  const mcp = landmarks[THUMB_MCP];
  const ip = landmarks[THUMB_IP];

  if (!cmc || !mcp || !ip) {
    throw new Error('Required landmarks not found');
  }

  return calculateAngle3D(cmc, mcp, ip);
};

// 手首伸展角度計算
const calculateWristExtensionAngle = (landmarks: Point3D[]): number => {
  // MediaPipeのランドマークインデックス
  const WRIST = 0; // 手首
  const MIDDLE_FINGER_MCP = 9; // 中指の中手指節関節
  const MIDDLE_FINGER_TIP = 12; // 中指の先端

  if (landmarks.length < 21) {
    throw new Error('Invalid landmarks: 21 points required');
  }

  const wrist = landmarks[WRIST];
  const mcp = landmarks[MIDDLE_FINGER_MCP];
  const tip = landmarks[MIDDLE_FINGER_TIP];

  if (!wrist || !mcp || !tip) {
    throw new Error('Required landmarks not found');
  }

  return calculateAngle3D(tip, wrist, mcp);
};

// 新しい尺屈・橈屈角度計算（手のひら中心から手首へのベクトルと垂直ベクトルの角度）
const calculateRadialUlnarDeviationAngle = (landmarks: Point3D[]): number => {
  if (landmarks.length < 21) {
    throw new Error('Invalid landmarks: 21 points required');
  }

  const WRIST = 0;
  const INDEX_FINGER_MCP = 5;
  const MIDDLE_FINGER_MCP = 9;
  const RING_FINGER_MCP = 13;
  const PINKY_MCP = 17;

  const wrist = landmarks[WRIST];
  const indexMcp = landmarks[INDEX_FINGER_MCP];
  const middleMcp = landmarks[MIDDLE_FINGER_MCP];
  const ringMcp = landmarks[RING_FINGER_MCP];
  const pinkyMcp = landmarks[PINKY_MCP];

  if (!wrist || !indexMcp || !middleMcp || !ringMcp || !pinkyMcp) {
    throw new Error('Required landmarks not found');
  }

  // 手のひらの中心を計算（4つの指の付け根の平均位置）
  const palmCenter = {
    x: (indexMcp.x + middleMcp.x + ringMcp.x + pinkyMcp.x) / 4,
    y: (indexMcp.y + middleMcp.y + ringMcp.y + pinkyMcp.y) / 4,
    z: (indexMcp.z + middleMcp.z + ringMcp.z + pinkyMcp.z) / 4,
  };

  // 手のひらの中心から手首へのベクトル
  const palmToWrist = {
    x: wrist.x - palmCenter.x,
    y: wrist.y - palmCenter.y,
    z: wrist.z - palmCenter.z,
  };

  // 垂直ベクトル（Y軸の負方向、中指を上に向けた方向）
  const verticalVector = { x: 0, y: -1, z: 0 };

  // ベクトルの長さを計算
  const palmToWristLength = Math.sqrt(
    palmToWrist.x ** 2 + palmToWrist.y ** 2 + palmToWrist.z ** 2
  );

  if (palmToWristLength === 0) return 0;

  // 内積を計算
  const dotProduct =
    palmToWrist.x * verticalVector.x +
    palmToWrist.y * verticalVector.y +
    palmToWrist.z * verticalVector.z;

  // 角度を計算（ラジアンから度に変換）
  const cosAngle = dotProduct / palmToWristLength;
  const angle =
    Math.acos(Math.max(-1, Math.min(1, cosAngle))) * (180 / Math.PI);

  return angle;
};

// 角度の正規化（0-180度の範囲に）
const normalizeAngle = (angle: number): number => {
  if (angle < 0) return 0;
  if (angle > 180) return 180;
  return angle;
};

// ランドマークデータの検証
const validateLandmarks = (landmarks: Point3D[]): boolean => {
  if (!Array.isArray(landmarks) || landmarks.length !== 21) {
    return false;
  }

  return landmarks.every(
    (point) =>
      typeof point.x === 'number' &&
      typeof point.y === 'number' &&
      typeof point.z === 'number' &&
      !isNaN(point.x) &&
      !isNaN(point.y) &&
      !isNaN(point.z)
  );
};

describe('角度計算精度テスト', () => {
  let mockLandmarks: Point3D[];

  beforeEach(() => {
    // MediaPipeの標準的な手のランドマーク21点をモック
    mockLandmarks = [
      { x: 0.5, y: 0.7, z: 0.0 }, // 0: WRIST
      { x: 0.45, y: 0.65, z: 0.02 }, // 1: THUMB_CMC
      { x: 0.4, y: 0.6, z: 0.04 }, // 2: THUMB_MCP
      { x: 0.35, y: 0.55, z: 0.06 }, // 3: THUMB_IP
      { x: 0.3, y: 0.5, z: 0.08 }, // 4: THUMB_TIP
      { x: 0.48, y: 0.55, z: 0.01 }, // 5: INDEX_FINGER_MCP
      { x: 0.46, y: 0.45, z: 0.02 }, // 6: INDEX_FINGER_PIP
      { x: 0.44, y: 0.4, z: 0.03 }, // 7: INDEX_FINGER_DIP
      { x: 0.42, y: 0.35, z: 0.04 }, // 8: INDEX_FINGER_TIP
      { x: 0.5, y: 0.55, z: 0.0 }, // 9: MIDDLE_FINGER_MCP
      { x: 0.48, y: 0.4, z: 0.01 }, // 10: MIDDLE_FINGER_PIP
      { x: 0.46, y: 0.35, z: 0.02 }, // 11: MIDDLE_FINGER_DIP
      { x: 0.44, y: 0.3, z: 0.03 }, // 12: MIDDLE_FINGER_TIP
      { x: 0.52, y: 0.55, z: 0.0 }, // 13: RING_FINGER_MCP
      { x: 0.54, y: 0.45, z: 0.01 }, // 14: RING_FINGER_PIP
      { x: 0.56, y: 0.4, z: 0.02 }, // 15: RING_FINGER_DIP
      { x: 0.58, y: 0.35, z: 0.03 }, // 16: RING_FINGER_TIP
      { x: 0.55, y: 0.6, z: -0.01 }, // 17: PINKY_MCP
      { x: 0.57, y: 0.5, z: 0.0 }, // 18: PINKY_PIP
      { x: 0.59, y: 0.45, z: 0.01 }, // 19: PINKY_DIP
      { x: 0.61, y: 0.4, z: 0.02 }, // 20: PINKY_TIP
    ];
  });

  describe('基本的な角度計算', () => {
    test('直角（90度）を正確に計算する', () => {
      const p1: Point3D = { x: 1, y: 0, z: 0 };
      const vertex: Point3D = { x: 0, y: 0, z: 0 };
      const p2: Point3D = { x: 0, y: 1, z: 0 };

      const angle = calculateAngle3D(p1, vertex, p2);
      expect(angle).toBeCloseTo(90, 1);
    });

    test('180度（直線）を正確に計算する', () => {
      const p1: Point3D = { x: -1, y: 0, z: 0 };
      const vertex: Point3D = { x: 0, y: 0, z: 0 };
      const p2: Point3D = { x: 1, y: 0, z: 0 };

      const angle = calculateAngle3D(p1, vertex, p2);
      expect(angle).toBeCloseTo(180, 1);
    });

    test('0度（同一方向）を正確に計算する', () => {
      const p1: Point3D = { x: 1, y: 0, z: 0 };
      const vertex: Point3D = { x: 0, y: 0, z: 0 };
      const p2: Point3D = { x: 2, y: 0, z: 0 };

      const angle = calculateAngle3D(p1, vertex, p2);
      expect(angle).toBeCloseTo(0, 1);
    });

    test('45度を正確に計算する', () => {
      const p1: Point3D = { x: 1, y: 0, z: 0 };
      const vertex: Point3D = { x: 0, y: 0, z: 0 };
      const p2: Point3D = { x: 1, y: 1, z: 0 };

      const angle = calculateAngle3D(p1, vertex, p2);
      expect(angle).toBeCloseTo(45, 1);
    });

    test('135度を正確に計算する', () => {
      const p1: Point3D = { x: 1, y: 0, z: 0 };
      const vertex: Point3D = { x: 0, y: 0, z: 0 };
      const p2: Point3D = { x: -1, y: 1, z: 0 };

      const angle = calculateAngle3D(p1, vertex, p2);
      expect(angle).toBeCloseTo(135, 1);
    });
  });

  describe('3D空間での角度計算', () => {
    test('Z軸を含む3D角度を正確に計算する', () => {
      const p1: Point3D = { x: 1, y: 0, z: 0 };
      const vertex: Point3D = { x: 0, y: 0, z: 0 };
      const p2: Point3D = { x: 0, y: 0, z: 1 };

      const angle = calculateAngle3D(p1, vertex, p2);
      expect(angle).toBeCloseTo(90, 1);
    });

    test('複雑な3D角度を計算する', () => {
      const p1: Point3D = { x: 1, y: 1, z: 1 };
      const vertex: Point3D = { x: 0, y: 0, z: 0 };
      const p2: Point3D = { x: 1, y: -1, z: 1 };

      const angle = calculateAngle3D(p1, vertex, p2);
      expect(angle).toBeGreaterThan(0);
      expect(angle).toBeLessThan(180);
    });
  });

  describe('エッジケースの処理', () => {
    test('ゼロベクトルの場合に0度を返す', () => {
      const p1: Point3D = { x: 0, y: 0, z: 0 };
      const vertex: Point3D = { x: 0, y: 0, z: 0 };
      const p2: Point3D = { x: 1, y: 0, z: 0 };

      const angle = calculateAngle3D(p1, vertex, p2);
      expect(angle).toBe(0);
    });

    test('非常に小さな値での計算精度', () => {
      const p1: Point3D = { x: 0.0001, y: 0, z: 0 };
      const vertex: Point3D = { x: 0, y: 0, z: 0 };
      const p2: Point3D = { x: 0, y: 0.0001, z: 0 };

      const angle = calculateAngle3D(p1, vertex, p2);
      expect(angle).toBeCloseTo(90, 1);
    });

    test('非常に大きな値での計算精度', () => {
      const p1: Point3D = { x: 1000000, y: 0, z: 0 };
      const vertex: Point3D = { x: 0, y: 0, z: 0 };
      const p2: Point3D = { x: 0, y: 1000000, z: 0 };

      const angle = calculateAngle3D(p1, vertex, p2);
      expect(angle).toBeCloseTo(90, 1);
    });

    test('負の座標値での計算', () => {
      const p1: Point3D = { x: -1, y: -1, z: -1 };
      const vertex: Point3D = { x: 0, y: 0, z: 0 };
      const p2: Point3D = { x: 1, y: 1, z: 1 };

      const angle = calculateAngle3D(p1, vertex, p2);
      expect(angle).toBeCloseTo(180, 1);
    });
  });

  describe('MediaPipeランドマークでの実用例', () => {
    let mockLandmarks: Point3D[];

    beforeEach(() => {
      // MediaPipeの標準的な手のランドマーク21点をモック
      mockLandmarks = [
        { x: 0.5, y: 0.7, z: 0.0 }, // 0: WRIST
        { x: 0.45, y: 0.65, z: 0.02 }, // 1: THUMB_CMC
        { x: 0.4, y: 0.6, z: 0.04 }, // 2: THUMB_MCP
        { x: 0.35, y: 0.55, z: 0.06 }, // 3: THUMB_IP
        { x: 0.3, y: 0.5, z: 0.08 }, // 4: THUMB_TIP
        { x: 0.48, y: 0.55, z: 0.01 }, // 5: INDEX_FINGER_MCP
        { x: 0.46, y: 0.45, z: 0.02 }, // 6: INDEX_FINGER_PIP
        { x: 0.44, y: 0.4, z: 0.03 }, // 7: INDEX_FINGER_DIP
        { x: 0.42, y: 0.35, z: 0.04 }, // 8: INDEX_FINGER_TIP
        { x: 0.5, y: 0.55, z: 0.0 }, // 9: MIDDLE_FINGER_MCP
        { x: 0.48, y: 0.4, z: 0.01 }, // 10: MIDDLE_FINGER_PIP
        { x: 0.46, y: 0.35, z: 0.02 }, // 11: MIDDLE_FINGER_DIP
        { x: 0.44, y: 0.3, z: 0.03 }, // 12: MIDDLE_FINGER_TIP
        { x: 0.52, y: 0.55, z: 0.0 }, // 13: RING_FINGER_MCP
        { x: 0.54, y: 0.45, z: 0.01 }, // 14: RING_FINGER_PIP
        { x: 0.56, y: 0.4, z: 0.02 }, // 15: RING_FINGER_DIP
        { x: 0.58, y: 0.35, z: 0.03 }, // 16: RING_FINGER_TIP
        { x: 0.55, y: 0.6, z: -0.01 }, // 17: PINKY_MCP
        { x: 0.57, y: 0.5, z: 0.0 }, // 18: PINKY_PIP
        { x: 0.59, y: 0.45, z: 0.01 }, // 19: PINKY_DIP
        { x: 0.61, y: 0.4, z: 0.02 }, // 20: PINKY_TIP
      ];
    });

    test('手首屈曲角度が有効な範囲で計算される', () => {
      const angle = calculateWristFlexionAngle(mockLandmarks);

      expect(angle).toBeGreaterThan(0);
      expect(angle).toBeLessThan(180);
      expect(typeof angle).toBe('number');
      expect(isNaN(angle)).toBe(false);
    });

    test('親指関節角度が有効な範囲で計算される', () => {
      const angle = calculateThumbJointAngle(mockLandmarks);

      expect(angle).toBeGreaterThan(0);
      expect(angle).toBeLessThan(180);
      expect(typeof angle).toBe('number');
      expect(isNaN(angle)).toBe(false);
    });

    test('新しい尺屈・橈屈角度計算の精度テスト', () => {
      const angle = calculateRadialUlnarDeviationAngle(mockLandmarks);

      expect(angle).toBeGreaterThanOrEqual(0);
      expect(angle).toBeLessThanOrEqual(180);
      expect(typeof angle).toBe('number');
      expect(isNaN(angle)).toBe(false);
    });

    test('中指が上を向いた理想的な状態でのテスト', () => {
      // 手のひらを正面に向け、中指を上に向けた理想的な位置
      const idealLandmarks: Point3D[] = mockLandmarks.map((landmark, index) => {
        if (index === 0) {
          // WRIST
          return { x: 0.5, y: 0.8, z: 0.0 }; // 手首が手のひら中心より下
        }
        return landmark;
      });

      const angle = calculateRadialUlnarDeviationAngle(idealLandmarks);

      // 理想的な位置では角度が小さい（0度に近い）はず
      expect(angle).toBeLessThan(30);
    });

    test('尺屈（小指側）に曲げた状態でのテスト', () => {
      // 手首を小指側に曲げた状態のランドマーク
      const ulnarDeviationLandmarks: Point3D[] = mockLandmarks.map(
        (landmark, index) => {
          if (index === 0) {
            // WRIST
            return { x: 0.6, y: 0.8, z: 0.0 }; // 手首を小指側にシフト
          }
          return landmark;
        }
      );

      const angle = calculateRadialUlnarDeviationAngle(ulnarDeviationLandmarks);

      // 尺屈の場合、角度がある程度大きくなるはず
      expect(angle).toBeGreaterThan(20);
    });

    test('橈屈（親指側）に曲げた状態でのテスト', () => {
      // 手首を親指側に曲げた状態のランドマーク
      const radialDeviationLandmarks: Point3D[] = mockLandmarks.map(
        (landmark, index) => {
          if (index === 0) {
            // WRIST
            return { x: 0.4, y: 0.8, z: 0.0 }; // 手首を親指側にシフト
          }
          return landmark;
        }
      );

      const angle = calculateRadialUlnarDeviationAngle(
        radialDeviationLandmarks
      );

      // 橈屈の場合、角度がある程度大きくなるはず
      expect(angle).toBeGreaterThan(20);
    });

    test('不正なランドマークデータでエラーが発生する', () => {
      const invalidLandmarks = mockLandmarks.slice(0, 10); // 不足

      expect(() => {
        calculateWristFlexionAngle(invalidLandmarks);
      }).toThrow('Invalid landmarks: 21 points required');
    });

    test('ランドマークデータの検証が正常に動作する', () => {
      expect(validateLandmarks(mockLandmarks)).toBe(true);

      // 不正なデータのテスト
      expect(validateLandmarks([])).toBe(false);
      expect(validateLandmarks(mockLandmarks.slice(0, 10))).toBe(false);

      const invalidLandmarks = [...mockLandmarks];
      invalidLandmarks[0] = { x: NaN, y: 0, z: 0 };
      expect(validateLandmarks(invalidLandmarks)).toBe(false);
    });
  });

  describe('実際の測定シナリオでの精度テスト', () => {
    test('手首の可動域測定（屈曲-伸展）', () => {
      // 正常位置（中立位）
      const neutralLandmarks = [...mockLandmarks];

      // 屈曲位置（手首を曲げた状態）
      const flexedLandmarks = neutralLandmarks.map((point, index) => {
        if (index >= 5) {
          // 指のランドマークを上に移動
          return { ...point, y: point.y - 0.1 };
        }
        return point;
      });

      // 伸展位置（手首を反らした状態）
      const extendedLandmarks = neutralLandmarks.map((point, index) => {
        if (index >= 5) {
          // 指のランドマークを下に移動
          return { ...point, y: point.y + 0.1 };
        }
        return point;
      });

      const neutralAngle = calculateWristFlexionAngle(neutralLandmarks);
      const flexedAngle = calculateWristFlexionAngle(flexedLandmarks);
      const extendedAngle = calculateWristFlexionAngle(extendedLandmarks);

      // 屈曲時と伸展時で角度が変化することを確認
      expect(Math.abs(flexedAngle - neutralAngle)).toBeGreaterThan(5);
      expect(Math.abs(extendedAngle - neutralAngle)).toBeGreaterThan(5);
      expect(flexedAngle).not.toEqual(extendedAngle);
    });

    test('連続する角度測定の一貫性', () => {
      const angles: number[] = [];

      // 同じランドマークデータで複数回計算
      for (let i = 0; i < 10; i++) {
        const angle = calculateWristFlexionAngle(mockLandmarks);
        angles.push(angle);
      }

      // 全て同じ値であることを確認
      const firstAngle = angles[0];
      expect(firstAngle).toBeDefined();

      angles.forEach((angle) => {
        expect(angle).toBeCloseTo(firstAngle!, 10);
      });
    });

    test('ノイズを含むデータでの安定性', () => {
      const noisyAngles: number[] = [];

      // 小さなノイズを追加したランドマークで計算
      for (let i = 0; i < 50; i++) {
        const noisyLandmarks = mockLandmarks.map((point: Point3D) => ({
          x: point.x + (Math.random() - 0.5) * 0.001,
          y: point.y + (Math.random() - 0.5) * 0.001,
          z: point.z + (Math.random() - 0.5) * 0.001,
        }));

        const angle = calculateWristFlexionAngle(noisyLandmarks);
        noisyAngles.push(angle);
      }

      // 標準偏差が一定範囲内であることを確認
      const average =
        noisyAngles.reduce((a, b) => a + b, 0) / noisyAngles.length;
      const variance =
        noisyAngles.reduce(
          (sum, value) => sum + Math.pow(value - average, 2),
          0
        ) / noisyAngles.length;
      const standardDeviation = Math.sqrt(variance);

      expect(standardDeviation).toBeLessThan(2); // 2度以内の変動
    });
  });

  describe('パフォーマンステスト', () => {
    test('大量の角度計算が高速で処理される', () => {
      const iterations = 1000;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        calculateWristFlexionAngle(mockLandmarks);
        calculateThumbJointAngle(mockLandmarks);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const averageTime = totalTime / (iterations * 2); // 2つの計算

      // 1回の計算が1ms以下であることを確認
      expect(averageTime).toBeLessThan(1);
    });
  });

  describe('数値の安定性テスト', () => {
    test('計算結果が有限値である', () => {
      const angle = calculateWristFlexionAngle(mockLandmarks);

      expect(isFinite(angle)).toBe(true);
      expect(isNaN(angle)).toBe(false);
      expect(angle).not.toBe(Infinity);
      expect(angle).not.toBe(-Infinity);
    });

    test('角度の正規化が正常に動作する', () => {
      expect(normalizeAngle(-10)).toBe(0);
      expect(normalizeAngle(190)).toBe(180);
      expect(normalizeAngle(90)).toBe(90);
      expect(normalizeAngle(0)).toBe(0);
      expect(normalizeAngle(180)).toBe(180);
    });
  });
});
