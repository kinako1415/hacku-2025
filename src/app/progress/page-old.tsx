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
import styles from './page.module.scss';

/**
 * 期間選択タイプ
 */
type PeriodType = 'week' | 'month' | '3months' | '6months' | 'year';

/**
 * サンプルデータ生成
 */
const generateSampleMeasurements = (): MotionMeasurement[] => {
  const measurements: MotionMeasurement[] = [];
  const today = new Date();

  for (let i = 29; i >= 0; i--) {
    const measurementDate = new Date(today);
    measurementDate.setDate(today.getDate() - i);

    // ランダムだが改善傾向のあるデータ
    const progress = (30 - i) / 30; // 0から1の進捗
    const baseFlexion = 45 + progress * 30; // 45度から75度に改善
    const baseExtension = 20 + progress * 15; // 20度から35度に改善

    if (Math.random() > 0.3) {
      // 70%の確率で測定記録があるとする
      measurements.push({
        id: `measurement-${i}`,
        userId: 'sample-user',
        measurementDate: measurementDate,
        handUsed: Math.random() > 0.5 ? 'right' : 'left',
        wristFlexion: baseFlexion + (Math.random() - 0.5) * 10,
        wristExtension: baseExtension + (Math.random() - 0.5) * 8,
        thumbFlexion: 35 + progress * 20 + (Math.random() - 0.5) * 8,
        thumbExtension: 25 + progress * 15 + (Math.random() - 0.5) * 6,
        thumbAbduction: 30 + progress * 20 + (Math.random() - 0.5) * 8,
        thumbAdduction: 0,
        wristRadialDeviation: 15 + progress * 10 + (Math.random() - 0.5) * 5,
        wristUlnarDeviation: 20 + progress * 15 + (Math.random() - 0.5) * 7,
        accuracyScore: 0.7 + progress * 0.25 + (Math.random() - 0.5) * 0.1,
        comparisonResult: {
          overallStatus: 'normal',
          wristFlexion: { status: 'normal', within_range: true },
          wristExtension: { status: 'normal', within_range: true },
          wristUlnarDeviation: { status: 'normal', within_range: true },
          wristRadialDeviation: { status: 'normal', within_range: true },
          thumbFlexion: { status: 'normal', within_range: true },
          thumbExtension: { status: 'normal', within_range: true },
          thumbAbduction: { status: 'normal', within_range: true },
          thumbAdduction: { status: 'normal', within_range: true },
        },
        createdAt: measurementDate,
      });
    }
  }

  return measurements;
};

const generateSampleCalendarRecords = (): CalendarRecord[] => {
  const records: CalendarRecord[] = [];
  const today = new Date();

  for (let i = 29; i >= 0; i--) {
    const recordDate = new Date(today);
    recordDate.setDate(today.getDate() - i);

    if (Math.random() > 0.2) {
      // 80%の確率で記録があるとする
      const progress = (30 - i) / 30;

      const recordData: CalendarRecord = {
        userId: 'sample-user',
        recordDate: recordDate,
        rehabCompleted: Math.random() > 0.15, // 85%の完了率
        measurementCompleted: Math.random() > 0.2, // 80%の完了率
        painLevel: Math.max(
          1,
          Math.min(5, Math.round(5 - progress * 3 + (Math.random() - 0.5) * 2))
        ) as PainLevel, // 5から2に改善
        motivationLevel: Math.max(
          1,
          Math.min(5, Math.round(3 + progress * 2 + (Math.random() - 0.5) * 1))
        ) as MotivationLevel, // 3から5に改善
        performanceLevel: Math.max(
          1,
          Math.min(5, Math.round(2 + progress * 3 + (Math.random() - 0.5) * 1))
        ) as PerformanceLevel, // 2から5に改善
        createdAt: recordDate,
        updatedAt: recordDate,
      };

      if (i % 10 === 0) {
        recordData.notes = '今日は頑張りました！';
      }

      records.push(recordData);
    }
  }

  return records;
};

/**
 * 統計情報の計算
 */
const calculateStats = (
  measurements: MotionMeasurement[],
  period: PeriodType
) => {
  const now = new Date();
  const periodDays = {
    week: 7,
    month: 30,
    '3months': 90,
    '6months': 180,
    year: 365,
  };

  const cutoffDate = new Date(
    now.getTime() - periodDays[period] * 24 * 60 * 60 * 1000
  );
  const filteredMeasurements = measurements.filter(
    (m) => new Date(m.measurementDate) >= cutoffDate
  );

  if (filteredMeasurements.length === 0) {
    return {
      totalMeasurements: 0,
      averageAccuracy: 0,
      averageWristFlexion: 0,
      averageWristExtension: 0,
      averageThumbFlexion: 0,
      improvementRate: 0,
    };
  }

  const latest = filteredMeasurements[filteredMeasurements.length - 1];
  const earliest = filteredMeasurements[0];

  const improvementRate =
    latest && earliest
      ? ((latest.wristFlexion - earliest.wristFlexion) /
          earliest.wristFlexion) *
        100
      : 0;

  return {
    totalMeasurements: filteredMeasurements.length,
    averageAccuracy:
      filteredMeasurements.reduce((sum, m) => sum + m.accuracyScore, 0) /
      filteredMeasurements.length,
    averageWristFlexion:
      filteredMeasurements.reduce((sum, m) => sum + m.wristFlexion, 0) /
      filteredMeasurements.length,
    averageWristExtension:
      filteredMeasurements.reduce((sum, m) => sum + m.wristExtension, 0) /
      filteredMeasurements.length,
    averageThumbFlexion:
      filteredMeasurements.reduce((sum, m) => sum + m.thumbFlexion, 0) /
      filteredMeasurements.length,
    improvementRate,
  };
};

/**
 * 進捗ページコンポーネント
 */
export default function ProgressPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('month');
  const [measurements, setMeasurements] = useState<MotionMeasurement[]>([]);
  const [calendarRecords, setCalendarRecords] = useState<CalendarRecord[]>([]);

  // データの初期化
  useEffect(() => {
    const initializeData = async () => {
      try {
        setIsLoading(true);

        // 実際の実装では localStorage や IndexedDB からデータを読み込む
        // ここではサンプルデータを使用
        const sampleMeasurements = generateSampleMeasurements();
        const sampleRecords = generateSampleCalendarRecords();

        setMeasurements(sampleMeasurements);
        setCalendarRecords(sampleRecords);

        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : '予期しないエラーが発生しました'
        );
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
  }, []);

  // 統計情報の計算
  const stats = useMemo(
    () => calculateStats(measurements, selectedPeriod),
    [measurements, selectedPeriod]
  );

  // 期間変更ハンドラー
  const handlePeriodChange = (period: PeriodType) => {
    setSelectedPeriod(period);
  };

  // エラーリセット
  const handleErrorReset = () => {
    setError(null);
    window.location.reload();
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}>
          <div className={styles.spinner}></div>
          <h2>データを読み込んでいます</h2>
          <p>進捗データを準備しています...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.progressPage}>
      {/* ヘッダー */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>
            <span className={styles.titleIcon}>📊</span>
            進捗分析
          </h1>
          <nav className={styles.navigation}>
            <a href="/measurement" className={styles.navLink}>
              <span>📏</span>
              測定
            </a>
            <a href="/calendar" className={styles.navLink}>
              <span>📅</span>
              カレンダー
            </a>
            <a href="/setup" className={styles.navLink}>
              <span>⚙️</span>
              設定
            </a>
          </nav>
        </div>
      </header>

      {/* エラー表示 */}
      {error && (
        <div className={styles.errorContainer}>
          <div className={styles.errorMessage}>
            <span className={styles.errorIcon}>⚠️</span>
            <span>エラー: {error}</span>
            <button
              onClick={handleErrorReset}
              className={styles.errorResetButton}
            >
              再読み込み
            </button>
          </div>
        </div>
      )}

      <main className={styles.mainContent}>
        {/* 期間選択 */}
        <section className={styles.periodSelector}>
          <h2>分析期間</h2>
          <div className={styles.periodButtons}>
            {(
              ['week', 'month', '3months', '6months', 'year'] as PeriodType[]
            ).map((period) => (
              <button
                key={period}
                onClick={() => handlePeriodChange(period)}
                className={`${styles.periodButton} ${selectedPeriod === period ? styles.active : ''}`}
              >
                {period === 'week' && '1週間'}
                {period === 'month' && '1ヶ月'}
                {period === '3months' && '3ヶ月'}
                {period === '6months' && '6ヶ月'}
                {period === 'year' && '1年'}
              </button>
            ))}
          </div>
        </section>

        {/* 統計サマリー */}
        <section className={styles.statsSection}>
          <h2>統計サマリー</h2>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>🎯</div>
              <div className={styles.statContent}>
                <div className={styles.statLabel}>測定回数</div>
                <div className={styles.statValue}>
                  {stats.totalMeasurements}回
                </div>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon}>📐</div>
              <div className={styles.statContent}>
                <div className={styles.statLabel}>平均手首屈曲</div>
                <div className={styles.statValue}>
                  {stats.averageWristFlexion.toFixed(1)}°
                </div>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon}>📏</div>
              <div className={styles.statContent}>
                <div className={styles.statLabel}>平均手首伸展</div>
                <div className={styles.statValue}>
                  {stats.averageWristExtension.toFixed(1)}°
                </div>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon}>👍</div>
              <div className={styles.statContent}>
                <div className={styles.statLabel}>測定精度</div>
                <div className={styles.statValue}>
                  {(stats.averageAccuracy * 100).toFixed(1)}%
                </div>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon}>📈</div>
              <div className={styles.statContent}>
                <div className={styles.statLabel}>改善率</div>
                <div className={styles.statValue}>
                  {stats.improvementRate > 0 ? '+' : ''}
                  {stats.improvementRate.toFixed(1)}%
                </div>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon}>👆</div>
              <div className={styles.statContent}>
                <div className={styles.statLabel}>平均母指屈曲</div>
                <div className={styles.statValue}>
                  {stats.averageThumbFlexion.toFixed(1)}°
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 進捗チャート */}
        <section className={styles.chartsSection}>
          <h2>詳細分析</h2>
          <ProgressCharts
            measurements={measurements}
            calendarRecords={calendarRecords}
            selectedPeriod={selectedPeriod}
            onPeriodChange={handlePeriodChange}
            {...(styles.progressCharts && { className: styles.progressCharts })}
          />
        </section>

        {/* インサイト */}
        <section className={styles.insightsSection}>
          <h2>📝 アドバイス</h2>
          <div className={styles.insightCards}>
            {stats.improvementRate > 5 && (
              <div className={styles.insightCard}>
                <div className={styles.insightIcon}>🎉</div>
                <div className={styles.insightContent}>
                  <h3>素晴らしい改善</h3>
                  <p>
                    可動域が{stats.improvementRate.toFixed(1)}
                    %改善しています。この調子で続けましょう！
                  </p>
                </div>
              </div>
            )}

            {stats.averageAccuracy < 0.7 && (
              <div className={styles.insightCard}>
                <div className={styles.insightIcon}>💡</div>
                <div className={styles.insightContent}>
                  <h3>測定精度の向上</h3>
                  <p>
                    測定精度を向上させるため、照明を明るくし、背景を単色にしてみてください。
                  </p>
                </div>
              </div>
            )}

            {stats.totalMeasurements < 7 && selectedPeriod === 'week' && (
              <div className={styles.insightCard}>
                <div className={styles.insightIcon}>⏰</div>
                <div className={styles.insightContent}>
                  <h3>継続を心がけましょう</h3>
                  <p>
                    週に7回以上の測定を目標にしましょう。毎日の継続が改善への近道です。
                  </p>
                </div>
              </div>
            )}

            {stats.totalMeasurements >= 20 && selectedPeriod === 'month' && (
              <div className={styles.insightCard}>
                <div className={styles.insightIcon}>🏆</div>
                <div className={styles.insightContent}>
                  <h3>継続優秀</h3>
                  <p>
                    月間{stats.totalMeasurements}
                    回の測定、素晴らしい継続力です！
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* フッター */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <p>AI駆動手首・母指可動域リハビリテーションアプリ</p>
          <div className={styles.footerLinks}>
            <a href="/privacy">プライバシーポリシー</a>
            <a href="/terms">利用規約</a>
            <a href="/help">ヘルプ</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
