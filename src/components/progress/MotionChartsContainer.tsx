/**
 * 全可動域グラフを表示するコンテナコンポーネント
 * 掌屈、背屈、橈屈、尺屈の4つのグラフを管理
 */

'use client';

import React, { useState } from 'react';
import { MotionChart, type MotionType } from './MotionChart';
import type { MotionMeasurement } from '@/lib/data-manager/models/motion-measurement';
import styles from './MotionChartsContainer.module.scss';

/**
 * MotionChartsContainerコンポーネントのProps
 */
interface MotionChartsContainerProps {
  measurements: MotionMeasurement[];
  className?: string;
  selectedPeriod?: 'week' | 'month' | '3months' | '6months' | 'year';
}

/**
 * 可動域タイプ一覧
 */
const MOTION_TYPES: { type: MotionType; label: string; description: string }[] =
  [
    {
      type: 'flexion',
      label: '掌屈',
      description: '手首を手のひら側に曲げる可動域',
    },
    {
      type: 'extension',
      label: '背屈',
      description: '手首を手の甲側に曲げる可動域',
    },
    {
      type: 'radial',
      label: '橈屈',
      description: '手首を親指側に曲げる可動域',
    },
    { type: 'ulnar', label: '尺屈', description: '手首を小指側に曲げる可動域' },
  ];

/**
 * 期間に基づいてデータをフィルタリング
 */
const filterMeasurementsByPeriod = (
  measurements: MotionMeasurement[],
  period: 'week' | 'month' | '3months' | '6months' | 'year'
): MotionMeasurement[] => {
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

  return measurements.filter(
    (measurement) => new Date(measurement.measurementDate) >= startDate
  );
};

/**
 * 全可動域グラフを表示するコンテナコンポーネント
 */
export const MotionChartsContainer: React.FC<MotionChartsContainerProps> = ({
  measurements,
  className,
  selectedPeriod = 'month',
}) => {
  const [activeTab, setActiveTab] = useState<MotionType>('flexion');

  // 期間でフィルタリングされた測定データ
  const filteredMeasurements = React.useMemo(
    () => filterMeasurementsByPeriod(measurements, selectedPeriod),
    [measurements, selectedPeriod]
  );

  return (
    <div className={`${styles.container} ${className || ''}`}>
      {/* ヘッダー */}
      <div className={styles.container__header}>
        <div className={styles.container__headerMain}>
          <h2 className={styles.container__title}>可動域推移グラフ</h2>
          <p className={styles.container__description}>
            手首の可動域測定データの推移を確認できます
          </p>
        </div>
      </div>

      {/* グラフ表示エリア */}
      <div className={styles.container__content}>
        {/* タブ表示 */}
        <div className={styles.tabsContainer}>
          {/* タブヘッダー */}
          <div className={styles.tabsContainer__header}>
            {MOTION_TYPES.map((motionType) => (
              <button
                key={motionType.type}
                type="button"
                className={`${styles.tab} ${
                  activeTab === motionType.type ? styles['tab--active'] : ''
                }`}
                onClick={() => setActiveTab(motionType.type)}
              >
                <span className={styles.tab__label}>{motionType.label}</span>
                <span className={styles.tab__description}>
                  {motionType.description}
                </span>
              </button>
            ))}
          </div>

          {/* タブコンテンツ */}
          <div className={styles.tabsContainer__content}>
            <MotionChart
              measurements={filteredMeasurements}
              motionType={activeTab}
              period={selectedPeriod}
              {...(styles.tabsContainer__chart && {
                className: styles.tabsContainer__chart,
              })}
            />
          </div>
        </div>
      </div>

      {/* データが無い場合の表示 */}
      {filteredMeasurements.length === 0 && (
        <div className={styles.container__empty}>
          <div className={styles.empty}>
            <div className={styles.empty__icon}>📊</div>
            <h3 className={styles.empty__title}>測定データがありません</h3>
            <p className={styles.empty__description}>
              選択した期間内に測定データがありません。
              <br />
              期間を変更するか、新しい測定を行ってください。
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
