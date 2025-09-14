/**
 * CalendarRecordエンティティモデル
 * リハビリテーションの日次記録
 */

export type PerformanceLevel = 1 | 2 | 3 | 4 | 5; // 1=非常に悪い, 5=非常に良い
export type PainLevel = 1 | 2 | 3 | 4 | 5; // 1=痛みなし, 5=激痛
export type MotivationLevel = 1 | 2 | 3 | 4 | 5; // 1=低い, 5=高い

export interface CalendarRecord {
  id: string; // UUID
  userId: string; // User.id参照
  recordDate: Date; // 記録対象日（YYYY-MM-DD形式）

  // 実行状況
  rehabCompleted: boolean; // リハビリ実施フラグ
  measurementCompleted: boolean; // 測定実施フラグ
  
  // 主観的評価（1-5スケール）
  performanceLevel?: PerformanceLevel; // 動作レベル自己評価
  painLevel?: PainLevel; // 痛みレベル
  motivationLevel?: MotivationLevel; // モチベーションレベル

  // 自由記述
  notes?: string; // メモ・感想（最大500文字）

  // メタデータ
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCalendarRecordInput {
  userId: string;
  recordDate: Date;
  rehabCompleted: boolean;
  measurementCompleted: boolean;
  performanceLevel?: PerformanceLevel;
  painLevel?: PainLevel;
  motivationLevel?: MotivationLevel;
  notes?: string;
}

export interface UpdateCalendarRecordInput {
  rehabCompleted?: boolean;
  measurementCompleted?: boolean;
  performanceLevel?: PerformanceLevel;
  painLevel?: PainLevel;
  motivationLevel?: MotivationLevel;
  notes?: string;
}

/**
 * カレンダー記録の検証ルール
 */
export const validateCalendarRecord = (data: CreateCalendarRecordInput): string[] => {
  const errors: string[] = [];

  // userId必須
  if (!data.userId || data.userId.trim().length === 0) {
    errors.push('ユーザーIDは必須です');
  }

  // recordDate: 過度な未来日は不可
  const maxFutureDate = new Date();
  maxFutureDate.setDate(maxFutureDate.getDate() + 7); // 1週間先まで
  if (data.recordDate > maxFutureDate) {
    errors.push('記録日は1週間先までの日付を設定してください');
  }

  // recordDate: 過度な過去日は不可
  const minPastDate = new Date();
  minPastDate.setFullYear(minPastDate.getFullYear() - 1); // 1年前まで
  if (data.recordDate < minPastDate) {
    errors.push('記録日は1年前以降の日付を設定してください');
  }

  // レベル値の検証（1-5の範囲）
  const levelChecks = [
    { value: data.performanceLevel, name: '動作レベル' },
    { value: data.painLevel, name: '痛みレベル' },
    { value: data.motivationLevel, name: 'モチベーションレベル' }
  ];

  levelChecks.forEach(({ value, name }) => {
    if (value !== undefined && (value < 1 || value > 5)) {
      errors.push(`${name}は1から5の範囲で設定してください`);
    }
  });

  // notes文字数制限
  if (data.notes && data.notes.length > 500) {
    errors.push('メモは500文字以内で入力してください');
  }

  return errors;
};

/**
 * 更新データの検証ルール
 */
export const validateCalendarRecordUpdate = (data: UpdateCalendarRecordInput): string[] => {
  const errors: string[] = [];

  // レベル値の検証（1-5の範囲）
  const levelChecks = [
    { value: data.performanceLevel, name: '動作レベル' },
    { value: data.painLevel, name: '痛みレベル' },
    { value: data.motivationLevel, name: 'モチベーションレベル' }
  ];

  levelChecks.forEach(({ value, name }) => {
    if (value !== undefined && (value < 1 || value > 5)) {
      errors.push(`${name}は1から5の範囲で設定してください`);
    }
  });

  // notes文字数制限
  if (data.notes && data.notes.length > 500) {
    errors.push('メモは500文字以内で入力してください');
  }

  return errors;
};

/**
 * 日付を YYYY-MM-DD 形式の文字列に変換
 */
export const formatRecordDate = (date: Date): string => {
  return date.toISOString().split('T')[0]!;
};

/**
 * YYYY-MM-DD 形式の文字列を Date オブジェクトに変換
 */
export const parseRecordDate = (dateString: string): Date => {
  const date = new Date(dateString + 'T00:00:00.000Z');
  return date;
};

/**
 * 当日のデフォルト記録を作成
 */
export const createTodayRecord = (userId: string): CreateCalendarRecordInput => {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // 時間をリセット

  return {
    userId,
    recordDate: today,
    rehabCompleted: false,
    measurementCompleted: false,
  };
};

/**
 * カレンダー記録エンティティの作成
 */
export const createCalendarRecord = (input: CreateCalendarRecordInput): CalendarRecord => {
  const errors = validateCalendarRecord(input);
  if (errors.length > 0) {
    throw new Error(`カレンダー記録作成エラー: ${errors.join(', ')}`);
  }

  const now = new Date();
  
  const record: CalendarRecord = {
    id: crypto.randomUUID(),
    userId: input.userId,
    recordDate: input.recordDate,
    rehabCompleted: input.rehabCompleted,
    measurementCompleted: input.measurementCompleted,
    createdAt: now,
    updatedAt: now,
  };

  // オプショナルフィールドの条件付き追加
  if (input.performanceLevel !== undefined) {
    record.performanceLevel = input.performanceLevel;
  }
  if (input.painLevel !== undefined) {
    record.painLevel = input.painLevel;
  }
  if (input.motivationLevel !== undefined) {
    record.motivationLevel = input.motivationLevel;
  }
  if (input.notes !== undefined) {
    record.notes = input.notes;
  }

  return record;
};

/**
 * カレンダー記録エンティティの更新
 */
export const updateCalendarRecord = (
  record: CalendarRecord, 
  updates: UpdateCalendarRecordInput
): CalendarRecord => {
  const errors = validateCalendarRecordUpdate(updates);
  if (errors.length > 0) {
    throw new Error(`カレンダー記録更新エラー: ${errors.join(', ')}`);
  }

  return {
    ...record,
    ...updates,
    updatedAt: new Date(),
  };
};

/**
 * 記録完了状況の計算
 */
export const calculateCompletionStatus = (record: CalendarRecord) => {
  const completedTasks = [
    record.rehabCompleted,
    record.measurementCompleted
  ].filter(Boolean).length;

  const totalTasks = 2;
  const completionRate = completedTasks / totalTasks;

  return {
    completedTasks,
    totalTasks,
    completionRate,
    isFullyCompleted: completionRate === 1,
    isPartiallyCompleted: completionRate > 0 && completionRate < 1,
    isNotStarted: completionRate === 0,
  };
};

/**
 * 週間完了統計の計算
 */
export interface WeeklyStats {
  totalDays: number;
  rehabCompletedDays: number;
  measurementCompletedDays: number;
  fullyCompletedDays: number;
  rehabCompletionRate: number;
  measurementCompletionRate: number;
  overallCompletionRate: number;
}

export const calculateWeeklyStats = (records: CalendarRecord[]): WeeklyStats => {
  const totalDays = records.length;
  const rehabCompletedDays = records.filter(r => r.rehabCompleted).length;
  const measurementCompletedDays = records.filter(r => r.measurementCompleted).length;
  const fullyCompletedDays = records.filter(
    r => r.rehabCompleted && r.measurementCompleted
  ).length;

  return {
    totalDays,
    rehabCompletedDays,
    measurementCompletedDays,
    fullyCompletedDays,
    rehabCompletionRate: totalDays > 0 ? rehabCompletedDays / totalDays : 0,
    measurementCompletionRate: totalDays > 0 ? measurementCompletedDays / totalDays : 0,
    overallCompletionRate: totalDays > 0 ? fullyCompletedDays / totalDays : 0,
  };
};
