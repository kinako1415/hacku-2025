/**
 * Dexie.jsによるカレンダーリポジトリ実装
 * クリーンアーキテクチャ: インフラ層
 */

import { db } from '@/lib/data-manager/database';
import { CalendarRecord } from '@/shared/types/common';
import { CalendarRepository } from '@/core/domain/repositories/calendar-repository';

/**
 * Dexie.jsカレンダーリポジトリ実装
 */
export class DexieCalendarRepository implements CalendarRepository {
  async save(record: CalendarRecord): Promise<number> {
    const id = await db.records.add({
      userId: record.userId,
      recordDate: record.recordDate,
      rehabCompleted: record.rehabCompleted,
      measurementCompleted: record.measurementCompleted,
      painLevel: record.painLevel,
      motivationLevel: record.motivationLevel,
      performanceLevel: record.performanceLevel,
      notes: record.notes,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
    return id;
  }

  async findById(id: number): Promise<CalendarRecord | null> {
    const record = await db.records.get(id);
    return record || null;
  }

  async findByUserIdAndDate(
    userId: string,
    recordDate: string
  ): Promise<CalendarRecord | null> {
    const record = await db.records
      .where('[userId+recordDate]')
      .equals([userId, recordDate])
      .first();
    return record || null;
  }

  async findByMonth(
    userId: string,
    year: number,
    month: number
  ): Promise<CalendarRecord[]> {
    // YYYY-MM-DD形式で開始日と終了日を計算
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const endDate = `${year}-${month.toString().padStart(2, '0')}-${new Date(
      year,
      month,
      0
    ).getDate()}`;

    return this.findByDateRange(userId, startDate, endDate);
  }

  async findByDateRange(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<CalendarRecord[]> {
    const records = await db.records
      .where('userId')
      .equals(userId)
      .and((r) => r.recordDate >= startDate && r.recordDate <= endDate)
      .toArray();

    return records;
  }

  async update(record: CalendarRecord): Promise<void> {
    if (!record.id) {
      throw new Error('Cannot update record without id');
    }

    await db.records.update(record.id, {
      rehabCompleted: record.rehabCompleted,
      measurementCompleted: record.measurementCompleted,
      painLevel: record.painLevel,
      motivationLevel: record.motivationLevel,
      performanceLevel: record.performanceLevel,
      notes: record.notes,
      updatedAt: Date.now(),
    });
  }

  async delete(id: number): Promise<void> {
    await db.records.delete(id);
  }

  async deleteByUserId(userId: string): Promise<void> {
    await db.records.where('userId').equals(userId).delete();
  }
}
