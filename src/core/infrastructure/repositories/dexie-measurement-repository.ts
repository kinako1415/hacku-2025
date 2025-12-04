/**
 * Dexie.jsによる測定データリポジトリ実装
 * クリーンアーキテクチャ: インフラ層
 */

import { db } from '@/lib/data-manager/database';
import {
  MeasurementSession,
  MeasurementResult,
  MotionMeasurement,
} from '@/core/domain/types/measurement';
import {
  MeasurementRepository,
  MeasurementResultRepository,
  MotionMeasurementRepository,
} from '@/core/domain/repositories/measurement-repository';

/**
 * Dexie.js測定セッションリポジトリ実装
 */
export class DexieMeasurementRepository implements MeasurementRepository {
  async save(session: MeasurementSession): Promise<void> {
    // DexieのテーブルにはIndexedDBのauto-incrementをid使用するため、
    // sessionIdは別フィールドとして保存
    await db.measurements.add({
      userId: session.userId,
      measurementDate: session.startTime.getTime(),
      handUsed: session.hand,
      angleValue: 0, // セッション開始時は0
      accuracy: 0,
      createdAt: session.startTime.getTime(),
    });
  }

  async findById(sessionId: string): Promise<MeasurementSession | null> {
    // 既存のスキーマではsessionIdフィールドがないため、
    // Phase 2.3のマイグレーションで追加予定
    // とりあえずnullを返す（後で実装）
    return null;
  }

  async findByUserId(userId: string): Promise<MeasurementSession[]> {
    const measurements = await db.measurements
      .where('userId')
      .equals(userId)
      .toArray();

    // 既存データから MeasurementSession に変換
    // TODO: Phase 2.3でスキーマ拡張後に完全実装
    return [];
  }

  async findByDateRange(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<MeasurementSession[]> {
    const measurements = await db.measurements
      .where('userId')
      .equals(userId)
      .and(
        (m) =>
          m.measurementDate >= startDate.getTime() &&
          m.measurementDate <= endDate.getTime()
      )
      .toArray();

    // TODO: Phase 2.3でスキーマ拡張後に完全実装
    return [];
  }

  async update(session: MeasurementSession): Promise<void> {
    // TODO: Phase 2.3で完全実装
  }

  async delete(sessionId: string): Promise<void> {
    // TODO: Phase 2.3で完全実装
  }

  async deleteByUserId(userId: string): Promise<void> {
    await db.measurements.where('userId').equals(userId).delete();
  }
}

/**
 * Dexie.js測定結果リポジトリ実装
 */
export class DexieMeasurementResultRepository
  implements MeasurementResultRepository
{
  async save(result: MeasurementResult): Promise<void> {
    // TODO: Phase 2.3で測定結果テーブル追加後に実装
  }

  async findBySessionId(sessionId: string): Promise<MeasurementResult[]> {
    // TODO: Phase 2.3で完全実装
    return [];
  }

  async delete(resultId: string): Promise<void> {
    // TODO: Phase 2.3で完全実装
  }

  async deleteBySessionId(sessionId: string): Promise<void> {
    // TODO: Phase 2.3で完全実装
  }
}

/**
 * Dexie.js測定データリポジトリ実装（IndexedDB用）
 */
export class DexieMotionMeasurementRepository
  implements MotionMeasurementRepository
{
  async save(measurement: MotionMeasurement): Promise<number> {
    const id = await db.measurements.add({
      userId: measurement.userId,
      measurementDate: measurement.measurementDate,
      handUsed: measurement.handUsed,
      angleValue: measurement.angleValue,
      accuracy: measurement.accuracy,
      createdAt: measurement.createdAt,
    });
    return id;
  }

  async findById(id: number): Promise<MotionMeasurement | null> {
    const measurement = await db.measurements.get(id);
    return measurement || null;
  }

  async findByUserId(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<MotionMeasurement[]> {
    const measurements = await db.measurements
      .where('userId')
      .equals(userId)
      .offset(offset)
      .limit(limit)
      .toArray();

    return measurements;
  }

  async findByDateRange(
    userId: string,
    startDate: number,
    endDate: number
  ): Promise<MotionMeasurement[]> {
    const measurements = await db.measurements
      .where('userId')
      .equals(userId)
      .and((m) => m.measurementDate >= startDate && m.measurementDate <= endDate)
      .toArray();

    return measurements;
  }

  async delete(id: number): Promise<void> {
    await db.measurements.delete(id);
  }

  async deleteByUserId(userId: string): Promise<void> {
    await db.measurements.where('userId').equals(userId).delete();
  }

  async count(userId?: string): Promise<number> {
    if (userId) {
      return await db.measurements.where('userId').equals(userId).count();
    }
    return await db.measurements.count();
  }
}
