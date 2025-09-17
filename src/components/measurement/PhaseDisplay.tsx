/**
 * フェーズベース測定表示コンポーネント
 * 段階的な可動域測定のUI提供
 */

import React from 'react';
import styles from './PhaseDisplay.module.scss';

/**
 * 測定フェーズの型定義
 */
export type MeasurementPhase = 'flexion' | 'extension' | 'ulnarDeviation' | 'radialDeviation';

/**
 * フェーズ情報の型定義
 */
export interface PhaseInfo {
  id: MeasurementPhase;
  name: string;
  description: string;
  targetAngle: 'flexion' | 'extension' | 'ulnarDeviation' | 'radialDeviation';
  normalRange: { min: number; max: number };
  instruction: string;
}

/**
 * PhaseDisplayコンポーネントのProps型定義
 */
export interface PhaseDisplayProps {
  currentPhase: PhaseInfo;
  currentAngle: number;
  phaseProgress: number;
  totalPhases: number;
  currentPhaseNumber: number;
  isComplete: boolean;
  onNext?: () => void;
  onComplete?: () => void;
  status?: 'measuring' | 'complete' | 'invalid';
}

/**
 * PhaseDisplayコンポーネント
 * フェーズベースの測定UI
 */
const PhaseDisplay: React.FC<PhaseDisplayProps> = ({
  currentPhase,
  currentAngle,
  phaseProgress,
  totalPhases,
  currentPhaseNumber,
  isComplete,
  onNext,
  onComplete,
  status = 'measuring',
}) => {
  // 角度の正常範囲内かチェック
  const isAngleValid = currentAngle >= currentPhase.normalRange.min && 
                       currentAngle <= currentPhase.normalRange.max;
  
  // 角度プログレス（0-100%）
  const angleProgress = Math.min(
    100,
    Math.max(0, ((currentAngle - currentPhase.normalRange.min) / 
    (currentPhase.normalRange.max - currentPhase.normalRange.min)) * 100)
  );

  return (
    <div className={styles.phaseDisplay}>
      {/* フェーズプログレス */}
      <div className={styles.phaseProgress}>
        <div className={styles.progressBar}>
          <div 
            className={styles.progressFill}
            style={{ width: `${phaseProgress}%` }}
          />
        </div>
        <span className={styles.progressText}>
          {currentPhaseNumber}/{totalPhases}
        </span>
      </div>

      {/* 現在のフェーズ */}
      <div className={styles.currentPhase}>
        <div className={styles.phaseNumber}>
          step{currentPhaseNumber}. {currentPhase.name}
        </div>
        <div className={styles.angleDisplay}>
          <span className={styles.currentAngleValue}>
            {Math.round(currentAngle)}°
          </span>
        </div>
      </div>

      {/* 角度情報 */}
      <div className={styles.angleInfo}>
        <div className={styles.angleRange}>
          正常範囲: {currentPhase.normalRange.min}° - {currentPhase.normalRange.max}°
        </div>
        
        <div className={styles.angleProgress}>
          <div className={styles.angleBar}>
            <div 
              className={`${styles.angleFill} ${isAngleValid ? styles.valid : styles.invalid}`}
              style={{ width: `${angleProgress}%` }}
            />
          </div>
          <div className={styles.rangeMarkers}>
            <span className={styles.minMarker}>{currentPhase.normalRange.min}°</span>
            <span className={styles.maxMarker}>{currentPhase.normalRange.max}°</span>
          </div>
        </div>
      </div>

      {/* 指示・説明 */}
      <div className={styles.instructions}>
        <p className={styles.description}>{currentPhase.description}</p>
        <p className={styles.instruction}>{currentPhase.instruction}</p>
      </div>

      {/* ステータス */}
      <div className={styles.status}>
        {status === 'complete' && (
          <div className={`${styles.statusIndicator} ${styles.success}`}>
            測定完了
          </div>
        )}
        {status === 'invalid' && (
          <div className={`${styles.statusIndicator} ${styles.warning}`}>
            手をカメラに向けてください
          </div>
        )}
      </div>

      {/* アクションボタン */}
      <div className={styles.actionButtons}>
        {!isComplete && onNext && (
          <button
            className={`${styles.nextButton} ${isAngleValid ? styles.enabled : styles.disabled}`}
            onClick={onNext}
            disabled={!isAngleValid}
          >
            次のフェーズ
          </button>
        )}
        {isComplete && onComplete && (
          <button
            className={styles.completeButton}
            onClick={onComplete}
          >
            測定完了
          </button>
        )}
      </div>
    </div>
  );
};

export default PhaseDisplay;
