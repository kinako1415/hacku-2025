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
 * 手首の横方向の曲がり具合を測定
 */
export function calculateRadialUlnarDeviation(landmarks: Point3D[]): number {
  if (landmarks.length < 21) return 0;

  const wrist = landmarks[HAND_LANDMARKS.WRIST];
  const thumbCmc = landmarks[HAND_LANDMARKS.THUMB_CMC];
  const pinkyCmc = landmarks[HAND_LANDMARKS.PINKY_MCP];

  if (!wrist || !thumbCmc || !pinkyCmc) return 0;

  // 手首から親指と小指への方向ベクトル
  const wristToThumb = {
    x: thumbCmc.x - wrist.x,
    y: thumbCmc.y - wrist.y,
    z: thumbCmc.z - wrist.z,
  };

  const wristToPinky = {
    x: pinkyCmc.x - wrist.x,
    y: pinkyCmc.y - wrist.y,
    z: pinkyCmc.z - wrist.z,
  };

  // X軸（水平）方向の曲がり角度を計算
  const thumbLength = Math.sqrt(
    wristToThumb.x ** 2 + wristToThumb.y ** 2 + wristToThumb.z ** 2
  );
  const pinkyLength = Math.sqrt(
    wristToPinky.x ** 2 + wristToPinky.y ** 2 + wristToPinky.z ** 2
  );

  if (thumbLength === 0 || pinkyLength === 0) return 0;

  // X方向の角度を計算
  const thumbAngle =
    Math.asin(Math.abs(wristToThumb.x) / thumbLength) * (180 / Math.PI);
  const pinkyAngle =
    Math.asin(Math.abs(wristToPinky.x) / pinkyLength) * (180 / Math.PI);

  // より大きい角度を使用
  const deviationAngle = Math.max(thumbAngle, pinkyAngle);

  // 0-45度の範囲に制限
  return Math.min(Math.max(deviationAngle, 0), 45);
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
