/**
 * 手首角度計算ユーティリティ
 * MediaPipeのランドマークデータから手首の角度を計算
 */

/**
 * 3D座標点
 */
export interface Point3D {
  x: number;
  y: number;
  z: number;
}

/**
 * 手のランドマークインデックス
 * MediaPipe Handsのランドマーク番号
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
 * ベクトル間の角度を計算
 */
function calculateAngle(
  point1: Point3D,
  center: Point3D,
  point2: Point3D
): number {
  // ベクトルを計算
  const vector1 = {
    x: point1.x - center.x,
    y: point1.y - center.y,
    z: point1.z - center.z,
  };

  const vector2 = {
    x: point2.x - center.x,
    y: point2.y - center.y,
    z: point2.z - center.z,
  };

  // 内積を計算
  const dotProduct =
    vector1.x * vector2.x + vector1.y * vector2.y + vector1.z * vector2.z;

  // ベクトルの長さを計算
  const magnitude1 = Math.sqrt(
    vector1.x ** 2 + vector1.y ** 2 + vector1.z ** 2
  );
  const magnitude2 = Math.sqrt(
    vector2.x ** 2 + vector2.y ** 2 + vector2.z ** 2
  );

  // 角度を計算（ラジアンから度に変換）
  const cosAngle = dotProduct / (magnitude1 * magnitude2);
  const angle =
    Math.acos(Math.max(-1, Math.min(1, cosAngle))) * (180 / Math.PI);

  return angle;
}

/**
 * 掌屈・背屈の角度を計算
 * 手首の縦方向の曲がり具合を測定
 */
export function calculateFlexionExtension(landmarks: Point3D[]): number {
  if (landmarks.length < 21) return 0;

  const wrist = landmarks[HAND_LANDMARKS.WRIST];
  const middleFingerMcp = landmarks[HAND_LANDMARKS.MIDDLE_FINGER_MCP];
  const indexFingerMcp = landmarks[HAND_LANDMARKS.INDEX_FINGER_MCP];

  if (!wrist || !middleFingerMcp || !indexFingerMcp) return 0;

  // 手首から指の付け根への方向ベクトルを使って角度を計算
  const wristToMiddle = {
    x: middleFingerMcp.x - wrist.x,
    y: middleFingerMcp.y - wrist.y,
    z: middleFingerMcp.z - wrist.z,
  };

  // Y軸（垂直）との角度を計算して曲がり角度を求める
  const length = Math.sqrt(
    wristToMiddle.x ** 2 + wristToMiddle.y ** 2 + wristToMiddle.z ** 2
  );
  if (length === 0) return 0;

  // Y方向の成分から角度を計算
  const angle = Math.asin(Math.abs(wristToMiddle.y) / length) * (180 / Math.PI);

  // 0-90度の範囲に制限
  return Math.min(Math.max(angle, 0), 90);
}

/**
 * 尺屈・橈屈の角度を計算
 * 「手のひらをカメラに向け、中指を上に向けた状態」を0°として、
 * 手のひらの中心から手首までのベクトルと垂直ベクトルとの角度で測定
 */
export function calculateRadialUlnarDeviation(landmarks: Point3D[]): number {
  if (landmarks.length < 21) return 0;

  const wrist = landmarks[HAND_LANDMARKS.WRIST];
  const indexFingerMcp = landmarks[HAND_LANDMARKS.INDEX_FINGER_MCP];
  const middleFingerMcp = landmarks[HAND_LANDMARKS.MIDDLE_FINGER_MCP];
  const ringFingerMcp = landmarks[HAND_LANDMARKS.RING_FINGER_MCP];
  const pinkyMcp = landmarks[HAND_LANDMARKS.PINKY_MCP];

  if (
    !wrist ||
    !indexFingerMcp ||
    !middleFingerMcp ||
    !ringFingerMcp ||
    !pinkyMcp
  )
    return 0;

  // 手のひらの中心を計算（4つの指の付け根の平均位置）
  const palmCenter = {
    x:
      (indexFingerMcp.x + middleFingerMcp.x + ringFingerMcp.x + pinkyMcp.x) / 4,
    y:
      (indexFingerMcp.y + middleFingerMcp.y + ringFingerMcp.y + pinkyMcp.y) / 4,
    z:
      (indexFingerMcp.z + middleFingerMcp.z + ringFingerMcp.z + pinkyMcp.z) / 4,
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
    Math.acos(Math.max(-1, Math.min(1, cosAngle))) * (180 / Math.PI) * -1 + 180;

  return angle;
}

/**
 * 測定ステップに応じた角度を計算
 */
export function calculateWristAngle(
  landmarks: Point3D[],
  stepId: string
): number {
  switch (stepId) {
    case 'palmar-flexion':
    case 'dorsal-flexion':
      return calculateFlexionExtension(landmarks);
    case 'ulnar-deviation':
    case 'radial-deviation':
      return calculateRadialUlnarDeviation(landmarks);
    default:
      return 0;
  }
}

/**
 * ランドマークデータの有効性をチェック
 */
export function validateLandmarks(landmarks: Point3D[]): boolean {
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

  const isValid = requiredLandmarks.every((index) => {
    const landmark = landmarks[index];
    const valid =
      landmark &&
      typeof landmark.x === 'number' &&
      typeof landmark.y === 'number' &&
      typeof landmark.z === 'number' &&
      !isNaN(landmark.x) &&
      !isNaN(landmark.y) &&
      !isNaN(landmark.z);

    if (!valid) {
      console.warn(`無効なランドマーク at index ${index}:`, landmark);
    }

    return valid;
  });

  return isValid;
}
