/**
 * 測定データリポジトリインターフェース
 * クリーンアーキテクチャ: ドメイン層
 * 
 * データアクセスの抽象化により、具体的な実装（Dexie.js、REST API等）を
 * ビジネスロジックから分離します。
 */

import {
  MeasurementSession,
  MeasurementResult,
  MotionMeasurement,
} from '../types/measurement';

/**
 * 測定セッションリポジトリ
 */
export interface MeasurementRepository {
  /**
   * セッションを保存
   * @param session 測定セッション
   */
  save(session: MeasurementSession): Promise<void>;

  /**
   * IDでセッションを取得
   * @param sessionId セッションID
   * @returns セッション（存在しない場合はnull）
   */
  findById(sessionId: string): Promise<MeasurementSession | null>;

  /**
   * ユーザーIDで全セッションを取得
   * @param userId ユーザーID
   * @returns セッション配列
   */
  findByUserId(userId: string): Promise<MeasurementSession[]>;

  /**
   * 日付範囲でセッションを取得
   * @param userId ユーザーID
   * @param startDate 開始日
   * @param endDate 終了日
   * @returns セッション配列
   */
  findByDateRange(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<MeasurementSession[]>;

  /**
   * セッションを更新
   * @param session 更新するセッション
   */
  update(session: MeasurementSession): Promise<void>;

  /**
   * セッションを削除
   * @param sessionId セッションID
   */
  delete(sessionId: string): Promise<void>;

  /**
   * ユーザーの全セッションを削除
   * @param userId ユーザーID
   */
  deleteByUserId(userId: string): Promise<void>;
}

/**
 * 測定結果リポジトリ
 */
export interface MeasurementResultRepository {
  /**
   * 測定結果を保存
   * @param result 測定結果
   */
  save(result: MeasurementResult): Promise<void>;

  /**
   * セッションIDで測定結果を取得
   * @param sessionId セッションID
   * @returns 測定結果配列
   */
  findBySessionId(sessionId: string): Promise<MeasurementResult[]>;

  /**
   * 測定結果を削除
   * @param resultId 結果ID
   */
  delete(resultId: string): Promise<void>;

  /**
   * セッションの全測定結果を削除
   * @param sessionId セッションID
   */
  deleteBySessionId(sessionId: string): Promise<void>;
}

/**
 * 測定データリポジトリインターフェース（IndexedDB用）
 */
export interface MotionMeasurementRepository {
  /**
   * 測定データを保存
   * @param measurement 測定データ
   * @returns 保存されたレコードのID
   */
  save(measurement: import('@/lib/data-manager/models/motion-measurement').MotionMeasurement): Promise<number>;

  /**
   * IDで測定データを取得
   * @param id レコードID
   * @returns 測定データ（存在しない場合はnull）
   */
  findById(id: number): Promise<import('@/lib/data-manager/models/motion-measurement').MotionMeasurement | null>;

  /**
   * ユーザーIDで測定データを取得
   * @param userId ユーザーID
   * @param limit 取得件数
   * @param offset オフセット
   * @returns 測定データ配列
   */
  findByUserId(
    userId: string,
    limit?: number,
    offset?: number
  ): Promise<import('@/lib/data-manager/models/motion-measurement').MotionMeasurement[]>;

  /**
   * 日付範囲で測定データを取得
   * @param userId ユーザーID
   * @param startDate 開始日（タイムスタンプ）
   * @param endDate 終了日（タイムスタンプ）
   * @returns 測定データ配列
   */
  findByDateRange(
    userId: string,
    startDate: number,
    endDate: number
  ): Promise<import('@/lib/data-manager/models/motion-measurement').MotionMeasurement[]>;

  /**
   * 測定データを削除
   * @param id レコードID
   */
  delete(id: number): Promise<void>;

  /**
   * ユーザーの全測定データを削除
   * @param userId ユーザーID
   */
  deleteByUserId(userId: string): Promise<void>;

  /**
   * 測定データ数を取得
   * @param userId ユーザーID（省略時は全ユーザー）
   * @returns データ数
   */
  count(userId?: string): Promise<number>;
}
