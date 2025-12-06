/**
 * メモ保存ユースケース
 * クリーンアーキテクチャ: アプリケーション層
 */

import { CalendarRepository } from '@/core/domain/repositories/calendar-repository';
import { CalendarRecord, PainLevel, MotivationLevel, PerformanceLevel } from '@/lib/data-manager/models/calendar-record';

/**
 * メモ保存の入力パラメータ
 */
export interface SaveMemoInput {
  userId: string;
  recordDate: string; // YYYY-MM-DD形式
  memo: string;
  painLevel?: PainLevel;
  motivationLevel?: MotivationLevel;
  performanceLevel?: PerformanceLevel;
}

/**
 * メモ保存ユースケース
 * カレンダーのメモと体調データを保存
 */
export class SaveMemoUseCase {
  constructor(private calendarRepo: CalendarRepository) {}

  /**
   * メモを保存
   * @param input ユーザーID、日付、メモ、レベル情報
   * @returns 保存されたカレンダー記録
   */
  async execute(input: SaveMemoInput): Promise<CalendarRecord> {
    // 既存の記録を取得
    const existing = await this.calendarRepo.findByUserIdAndDate(
      input.userId,
      input.recordDate
    );

    if (existing) {
      // 既存の記録を更新
      const updated: CalendarRecord = {
        ...existing,
        notes: input.memo,
        updatedAt: new Date(),
      };
      
      // オプショナルフィールドは値が存在する場合のみ設定
      if (input.painLevel !== undefined) {
        updated.painLevel = input.painLevel;
      }
      if (input.motivationLevel !== undefined) {
        updated.motivationLevel = input.motivationLevel;
      }
      if (input.performanceLevel !== undefined) {
        updated.performanceLevel = input.performanceLevel;
      }

      await this.calendarRepo.update(updated);
      return updated;
    } else {
      // 新規記録を作成 - recordDateを文字列からDateに変換
      const recordDate = new Date(input.recordDate + 'T00:00:00.000Z');
      
      const newRecord: Omit<CalendarRecord, 'id'> = {
        userId: input.userId,
        recordDate,
        rehabCompleted: false,
        measurementCompleted: false,
        painLevel: input.painLevel ?? 3,
        motivationLevel: input.motivationLevel ?? 3,
        performanceLevel: input.performanceLevel ?? 3,
        notes: input.memo,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const id = await this.calendarRepo.save(newRecord as CalendarRecord);
      return { ...newRecord, id } as CalendarRecord;
    }
  }
}
