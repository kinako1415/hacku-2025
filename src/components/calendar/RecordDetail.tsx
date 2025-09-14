/**
 * カレンダー記録詳細コンポーネント
 * 選択された日付のリハビリ記録の詳細表示・編集
 */

import React, { useState, useEffect } from 'react';
import type {
  CalendarRecord,
  CreateCalendarRecordInput,
  UpdateCalendarRecordInput,
  PerformanceLevel,
  PainLevel,
  MotivationLevel,
} from '@/lib/data-manager/models/calendar-record';
import styles from './RecordDetail.module.scss';

/**
 * カレンダー記録詳細コンポーネントのProps
 */
interface RecordDetailProps {
  selectedDate: Date;
  record?: CalendarRecord;
  onSave: (
    data: CreateCalendarRecordInput | UpdateCalendarRecordInput
  ) => Promise<void>;
  onDelete?: (recordId: string) => Promise<void>;
  onClose?: () => void;
  isLoading?: boolean;
  className?: string;
}

/**
 * レベル選択のオプション
 */
const PERFORMANCE_LEVELS: Array<{
  value: PerformanceLevel;
  label: string;
  color: string;
}> = [
  { value: 1, label: '非常に悪い', color: '#F44336' },
  { value: 2, label: '悪い', color: '#FF9800' },
  { value: 3, label: '普通', color: '#FFC107' },
  { value: 4, label: '良い', color: '#8BC34A' },
  { value: 5, label: '非常に良い', color: '#4CAF50' },
];

const PAIN_LEVELS: Array<{ value: PainLevel; label: string; color: string }> = [
  { value: 1, label: '痛みなし', color: '#4CAF50' },
  { value: 2, label: '軽い痛み', color: '#8BC34A' },
  { value: 3, label: '中程度の痛み', color: '#FFC107' },
  { value: 4, label: '強い痛み', color: '#FF9800' },
  { value: 5, label: '激痛', color: '#F44336' },
];

const MOTIVATION_LEVELS: Array<{
  value: MotivationLevel;
  label: string;
  color: string;
}> = [
  { value: 1, label: '非常に低い', color: '#F44336' },
  { value: 2, label: '低い', color: '#FF9800' },
  { value: 3, label: '普通', color: '#FFC107' },
  { value: 4, label: '高い', color: '#8BC34A' },
  { value: 5, label: '非常に高い', color: '#4CAF50' },
];

/**
 * カレンダー記録詳細コンポーネント
 */
export const RecordDetail: React.FC<RecordDetailProps> = ({
  selectedDate,
  record,
  onSave,
  onDelete,
  onClose,
  isLoading = false,
  className,
}) => {
  // フォーム状態
  const [formData, setFormData] = useState({
    rehabCompleted: false,
    measurementCompleted: false,
    performanceLevel: undefined as PerformanceLevel | undefined,
    painLevel: undefined as PainLevel | undefined,
    motivationLevel: undefined as MotivationLevel | undefined,
    notes: '',
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  /**
   * レコードデータでフォームを初期化
   */
  useEffect(() => {
    if (record) {
      setFormData({
        rehabCompleted: record.rehabCompleted,
        measurementCompleted: record.measurementCompleted,
        performanceLevel: record.performanceLevel,
        painLevel: record.painLevel,
        motivationLevel: record.motivationLevel,
        notes: record.notes || '',
      });
    } else {
      setFormData({
        rehabCompleted: false,
        measurementCompleted: false,
        performanceLevel: undefined,
        painLevel: undefined,
        motivationLevel: undefined,
        notes: '',
      });
    }
    setHasChanges(false);
  }, [record]);

  /**
   * フォーム値変更ハンドラ
   */
  const handleInputChange = <K extends keyof typeof formData>(
    field: K,
    value: (typeof formData)[K]
  ): void => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setHasChanges(true);
  };

  /**
   * 保存処理
   */
  const handleSave = async (): Promise<void> => {
    setIsSaving(true);

    try {
      if (record) {
        // 更新
        const updateData: UpdateCalendarRecordInput = {
          rehabCompleted: formData.rehabCompleted,
          measurementCompleted: formData.measurementCompleted,
          ...(formData.performanceLevel !== undefined && {
            performanceLevel: formData.performanceLevel,
          }),
          ...(formData.painLevel !== undefined && {
            painLevel: formData.painLevel,
          }),
          ...(formData.motivationLevel !== undefined && {
            motivationLevel: formData.motivationLevel,
          }),
          ...(formData.notes && { notes: formData.notes }),
        };
        await onSave(updateData);
      } else {
        // 新規作成（userIdは呼び出し元で設定）
        const createData: CreateCalendarRecordInput = {
          userId: '', // 呼び出し元で設定される
          recordDate: selectedDate,
          rehabCompleted: formData.rehabCompleted,
          measurementCompleted: formData.measurementCompleted,
          ...(formData.performanceLevel !== undefined && {
            performanceLevel: formData.performanceLevel,
          }),
          ...(formData.painLevel !== undefined && {
            painLevel: formData.painLevel,
          }),
          ...(formData.motivationLevel !== undefined && {
            motivationLevel: formData.motivationLevel,
          }),
          ...(formData.notes && { notes: formData.notes }),
        };
        await onSave(createData);
      }

      setHasChanges(false);
    } catch (error) {
      console.error('保存エラー:', error);
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * 削除処理
   */
  const handleDelete = async (): Promise<void> => {
    if (record && onDelete && window.confirm('この記録を削除しますか？')) {
      try {
        await onDelete(record.id);
      } catch (error) {
        console.error('削除エラー:', error);
      }
    }
  };

  /**
   * 日付フォーマット
   */
  const formatDate = (date: Date): string => {
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  };

  /**
   * 完了率計算
   */
  const getCompletionRate = (): number => {
    let completed = 0;
    let total = 2;

    if (formData.rehabCompleted) completed++;
    if (formData.measurementCompleted) completed++;

    return Math.round((completed / total) * 100);
  };

  return (
    <div className={`${styles.recordDetail} ${className || ''}`}>
      {/* ヘッダー */}
      <div className={styles.header}>
        <h2 className={styles.title}>{formatDate(selectedDate)}の記録</h2>
        {onClose && (
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            disabled={isLoading}
          >
            ✕
          </button>
        )}
      </div>

      {/* 実施状況 */}
      <div className={styles.section}>
        <h3>実施状況</h3>
        <div className={styles.checkboxGroup}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={formData.rehabCompleted}
              onChange={(e) =>
                handleInputChange('rehabCompleted', e.target.checked)
              }
              disabled={isLoading}
            />
            <span className={styles.checkboxText}>リハビリテーション実施</span>
          </label>

          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={formData.measurementCompleted}
              onChange={(e) =>
                handleInputChange('measurementCompleted', e.target.checked)
              }
              disabled={isLoading}
            />
            <span className={styles.checkboxText}>可動域測定実施</span>
          </label>
        </div>

        <div className={styles.completionRate}>
          完了率: {getCompletionRate()}%
        </div>
      </div>

      {/* 主観的評価 */}
      <div className={styles.section}>
        <h3>主観的評価</h3>

        {/* パフォーマンスレベル */}
        <div className={styles.levelSection}>
          <h4>動作レベル</h4>
          <div className={styles.levelButtons}>
            {PERFORMANCE_LEVELS.map((level) => (
              <button
                key={level.value}
                type="button"
                className={`${styles.levelButton} ${
                  formData.performanceLevel === level.value
                    ? styles.selected
                    : ''
                }`}
                style={
                  {
                    '--level-color': level.color,
                  } as React.CSSProperties
                }
                onClick={() =>
                  handleInputChange('performanceLevel', level.value)
                }
                disabled={isLoading}
              >
                <span className={styles.levelNumber}>{level.value}</span>
                <span className={styles.levelLabel}>{level.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 痛みレベル */}
        <div className={styles.levelSection}>
          <h4>痛みレベル</h4>
          <div className={styles.levelButtons}>
            {PAIN_LEVELS.map((level) => (
              <button
                key={level.value}
                type="button"
                className={`${styles.levelButton} ${
                  formData.painLevel === level.value ? styles.selected : ''
                }`}
                style={
                  {
                    '--level-color': level.color,
                  } as React.CSSProperties
                }
                onClick={() => handleInputChange('painLevel', level.value)}
                disabled={isLoading}
              >
                <span className={styles.levelNumber}>{level.value}</span>
                <span className={styles.levelLabel}>{level.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* モチベーションレベル */}
        <div className={styles.levelSection}>
          <h4>モチベーション</h4>
          <div className={styles.levelButtons}>
            {MOTIVATION_LEVELS.map((level) => (
              <button
                key={level.value}
                type="button"
                className={`${styles.levelButton} ${
                  formData.motivationLevel === level.value
                    ? styles.selected
                    : ''
                }`}
                style={
                  {
                    '--level-color': level.color,
                  } as React.CSSProperties
                }
                onClick={() =>
                  handleInputChange('motivationLevel', level.value)
                }
                disabled={isLoading}
              >
                <span className={styles.levelNumber}>{level.value}</span>
                <span className={styles.levelLabel}>{level.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* メモ */}
      <div className={styles.section}>
        <h3>メモ・感想</h3>
        <textarea
          className={styles.notesTextarea}
          value={formData.notes}
          onChange={(e) => handleInputChange('notes', e.target.value)}
          placeholder="今日の調子や気づいたことを記録してください（最大500文字）"
          maxLength={500}
          rows={4}
          disabled={isLoading}
        />
        <div className={styles.charCount}>{formData.notes.length}/500文字</div>
      </div>

      {/* アクションボタン */}
      <div className={styles.actions}>
        <button
          type="button"
          className={`${styles.saveButton} ${!hasChanges ? styles.disabled : ''}`}
          onClick={handleSave}
          disabled={!hasChanges || isLoading || isSaving}
        >
          {isSaving ? (
            <>
              <span className={styles.spinner}></span>
              保存中...
            </>
          ) : (
            <>💾 保存</>
          )}
        </button>

        {record && onDelete && (
          <button
            type="button"
            className={styles.deleteButton}
            onClick={handleDelete}
            disabled={isLoading}
          >
            🗑️ 削除
          </button>
        )}
      </div>

      {/* 記録履歴情報 */}
      {record && (
        <div className={styles.metadata}>
          <div className={styles.timestamps}>
            <span>作成: {new Date(record.createdAt).toLocaleString()}</span>
            <span>更新: {new Date(record.updatedAt).toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  );
};
