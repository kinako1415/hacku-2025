/**
 * 進捗データリポジトリインターフェース
 * クリーンアーキテクチャ: ドメイン層
 */

import { ProgressData } from '@/shared/types/common';

/**
 * 進捗データリポジトリ
 */
export interface ProgressRepository {
  /**
   * 進捗データを保存
   * @param progress 進捗データ
   * @returns 保存されたデータのID
   */
  save(progress: ProgressData): Promise<number>;

  /**
   * IDで進捗データを取得
   * @param id 進捗データID
   * @returns 進捗データ（存在しない場合はnull）
   */
  findById(id: number): Promise<ProgressData | null>;

  /**
   * ユーザーIDと分析期間で進捗データを取得
   * @param userId ユーザーID
   * @param analysisPeriod 分析期間
   * @returns 進捗データ配列
   */
  findByUserIdAndPeriod(
    userId: string,
    analysisPeriod: 'week' | 'month' | 'year'
  ): Promise<ProgressData[]>;

  /**
   * ユーザーの最新の進捗データを取得
   * @param userId ユーザーID
   * @param analysisPeriod 分析期間（省略時は全期間）
   * @returns 最新の進捗データ（存在しない場合はnull）
   */
  findLatest(
    userId: string,
    analysisPeriod?: 'week' | 'month' | 'year'
  ): Promise<ProgressData | null>;

  /**
   * 進捗データを削除
   * @param id 進捗データID
   */
  delete(id: number): Promise<void>;

  /**
   * ユーザーの全進捗データを削除
   * @param userId ユーザーID
   */
  deleteByUserId(userId: string): Promise<void>;
}
