/**
 * 共通型定義
 * クリーンアーキテクチャ: 共有レイヤー
 */

/**
 * カレンダー記録
 */
export interface CalendarRecord {
  /** 記録ID */
  id?: number;
  
  /** ユーザーID */
  userId: string;
  
  /** 記録日付（YYYY-MM-DD形式） */
  recordDate: string;
  
  /** リハビリ実施フラグ */
  rehabCompleted: boolean;
  
  /** 測定実施フラグ */
  measurementCompleted: boolean;
  
  /** 痛みレベル（1-5） */
  painLevel: number;
  
  /** モチベーションレベル（1-5） */
  motivationLevel: number;
  
  /** パフォーマンスレベル（1-5） */
  performanceLevel: number;
  
  /** メモ */
  notes?: string;
  
  /** 作成日時 */
  createdAt: number;
  
  /** 更新日時 */
  updatedAt: number;
}

/**
 * 進捗データ
 */
export interface ProgressData {
  /** 進捗ID */
  id?: number;
  
  /** ユーザーID */
  userId: string;
  
  /** 分析日付 */
  analysisDate: number;
  
  /** 分析期間 */
  analysisPeriod: 'week' | 'month' | 'year';
  
  /** 平均角度 */
  averageAngle: number;
  
  /** 最大角度 */
  maxAngle: number;
  
  /** 最小角度 */
  minAngle: number;
  
  /** 測定回数 */
  measurementCount: number;
  
  /** 改善率（%） */
  improvementRate: number;
  
  /** 作成日時 */
  createdAt: number;
}

/**
 * ユーザー情報
 */
export interface User {
  /** ユーザーID */
  id: string;
  
  /** 名前 */
  name: string;
  
  /** 作成日時 */
  createdAt: number;
  
  /** 設定 */
  settings?: UserSettings;
}

/**
 * ユーザー設定
 */
export interface UserSettings {
  /** 利き手 */
  dominantHand: 'left' | 'right';
  
  /** 通知設定 */
  notifications: boolean;
  
  /** テーマ */
  theme: 'light' | 'dark' | 'auto';
}

/**
 * API レスポンス（成功）
 */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    timestamp: string;
    version: string;
    requestId: string;
  };
}

/**
 * API レスポンス（エラー）
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: string;
    field?: string;
  };
  meta?: {
    timestamp: string;
    version: string;
    requestId: string;
    path: string;
  };
}

/**
 * ページネーション
 */
export interface Pagination {
  total: number;
  limit: number;
  offset: number;
  hasNext: boolean;
  hasPrevious?: boolean;
}
