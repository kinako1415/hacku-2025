/**
 * 角度計算ライブラリ
 * MediaPipeのランドマークから手首・母指の可動域角度を計算
 */

/**
 * 3D点の型定義
 */
interface Point3D {
  x: number;
  y: number;
  z?: number;
}

/**
 * 手首角度の型定義
 */
export interface WristAngles {
  flexion: number; // 掌屈
  extension: number; // 背屈
  radialDeviation: number; // 橈屈
  ulnarDeviation: number; // 尺屈
}

/**
 * 母指角度の型定義
 */
export interface ThumbAngles {
  flexion: number; // 屈曲
  extension: number; // 伸展
  abduction: number; // 外転
  adduction: number; // 内転
}

/**
 * 2点間のベクトルを計算
 */
const calculateVector = (point1: Point3D, point2: Point3D): Point3D => {
  return {
    x: point2.x - point1.x,
    y: point2.y - point1.y,
    z: (point2.z || 0) - (point1.z || 0),
  };
};

/**
 * ベクトルの大きさを計算
 */
const vectorMagnitude = (vector: Point3D): number => {
  return Math.sqrt(vector.x ** 2 + vector.y ** 2 + (vector.z || 0) ** 2);
};

/**
 * ベクトルの内積を計算
 */
const dotProduct = (vector1: Point3D, vector2: Point3D): number => {
  return (
    vector1.x * vector2.x +
    vector1.y * vector2.y +
    (vector1.z || 0) * (vector2.z || 0)
  );
};

/**
 * 2つのベクトル間の角度を計算（度）
 */
const calculateAngleBetweenVectors = (
  vector1: Point3D,
  vector2: Point3D
): number => {
  const mag1 = vectorMagnitude(vector1);
  const mag2 = vectorMagnitude(vector2);

  if (mag1 === 0 || mag2 === 0) {
    return 0;
  }

  const dot = dotProduct(vector1, vector2);
  const cosAngle = dot / (mag1 * mag2);

  // アークコサインの範囲を-1から1に制限
  const clampedCosAngle = Math.max(-1, Math.min(1, cosAngle));
  const angleRadians = Math.acos(clampedCosAngle);

  return angleRadians * (180 / Math.PI);
};

/**
 * 3点から角度を計算（中点が頂点）
 */
const calculateAngleFromThreePoints = (
  point1: Point3D,
  vertex: Point3D,
  point3: Point3D
): number => {
  const vector1 = calculateVector(vertex, point1);
  const vector2 = calculateVector(vertex, point3);

  return calculateAngleBetweenVectors(vector1, vector2);
};

/**
 * 手首の可動域角度を計算
 * MediaPipeの手のランドマークから手首の屈曲・伸展・側屈を計算
 */
export const calculateWristAngles = (landmarks: Point3D[]): WristAngles => {
  // MediaPipeの手のランドマークインデックス
  const WRIST = 0;
  const THUMB_CMC = 1; // 母指CM関節
  const INDEX_MCP = 5; // 人差し指MP関節
  const MIDDLE_MCP = 9; // 中指MP関節
  const RING_MCP = 13; // 薬指MP関節
  const PINKY_MCP = 17; // 小指MP関節

  if (landmarks.length < 21) {
    throw new Error('ランドマークが不足しています');
  }

  const wrist = landmarks[WRIST];
  const thumbCmc = landmarks[THUMB_CMC];
  const indexMcp = landmarks[INDEX_MCP];
  const middleMcp = landmarks[MIDDLE_MCP];
  const ringMcp = landmarks[RING_MCP];
  const pinkyMcp = landmarks[PINKY_MCP];

  // 必要なランドマークの存在確認
  if (!wrist || !indexMcp || !middleMcp || !ringMcp || !pinkyMcp) {
    throw new Error('必要なランドマークが見つかりません');
  }

  // 手のひらの中央点を計算
  const palmCenter = {
    x: (indexMcp.x + middleMcp.x + ringMcp.x + pinkyMcp.x) / 4,
    y: (indexMcp.y + middleMcp.y + ringMcp.y + pinkyMcp.y) / 4,
    z:
      ((indexMcp.z || 0) +
        (middleMcp.z || 0) +
        (ringMcp.z || 0) +
        (pinkyMcp.z || 0)) /
      4,
  };

  // 手首から手のひら中央へのベクトル
  const wristToPalmVector = calculateVector(wrist, palmCenter);

  // 基準ベクトル（垂直方向）
  const verticalVector = { x: 0, y: -1, z: 0 };

  // 屈曲・伸展角度（Y軸回転）
  const flexionExtensionAngle = calculateAngleBetweenVectors(
    { x: wristToPalmVector.x, y: wristToPalmVector.y, z: 0 },
    verticalVector
  );

  // 側屈角度（手のひら中心から手首へのベクトルと垂直ベクトルの角度）
  const palmToWristVector = calculateVector(palmCenter, wrist);

  // 手のひら中心から手首へのベクトルと垂直ベクトルの角度を計算
  const deviationAngle = calculateAngleBetweenVectors(
    palmToWristVector,
    verticalVector
  );

  // 屈曲・伸展の角度の方向を判定
  const flexion = wristToPalmVector.y > 0 ? flexionExtensionAngle : 0;
  const extension = wristToPalmVector.y < 0 ? flexionExtensionAngle : 0;

  // 側屈角度の方向を判定（X成分の符号で判定）
  const radialDeviation = palmToWristVector.x > 0 ? deviationAngle : 0;
  const ulnarDeviation = palmToWristVector.x < 0 ? deviationAngle : 0;

  return {
    flexion,
    extension,
    radialDeviation,
    ulnarDeviation,
  };
};

/**
 * 母指の可動域角度を計算
 * MediaPipeの手のランドマークから母指の屈曲・伸展・外転・内転を計算
 */
export const calculateThumbAngles = (landmarks: Point3D[]): ThumbAngles => {
  // MediaPipeの母指ランドマークインデックス
  const WRIST = 0;
  const THUMB_CMC = 1; // CM関節
  const THUMB_MCP = 2; // MP関節
  const THUMB_IP = 3; // IP関節
  const THUMB_TIP = 4; // 指先
  const INDEX_MCP = 5; // 人差し指MP関節（参照点）

  if (landmarks.length < 21) {
    throw new Error('ランドマークが不足しています');
  }

  const wrist = landmarks[WRIST];
  const thumbCmc = landmarks[THUMB_CMC];
  const thumbMcp = landmarks[THUMB_MCP];
  const thumbIp = landmarks[THUMB_IP];
  const thumbTip = landmarks[THUMB_TIP];
  const indexMcp = landmarks[INDEX_MCP];

  // 必要なランドマークの存在確認
  if (!wrist || !thumbCmc || !thumbMcp || !thumbIp || !thumbTip || !indexMcp) {
    throw new Error('必要な母指ランドマークが見つかりません');
  }

  // 母指の屈曲・伸展角度（MP関節）
  const flexionExtensionAngle = calculateAngleFromThreePoints(
    thumbCmc,
    thumbMcp,
    thumbIp
  );

  // 母指の外転・内転角度（CM関節から人差し指への角度）
  const abductionAdductionAngle = calculateAngleFromThreePoints(
    wrist,
    thumbCmc,
    indexMcp
  );

  // 屈曲・伸展の方向判定（簡易的）
  const cmcToMcpVector = calculateVector(thumbCmc, thumbMcp);
  const mcpToIpVector = calculateVector(thumbMcp, thumbIp);

  const flexion = flexionExtensionAngle > 90 ? flexionExtensionAngle - 90 : 0;
  const extension = flexionExtensionAngle < 90 ? 90 - flexionExtensionAngle : 0;

  // 外転・内転の方向判定
  const thumbToIndexVector = calculateVector(thumbCmc, indexMcp);
  const abduction =
    abductionAdductionAngle > 30 ? abductionAdductionAngle - 30 : 0;
  const adduction =
    abductionAdductionAngle < 30 ? 30 - abductionAdductionAngle : 0;

  return {
    flexion,
    extension,
    abduction,
    adduction,
  };
};

/**
 * 角度の有効性をチェック
 */
export const validateAngles = (
  wristAngles: WristAngles,
  thumbAngles: ThumbAngles
): boolean => {
  const wristValid = [
    wristAngles.flexion,
    wristAngles.extension,
    wristAngles.radialDeviation,
    wristAngles.ulnarDeviation,
  ].every((angle) => angle >= 0 && angle <= 180);

  const thumbValid = [
    thumbAngles.flexion,
    thumbAngles.extension,
    thumbAngles.abduction,
    thumbAngles.adduction,
  ].every((angle) => angle >= 0 && angle <= 180);

  return wristValid && thumbValid;
};

/**
 * 角度データの平滑化（移動平均）
 */
export class AngleSmoothing {
  private wristHistory: WristAngles[] = [];
  private thumbHistory: ThumbAngles[] = [];
  private readonly maxHistory = 5;

  addAngles(wristAngles: WristAngles, thumbAngles: ThumbAngles): void {
    this.wristHistory.push(wristAngles);
    this.thumbHistory.push(thumbAngles);

    if (this.wristHistory.length > this.maxHistory) {
      this.wristHistory.shift();
    }
    if (this.thumbHistory.length > this.maxHistory) {
      this.thumbHistory.shift();
    }
  }

  getSmoothedAngles(): { wrist: WristAngles; thumb: ThumbAngles } | null {
    if (this.wristHistory.length === 0 || this.thumbHistory.length === 0) {
      return null;
    }

    const wristSmoothed: WristAngles = {
      flexion: this.average(this.wristHistory.map((w) => w.flexion)),
      extension: this.average(this.wristHistory.map((w) => w.extension)),
      radialDeviation: this.average(
        this.wristHistory.map((w) => w.radialDeviation)
      ),
      ulnarDeviation: this.average(
        this.wristHistory.map((w) => w.ulnarDeviation)
      ),
    };

    const thumbSmoothed: ThumbAngles = {
      flexion: this.average(this.thumbHistory.map((t) => t.flexion)),
      extension: this.average(this.thumbHistory.map((t) => t.extension)),
      abduction: this.average(this.thumbHistory.map((t) => t.abduction)),
      adduction: this.average(this.thumbHistory.map((t) => t.adduction)),
    };

    return { wrist: wristSmoothed, thumb: thumbSmoothed };
  }

  private average(values: number[]): number {
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  reset(): void {
    this.wristHistory = [];
    this.thumbHistory = [];
  }
}
