/**
 * 進捗チャートコンポーネント
 * 可動域測定データの推移と統計情報を視覚化
 */

import React, { useMemo, useState } from 'react';
import type { MotionMeasurement } from '@/lib/data-manager/models/motion-measurement';
import type { CalendarRecord } from '@/lib/data-manager/models/calendar-record';
import styles from './ProgressCharts.module.scss';

/**
 * 進捗チャートコンポーネントのProps
 */
interface ProgressChartsProps {
  measurements: MotionMeasurement[];
  calendarRecords: CalendarRecord[];
  selectedPeriod?: 'week' | 'month' | '3months' | '6months' | 'year';
  onPeriodChange?: (
    period: 'week' | 'month' | '3months' | '6months' | 'year'
  ) => void;
  className?: string;
}

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

/**
 * チャート表示タイプ
 */
const CHART_TYPES = [
  { value: 'angle' as const, label: '可動域角度', icon: '📐' },
  { value: 'accuracy' as const, label: '測定精度', icon: '🎯' },
  { value: 'completion' as const, label: '実施率', icon: '✅' },
  { value: 'subjective' as const, label: '主観評価', icon: '💭' },
];

/**
 * データポイント
 */
interface DataPoint {
  date: string;
  value: number;
  label: string;
}

/**
 * 統計情報
 */
interface Statistics {
  average: number;
  max: number;
  min: number;
  trend: 'up' | 'down' | 'stable';
  changeRate: number;
}

/**
 * 進捗チャートコンポーネント
 */
export const ProgressCharts: React.FC<ProgressChartsProps> = ({
  measurements,
  calendarRecords,
  selectedPeriod = 'month',
  onPeriodChange,
  className,
}) => {
  const [selectedChart, setSelectedChart] = useState<
    'angle' | 'accuracy' | 'completion' | 'subjective'
  >('angle');

  /**
   * 期間によるデータフィルタリング
   */
  const filteredData = useMemo(() => {
    const now = new Date();
    const periodStart = new Date();

    switch (selectedPeriod) {
      case 'week':
        periodStart.setDate(now.getDate() - 7);
        break;
      case 'month':
        periodStart.setMonth(now.getMonth() - 1);
        break;
      case '3months':
        periodStart.setMonth(now.getMonth() - 3);
        break;
      case '6months':
        periodStart.setMonth(now.getMonth() - 6);
        break;
      case 'year':
        periodStart.setFullYear(now.getFullYear() - 1);
        break;
    }

    const filteredMeasurements = measurements.filter(
      (m) => new Date(m.createdAt) >= periodStart
    );

    const filteredRecords = calendarRecords.filter(
      (r) => new Date(r.recordDate) >= periodStart
    );

    return { measurements: filteredMeasurements, records: filteredRecords };
  }, [measurements, calendarRecords, selectedPeriod]);

  /**
   * チャートデータ生成
   */
  const chartData = useMemo((): DataPoint[] => {
    const { measurements: filteredMeasurements, records: filteredRecords } =
      filteredData;

    switch (selectedChart) {
      case 'angle':
        return filteredMeasurements.map((m) => ({
          date: m.createdAt.toISOString().split('T')[0]!,
          value: m.wristFlexion || 0,
          label: `${Math.round(m.wristFlexion || 0)}°`,
        }));

      case 'accuracy':
        return filteredMeasurements.map((m) => ({
          date: m.createdAt.toISOString().split('T')[0]!,
          value: m.accuracyScore * 100,
          label: `${Math.round(m.accuracyScore * 100)}%`,
        }));

      case 'completion':
        // 日別の実施率を計算
        const dailyCompletion = new Map<
          string,
          { rehab: boolean; measurement: boolean }
        >();

        filteredRecords.forEach((r) => {
          const dateKey = r.recordDate.toISOString().split('T')[0];
          if (dateKey) {
            dailyCompletion.set(dateKey, {
              rehab: r.rehabCompleted,
              measurement: r.measurementCompleted,
            });
          }
        });

        return Array.from(dailyCompletion.entries()).map(([date, data]) => {
          const rate =
            ((Number(data.rehab) + Number(data.measurement)) / 2) * 100;
          return {
            date,
            value: rate,
            label: `${Math.round(rate)}%`,
          };
        });

      case 'subjective':
        return filteredRecords
          .filter((r) => r.performanceLevel !== undefined)
          .map((r) => {
            const dateKey = r.recordDate.toISOString().split('T')[0]!;
            return {
              date: dateKey,
              value: r.performanceLevel!,
              label: `レベル ${r.performanceLevel}`,
            };
          });

      default:
        return [];
    }
  }, [filteredData, selectedChart]);

  /**
   * 統計情報計算
   */
  const statistics = useMemo((): Statistics => {
    if (chartData.length === 0) {
      return {
        average: 0,
        max: 0,
        min: 0,
        trend: 'stable',
        changeRate: 0,
      };
    }

    const values = chartData.map((d) => d.value);
    const average = values.reduce((sum, val) => sum + val, 0) / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);

    // トレンド計算（最初の3つと最後の3つの平均を比較）
    let trend: 'up' | 'down' | 'stable' = 'stable';
    let changeRate = 0;

    if (values.length >= 6) {
      const firstThird = values.slice(0, 3);
      const lastThird = values.slice(-3);
      const firstAvg =
        firstThird.reduce((sum, val) => sum + val, 0) / firstThird.length;
      const lastAvg =
        lastThird.reduce((sum, val) => sum + val, 0) / lastThird.length;

      changeRate = ((lastAvg - firstAvg) / firstAvg) * 100;

      if (Math.abs(changeRate) > 5) {
        trend = changeRate > 0 ? 'up' : 'down';
      }
    }

    return { average, max, min, trend, changeRate };
  }, [chartData]);

  /**
   * 日付フォーマット
   */
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  /**
   * シンプルなSVGチャート描画
   */
  const renderChart = (): JSX.Element => {
    if (chartData.length === 0) {
      return (
        <div className={styles.noData}>
          <span>📊</span>
          <p>データがありません</p>
        </div>
      );
    }

    const maxValue = Math.max(...chartData.map((d) => d.value));
    const minValue = Math.min(...chartData.map((d) => d.value));
    const range = maxValue - minValue || 1;

    const width = 400;
    const height = 200;
    const padding = 40;

    const points = chartData.map((point, index) => {
      const x =
        padding + (index / (chartData.length - 1)) * (width - 2 * padding);
      const y =
        height -
        padding -
        ((point.value - minValue) / range) * (height - 2 * padding);
      return { x, y, ...point };
    });

    const pathData = points
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' ');

    return (
      <div className={styles.chartContainer}>
        <svg width={width} height={height} className={styles.chart}>
          {/* グリッドライン */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = height - padding - ratio * (height - 2 * padding);
            return (
              <line
                key={ratio}
                x1={padding}
                y1={y}
                x2={width - padding}
                y2={y}
                stroke="#e0e0e0"
                strokeWidth={1}
                strokeDasharray={ratio === 0 || ratio === 1 ? 'none' : '2,2'}
              />
            );
          })}

          {/* データライン */}
          <path
            d={pathData}
            fill="none"
            stroke="var(--primary-color, #2196f3)"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* データポイント */}
          {points.map((point, index) => (
            <g key={index}>
              <circle
                cx={point.x}
                cy={point.y}
                r={5}
                fill="var(--primary-color, #2196f3)"
                stroke="#ffffff"
                strokeWidth={2}
              />
              {/* ツールチップ */}
              <title>{`${formatDate(point.date)}: ${point.label}`}</title>
            </g>
          ))}

          {/* Y軸ラベル */}
          <text
            x={15}
            y={padding + (height - 2 * padding) / 2}
            textAnchor="middle"
            transform={`rotate(-90 15 ${padding + (height - 2 * padding) / 2})`}
            className={styles.axisLabel}
          >
            {CHART_TYPES.find((t) => t.value === selectedChart)?.label}
          </text>
        </svg>

        {/* X軸の日付ラベル */}
        <div className={styles.xLabels}>
          {points.map((point, index) => (
            <span key={index} className={styles.xLabel}>
              {formatDate(point.date)}
            </span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={`${styles.progressCharts} ${className || ''}`}>
      {/* ヘッダー */}
      <div className={styles.header}>
        <h2 className={styles.title}>📈 進捗チャート</h2>

        {/* 期間選択 */}
        <div className={styles.periodSelector}>
          {PERIOD_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`${styles.periodButton} ${
                selectedPeriod === option.value ? styles.active : ''
              }`}
              onClick={() => onPeriodChange?.(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* チャートタイプ選択 */}
      <div className={styles.chartTypeSelector}>
        {CHART_TYPES.map((type) => (
          <button
            key={type.value}
            type="button"
            className={`${styles.chartTypeButton} ${
              selectedChart === type.value ? styles.active : ''
            }`}
            onClick={() => setSelectedChart(type.value)}
          >
            <span className={styles.chartIcon}>{type.icon}</span>
            <span>{type.label}</span>
          </button>
        ))}
      </div>

      {/* 統計情報 */}
      <div className={styles.statistics}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>平均</span>
          <span className={styles.statValue}>
            {selectedChart === 'angle'
              ? `${Math.round(statistics.average)}°`
              : selectedChart === 'accuracy' || selectedChart === 'completion'
                ? `${Math.round(statistics.average)}%`
                : `レベル ${Math.round(statistics.average)}`}
          </span>
        </div>

        <div className={styles.statCard}>
          <span className={styles.statLabel}>最高値</span>
          <span className={styles.statValue}>
            {selectedChart === 'angle'
              ? `${Math.round(statistics.max)}°`
              : selectedChart === 'accuracy' || selectedChart === 'completion'
                ? `${Math.round(statistics.max)}%`
                : `レベル ${Math.round(statistics.max)}`}
          </span>
        </div>

        <div className={styles.statCard}>
          <span className={styles.statLabel}>トレンド</span>
          <span
            className={`${styles.statValue} ${styles[`trend-${statistics.trend}`]}`}
          >
            {statistics.trend === 'up' && '📈 上昇'}
            {statistics.trend === 'down' && '📉 下降'}
            {statistics.trend === 'stable' && '➡️ 安定'}
            {Math.abs(statistics.changeRate) > 1 && (
              <span className={styles.changeRate}>
                ({statistics.changeRate > 0 ? '+' : ''}
                {Math.round(statistics.changeRate)}%)
              </span>
            )}
          </span>
        </div>
      </div>

      {/* チャート表示 */}
      <div className={styles.chartSection}>{renderChart()}</div>

      {/* データサマリー */}
      {chartData.length > 0 && (
        <div className={styles.summary}>
          <h3>📊 期間サマリー</h3>
          <div className={styles.summaryStats}>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>データ数</span>
              <span className={styles.summaryValue}>{chartData.length}件</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>期間</span>
              <span className={styles.summaryValue}>
                {PERIOD_OPTIONS.find((p) => p.value === selectedPeriod)?.label}
              </span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>最終記録</span>
              <span className={styles.summaryValue}>
                {chartData.length > 0 && chartData[chartData.length - 1]
                  ? formatDate(chartData[chartData.length - 1]!.date)
                  : '-'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
