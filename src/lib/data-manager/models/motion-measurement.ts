/**
 * MotionMeasurementエンティティモデル
 * 可動域測定の個別記録
 */

export type ComparisonStatus =
  | { status: "normal"; within_range: true }
  | { status: "below_normal"; deficit_degrees: number }
  | { status: "above_normal"; excess_degrees: number };

export interface MotionComparisonResult {
  wristFlexion: ComparisonStatus;
  wristExtension: ComparisonStatus;
  wristUlnarDeviation: ComparisonStatus;
  wristRadialDeviation: ComparisonStatus;
  thumbFlexion: ComparisonStatus;
  thumbExtension: ComparisonStatus;
  thumbAdduction: ComparisonStatus;
  thumbAbduction: ComparisonStatus;
  overallStatus: "normal" | "below_normal" | "above_normal";
}

export interface MotionMeasurement {
  id: string; // UUID
  userId: string; // User.id参照
  measurementDate: Date; // 測定日時

  // 手首可動域 (degrees)
  wristFlexion: number; // 掌屈 0-90°
  wristExtension: number; // 背屈 0-70°
  wristUlnarDeviation: number; // 尺屈 0-55°
  wristRadialDeviation: number; // 橈屈 0-25°

  // 母指可動域 (degrees)
  thumbFlexion: number; // 屈曲 0-90°
  thumbExtension: number; // 伸展 0°(基準)
  thumbAdduction: number; // 内転 0°(基準)
  thumbAbduction: number; // 外転 0-60°

  // 測定メタデータ
  accuracyScore: number; // 測定精度スコア 0-1
  handUsed: "left" | "right"; // 測定対象手

  // 正常範囲比較結果
  comparisonResult: MotionComparisonResult;

  createdAt: Date;
}

export interface CreateMeasurementInput {
  userId: string;
  measurementDate: Date;
  wristFlexion: number;
  wristExtension: number;
  wristUlnarDeviation: number;
  wristRadialDeviation: number;
  thumbFlexion: number;
  thumbExtension: number;
  thumbAdduction: number;
  thumbAbduction: number;
  accuracyScore: number;
  handUsed: "left" | "right";
}

/**
 * 正常範囲定数
 */
export const NORMAL_RANGES = {
  wrist: {
    flexion: { min: 0, max: 90 }, // 掌屈
    extension: { min: 0, max: 70 }, // 背屈
    ulnarDeviation: { min: 0, max: 55 }, // 尺屈
    radialDeviation: { min: 0, max: 25 }, // 橈屈
  },
  thumb: {
    flexion: { min: 0, max: 90 }, // 屈曲
    extension: { min: 0, max: 0 }, // 伸展（基準位置）
    adduction: { min: 0, max: 0 }, // 内転（基準位置）
    abduction: { min: 0, max: 60 }, // 外転
  },
} as const;

/**
 * 測定精度閾値
 */
export const MEASUREMENT_PRECISION_THRESHOLD = 5; // ±5°

/**
 * 角度と正常範囲の比較
 */
const compareAngleWithNormalRange = (
  angle: number,
  normalRange: { min: number; max: number }
): ComparisonStatus => {
  if (angle >= normalRange.min && angle <= normalRange.max) {
    return { status: "normal", within_range: true };
  } else if (angle < normalRange.min) {
    return { 
      status: "below_normal", 
      deficit_degrees: Math.round(normalRange.min - angle) 
    };
  } else {
    return { 
      status: "above_normal", 
      excess_degrees: Math.round(angle - normalRange.max) 
    };
  }
};

/**
 * 測定データの正常範囲比較結果を計算
 */
export const calculateComparisonResult = (
  measurement: Omit<CreateMeasurementInput, 'userId' | 'measurementDate'>
): MotionComparisonResult => {
  const wristFlexion = compareAngleWithNormalRange(
    measurement.wristFlexion, 
    NORMAL_RANGES.wrist.flexion
  );
  const wristExtension = compareAngleWithNormalRange(
    measurement.wristExtension, 
    NORMAL_RANGES.wrist.extension
  );
  const wristUlnarDeviation = compareAngleWithNormalRange(
    measurement.wristUlnarDeviation, 
    NORMAL_RANGES.wrist.ulnarDeviation
  );
  const wristRadialDeviation = compareAngleWithNormalRange(
    measurement.wristRadialDeviation, 
    NORMAL_RANGES.wrist.radialDeviation
  );
  const thumbFlexion = compareAngleWithNormalRange(
    measurement.thumbFlexion, 
    NORMAL_RANGES.thumb.flexion
  );
  const thumbExtension = compareAngleWithNormalRange(
    measurement.thumbExtension, 
    NORMAL_RANGES.thumb.extension
  );
  const thumbAdduction = compareAngleWithNormalRange(
    measurement.thumbAdduction, 
    NORMAL_RANGES.thumb.adduction
  );
  const thumbAbduction = compareAngleWithNormalRange(
    measurement.thumbAbduction, 
    NORMAL_RANGES.thumb.abduction
  );

  // 全体ステータスの決定
  const allStatuses = [
    wristFlexion.status,
    wristExtension.status,
    wristUlnarDeviation.status,
    wristRadialDeviation.status,
    thumbFlexion.status,
    thumbExtension.status,
    thumbAdduction.status,
    thumbAbduction.status,
  ];

  let overallStatus: "normal" | "below_normal" | "above_normal" = "normal";
  
  if (allStatuses.includes("below_normal")) {
    overallStatus = "below_normal";
  } else if (allStatuses.includes("above_normal")) {
    overallStatus = "above_normal";
  }

  return {
    wristFlexion,
    wristExtension,
    wristUlnarDeviation,
    wristRadialDeviation,
    thumbFlexion,
    thumbExtension,
    thumbAdduction,
    thumbAbduction,
    overallStatus,
  };
};

/**
 * 測定データ検証ルール
 */
export const validateMeasurement = (data: CreateMeasurementInput): string[] => {
  const errors: string[] = [];

  // userId必須
  if (!data.userId || data.userId.trim().length === 0) {
    errors.push('ユーザーIDは必須です');
  }

  // measurementDate: 未来日不可
  if (data.measurementDate > new Date()) {
    errors.push('測定日は未来の日付に設定できません');
  }

  // 角度値の検証
  const angleChecks = [
    { value: data.wristFlexion, name: '手首掌屈', max: NORMAL_RANGES.wrist.flexion.max },
    { value: data.wristExtension, name: '手首背屈', max: NORMAL_RANGES.wrist.extension.max },
    { value: data.wristUlnarDeviation, name: '手首尺屈', max: NORMAL_RANGES.wrist.ulnarDeviation.max },
    { value: data.wristRadialDeviation, name: '手首橈屈', max: NORMAL_RANGES.wrist.radialDeviation.max },
    { value: data.thumbFlexion, name: '母指屈曲', max: NORMAL_RANGES.thumb.flexion.max },
    { value: data.thumbExtension, name: '母指伸展', max: NORMAL_RANGES.thumb.extension.max },
    { value: data.thumbAdduction, name: '母指内転', max: NORMAL_RANGES.thumb.adduction.max },
    { value: data.thumbAbduction, name: '母指外転', max: NORMAL_RANGES.thumb.abduction.max },
  ];

  angleChecks.forEach(({ value, name, max }) => {
    if (value < 0) {
      errors.push(`${name}の角度は0度以上である必要があります`);
    }
    // 正常範囲を大幅に超える値も警告
    if (value > max * 2) {
      errors.push(`${name}の角度が異常に大きい値です（${value}度）`);
    }
  });

  // accuracyScore: 0-1の範囲
  if (data.accuracyScore < 0 || data.accuracyScore > 1) {
    errors.push('測定精度スコアは0から1の範囲である必要があります');
  }

  // handUsed: 'left' | 'right'のみ
  if (!['left', 'right'].includes(data.handUsed)) {
    errors.push('測定対象手は左手または右手を選択してください');
  }

  return errors;
};

/**
 * 測定エンティティの作成
 */
export const createMeasurement = (input: CreateMeasurementInput): MotionMeasurement => {
  const errors = validateMeasurement(input);
  if (errors.length > 0) {
    throw new Error(`測定データ作成エラー: ${errors.join(', ')}`);
  }

  const comparisonResult = calculateComparisonResult(input);

  return {
    id: crypto.randomUUID(),
    userId: input.userId,
    measurementDate: input.measurementDate,
    wristFlexion: input.wristFlexion,
    wristExtension: input.wristExtension,
    wristUlnarDeviation: input.wristUlnarDeviation,
    wristRadialDeviation: input.wristRadialDeviation,
    thumbFlexion: input.thumbFlexion,
    thumbExtension: input.thumbExtension,
    thumbAdduction: input.thumbAdduction,
    thumbAbduction: input.thumbAbduction,
    accuracyScore: input.accuracyScore,
    handUsed: input.handUsed,
    comparisonResult,
    createdAt: new Date(),
  };
};
