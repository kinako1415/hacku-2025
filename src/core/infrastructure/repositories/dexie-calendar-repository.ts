/**
 * Dexie.jsによるカレンダーリポジトリ実装
 * クリーンアーキテクチャ: インフラ層
 */

import { db } from '@/lib/data-manager/database';
import { CalendarRecord } from '@/lib/data-manager/models/calendar-record';
import { CalendarRepository } from '@/core/domain/repositories/calendar-repository';

/**
 * Dexie.jsカレンダーリポジトリ実装
 */
export class DexieCalendarRepository implements CalendarRepository {
  async save(record: CalendarRecord): Promise<number> {
    const dataToSave: any = {
      userId: record.userId,
      recordDate: record.recordDate,
      rehabCompleted: record.rehabCompleted,
      measurementCompleted: record.measurementCompleted,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
    
    // オプショナルフィールドは値が存在する場合のみ含める
    if (record.painLevel !== undefined) {
      dataToSave.painLevel = record.painLevel;
    }
    if (record.motivationLevel !== undefined) {
      dataToSave.motivationLevel = record.motivationLevel;
    }
    if (record.performanceLevel !== undefined) {
      dataToSave.performanceLevel = record.performanceLevel;
    }
    if (record.notes !== undefined) {
      dataToSave.notes = record.notes;
    }
    
    const id = await db.records.add(dataToSave);
    return id as number;
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
    // 文字列の日付をDateオブジェクトに変換して比較
    const start = new Date(startDate + 'T00:00:00.000Z');
    const end = new Date(endDate + 'T23:59:59.999Z');
    
    const records = await db.records
      .where('userId')
      .equals(userId)
      .and((r) => r.recordDate >= start && r.recordDate <= end)
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
