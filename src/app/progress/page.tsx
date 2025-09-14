/**
 * 進捗ページ
 * 測定データの推移と統計情報を表示
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ProgressCharts } from '@/components/progress/ProgressCharts';
import type { MotionMeasurement } from '@/lib/data-manager/models/motion-measurement';
import type {
  CalendarRecord,
  PainLevel,
  MotivationLevel,
  PerformanceLevel,
} from '@/lib/data-manager/models/calendar-record';
import { db } from '@/lib/data-manager/database';
import styles from './page.module.scss';

/**
 * 期間選択タイプ
 */
type PeriodType = 'week' | 'month' | '3months' | '6months' | 'year';

/**
 * 実際のデータベースから測定データを取得
 */
const fetchMeasurements = async (
  userId: string = 'default-user'
): Promise<MotionMeasurement[]> => {
  try {
    const measurements = await db.measurements
      .where('userId')
      .equals(userId)
      .reverse()
      .toArray();

    return measurements;
  } catch (error) {
    console.error('測定データの取得に失敗:', error);
    return [];
  }
};

/**
 * 実際のデータベースからカレンダー記録を取得
 */
const fetchCalendarRecords = async (
  userId: string = 'default-user'
): Promise<CalendarRecord[]> => {
  try {
    const records = await db.records
      .where('userId')
      .equals(userId)
      .reverse()
      .toArray();

    return records;
  } catch (error) {
    console.error('カレンダー記録の取得に失敗:', error);
    return [];
  }
};

/**
 * 期間に基づいてデータをフィルタリング
 */
const filterDataByPeriod = <
  T extends { measurementDate?: Date; recordDate?: Date; createdAt?: Date },
>(
  data: T[],
  period: PeriodType
): T[] => {
  const now = new Date();
  let startDate: Date;

  switch (period) {
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '3months':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case '6months':
      startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
      break;
    case 'year':
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  return data.filter((item) => {
    const itemDate = item.measurementDate || item.recordDate || item.createdAt;
    return itemDate && itemDate >= startDate;
  });
};

/**
 * 統計情報計算
 */
interface ProgressStats {
  totalMeasurements: number;
  avgAccuracy: number;
  improvementRate: number;
  consistencyScore: number;
  painTrend: 'improving' | 'stable' | 'worsening';
  motivationTrend: 'improving' | 'stable' | 'worsening';
}

const calculateProgressStats = (
  measurements: MotionMeasurement[],
  records: CalendarRecord[]
): ProgressStats => {
  if (measurements.length === 0) {
    return {
      totalMeasurements: 0,
      avgAccuracy: 0,
      improvementRate: 0,
      consistencyScore: 0,
      painTrend: 'stable',
      motivationTrend: 'stable',
    };
  }

  // 測定精度の平均
  const avgAccuracy =
    measurements.reduce((sum, m) => sum + (m.accuracyScore || 0), 0) /
    measurements.length;

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

  // 一貫性スコア（測定頻度）
  const dayRange = 30; // 30日間
  const consistencyScore = Math.min(
    100,
    (measurements.length / dayRange) * 100
  );

  // 痛みと意欲のトレンド分析
  const recentRecords = records.slice(0, 7); // 最近7日間
  const olderRecords = records.slice(7, 14); // その前の7日間

  const avgRecentPain =
    recentRecords.length > 0
      ? recentRecords.reduce((sum, r) => sum + (r.painLevel || 3), 0) /
        recentRecords.length
      : 3;
  const avgOlderPain =
    olderRecords.length > 0
      ? olderRecords.reduce((sum, r) => sum + (r.painLevel || 3), 0) /
        olderRecords.length
      : 3;

  const avgRecentMotivation =
    recentRecords.length > 0
      ? recentRecords.reduce((sum, r) => sum + (r.motivationLevel || 3), 0) /
        recentRecords.length
      : 3;
  const avgOlderMotivation =
    olderRecords.length > 0
      ? olderRecords.reduce((sum, r) => sum + (r.motivationLevel || 3), 0) /
        olderRecords.length
      : 3;

  const painTrend =
    avgRecentPain < avgOlderPain - 0.3
      ? 'improving'
      : avgRecentPain > avgOlderPain + 0.3
        ? 'worsening'
        : 'stable';

  const motivationTrend =
    avgRecentMotivation > avgOlderMotivation + 0.3
      ? 'improving'
      : avgRecentMotivation < avgOlderMotivation - 0.3
        ? 'worsening'
        : 'stable';

  return {
    totalMeasurements: measurements.length,
    avgAccuracy: Math.round(avgAccuracy * 100),
    improvementRate: Math.round(improvementRate),
    consistencyScore: Math.round(consistencyScore),
    painTrend,
    motivationTrend,
  };
};

/**
 * 進捗ページメインコンポーネント
 */
const ProgressPage: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('month');
  const [measurements, setMeasurements] = useState<MotionMeasurement[]>([]);
  const [calendarRecords, setCalendarRecords] = useState<CalendarRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // データ読み込み
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [measurementData, recordData] = await Promise.all([
          fetchMeasurements(),
          fetchCalendarRecords(),
        ]);

        setMeasurements(measurementData);
        setCalendarRecords(recordData);
      } catch (error) {
        console.error('データの読み込みに失敗:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // 期間フィルタリング済みデータ
  const filteredMeasurements = useMemo(
    () => filterDataByPeriod(measurements, selectedPeriod),
    [measurements, selectedPeriod]
  );

  const filteredRecords = useMemo(
    () => filterDataByPeriod(calendarRecords, selectedPeriod),
    [calendarRecords, selectedPeriod]
  );

  // 統計情報
  const stats = useMemo(
    () => calculateProgressStats(filteredMeasurements, filteredRecords),
    [filteredMeasurements, filteredRecords]
  );

  const periodLabels: Record<PeriodType, string> = {
    week: '1週間',
    month: '1ヶ月',
    '3months': '3ヶ月',
    '6months': '6ヶ月',
    year: '1年',
  };

  const getTrendIcon = (trend: 'improving' | 'stable' | 'worsening') => {
    switch (trend) {
      case 'improving':
        return '📈';
      case 'worsening':
        return '📉';
      default:
        return '➡️';
    }
  };

  const getTrendColor = (trend: 'improving' | 'stable' | 'worsening') => {
    switch (trend) {
      case 'improving':
        return '#4caf50';
      case 'worsening':
        return '#f44336';
      default:
        return '#ff9800';
    }
  };

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
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>
            <span className={styles.titleIcon}>📊</span>
            進捗レポート
          </h1>
          <div className={styles.periodSelector}>
            {Object.entries(periodLabels).map(([period, label]) => (
              <button
                key={period}
                className={`${styles.periodButton} ${
                  selectedPeriod === period ? styles.active : ''
                }`}
                onClick={() => setSelectedPeriod(period as PeriodType)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className={styles.mainContent}>
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <h3>測定回数</h3>
            <p className={styles.statValue}>{stats.totalMeasurements}回</p>
            <span className={styles.statDescription}>期間内の総測定回数</span>
          </div>

          <div className={styles.statCard}>
            <h3>平均精度</h3>
            <p className={styles.statValue}>{stats.avgAccuracy}%</p>
            <span className={styles.statDescription}>測定精度の平均値</span>
          </div>

          <div className={styles.statCard}>
            <h3>改善率</h3>
            <p className={styles.statValue}>
              {stats.improvementRate > 0 ? '+' : ''}
              {stats.improvementRate}%
            </p>
            <span className={styles.statDescription}>可動域の変化率</span>
          </div>

          <div className={styles.statCard}>
            <h3>継続性</h3>
            <p className={styles.statValue}>{stats.consistencyScore}%</p>
            <span className={styles.statDescription}>測定頻度のスコア</span>
          </div>

          <div className={styles.statCard}>
            <h3>痛みレベル</h3>
            <p
              className={styles.statValue}
              style={{ color: getTrendColor(stats.painTrend) }}
            >
              {getTrendIcon(stats.painTrend)}
            </p>
            <span className={styles.statDescription}>
              {stats.painTrend === 'improving'
                ? '改善中'
                : stats.painTrend === 'worsening'
                  ? '悪化傾向'
                  : '安定'}
            </span>
          </div>

          <div className={styles.statCard}>
            <h3>意欲レベル</h3>
            <p
              className={styles.statValue}
              style={{ color: getTrendColor(stats.motivationTrend) }}
            >
              {getTrendIcon(stats.motivationTrend)}
            </p>
            <span className={styles.statDescription}>
              {stats.motivationTrend === 'improving'
                ? '向上中'
                : stats.motivationTrend === 'worsening'
                  ? '低下傾向'
                  : '安定'}
            </span>
          </div>
        </div>

        <div className={styles.chartsContainer}>
          <ProgressCharts
            measurements={filteredMeasurements}
            calendarRecords={filteredRecords}
            selectedPeriod={selectedPeriod}
          />
        </div>

        {filteredMeasurements.length === 0 && (
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
