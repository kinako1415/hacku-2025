/**
 * カレンダーデータ取得ユースケース
 * クリーンアーキテクチャ: アプリケーション層
 */

import { CalendarRepository } from '@/core/domain/repositories/calendar-repository';
import { CalendarRecord } from '@/lib/data-manager/models/calendar-record';

/**
 * カレンダーデータ取得の入力パラメータ
 */
export interface GetCalendarDataInput {
  userId: string;
  year: number;
  month: number;
}

/**
 * カレンダーデータ取得ユースケース
 * 指定月のカレンダー記録を取得
 */
export class GetCalendarDataUseCase {
  constructor(private calendarRepo: CalendarRepository) {}

  /**
   * カレンダーデータを取得
   * @param input ユーザーID、年、月
   * @returns カレンダー記録配列
   */
  async execute(input: GetCalendarDataInput): Promise<CalendarRecord[]> {
    // 月のカレンダー記録を取得
    const records = await this.calendarRepo.findByMonth(
      input.userId,
      input.year,
      input.month
    );

    return records;
  }
}
