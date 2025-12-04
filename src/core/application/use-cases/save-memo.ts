/**
 * メモ保存ユースケース
 * クリーンアーキテクチャ: アプリケーション層
 */

import { CalendarRepository } from '@/core/domain/repositories/calendar-repository';
import { CalendarRecord } from '@/shared/types/common';

/**
 * メモ保存の入力パラメータ
 */
export interface SaveMemoInput {
  userId: string;
  recordDate: string; // YYYY-MM-DD形式
  memo: string;
  painLevel?: number;
  motivationLevel?: number;
  performanceLevel?: number;
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
        painLevel: input.painLevel ?? existing.painLevel,
        motivationLevel: input.motivationLevel ?? existing.motivationLevel,
        performanceLevel: input.performanceLevel ?? existing.performanceLevel,
        updatedAt: Date.now(),
      };

      await this.calendarRepo.update(updated);
      return updated;
    } else {
      // 新規記録を作成
      const newRecord: CalendarRecord = {
        userId: input.userId,
        recordDate: input.recordDate,
        rehabCompleted: false,
        measurementCompleted: false,
        painLevel: input.painLevel ?? 3,
        motivationLevel: input.motivationLevel ?? 3,
        performanceLevel: input.performanceLevel ?? 3,
        notes: input.memo,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const id = await this.calendarRepo.save(newRecord);
      return { ...newRecord, id };
    }
  }
}
