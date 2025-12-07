/**
 * 測定データ関連の型定義
 * クリーンアーキテクチャ: ドメイン層
 */

/**
 * 測定ステップID
 */
export type StepId =
  | 'palmar-flexion' // 掌屈
  | 'dorsal-flexion' // 背屈
  | 'ulnar-deviation' // 尺屈
  | 'radial-deviation' // 橈屈
  | 'pronation' // 回内
  | 'supination'; // 回外

/**
 * 測定セッション
 * 1回の測定の開始から終了までを管理
 */
export interface MeasurementSession {
  /** セッションID（ULID形式） */
  sessionId: string;

  /** ユーザーID */
  userId: string;

  /** 測定対象の手 */
  hand: 'left' | 'right';

  /** 開始時刻 */
  startTime: Date;

  /** 終了時刻 */
  endTime?: Date;

  /** セッション状態 */
  status: 'active' | 'completed' | 'cancelled';

  /** 総ステップ数（常に6） */
  totalSteps: 6;

  /** 完了したステップ数 */
  completedSteps: number;
}

/**
 * 測定結果
 * 各ステップごとの測定データ
 */
export interface MeasurementResult {
  /** 結果ID（ULID形式） */
  resultId: string;

  /** 所属セッションID */
  sessionId: string;

  /** ステップID */
  stepId: StepId;

  /** ステップ名（日本語） */
  stepName: string;

  /** 測定角度値（度） */
  angleValue: number;

  /** 目標角度値（度） */
  targetAngle: number;

  /** 達成率（%） */
  achievement: number;

  /** 測定精度（0-1） */
  accuracy: number;

  /** 測定時刻 */
  timestamp: Date;

  /** 完了フラグ */
  isCompleted: boolean;
}

/**
 * 測定データ（IndexedDB保存用）
 */
export interface MotionMeasurement {
  /** 測定ID */
  id?: number;

  /** ユーザーID */
  userId: string;

  /** 測定日時 */
  measurementDate: number;

  /** 使用した手 */
  handUsed: 'left' | 'right';

  /** 角度値 */
  angleValue: number;

  /** 精度 */
  accuracy: number;

  /** 作成日時 */
  createdAt: number;
}
