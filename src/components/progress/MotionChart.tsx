/**
 * 可動域測定データ用チャートコンポーネント
 * 掌屈、背屈、橈屈、尺屈の各データを時系列グラフで表示
 */

'use client';

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { MotionMeasurement } from '@/lib/data-manager/models/motion-measurement';
import styles from './MotionChart.module.scss';

/**
 * 可動域の種類
 */
export type MotionType =
  | 'flexion'
  | 'extension'
  | 'radial'
  | 'ulnar'
  | 'pronation'
  | 'supination';

/**
 * チャートデータポイント
 */
interface ChartDataPoint {
  date: string;
  value: number;
  formattedDate: string;
}

/**
 * MotionChartコンポーネントのProps
 */
interface MotionChartProps {
  measurements: MotionMeasurement[];
  motionType: MotionType;
  period?: 'week' | 'month' | '3months' | '6months' | 'year';
  className?: string;
}

/**
 * 可動域タイプごとの設定
 */
const MOTION_CONFIG = {
  flexion: {
    label: '掌屈',
    color: '#3B82F6',
    unit: '°',
    description: '手首を手のひら側に曲げる可動域',
    normalRange: { min: 0, max: 90 },
    getValueFromMeasurement: (m: MotionMeasurement) => m.wristFlexion,
  },
  extension: {
    label: '背屈',
    color: '#10B981',
    unit: '°',
    description: '手首を手の甲側に曲げる可動域',
    normalRange: { min: 0, max: 70 },
    getValueFromMeasurement: (m: MotionMeasurement) => m.wristExtension,
  },
  radial: {
    label: '橈屈',
    color: '#F59E0B',
    unit: '°',
    description: '手首を親指側に曲げる可動域',
    normalRange: { min: 0, max: 25 },
    getValueFromMeasurement: (m: MotionMeasurement) => m.wristRadialDeviation,
  },
  ulnar: {
    label: '尺屈',
    color: '#EF4444',
    unit: '°',
    description: '手首を小指側に曲げる可動域',
    normalRange: { min: 0, max: 55 },
    getValueFromMeasurement: (m: MotionMeasurement) => m.wristUlnarDeviation,
  },
  pronation: {
    label: '回内',
    color: '#8B5CF6',
    unit: '°',
    description: '前腕を内側にひねる可動域',
    normalRange: { min: 0, max: 90 },
    getValueFromMeasurement: (m: MotionMeasurement) => m.wristPronation ?? 0,
  },
  supination: {
    label: '回外',
    color: '#EC4899',
    unit: '°',
    description: '前腕を外側にひねる可動域',
    normalRange: { min: 0, max: 90 },
    getValueFromMeasurement: (m: MotionMeasurement) => m.wristSupination ?? 0,
  },
} as const;

/**
 * 日付フォーマット関数
 */
const formatDate = (date: Date, period: string): string => {
  const options: Intl.DateTimeFormatOptions = {};

  switch (period) {
    case 'week':
      options.month = 'short';
      options.day = 'numeric';
      break;
    case 'month':
      options.month = 'short';
      options.day = 'numeric';
      break;
    case '3months':
    case '6months':
      options.month = 'short';
      options.day = 'numeric';
      break;
    case 'year':
      options.year = 'numeric';
      options.month = 'short';
      break;
    default:
      options.month = 'short';
      options.day = 'numeric';
  }

  return date.toLocaleDateString('ja-JP', options);
};

/**
 * カスタムツールチップコンポーネント
 */
const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className={styles.tooltip}>
        <p className={styles.tooltip__date}>{data.payload.formattedDate}</p>
        <p className={styles.tooltip__value}>
          <span
            className={styles.tooltip__indicator}
            style={{ backgroundColor: data.color }}
          />
          {data.value.toFixed(1)}°
        </p>
      </div>
    );
  }
  return null;
};

/**
 * 可動域測定データ用チャートコンポーネント
 */
export const MotionChart: React.FC<MotionChartProps> = ({
  measurements,
  motionType,
  period = 'month',
  className,
}) => {
  const config = MOTION_CONFIG[motionType];

  // データを日付でソートし、チャート用に変換
  const chartData: ChartDataPoint[] = React.useMemo(() => {
    const sortedMeasurements = [...measurements].sort(
      (a, b) =>
        new Date(a.measurementDate).getTime() -
        new Date(b.measurementDate).getTime()
    );

    return sortedMeasurements.map((measurement) => {
      const date = new Date(measurement.measurementDate);
      const dateString = date.toISOString().split('T')[0];
      return {
        date: dateString || '',
        value: config.getValueFromMeasurement(measurement),
        formattedDate: formatDate(date, period),
      };
    });
  }, [measurements, motionType, period, config]);

  // 統計情報を計算
  const statistics = React.useMemo(() => {
    if (chartData.length === 0) {
      return { average: 0, max: 0, min: 0, latest: 0, change: 0 };
    }

    const values = chartData.map((d) => d.value);
    const average = values.reduce((sum, val) => sum + val, 0) / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);
    const latest = values[values.length - 1] || 0;
    const previous =
      values.length > 1 ? values[values.length - 2] || 0 : latest;
    const change = latest - previous;

    return { average, max, min, latest, change };
  }, [chartData]);

  if (chartData.length === 0) {
    return (
      <div className={`${styles.motionChart} ${className || ''}`}>
        <div className={styles.motionChart__header}>
          <h3 className={styles.motionChart__title}>{config.label}</h3>
          <p className={styles.motionChart__description}>
            {config.description}
          </p>
        </div>
        <div className={styles.motionChart__empty}>
          <p>測定データがありません</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.motionChart} ${className || ''}`}>
      {/* ヘッダー */}
      <div className={styles.motionChart__header}>
        <h3 className={styles.motionChart__title}>{config.label}</h3>
        <p className={styles.motionChart__description}>{config.description}</p>
      </div>

      <div className={styles.normalRange__info}>
        <span className={styles.normalRange__label}>正常可動域</span>
        <span className={styles.normalRange__value}>
          {config.normalRange.max}°
        </span>
      </div>

      {/* 統計情報 */}
      <div className={styles.motionChart__stats}>
        <div className={styles.stat}>
          <span className={styles.stat__label}>最新</span>
          <span className={styles.stat__value}>
            {statistics.latest.toFixed(1)}
            {config.unit}
          </span>
          {statistics.change !== 0 && (
            <span
              className={`${styles.stat__change} ${
                statistics.change > 0
                  ? styles['stat__change--positive']
                  : styles['stat__change--negative']
              }`}
            >
              {statistics.change > 0 ? '+' : ''}
              {statistics.change.toFixed(1)}°
            </span>
          )}
        </div>
        <div className={styles.stat}>
          <span className={styles.stat__label}>平均</span>
          <span className={styles.stat__value}>
            {statistics.average.toFixed(1)}
            {config.unit}
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.stat__label}>最大</span>
          <span className={styles.stat__value}>
            {statistics.max.toFixed(1)}
            {config.unit}
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.stat__label}>最小</span>
          <span className={styles.stat__value}>
            {statistics.min.toFixed(1)}
            {config.unit}
          </span>
        </div>
      </div>

      {/* チャート */}
      <div className={styles.motionChart__chartContainer}>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={chartData}
            margin={{
              top: 5,
              right: 5,
              left: 5,
              bottom: 5,
            }}
          >
            <CartesianGrid
              strokeDasharray="2 4"
              stroke="#E5E7EB"
              opacity={0.6}
              horizontal={true}
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tickFormatter={(value) => {
                const item = chartData.find((d) => d.date === value);
                return item ? item.formattedDate : value;
              }}
              stroke="#6B7280"
              fontSize={11}
              tickMargin={10}
              tick={{
                fontSize: 11,
                fill: '#6B7280',
                fontWeight: '400',
              }}
              axisLine={{ stroke: '#D1D5DB', strokeWidth: 1 }}
              tickLine={{ stroke: '#D1D5DB', strokeWidth: 1 }}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[
                Math.max(0, Math.min(...chartData.map((d) => d.value)) - 5),
                Math.min(
                  config.normalRange.max + 10,
                  Math.max(...chartData.map((d) => d.value)) + 5
                ),
              ]}
              stroke="#6B7280"
              fontSize={12}
              tickMargin={10}
              tickFormatter={(value) => `${Math.round(value)}°`}
              label={{
                value: `角度 (度)`,
                angle: -90,
                position: 'insideLeft',
                style: {
                  textAnchor: 'middle',
                  fontSize: '13px',
                  fill: '#374151',
                  fontWeight: '500',
                },
              }}
              tick={{
                fontSize: 12,
                fill: '#4B5563',
                fontWeight: '500',
              }}
              axisLine={{ stroke: '#D1D5DB', strokeWidth: 1 }}
              tickLine={{ stroke: '#D1D5DB', strokeWidth: 1 }}
              interval="preserveStartEnd"
              tickCount={6}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="value"
              stroke={config.color}
              strokeWidth={3}
              dot={{
                fill: config.color,
                strokeWidth: 2,
                stroke: '#fff',
                r: 4,
              }}
              activeDot={{
                r: 6,
                fill: config.color,
                stroke: '#fff',
                strokeWidth: 2,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 正常範囲の表示 */}
      {/* <div className={styles.motionChart__normalRange}>
        <div className={styles.normalRange__info}>
          <span className={styles.normalRange__label}>正常可動域</span>
          <span className={styles.normalRange__value}>
            {config.normalRange.max}°
          </span>
        </div>

        <div className={styles.normalRange__status}>
          <span className={styles.normalRange__current}>
            現在: {statistics.latest.toFixed(1)}°
          </span>
          <span
            className={`${styles.normalRange__badge} ${
              statistics.latest >= config.normalRange.max * 0.8
                ? styles['normalRange__badge--good']
                : statistics.latest >= config.normalRange.max * 0.6
                  ? styles['normalRange__badge--fair']
                  : styles['normalRange__badge--poor']
            }`}
          >
            {statistics.latest >= config.normalRange.max * 0.8
              ? '良好'
              : statistics.latest >= config.normalRange.max * 0.6
                ? '改善中'
                : '要改善'}
          </span>
        </div>
      </div> */}
    </div>
  );
};
