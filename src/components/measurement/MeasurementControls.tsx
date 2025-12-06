/**
 * 測定コントロールコンポーネント
 * 測定の開始/停止、手の選択、精度表示などの制御UI
 */

import React from 'react';
import type { HandType } from '@/lib/data-manager/models/motion-measurement';
import styles from './MeasurementControls.module.scss';

/**
 * 測定コントロールコンポーネントのProps
 */
interface MeasurementControlsProps {
  isCapturing: boolean;
  isReady: boolean;
  selectedHand: HandType;
  accuracy: number;
  isSaving: boolean;
  onStartMeasurement: () => void;
  onStopMeasurement: () => void;
  onSaveMeasurement?: () => void;
  onHandSelection: (hand: HandType) => void;
  className?: string;
}

/**
 * 測定コントロールコンポーネント
 */
export const MeasurementControls: React.FC<MeasurementControlsProps> = ({
  isCapturing,
  isReady,
  selectedHand,
  accuracy,
  isSaving,
  onStartMeasurement,
  onStopMeasurement,
  onSaveMeasurement,
  onHandSelection,
  className,
}) => {
  // 精度をパーセンテージに変換
  const accuracyPercentage = Math.round(accuracy * 100);

  // 測定開始可能かの判定
  const canStartMeasurement = isReady && !isCapturing && !isSaving;

  // 測定停止可能かの判定
  const canStopMeasurement = isCapturing && accuracy >= 0.7; // 70%以上の精度で保存可能

  return (
    <div className={`${styles.measurementControls} ${className || ''}`}>
      {/* 手の選択 */}
      <div className={styles.handSelection}>
        <h3>測定対象の手</h3>
        <div className={styles.handButtons}>
          <button
            type="button"
            className={`${styles.handButton} ${selectedHand === 'left' ? styles.active : ''}`}
            onClick={() => onHandSelection('left')}
            disabled={isCapturing}
          >
            <span className={styles.handIcon}>🤚</span>
            <span>左手</span>
          </button>
          <button
            type="button"
            className={`${styles.handButton} ${selectedHand === 'right' ? styles.active : ''}`}
            onClick={() => onHandSelection('right')}
            disabled={isCapturing}
          >
            <span className={styles.handIcon}>✋</span>
            <span>右手</span>
          </button>
        </div>
      </div>

      {/* 測定ステータス */}
      <div className={styles.measurementStatus}>
        <h3>測定ステータス</h3>
        <div className={styles.statusGrid}>
          <div className={styles.statusItem}>
            <span className={styles.statusLabel}>カメラ:</span>
            <span
              className={`${styles.statusValue} ${isReady ? styles.ready : styles.notReady}`}
            >
              {isReady ? '準備完了' : '準備中...'}
            </span>
          </div>

          <div className={styles.statusItem}>
            <span className={styles.statusLabel}>測定:</span>
            <span
              className={`${styles.statusValue} ${isCapturing ? styles.capturing : styles.idle}`}
            >
              {isCapturing ? '測定中' : '待機中'}
            </span>
          </div>

          <div className={styles.statusItem}>
            <span className={styles.statusLabel}>精度:</span>
            <span
              className={`${styles.statusValue} ${accuracyPercentage >= 70 ? styles.good : styles.poor}`}
            >
              {accuracyPercentage}%
            </span>
          </div>
        </div>
      </div>

      {/* 精度インジケーター */}
      <div className={styles.accuracyIndicator}>
        <h3>測定精度</h3>
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{
              width: `${accuracyPercentage}%`,
              backgroundColor:
                accuracyPercentage >= 70
                  ? '#4CAF50'
                  : accuracyPercentage >= 50
                    ? '#FF9800'
                    : '#F44336',
            }}
          />
        </div>
        <div className={styles.accuracyText}>
          {accuracyPercentage >= 70 && (
            <span className={styles.goodAccuracy}>✓ 測定可能な精度です</span>
          )}
          {accuracyPercentage < 70 && accuracyPercentage >= 50 && (
            <span className={styles.mediumAccuracy}>
              △ 手をもう少し安定させてください
            </span>
          )}
          {accuracyPercentage < 50 && (
            <span className={styles.poorAccuracy}>
              ⚠ 手を画面内に入れてください
            </span>
          )}
        </div>
      </div>

      {/* 測定コントロールボタン */}
      <div className={styles.measurementButtons}>
        {!isCapturing ? (
          <button
            type="button"
            className={`${styles.primaryButton} ${styles.startButton}`}
            onClick={onStartMeasurement}
            disabled={!canStartMeasurement}
          >
            {!isReady ? (
              <>
                <span className={styles.spinner}></span>
                準備中...
              </>
            ) : (
              <>
                <span className={styles.buttonIcon}>▶️</span>
                測定開始
              </>
            )}
          </button>
        ) : (
          <div className={styles.captureButtons}>
            <button
              type="button"
              className={`${styles.primaryButton} ${styles.stopButton}`}
              onClick={onStopMeasurement}
              disabled={!canStopMeasurement || isSaving}
            >
              {isSaving ? (
                <>
                  <span className={styles.spinner}></span>
                  保存中...
                </>
              ) : (
                <>
                  <span className={styles.buttonIcon}>⏹️</span>
                  測定停止
                </>
              )}
            </button>

            {onSaveMeasurement && (
              <button
                type="button"
                className={`${styles.primaryButton} ${styles.saveButton}`}
                onClick={onSaveMeasurement}
                disabled={!canStopMeasurement || isSaving}
              >
                {isSaving ? (
                  <>
                    <span className={styles.spinner}></span>
                    保存中...
                  </>
                ) : (
                  <>
                    <span className={styles.buttonIcon}>💾</span>
                    結果を保存
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* 測定ガイド */}
      {isCapturing && (
        <div className={styles.measurementGuide}>
          <h3>測定ガイド</h3>
          <ul className={styles.guideList}>
            <li
              className={`${styles.guideItem} ${isReady ? styles.completed : ''}`}
            >
              ✓ カメラに向かって{selectedHand === 'right' ? '右手' : '左手'}
              を出してください
            </li>
            <li
              className={`${styles.guideItem} ${accuracyPercentage >= 30 ? styles.completed : ''}`}
            >
              {accuracyPercentage >= 30 ? '✓' : '○'}{' '}
              手を画面のガイド枠内に合わせてください
            </li>
            <li
              className={`${styles.guideItem} ${accuracyPercentage >= 50 ? styles.completed : ''}`}
            >
              {accuracyPercentage >= 50 ? '✓' : '○'}{' '}
              手をゆっくりと動かしてください
            </li>
            <li
              className={`${styles.guideItem} ${accuracyPercentage >= 70 ? styles.completed : ''}`}
            >
              {accuracyPercentage >= 70 ? '✓' : '○'}{' '}
              精度が70%以上で測定完了できます
            </li>
          </ul>
        </div>
      )}

      {/* エラーメッセージ */}
      {!isReady && (
        <div className={styles.errorMessage}>
          <span className={styles.errorIcon}>⚠️</span>
          カメラの準備ができていません。ブラウザでカメラアクセスを許可してください。
        </div>
      )}
    </div>
  );
};
