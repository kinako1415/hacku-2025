/**
 * プログレス統合サービス
 * プログレスコンポーネントと計算サービスを統合
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { CalendarRecord } from '@/lib/data-manager/models/calendar-record';
import { useCalendarIntegration } from './calendar-integration';

/**
 * プログレス統計データ
 */
interface ProgressStatistics {
  // 基本統計
  totalDays: number;
  activeDays: number;
  streakDays: number;

  // 完了率
  rehabCompletionRate: number;
  measurementCompletionRate: number;
  overallCompletionRate: number;

  // 平均値
  averagePainLevel: number;
  averageMotivationLevel: number;
  averagePerformanceLevel: number;

  // トレンド分析
  painTrend: 'improving' | 'stable' | 'worsening';
  motivationTrend: 'improving' | 'stable' | 'declining';
  performanceTrend: 'improving' | 'stable' | 'declining';

  // 期間比較
  weeklyComparison: {
    thisWeek: WeeklyStats;
    lastWeek: WeeklyStats;
    improvement: number;
  };

  monthlyComparison: {
    thisMonth: MonthlyStats;
    lastMonth: MonthlyStats;
    improvement: number;
  };
}

/**
 * 週間統計
 */
interface WeeklyStats {
  days: number;
  rehabCompleted: number;
  measurementCompleted: number;
  averagePain: number;
  averageMotivation: number;
  averagePerformance: number;
}

/**
 * 月間統計
 */
interface MonthlyStats {
  days: number;
  rehabCompleted: number;
  measurementCompleted: number;
  averagePain: number;
  averageMotivation: number;
  averagePerformance: number;
  streak: number;
}

/**
 * 目標設定
 */
interface Goals {
  weeklyRehabTarget: number;
  weeklyMeasurementTarget: number;
  painReductionTarget: number;
  motivationTarget: number;
  performanceTarget: number;
}

/**
 * プログレス統合フックの状態
 */
interface ProgressIntegrationState {
  statistics: ProgressStatistics | null;
  goals: Goals;
  isCalculating: boolean;
  error: string | null;
  selectedPeriod: 'week' | 'month' | 'quarter' | 'year';
  chartData: ChartData | null;
}

/**
 * チャートデータ
 */
interface ChartData {
  labels: string[];
  painData: number[];
  motivationData: number[];
  performanceData: number[];
  rehabData: number[];
  measurementData: number[];
}

/**
 * プログレス統合フック
 */
export const useProgressIntegration = () => {
  const { records, getRecordsByDateRange, getStatistics } =
    useCalendarIntegration();

  const [state, setState] = useState<ProgressIntegrationState>({
    statistics: null,
    goals: {
      weeklyRehabTarget: 5,
      weeklyMeasurementTarget: 3,
      painReductionTarget: 20,
      motivationTarget: 4,
      performanceTarget: 4,
    },
    isCalculating: false,
    error: null,
    selectedPeriod: 'month',
    chartData: null,
  });

  // 統計計算
  const calculateStatistics = useCallback(
    async (period: 'week' | 'month' | 'quarter' | 'year' = 'month') => {
      try {
        setState((prev) => ({ ...prev, isCalculating: true, error: null }));

        const now = new Date();
        const { startDate, endDate } = getPeriodDates(now, period);
        const periodRecords = getRecordsByDateRange(startDate, endDate);

        if (periodRecords.length === 0) {
          setState((prev) => ({
            ...prev,
            statistics: createEmptyStatistics(),
            isCalculating: false,
          }));
          return;
        }

        // 基本統計
        const totalDays = Math.ceil(
          (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        const activeDays = periodRecords.length;
        const rehabCompleted = periodRecords.filter(
          (r) => r.rehabCompleted
        ).length;
        const measurementCompleted = periodRecords.filter(
          (r) => r.measurementCompleted
        ).length;

        // 平均値計算
        const averagePainLevel = calculateAverage(periodRecords, 'painLevel');
        const averageMotivationLevel = calculateAverage(
          periodRecords,
          'motivationLevel'
        );
        const averagePerformanceLevel = calculateAverage(
          periodRecords,
          'performanceLevel'
        );

        // トレンド分析
        const painTrend = calculateTrend(periodRecords, 'painLevel', true) as
          | 'improving'
          | 'stable'
          | 'worsening';
        const motivationTrend = calculateTrend(
          periodRecords,
          'motivationLevel'
        ) as 'improving' | 'stable' | 'declining';
        const performanceTrend = calculateTrend(
          periodRecords,
          'performanceLevel'
        ) as 'improving' | 'stable' | 'declining';

        // 期間比較
        const weeklyComparison = calculateWeeklyComparison(
          now,
          getRecordsByDateRange
        );
        const monthlyComparison = calculateMonthlyComparison(
          now,
          getRecordsByDateRange
        );

        // 連続記録計算
        const streakDays = calculateCurrentStreak(records);

        const statistics: ProgressStatistics = {
          totalDays,
          activeDays,
          streakDays,
          rehabCompletionRate:
            activeDays > 0 ? (rehabCompleted / activeDays) * 100 : 0,
          measurementCompletionRate:
            activeDays > 0 ? (measurementCompleted / activeDays) * 100 : 0,
          overallCompletionRate:
            activeDays > 0
              ? ((rehabCompleted + measurementCompleted) / (activeDays * 2)) *
                100
              : 0,
          averagePainLevel,
          averageMotivationLevel,
          averagePerformanceLevel,
          painTrend,
          motivationTrend,
          performanceTrend,
          weeklyComparison,
          monthlyComparison,
        };

        setState((prev) => ({
          ...prev,
          statistics,
          isCalculating: false,
        }));
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : '統計の計算に失敗しました';
        setState((prev) => ({
          ...prev,
          isCalculating: false,
          error: errorMessage,
        }));
      }
    },
    [records, getRecordsByDateRange]
  );

  // チャートデータ生成
  const generateChartData = useCallback(
    (period: 'week' | 'month' | 'quarter' | 'year') => {
      try {
        setState((prev) => ({ ...prev, isCalculating: true }));

        const now = new Date();
        const chartData = generateChartDataForPeriod(
          now,
          period,
          getRecordsByDateRange
        );

        setState((prev) => ({
          ...prev,
          chartData,
          isCalculating: false,
        }));
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'チャートデータの生成に失敗しました';
        setState((prev) => ({
          ...prev,
          isCalculating: false,
          error: errorMessage,
        }));
      }
    },
    [getRecordsByDateRange]
  );

  // 目標更新
  const updateGoals = useCallback(
    (newGoals: Partial<Goals>) => {
      setState((prev) => ({
        ...prev,
        goals: { ...prev.goals, ...newGoals },
      }));

      // ローカルストレージに保存
      const updatedGoals = { ...state.goals, ...newGoals };
      localStorage.setItem(
        'rehabilitation-goals',
        JSON.stringify(updatedGoals)
      );
    },
    [state.goals]
  );

  // 期間変更
  const changePeriod = useCallback(
    (period: 'week' | 'month' | 'quarter' | 'year') => {
      setState((prev) => ({ ...prev, selectedPeriod: period }));
      calculateStatistics(period);
      generateChartData(period);
    },
    [calculateStatistics, generateChartData]
  );

  // エラークリア
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  // 進歩率計算
  const calculateProgressRate = useCallback(
    (metric: 'pain' | 'motivation' | 'performance'): number => {
      if (!state.statistics) return 0;

      const { monthlyComparison } = state.statistics;
      const current = monthlyComparison.thisMonth;
      const previous = monthlyComparison.lastMonth;

      switch (metric) {
        case 'pain':
          if (previous.averagePain === 0) return 0;
          return (
            ((previous.averagePain - current.averagePain) /
              previous.averagePain) *
            100
          );
        case 'motivation':
          if (previous.averageMotivation === 0) return 0;
          return (
            ((current.averageMotivation - previous.averageMotivation) /
              previous.averageMotivation) *
            100
          );
        case 'performance':
          if (previous.averagePerformance === 0) return 0;
          return (
            ((current.averagePerformance - previous.averagePerformance) /
              previous.averagePerformance) *
            100
          );
        default:
          return 0;
      }
    },
    [state.statistics]
  );

  // 目標達成率計算
  const calculateGoalAchievement = useCallback(
    (period: 'week' | 'month' = 'week') => {
      if (!state.statistics) return { rehab: 0, measurement: 0 };

      const comparison =
        period === 'week'
          ? state.statistics.weeklyComparison
          : state.statistics.monthlyComparison;
      const current =
        'thisWeek' in comparison ? comparison.thisWeek : comparison.thisMonth;
      const targets = state.goals;

      const rehabTarget =
        period === 'week'
          ? targets.weeklyRehabTarget
          : targets.weeklyRehabTarget * 4;
      const measurementTarget =
        period === 'week'
          ? targets.weeklyMeasurementTarget
          : targets.weeklyMeasurementTarget * 4;

      return {
        rehab: (current.rehabCompleted / rehabTarget) * 100,
        measurement: (current.measurementCompleted / measurementTarget) * 100,
      };
    },
    [state.statistics, state.goals]
  );

  // 初期化
  useEffect(() => {
    // 保存された目標を読み込み
    const savedGoals = localStorage.getItem('rehabilitation-goals');
    if (savedGoals) {
      const parsedGoals = JSON.parse(savedGoals);
      setState((prev) => ({ ...prev, goals: parsedGoals }));
    }

    // 初期統計計算
    calculateStatistics(state.selectedPeriod);
    generateChartData(state.selectedPeriod);
  }, [calculateStatistics, generateChartData, state.selectedPeriod]);

  // recordsが変更されたら再計算
  useEffect(() => {
    if (records.length > 0) {
      calculateStatistics(state.selectedPeriod);
      generateChartData(state.selectedPeriod);
    }
  }, [records, calculateStatistics, generateChartData, state.selectedPeriod]);

  return {
    // 状態
    ...state,

    // アクション
    calculateStatistics,
    generateChartData,
    updateGoals,
    changePeriod,
    clearError,
    calculateProgressRate,
    calculateGoalAchievement,
  };
};

// ヘルパー関数

/**
 * 期間の開始日と終了日を取得
 */
const getPeriodDates = (
  baseDate: Date,
  period: 'week' | 'month' | 'quarter' | 'year'
) => {
  const startDate = new Date(baseDate);
  const endDate = new Date(baseDate);

  switch (period) {
    case 'week':
      const dayOfWeek = startDate.getDay();
      startDate.setDate(startDate.getDate() - dayOfWeek);
      endDate.setDate(startDate.getDate() + 6);
      break;
    case 'month':
      startDate.setDate(1);
      endDate.setMonth(endDate.getMonth() + 1, 0);
      break;
    case 'quarter':
      const quarterStartMonth = Math.floor(startDate.getMonth() / 3) * 3;
      startDate.setMonth(quarterStartMonth, 1);
      endDate.setMonth(quarterStartMonth + 3, 0);
      break;
    case 'year':
      startDate.setMonth(0, 1);
      endDate.setMonth(11, 31);
      break;
  }

  return { startDate, endDate };
};

/**
 * 平均値計算
 */
const calculateAverage = (
  records: CalendarRecord[],
  field: 'painLevel' | 'motivationLevel' | 'performanceLevel'
): number => {
  const values = records
    .map((r) => r[field])
    .filter((value): value is 1 | 2 | 3 | 4 | 5 => value !== undefined);
  return values.length > 0
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;
};

/**
 * トレンド計算
 */
const calculateTrend = (
  records: CalendarRecord[],
  field: 'painLevel' | 'motivationLevel' | 'performanceLevel',
  inverse = false
): 'improving' | 'stable' | 'worsening' | 'declining' => {
  if (records.length < 3) return 'stable';

  const values = records
    .sort((a, b) => a.recordDate.getTime() - b.recordDate.getTime())
    .map((r) => r[field])
    .filter((value): value is 1 | 2 | 3 | 4 | 5 => value !== undefined);

  if (values.length < 3) return 'stable';

  const firstHalf = values.slice(0, Math.floor(values.length / 2));
  const secondHalf = values.slice(Math.ceil(values.length / 2));

  const firstAvg =
    firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
  const secondAvg =
    secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;

  const difference = secondAvg - firstAvg;
  const threshold = 0.3; // 閾値

  if (Math.abs(difference) < threshold) return 'stable';

  if (inverse) {
    return difference < 0 ? 'improving' : 'worsening';
  } else {
    if (field === 'motivationLevel' || field === 'performanceLevel') {
      return difference > 0 ? 'improving' : 'declining';
    } else {
      return difference > 0 ? 'improving' : 'worsening';
    }
  }
};

/**
 * 週間比較計算
 */
const calculateWeeklyComparison = (
  baseDate: Date,
  getRecordsByDateRange: (start: Date, end: Date) => CalendarRecord[]
) => {
  const thisWeekStart = new Date(baseDate);
  const dayOfWeek = thisWeekStart.getDay();
  thisWeekStart.setDate(thisWeekStart.getDate() - dayOfWeek);
  const thisWeekEnd = new Date(thisWeekStart);
  thisWeekEnd.setDate(thisWeekEnd.getDate() + 6);

  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const lastWeekEnd = new Date(thisWeekEnd);
  lastWeekEnd.setDate(lastWeekEnd.getDate() - 7);

  const thisWeekRecords = getRecordsByDateRange(thisWeekStart, thisWeekEnd);
  const lastWeekRecords = getRecordsByDateRange(lastWeekStart, lastWeekEnd);

  const thisWeek: WeeklyStats = {
    days: thisWeekRecords.length,
    rehabCompleted: thisWeekRecords.filter((r) => r.rehabCompleted).length,
    measurementCompleted: thisWeekRecords.filter((r) => r.measurementCompleted)
      .length,
    averagePain: calculateAverage(thisWeekRecords, 'painLevel'),
    averageMotivation: calculateAverage(thisWeekRecords, 'motivationLevel'),
    averagePerformance: calculateAverage(thisWeekRecords, 'performanceLevel'),
  };

  const lastWeek: WeeklyStats = {
    days: lastWeekRecords.length,
    rehabCompleted: lastWeekRecords.filter((r) => r.rehabCompleted).length,
    measurementCompleted: lastWeekRecords.filter((r) => r.measurementCompleted)
      .length,
    averagePain: calculateAverage(lastWeekRecords, 'painLevel'),
    averageMotivation: calculateAverage(lastWeekRecords, 'motivationLevel'),
    averagePerformance: calculateAverage(lastWeekRecords, 'performanceLevel'),
  };

  const improvement = calculateImprovementRate(thisWeek, lastWeek);

  return { thisWeek, lastWeek, improvement };
};

/**
 * 月間比較計算
 */
const calculateMonthlyComparison = (
  baseDate: Date,
  getRecordsByDateRange: (start: Date, end: Date) => CalendarRecord[]
) => {
  const thisMonthStart = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    1
  );
  const thisMonthEnd = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth() + 1,
    0
  );

  const lastMonthStart = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth() - 1,
    1
  );
  const lastMonthEnd = new Date(baseDate.getFullYear(), baseDate.getMonth(), 0);

  const thisMonthRecords = getRecordsByDateRange(thisMonthStart, thisMonthEnd);
  const lastMonthRecords = getRecordsByDateRange(lastMonthStart, lastMonthEnd);

  const thisMonth: MonthlyStats = {
    days: thisMonthRecords.length,
    rehabCompleted: thisMonthRecords.filter((r) => r.rehabCompleted).length,
    measurementCompleted: thisMonthRecords.filter((r) => r.measurementCompleted)
      .length,
    averagePain: calculateAverage(thisMonthRecords, 'painLevel'),
    averageMotivation: calculateAverage(thisMonthRecords, 'motivationLevel'),
    averagePerformance: calculateAverage(thisMonthRecords, 'performanceLevel'),
    streak: calculateCurrentStreak(thisMonthRecords),
  };

  const lastMonth: MonthlyStats = {
    days: lastMonthRecords.length,
    rehabCompleted: lastMonthRecords.filter((r) => r.rehabCompleted).length,
    measurementCompleted: lastMonthRecords.filter((r) => r.measurementCompleted)
      .length,
    averagePain: calculateAverage(lastMonthRecords, 'painLevel'),
    averageMotivation: calculateAverage(lastMonthRecords, 'motivationLevel'),
    averagePerformance: calculateAverage(lastMonthRecords, 'performanceLevel'),
    streak: calculateCurrentStreak(lastMonthRecords),
  };

  const improvement = calculateImprovementRate(thisMonth, lastMonth);

  return { thisMonth, lastMonth, improvement };
};

/**
 * 改善率計算
 */
const calculateImprovementRate = (
  current: WeeklyStats | MonthlyStats,
  previous: WeeklyStats | MonthlyStats
): number => {
  // 複合指標での改善率計算
  const currentScore =
    ((((current.rehabCompleted + current.measurementCompleted) /
      Math.max(current.days, 1)) *
      (current.averageMotivation + current.averagePerformance)) /
      2) *
    (6 - current.averagePain); // 痛みの逆数

  const previousScore =
    ((((previous.rehabCompleted + previous.measurementCompleted) /
      Math.max(previous.days, 1)) *
      (previous.averageMotivation + previous.averagePerformance)) /
      2) *
    (6 - previous.averagePain);

  if (previousScore === 0) return 0;
  return ((currentScore - previousScore) / previousScore) * 100;
};

/**
 * 現在の連続記録計算
 */
const calculateCurrentStreak = (records: CalendarRecord[]): number => {
  if (records.length === 0) return 0;

  const sortedRecords = records
    .filter((r) => r.rehabCompleted)
    .sort((a, b) => b.recordDate.getTime() - a.recordDate.getTime());

  if (sortedRecords.length === 0) return 0;

  let streak = 0;
  const today = new Date();

  for (const record of sortedRecords) {
    const daysDiff = Math.floor(
      (today.getTime() - record.recordDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysDiff === streak) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
};

/**
 * チャートデータ生成
 */
const generateChartDataForPeriod = (
  baseDate: Date,
  period: 'week' | 'month' | 'quarter' | 'year',
  getRecordsByDateRange: (start: Date, end: Date) => CalendarRecord[]
): ChartData => {
  const { startDate, endDate } = getPeriodDates(baseDate, period);
  const records = getRecordsByDateRange(startDate, endDate);

  let labels: string[] = [];
  let dataPoints: CalendarRecord[][] = [];

  switch (period) {
    case 'week':
      // 7日分のデータ
      for (let i = 0; i < 7; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        labels.push(
          date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
        );

        const dayRecords = records.filter(
          (r) => r.recordDate.toDateString() === date.toDateString()
        );
        dataPoints.push(dayRecords);
      }
      break;
    case 'month':
      // 30日分のデータを週ごとに集約
      const weeksInMonth = Math.ceil(30 / 7);
      for (let i = 0; i < weeksInMonth; i++) {
        const weekStart = new Date(startDate);
        weekStart.setDate(weekStart.getDate() + i * 7);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        labels.push(`第${i + 1}週`);

        const weekRecords = records.filter(
          (r) => r.recordDate >= weekStart && r.recordDate <= weekEnd
        );
        dataPoints.push(weekRecords);
      }
      break;
    case 'quarter':
    case 'year':
      // 月ごとに集約
      const monthsCount = period === 'quarter' ? 3 : 12;
      for (let i = 0; i < monthsCount; i++) {
        const monthStart = new Date(startDate);
        monthStart.setMonth(monthStart.getMonth() + i, 1);
        const monthEnd = new Date(monthStart);
        monthEnd.setMonth(monthEnd.getMonth() + 1, 0);

        labels.push(monthStart.toLocaleDateString('ja-JP', { month: 'short' }));

        const monthRecords = records.filter(
          (r) => r.recordDate >= monthStart && r.recordDate <= monthEnd
        );
        dataPoints.push(monthRecords);
      }
      break;
  }

  return {
    labels,
    painData: dataPoints.map((points) => calculateAverage(points, 'painLevel')),
    motivationData: dataPoints.map((points) =>
      calculateAverage(points, 'motivationLevel')
    ),
    performanceData: dataPoints.map((points) =>
      calculateAverage(points, 'performanceLevel')
    ),
    rehabData: dataPoints.map(
      (points) => points.filter((r) => r.rehabCompleted).length
    ),
    measurementData: dataPoints.map(
      (points) => points.filter((r) => r.measurementCompleted).length
    ),
  };
};

/**
 * 空の統計データ作成
 */
const createEmptyStatistics = (): ProgressStatistics => ({
  totalDays: 0,
  activeDays: 0,
  streakDays: 0,
  rehabCompletionRate: 0,
  measurementCompletionRate: 0,
  overallCompletionRate: 0,
  averagePainLevel: 0,
  averageMotivationLevel: 0,
  averagePerformanceLevel: 0,
  painTrend: 'stable',
  motivationTrend: 'stable',
  performanceTrend: 'stable',
  weeklyComparison: {
    thisWeek: createEmptyWeeklyStats(),
    lastWeek: createEmptyWeeklyStats(),
    improvement: 0,
  },
  monthlyComparison: {
    thisMonth: createEmptyMonthlyStats(),
    lastMonth: createEmptyMonthlyStats(),
    improvement: 0,
  },
});

const createEmptyWeeklyStats = (): WeeklyStats => ({
  days: 0,
  rehabCompleted: 0,
  measurementCompleted: 0,
  averagePain: 0,
  averageMotivation: 0,
  averagePerformance: 0,
});

const createEmptyMonthlyStats = (): MonthlyStats => ({
  days: 0,
  rehabCompleted: 0,
  measurementCompleted: 0,
  averagePain: 0,
  averageMotivation: 0,
  averagePerformance: 0,
  streak: 0,
});
