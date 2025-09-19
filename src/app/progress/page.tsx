/**
 * 進捗ページ
 * 測定データの推移と統計情報を表示
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { MotionChartsContainer } from '@/components/progress/MotionChartsContainer';
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
 * 開発者用設定: サンプルデータを強制使用するかどうか
 *
 * 使用方法:
 * - true:  サンプルデータを強制使用（実際のデータがあっても無視）
 * - false: 実際のデータを優先使用（データがない場合のみサンプルデータ）
 *
 * 開発・テスト時はtrueに設定して、グラフの動作確認を行ってください。
 * 本番環境やユーザーテスト時はfalseに設定してください。
 */
const FORCE_USE_SAMPLE_DATA = true;

/**
 * テスト用サンプルデータを生成
 */
const generateSampleData = (): MotionMeasurement[] => {
  const sampleData: MotionMeasurement[] = [];
  const today = new Date();

  // 過去30日間のサンプルデータを生成
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    // ランダムな進歩を含むリアルなデータを生成
    const baseProgress = (29 - i) / 29; // 0から1への進歩
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
  userId: string = 'default-user'
): Promise<{ measurements: MotionMeasurement[]; isRealData: boolean }> => {
  try {
    const measurements = await db.measurements
      .where('userId')
      .equals(userId)
      .reverse()
      .toArray();

    console.log('進捗ページ: 取得した測定データ:', measurements);

    // 開発者設定に基づいてデータソースを決定
    if (FORCE_USE_SAMPLE_DATA) {
      const sampleData = generateSampleData();
      console.log('開発者設定により、サンプルデータを強制使用:', sampleData);
      return { measurements: sampleData, isRealData: false };
    }

    // 実際のデータがない場合はサンプルデータを使用
    if (measurements.length === 0) {
      const sampleData = generateSampleData();
      console.log('実際のデータがないため、サンプルデータを使用:', sampleData);
      return { measurements: sampleData, isRealData: false };
    }

    console.log('実際のデータを使用:', measurements);
    return { measurements, isRealData: true };
  } catch (error) {
    console.error('測定データの取得に失敗:', error);
    // エラーの場合もサンプルデータを返す
    return { measurements: generateSampleData(), isRealData: false };
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
 * 統計情報計算
 */
interface ProgressStats {
  totalMeasurements: number;
  improvementRate: number;
  consecutiveDays: number;
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

  return {
    totalMeasurements: measurements.length,
    improvementRate: Math.round(improvementRate),
    consecutiveDays,
  };
};

/**
 * 進捗ページメインコンポーネント
 */
const ProgressPage: React.FC = () => {
  const [measurements, setMeasurements] = useState<MotionMeasurement[]>([]);
  const [calendarRecords, setCalendarRecords] = useState<CalendarRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingRealData, setUsingRealData] = useState(true);

  // データ読み込み
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [measurementResult, recordData] = await Promise.all([
          fetchMeasurements(),
          fetchCalendarRecords(),
        ]);

        setMeasurements(measurementResult.measurements);
        setUsingRealData(measurementResult.isRealData);
        setCalendarRecords(recordData);
      } catch (error) {
        console.error('データの読み込みに失敗:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // 統計情報
  const stats = useMemo(
    () => calculateProgressStats(measurements, calendarRecords),
    [measurements, calendarRecords]
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
      {!usingRealData && (
        <div className={styles.sampleDataBanner}>
          ⚠️ {FORCE_USE_SAMPLE_DATA ? '開発者設定により' : ''}
          サンプルデータを表示中です
        </div>
      )}

      <div className={styles.pageHeader}>
        <h1 className={styles.title}>
          <span className={styles.titleIcon}>📊</span>
          進捗レポート
        </h1>
      </div>

      <main className={styles.mainContent}>
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <h3>測定回数</h3>
            <p className={styles.statValue}>{stats.totalMeasurements}回</p>
            <span className={styles.statDescription}>期間内の総測定回数</span>
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
            <p className={styles.statValue}>{stats.consecutiveDays}日</p>
            <span className={styles.statDescription}>連続記録日数</span>
          </div>
        </div>

        <div className={styles.chartsContainer}>
          <MotionChartsContainer measurements={measurements} />
        </div>

        {measurements.length === 0 && usingRealData && (
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
