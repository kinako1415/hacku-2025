/**
 * 進捗ページ
 * 測定データの推移と統計情報を表示
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { db, MeasurementSession } from '@/lib/database/measurement-db';
import { MotionChartsContainer } from '@/components/progress/MotionChartsContainer';
import type { MotionMeasurement } from '@/lib/data-manager/models/motion-measurement';
import type { CalendarRecord } from '@/lib/data-manager/models/calendar-record';
import styles from './page.module.scss';

/**
 * 開発者用設定: サンプルデータを強制使用するかどうか
 *
 * 使用方法:
 * - true:  サンプルデータを強制使用（実際のデータがあっても無視）
 * - false: 実際のデータを優先使用（データがない場合のみサンプルデータ）
 *
 * 開発・テスト時はtrueに設定して、グラフの動作確認を行ってください。
 * 本番環境やユーザーテスト時はfalseに設定してください。
 */
const FORCE_USE_SAMPLE_DATA = false;

/**
 * テスト用サンプルデータを生成
 */
const generateSampleData = (): MotionMeasurement[] => {
  const sampleData: MotionMeasurement[] = [];
  const today = new Date();

  // 過去365日間のサンプルデータを生成（1年分）
  for (let i = 364; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    // ランダムな進歩を含むリアルなデータを生成
    const baseProgress = (364 - i) / 364; // 0から1への進歩
    const randomVariation = (Math.random() - 0.5) * 0.2; // ±10%のばらつき

    sampleData.push({
      id: `sample-${i}`,
      userId: 'sample-user',
      measurementDate: date,
      wristFlexion: Math.max(
        20,
        Math.min(90, 30 + baseProgress * 45 + randomVariation * 20)
      ), // 30°から75°へ進歩
      wristExtension: Math.max(
        15,
        Math.min(70, 25 + baseProgress * 35 + randomVariation * 15)
      ), // 25°から60°へ進歩
      wristUlnarDeviation: Math.max(
        10,
        Math.min(55, 20 + baseProgress * 25 + randomVariation * 10)
      ), // 20°から45°へ進歩
      wristRadialDeviation: Math.max(
        5,
        Math.min(25, 10 + baseProgress * 12 + randomVariation * 5)
      ), // 10°から22°へ進歩
      thumbFlexion: Math.max(
        20,
        Math.min(90, 40 + baseProgress * 30 + randomVariation * 15)
      ),
      thumbExtension: 0,
      thumbAdduction: 0,
      thumbAbduction: Math.max(
        10,
        Math.min(60, 20 + baseProgress * 25 + randomVariation * 10)
      ),
      accuracyScore: Math.max(
        0.6,
        Math.min(1.0, 0.7 + baseProgress * 0.2 + randomVariation * 0.1)
      ),
      handUsed: 'right' as const,
      comparisonResult: {
        wristFlexion: { status: 'normal', within_range: true },
        wristExtension: { status: 'normal', within_range: true },
        wristUlnarDeviation: { status: 'normal', within_range: true },
        wristRadialDeviation: { status: 'normal', within_range: true },
        thumbFlexion: { status: 'normal', within_range: true },
        thumbExtension: { status: 'normal', within_range: true },
        thumbAdduction: { status: 'normal', within_range: true },
        thumbAbduction: { status: 'normal', within_range: true },
        overallStatus: 'normal' as const,
      },
      createdAt: date,
    });
  }

  return sampleData;
};

/**
 * 実際のデータベースから測定データを取得（サンプルデータを含む）
 */
const fetchMeasurements = async (
  hand: 'left' | 'right',
  userId: string = 'default-user' // userIdは現状未使用ですが、将来的な拡張のため残します
): Promise<{ measurements: MotionMeasurement[]; isRealData: boolean }> => {
  try {
    // 開発者設定が有効ならサンプルデータを返す
    if (FORCE_USE_SAMPLE_DATA) {
      const sampleData = generateSampleData();
      console.log('開発者設定により、サンプルデータを強制使用:', sampleData);
      return { measurements: sampleData, isRealData: false };
    }

    // MeasurementDatabaseのdb.sessionsからデータを取得し、handでフィルタリング
    const sessions = await db.sessions
      .where('hand')
      .equals(hand)
      .sortBy('startTime');

    const allRealMeasurements: MotionMeasurement[] = [];

    for (const session of sessions) {
      const results = await db.getSessionResults(session.sessionId);

      if (results.length > 0) {
        const motionMeasurement: MotionMeasurement = {
          id: session.sessionId,
          userId: userId, // またはセッションから取得可能なuserId
          measurementDate: new Date(session.startTime),
          wristFlexion: 0,
          wristExtension: 0,
          wristUlnarDeviation: 0,
          wristRadialDeviation: 0,
          thumbFlexion: 0,
          thumbExtension: 0,
          thumbAdduction: 0,
          thumbAbduction: 0,
          accuracyScore: 1, // 仮の値
          handUsed: session.hand,
          comparisonResult: {
            wristFlexion: { status: 'normal', within_range: true },
            wristExtension: { status: 'normal', within_range: true },
            wristUlnarDeviation: { status: 'normal', within_range: true },
            wristRadialDeviation: { status: 'normal', within_range: true },
            thumbFlexion: { status: 'normal', within_range: true },
            thumbExtension: { status: 'normal', within_range: true },
            thumbAdduction: { status: 'normal', within_range: true },
            thumbAbduction: { status: 'normal', within_range: true },
            overallStatus: 'normal' as const,
          },
          createdAt: new Date(session.startTime),
        };

        // resultsをstepNameでグループ化し、各stepNameの最新のangleを取得
        const latestAngles: { [key: string]: number } = {};
        results.forEach((result) => {
          latestAngles[result.stepName] = result.angle;
        });

        // MotionMeasurementの各プロパティに割り当て
        motionMeasurement.wristFlexion = latestAngles['掌屈'] || 0;
        motionMeasurement.wristExtension = latestAngles['背屈'] || 0;
        motionMeasurement.wristUlnarDeviation = latestAngles['尺屈'] || 0;
        motionMeasurement.wristRadialDeviation = latestAngles['橈屈'] || 0;
        // 他のthumb関連の角度も同様にマッピングが必要であれば追加
        // motionMeasurement.thumbFlexion = latestAngles['thumbFlexion'] || 0;
        // motionMeasurement.thumbExtension = latestAngles['thumbExtension'] || 0;
        // motionMeasurement.thumbAdduction = latestAngles['thumbAdduction'] || 0;
        // motionMeasurement.thumbAbduction = latestAngles['thumbAbduction'] || 0;

        allRealMeasurements.push(motionMeasurement);
      }
    }

    // 日付ごとに最新の測定結果のみを保持
    const latestMeasurementsByDate = new Map<string, MotionMeasurement>();
    allRealMeasurements.forEach((measurement) => {
      const date = new Date(measurement.measurementDate);
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const dateKey = `${year}-${month}-${day}`;
      // 既にその日のデータがある場合、より新しいもので上書き
      if (
        !latestMeasurementsByDate.has(dateKey) ||
        new Date(measurement.measurementDate).getTime() >
          new Date(
            latestMeasurementsByDate.get(dateKey)!.measurementDate
          ).getTime()
      ) {
        latestMeasurementsByDate.set(dateKey, measurement);
      }
    });

    const realMeasurements = Array.from(latestMeasurementsByDate.values()).sort(
      (a, b) =>
        new Date(a.measurementDate).getTime() -
        new Date(b.measurementDate).getTime()
    );

    if (realMeasurements.length === 0) {
      console.warn(
        `実際のデータがないため、サンプルデータを使用します。(Hand: ${hand})`
      );
      return { measurements: generateSampleData(), isRealData: false };
    }

    console.log(
      `MeasurementDatabaseから取得した実際のデータを使用。(Hand: ${hand})`,
      realMeasurements
    );
    return {
      measurements: realMeasurements,
      isRealData: true,
    };
  } catch (error) {
    console.error(`測定データの取得に失敗。(Hand: ${hand})`, error);
    // エラーの場合もサンプルデータを返す
    return { measurements: generateSampleData(), isRealData: false };
  }
};

/**
 * 実際のデータベースからカレンダー記録を取得
 */
// const fetchCalendarRecords = async (
//   userId: string = 'default-user'
// ): Promise<CalendarRecord[]> => {
//   try {
//     const records = await db.records
//       .where('userId')
//       .equals(userId)
//       .reverse()
//       .toArray();
//
//     return records;
//   } catch (error) {
//     console.error('カレンダー記録の取得に失敗:', error);
//     return [];
//   }
// };

/**
 * 連続記録日数を計算
 */
const calculateConsecutiveDays = (
  measurements: MotionMeasurement[]
): number => {
  if (measurements.length === 0) return 0;

  // 測定日を日付文字列でソート（新しい順）
  const sortedDates = measurements
    .map((m) => new Date(m.measurementDate).toDateString())
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  // 重複を除去
  const uniqueDates = Array.from(new Set(sortedDates));

  let consecutiveDays = 0;
  const today = new Date().toDateString();
  let currentDate = new Date(today);

  // 今日から遡って連続日数をカウント
  for (const dateString of uniqueDates) {
    const measurementDate = new Date(dateString);
    const diffDays = Math.floor(
      (currentDate.getTime() - measurementDate.getTime()) /
        (1000 * 60 * 60 * 24)
    );

    if (diffDays === consecutiveDays) {
      consecutiveDays++;
      currentDate = new Date(measurementDate.getTime() - 24 * 60 * 60 * 1000);
    } else {
      break;
    }
  }

  return consecutiveDays;
};

/**
 * 期間選択オプション
 */
const PERIOD_OPTIONS = [
  { value: 'week' as const, label: '1週間' },
  { value: 'month' as const, label: '1ヶ月' },
  { value: '3months' as const, label: '3ヶ月' },
  { value: '6months' as const, label: '6ヶ月' },
  { value: 'year' as const, label: '1年' },
];

const HANDS = [
  { id: 1, label: '右手' },
  { id: 2, label: '左手' },
];

/**
 * 期間に基づいてデータをフィルタリング
 */
const filterDataByPeriod = (
  measurements: MotionMeasurement[],
  period: 'week' | 'month' | '3months' | '6months' | 'year'
): MotionMeasurement[] => {
  const now = new Date();
  const cutoffDate = new Date();

  switch (period) {
    case 'week':
      cutoffDate.setDate(now.getDate() - 7);
      break;
    case 'month':
      cutoffDate.setDate(now.getDate() - 30);
      break;
    case '3months':
      cutoffDate.setDate(now.getDate() - 90);
      break;
    case '6months':
      cutoffDate.setDate(now.getDate() - 180);
      break;
    case 'year':
      cutoffDate.setDate(now.getDate() - 365);
      break;
  }

  console.log(`Filtering for ${period}:`, {
    now: now.toISOString().split('T')[0],
    cutoffDate: cutoffDate.toISOString().split('T')[0],
    totalMeasurements: measurements.length,
    sampleDateRange:
      measurements.length > 0
        ? {
            earliest: new Date(
              Math.min(
                ...measurements.map((m) =>
                  new Date(m.measurementDate).getTime()
                )
              )
            )
              .toISOString()
              .split('T')[0],
            latest: new Date(
              Math.max(
                ...measurements.map((m) =>
                  new Date(m.measurementDate).getTime()
                )
              )
            )
              .toISOString()
              .split('T')[0],
          }
        : null,
  });

  const filtered = measurements.filter((measurement) => {
    const measurementDate = new Date(measurement.measurementDate);
    return measurementDate >= cutoffDate;
  });

  console.log(`Filtered results for ${period}:`, {
    filteredCount: filtered.length,
    dateRange:
      filtered.length > 0
        ? {
            earliest: new Date(
              Math.min(
                ...filtered.map((m) => new Date(m.measurementDate).getTime())
              )
            )
              .toISOString()
              .split('T')[0],
            latest: new Date(
              Math.max(
                ...filtered.map((m) => new Date(m.measurementDate).getTime())
              )
            )
              .toISOString()
              .split('T')[0],
          }
        : null,
  });

  return filtered;
};

/**
 * 週単位でデータを集約
 */
const aggregateDataByWeek = (
  measurements: MotionMeasurement[]
): MotionMeasurement[] => {
  if (measurements.length === 0) return [];

  // 週ごとにデータをグループ化
  const weeklyData = new Map<string, MotionMeasurement[]>();

  measurements.forEach((measurement) => {
    const date = new Date(measurement.measurementDate);
    // 週の開始日（月曜日）を計算
    const dayOfWeek = date.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(date);
    monday.setDate(date.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);

    const weekKey = monday.toISOString().split('T')[0];
    if (!weekKey) return;

    if (!weeklyData.has(weekKey)) {
      weeklyData.set(weekKey, []);
    }
    weeklyData.get(weekKey)?.push(measurement);
  });

  // 各週の平均値を計算
  const aggregatedData: MotionMeasurement[] = [];

  weeklyData.forEach((weekMeasurements, weekKey) => {
    const count = weekMeasurements.length;
    if (count === 0 || weekMeasurements.length === 0) return;

    const firstMeasurement = weekMeasurements[0];
    if (!firstMeasurement) return;

    // 平均値を計算
    const avgMeasurement: MotionMeasurement = {
      id: `week-${weekKey}`,
      userId: firstMeasurement.userId,
      measurementDate: new Date(weekKey),
      wristFlexion:
        weekMeasurements.reduce((sum, m) => sum + (m.wristFlexion || 0), 0) /
        count,
      wristExtension:
        weekMeasurements.reduce((sum, m) => sum + (m.wristExtension || 0), 0) /
        count,
      wristUlnarDeviation:
        weekMeasurements.reduce(
          (sum, m) => sum + (m.wristUlnarDeviation || 0),
          0
        ) / count,
      wristRadialDeviation:
        weekMeasurements.reduce(
          (sum, m) => sum + (m.wristRadialDeviation || 0),
          0
        ) / count,
      thumbFlexion:
        weekMeasurements.reduce((sum, m) => sum + (m.thumbFlexion || 0), 0) /
        count,
      thumbExtension:
        weekMeasurements.reduce((sum, m) => sum + (m.thumbExtension || 0), 0) /
        count,
      thumbAdduction:
        weekMeasurements.reduce((sum, m) => sum + (m.thumbAdduction || 0), 0) /
        count,
      thumbAbduction:
        weekMeasurements.reduce((sum, m) => sum + (m.thumbAbduction || 0), 0) /
        count,
      accuracyScore:
        weekMeasurements.reduce((sum, m) => sum + (m.accuracyScore || 0), 0) /
        count,
      handUsed: firstMeasurement.handUsed,
      comparisonResult: firstMeasurement.comparisonResult,
      createdAt: new Date(weekKey),
    };

    aggregatedData.push(avgMeasurement);
  });

  // 日付順にソート
  return aggregatedData.sort(
    (a, b) =>
      new Date(a.measurementDate).getTime() -
      new Date(b.measurementDate).getTime()
  );
};

/**
 * 2週間単位でデータを集約
 */
const aggregateDataByBiWeek = (
  measurements: MotionMeasurement[]
): MotionMeasurement[] => {
  if (measurements.length === 0) return [];

  // 2週間ごとにデータをグループ化
  const biWeeklyData = new Map<string, MotionMeasurement[]>();

  measurements.forEach((measurement) => {
    const date = new Date(measurement.measurementDate);
    // 基準日（例: 2025年1月1日）からの日数を計算
    const baseDate = new Date(2025, 0, 1); // 2025年1月1日
    const daysDiff = Math.floor(
      (date.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const biWeekNumber = Math.floor(daysDiff / 14); // 2週間ごとのグループ番号

    // 2週間期間の開始日を計算
    const biWeekStart = new Date(baseDate);
    biWeekStart.setDate(baseDate.getDate() + biWeekNumber * 14);
    biWeekStart.setHours(0, 0, 0, 0);

    const biWeekKey = biWeekStart.toISOString().split('T')[0];
    if (!biWeekKey) return;

    if (!biWeeklyData.has(biWeekKey)) {
      biWeeklyData.set(biWeekKey, []);
    }
    biWeeklyData.get(biWeekKey)?.push(measurement);
  });

  // 各2週間の平均値を計算
  const aggregatedData: MotionMeasurement[] = [];

  biWeeklyData.forEach((biWeekMeasurements, biWeekKey) => {
    const count = biWeekMeasurements.length;
    if (count === 0 || biWeekMeasurements.length === 0) return;

    const firstMeasurement = biWeekMeasurements[0];
    if (!firstMeasurement) return;

    // 平均値を計算
    const avgMeasurement: MotionMeasurement = {
      id: `biweek-${biWeekKey}`,
      userId: firstMeasurement.userId,
      measurementDate: new Date(biWeekKey),
      wristFlexion:
        biWeekMeasurements.reduce((sum, m) => sum + (m.wristFlexion || 0), 0) /
        count,
      wristExtension:
        biWeekMeasurements.reduce(
          (sum, m) => sum + (m.wristExtension || 0),
          0
        ) / count,
      wristUlnarDeviation:
        biWeekMeasurements.reduce(
          (sum, m) => sum + (m.wristUlnarDeviation || 0),
          0
        ) / count,
      wristRadialDeviation:
        biWeekMeasurements.reduce(
          (sum, m) => sum + (m.wristRadialDeviation || 0),
          0
        ) / count,
      thumbFlexion:
        biWeekMeasurements.reduce((sum, m) => sum + (m.thumbFlexion || 0), 0) /
        count,
      thumbExtension:
        biWeekMeasurements.reduce(
          (sum, m) => sum + (m.thumbExtension || 0),
          0
        ) / count,
      thumbAdduction:
        biWeekMeasurements.reduce(
          (sum, m) => sum + (m.thumbAdduction || 0),
          0
        ) / count,
      thumbAbduction:
        biWeekMeasurements.reduce(
          (sum, m) => sum + (m.thumbAbduction || 0),
          0
        ) / count,
      accuracyScore:
        biWeekMeasurements.reduce((sum, m) => sum + (m.accuracyScore || 0), 0) /
        count,
      handUsed: firstMeasurement.handUsed,
      comparisonResult: firstMeasurement.comparisonResult,
      createdAt: new Date(biWeekKey),
    };

    aggregatedData.push(avgMeasurement);
  });

  // 日付順にソート
  return aggregatedData.sort(
    (a, b) =>
      new Date(a.measurementDate).getTime() -
      new Date(b.measurementDate).getTime()
  );
};

/**
 * 統計情報計算
 */
interface ProgressStats {
  totalMeasurements: number;
  improvementRate: number;
  consecutiveDays: number;
  latestMeasurementDate: Date | null;
}

const calculateProgressStats = (
  measurements: MotionMeasurement[],
  records: CalendarRecord[]
): ProgressStats => {
  if (measurements.length === 0) {
    return {
      totalMeasurements: 0,
      improvementRate: 0,
      consecutiveDays: 0,
      latestMeasurementDate: null,
    };
  }

  // 改善率の計算（最初と最後の比較）
  const firstMeasurement = measurements[measurements.length - 1];
  const lastMeasurement = measurements[0];
  const improvementRate =
    lastMeasurement && firstMeasurement
      ? (((lastMeasurement.wristFlexion || 0) -
          (firstMeasurement.wristFlexion || 0)) /
          (firstMeasurement.wristFlexion || 1)) *
        100
      : 0;

  // 連続記録日数の計算
  const consecutiveDays = calculateConsecutiveDays(measurements);

  // 最新測定日の取得
  const sortedMeasurements = measurements
    .slice()
    .sort(
      (a, b) =>
        new Date(b.measurementDate).getTime() -
        new Date(a.measurementDate).getTime()
    );
  const latestMeasurementDate =
    sortedMeasurements.length > 0 && sortedMeasurements[0]
      ? new Date(sortedMeasurements[0].measurementDate)
      : null;

  return {
    totalMeasurements: measurements.length,
    improvementRate: -Math.round(improvementRate * 10) / 10, // 小数点1桁まで表示
    consecutiveDays,
    latestMeasurementDate,
  };
};

/**
 * 進捗ページメインコンポーネント
 */
const ProgressPage: React.FC = () => {
  const [measurements, setMeasurements] = useState<MotionMeasurement[]>([]);
  // const [calendarRecords, setCalendarRecords] = useState<CalendarRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingRealData, setUsingRealData] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<
    'week' | 'month' | '3months' | '6months' | 'year'
  >('month');
  const [selectedHand, setSelectedHand] = useState<'left' | 'right'>('right'); // デフォルトは右手

  // データ読み込み
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        console.log(`Fetching measurements for hand: ${selectedHand}`);
        const measurementResult = await fetchMeasurements(selectedHand);

        setMeasurements(measurementResult.measurements);
        setUsingRealData(measurementResult.isRealData);
      } catch (error) {
        console.error('データの読み込みに失敗:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedHand]); // selectedHandが変更されたらデータを再読み込み

  // 期間でフィルタリングされた測定データ
  const filteredMeasurements = useMemo(
    () => filterDataByPeriod(measurements, selectedPeriod),
    [measurements, selectedPeriod]
  );

  // 期間に応じてデータを集約
  const aggregatedMeasurements = useMemo(() => {
    if (selectedPeriod === 'year') {
      // 1年の場合は2週間単位で集約
      return aggregateDataByBiWeek(filteredMeasurements);
    } else if (selectedPeriod === '3months' || selectedPeriod === '6months') {
      // 3ヶ月・6ヶ月の場合は週単位で集約
      return aggregateDataByWeek(filteredMeasurements);
    }
    // 1週間・1ヶ月の場合は日単位のまま
    return filteredMeasurements;
  }, [filteredMeasurements, selectedPeriod]);

  // 統計情報（フィルタリングされたデータに基づく）
  const stats = useMemo(
    () => calculateProgressStats(filteredMeasurements, []),
    [filteredMeasurements]
  );

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
        <p>データを読み込んでいます...</p>
      </div>
    );
  }

  return (
    <div className={styles.progressPage}>
      {/* {!usingRealData && (
        <div className={styles.sampleDataBanner}>
          ⚠️ {FORCE_USE_SAMPLE_DATA ? '開発者設定により' : ''}
          サンプルデータを表示中です
        </div>
      )} */}

      <main className={styles.mainContent}>
        {/* 左側カラム: 期間選択 + 統計情報 */}
        <div className={styles.leftColumn}>
          {/* 期間選択 */}
          <div className={styles.periodSelector}>
            <h2>表示期間</h2>
            <div className={styles.periodButtons}>
              {PERIOD_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`${styles.periodButton} ${
                    selectedPeriod === option.value ? styles.active : ''
                  }`}
                  onClick={() => setSelectedPeriod(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* 期間選択 */}
          <div className={styles.periodSelector}>
            <h2>手の選択</h2>
            <div className={styles.periodButtons}>
              {HANDS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`${styles.periodButton} ${
                    selectedHand === option.label ? styles.active : ''
                  }`}
                  onClick={() =>
                    setSelectedHand(option.label === '右手' ? 'right' : 'left')
                  }
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* 統計セクション */}
          <div className={styles.statsSection}>
            <h2>統計情報</h2>
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <h3>測定回数</h3>
                <p className={styles.statValue}>{stats.totalMeasurements}回</p>
                <span className={styles.statDescription}>
                  期間内の総測定回数
                </span>
              </div>

              <div className={styles.statCard}>
                <h3>改善率</h3>
                <p className={styles.statValue}>
                  {stats.improvementRate > 0
                    ? '+'
                    : stats.improvementRate < 0
                      ? '-'
                      : ''}
                  {Math.abs(stats.improvementRate)}%
                </p>
                <span className={styles.statDescription}>可動域の変化率</span>
              </div>

              <div className={styles.statCard}>
                <h3>継続性</h3>
                <p className={styles.statValue}>{stats.consecutiveDays}日</p>
                <span className={styles.statDescription}>連続記録日数</span>
              </div>

              {/* 最新測定カード - 他のカードと同じデザイン */}
              {stats.latestMeasurementDate && (
                <div className={styles.statCard}>
                  <h3>最新測定</h3>
                  <p className={styles.statValue}>
                    {stats.latestMeasurementDate.toLocaleDateString('ja-JP')}
                  </p>
                  <span className={styles.statDescription}>
                    最後に測定した日
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 右側カラム: 可動域推移グラフ */}
        <div className={styles.rightColumn}>
          <div className={styles.chartsSection}>
            <MotionChartsContainer
              measurements={aggregatedMeasurements}
              selectedPeriod={selectedPeriod}
            />
          </div>
        </div>

        {aggregatedMeasurements.length === 0 && usingRealData && (
          <div className={styles.noDataMessage}>
            <p>選択した期間にデータがありません。</p>
            <p>測定を開始してデータを蓄積してください。</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default ProgressPage;
