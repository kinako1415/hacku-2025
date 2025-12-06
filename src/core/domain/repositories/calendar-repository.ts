/**
 * カレンダーリポジトリインターフェース
 * クリーンアーキテクチャ: ドメイン層
 */

import { CalendarRecord } from '@/lib/data-manager/models/calendar-record';

/**
 * カレンダー記録リポジトリ
 */
export interface CalendarRepository {
  /**
   * カレンダー記録を保存
   * @param record カレンダー記録
   * @returns 保存されたレコードのID
   */
  save(record: CalendarRecord): Promise<number>;

  /**
   * IDでカレンダー記録を取得
   * @param id レコードID
   * @returns カレンダー記録（存在しない場合はnull）
   */
  findById(id: number): Promise<CalendarRecord | null>;

  /**
   * ユーザーIDと日付でカレンダー記録を取得
   * @param userId ユーザーID
   * @param recordDate 記録日付（YYYY-MM-DD）
   * @returns カレンダー記録（存在しない場合はnull）
   */
  findByUserIdAndDate(
    userId: string,
    recordDate: string
  ): Promise<CalendarRecord | null>;

  /**
   * 月のカレンダー記録を取得
   * @param userId ユーザーID
   * @param year 年
   * @param month 月（1-12）
   * @returns カレンダー記録配列
   */
  findByMonth(
    userId: string,
    year: number,
    month: number
  ): Promise<CalendarRecord[]>;

  /**
   * 日付範囲でカレンダー記録を取得
   * @param userId ユーザーID
   * @param startDate 開始日（YYYY-MM-DD）
   * @param endDate 終了日（YYYY-MM-DD）
   * @returns カレンダー記録配列
   */
  findByDateRange(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<CalendarRecord[]>;

  /**
   * カレンダー記録を更新
   * @param record 更新するカレンダー記録
   */
  update(record: CalendarRecord): Promise<void>;

  /**
   * カレンダー記録を削除
   * @param id レコードID
   */
  delete(id: number): Promise<void>;

  /**
   * ユーザーの全カレンダー記録を削除
   * @param userId ユーザーID
   */
  deleteByUserId(userId: string): Promise<void>;
}
