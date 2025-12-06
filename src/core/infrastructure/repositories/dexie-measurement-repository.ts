/**
 * Dexie.jsによる測定データリポジトリ実装
 * クリーンアーキテクチャ: インフラ層
 */

import { db } from '@/lib/data-manager/database';
import {
  MeasurementSession,
  MeasurementResult,
} from '@/core/domain/types/measurement';
import { MotionMeasurement } from '@/lib/data-manager/models/motion-measurement';
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
    // Note: このメソッドはMeasurementSessionを保存するが、実際のテーブルは
    // MotionMeasurement型を期待している。Phase 2.3で完全実装予定。
    await db.measurements.add({
      userId: session.userId,
      measurementDate: session.startTime,
      handUsed: session.hand,
      // 以下はMotionMeasurement型に必要な最小限のプロパティ
      wristFlexion: 0,
      wristExtension: 0,
      wristUlnarDeviation: 0,
      wristRadialDeviation: 0,
      thumbFlexion: 0,
      thumbExtension: 0,
      thumbAdduction: 0,
      thumbAbduction: 0,
      accuracyScore: 0,
      comparisonResult: {
        wristFlexion: { status: 'normal', within_range: true },
        wristExtension: { status: 'normal', within_range: true },
        wristUlnarDeviation: { status: 'normal', within_range: true },
        wristRadialDeviation: { status: 'normal', within_range: true },
        thumbFlexion: { status: 'normal', within_range: true },
        thumbExtension: { status: 'normal', within_range: true },
        thumbAdduction: { status: 'normal', within_range: true },
        thumbAbduction: { status: 'normal', within_range: true },
        overallStatus: 'normal',
      },
      createdAt: session.startTime,
    } as any); // 型アサーションで一時的に回避
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
          m.measurementDate >= startDate &&
          m.measurementDate <= endDate
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
    const id = await db.measurements.add(measurement);
    return id as number;
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
    // number timestamp を Date に変換
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const measurements = await db.measurements
      .where('userId')
      .equals(userId)
      .and((m) => m.measurementDate >= start && m.measurementDate <= end)
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
