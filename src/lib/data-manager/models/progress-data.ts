/**
 * ProgressDataエンティティモデル
 * 進捗トレンド分析データ
 */

export type TrendDirection = 'improving' | 'stable' | 'declining';
export type AnalysisPeriod =
  | '1_week'
  | '2_weeks'
  | '1_month'
  | '3_months'
  | '6_months';

export interface AngleTrend {
  currentValue: number; // 現在値
  previousValue?: number; // 前回値
  changeAmount: number; // 変化量
  changePercentage: number; // 変化率（%）
  trend: TrendDirection; // トレンド方向
}

export interface MotionProgress {
  // 手首可動域トレンド
  wristFlexion: AngleTrend;
  wristExtension: AngleTrend;
  wristUlnarDeviation: AngleTrend;
  wristRadialDeviation: AngleTrend;

  // 母指可動域トレンド
  thumbFlexion: AngleTrend;
  thumbExtension: AngleTrend;
  thumbAdduction: AngleTrend;
  thumbAbduction: AngleTrend;

  // 総合指標
  overallTrend: TrendDirection;
  overallImprovement: number; // 総合改善スコア（%）
}

export interface ActivityProgress {
  // 実施率
  rehabCompletionRate: number; // リハビリ実施率（%）
  measurementCompletionRate: number; // 測定実施率（%）
  overallCompletionRate: number; // 総合実施率（%）

  // 主観的評価トレンド
  performanceLevelTrend?: AngleTrend;
  painLevelTrend?: AngleTrend;
  motivationLevelTrend?: AngleTrend;

  // 連続実施日数
  currentStreak: number; // 現在の連続実施日数
  longestStreak: number; // 最長連続実施日数
}

export interface ProgressData {
  id: string; // UUID
  userId: string; // User.id参照
  analysisDate: Date; // 分析実行日
  analysisPeriod: AnalysisPeriod; // 分析対象期間

  // 進捗データ
  motionProgress: MotionProgress; // 可動域進捗
  activityProgress: ActivityProgress; // 活動進捗

  // メタデータ
  measurementCount: number; // 分析対象測定回数
  recordCount: number; // 分析対象記録日数
  dataQuality: number; // データ品質スコア（0-1）

  createdAt: Date;
}

export interface CreateProgressDataInput {
  userId: string;
  analysisPeriod: AnalysisPeriod;
  motionProgress: MotionProgress;
  activityProgress: ActivityProgress;
  measurementCount: number;
  recordCount: number;
  dataQuality: number;
}

/**
 * 分析期間の日数を取得
 */
export const getAnalysisPeriodDays = (period: AnalysisPeriod): number => {
  switch (period) {
    case '1_week':
      return 7;
    case '2_weeks':
      return 14;
    case '1_month':
      return 30;
    case '3_months':
      return 90;
    case '6_months':
      return 180;
    default:
      return 7;
  }
};

/**
 * 角度トレンドの計算
 */
export const calculateAngleTrend = (
  currentValue: number,
  previousValue?: number
): AngleTrend => {
  if (previousValue === undefined) {
    return {
      currentValue,
      changeAmount: 0,
      changePercentage: 0,
      trend: 'stable',
    };
  }

  const changeAmount = currentValue - previousValue;
  const changePercentage =
    previousValue !== 0
      ? Math.round((changeAmount / Math.abs(previousValue)) * 100 * 10) / 10
      : 0;

  let trend: TrendDirection = 'stable';
  const threshold = 5; // 5%以上の変化で改善/悪化と判定

  if (Math.abs(changePercentage) >= threshold) {
    trend = changeAmount > 0 ? 'improving' : 'declining';
  }

  return {
    currentValue,
    previousValue,
    changeAmount: Math.round(changeAmount * 10) / 10,
    changePercentage,
    trend,
  };
};

/**
 * 総合トレンドの計算
 */
export const calculateOverallTrend = (trends: AngleTrend[]): TrendDirection => {
  const improvingCount = trends.filter((t) => t.trend === 'improving').length;
  const decliningCount = trends.filter((t) => t.trend === 'declining').length;
  const stableCount = trends.filter((t) => t.trend === 'stable').length;

  if (improvingCount > decliningCount + stableCount / 2) {
    return 'improving';
  } else if (decliningCount > improvingCount + stableCount / 2) {
    return 'declining';
  } else {
    return 'stable';
  }
};

/**
 * 総合改善スコアの計算
 */
export const calculateOverallImprovement = (trends: AngleTrend[]): number => {
  const totalChangePercentage = trends.reduce(
    (sum, trend) => sum + trend.changePercentage,
    0
  );

  return Math.round((totalChangePercentage / trends.length) * 10) / 10;
};

/**
 * データ品質スコアの計算
 */
export const calculateDataQuality = (
  measurementCount: number,
  recordCount: number,
  expectedPeriodDays: number
): number => {
  // 測定回数スコア（期間中最低3回は必要）
  const measurementScore = Math.min(measurementCount / 3, 1);

  // 記録完成度スコア（期間の70%以上の記録が理想）
  const recordScore = Math.min(recordCount / (expectedPeriodDays * 0.7), 1);

  // 総合スコア（測定40%、記録60%の重み）
  const qualityScore = measurementScore * 0.4 + recordScore * 0.6;

  return Math.round(qualityScore * 100) / 100;
};

/**
 * 進捗データの検証ルール
 */
export const validateProgressData = (
  data: CreateProgressDataInput
): string[] => {
  const errors: string[] = [];

  // userId必須
  if (!data.userId || data.userId.trim().length === 0) {
    errors.push('ユーザーIDは必須です');
  }

  // analysisPeriod妥当性
  const validPeriods: AnalysisPeriod[] = [
    '1_week',
    '2_weeks',
    '1_month',
    '3_months',
    '6_months',
  ];
  if (!validPeriods.includes(data.analysisPeriod)) {
    errors.push('分析期間が無効です');
  }

  // measurementCount: 0以上
  if (data.measurementCount < 0) {
    errors.push('測定回数は0以上である必要があります');
  }

  // recordCount: 0以上
  if (data.recordCount < 0) {
    errors.push('記録日数は0以上である必要があります');
  }

  // dataQuality: 0-1の範囲
  if (data.dataQuality < 0 || data.dataQuality > 1) {
    errors.push('データ品質スコアは0から1の範囲である必要があります');
  }

  // motionProgress検証
  const motionTrends = [
    data.motionProgress.wristFlexion,
    data.motionProgress.wristExtension,
    data.motionProgress.wristUlnarDeviation,
    data.motionProgress.wristRadialDeviation,
    data.motionProgress.thumbFlexion,
    data.motionProgress.thumbExtension,
    data.motionProgress.thumbAdduction,
    data.motionProgress.thumbAbduction,
  ];

  motionTrends.forEach((trend, index) => {
    if (trend.currentValue < 0) {
      errors.push(`動作${index + 1}の現在値が負の値です`);
    }
  });

  // activityProgress検証
  const activityRates = [
    {
      value: data.activityProgress.rehabCompletionRate,
      name: 'リハビリ実施率',
    },
    {
      value: data.activityProgress.measurementCompletionRate,
      name: '測定実施率',
    },
    { value: data.activityProgress.overallCompletionRate, name: '総合実施率' },
  ];

  activityRates.forEach(({ value, name }) => {
    if (value < 0 || value > 100) {
      errors.push(`${name}は0から100の範囲である必要があります`);
    }
  });

  if (data.activityProgress.currentStreak < 0) {
    errors.push('現在の連続実施日数は0以上である必要があります');
  }

  if (data.activityProgress.longestStreak < 0) {
    errors.push('最長連続実施日数は0以上である必要があります');
  }

  return errors;
};

/**
 * 進捗データエンティティの作成
 */
export const createProgressData = (
  input: CreateProgressDataInput
): ProgressData => {
  const errors = validateProgressData(input);
  if (errors.length > 0) {
    throw new Error(`進捗データ作成エラー: ${errors.join(', ')}`);
  }

  return {
    id: crypto.randomUUID(),
    userId: input.userId,
    analysisDate: new Date(),
    analysisPeriod: input.analysisPeriod,
    motionProgress: input.motionProgress,
    activityProgress: input.activityProgress,
    measurementCount: input.measurementCount,
    recordCount: input.recordCount,
    dataQuality: input.dataQuality,
    createdAt: new Date(),
  };
};

/**
 * 改善傾向の判定
 */
export const isImprovementTrend = (progressData: ProgressData): boolean => {
  const motionImproving =
    progressData.motionProgress.overallTrend === 'improving';
  const activityImproving =
    progressData.activityProgress.overallCompletionRate > 70;

  return motionImproving || activityImproving;
};

/**
 * 要注意状態の判定
 */
export const needsAttention = (progressData: ProgressData): boolean => {
  const motionDeclining =
    progressData.motionProgress.overallTrend === 'declining';
  const lowActivity = progressData.activityProgress.overallCompletionRate < 30;
  const poorDataQuality = progressData.dataQuality < 0.5;

  return motionDeclining || lowActivity || poorDataQuality;
};
