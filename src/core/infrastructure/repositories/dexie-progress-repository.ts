/**
 * Dexie.jsによる進捗データリポジトリ実装
 * クリーンアーキテクチャ: インフラ層
 */

import { db } from '@/lib/data-manager/database';
import { ProgressData } from '@/shared/types/common';
import { ProgressRepository } from '@/core/domain/repositories/progress-repository';

/**
 * Dex進捗データリポジトリ実装
 */
export class DexieProgressRepository implements ProgressRepository {
  async save(progress: ProgressData): Promise<number> {
    const id = await db.progress.add({
      userId: progress.userId,
      analysisDate: progress.analysisDate,
      analysisPeriod: progress.analysisPeriod,
      averageAngle: progress.averageAngle,
      maxAngle: progress.maxAngle,
      minAngle: progress.minAngle,
      measurementCount: progress.measurementCount,
      improvementRate: progress.improvementRate,
      createdAt: progress.createdAt,
    });
    return id;
  }

  async findById(id: number): Promise<ProgressData | null> {
    const progress = await db.progress.get(id);
    return progress || null;
  }

  async findByUserIdAndPeriod(
    userId: string,
    analysisPeriod: 'week' | 'month' | 'year'
  ): Promise<ProgressData[]> {
    const progressData = await db.progress
      .where('[userId+analysisPeriod]')
      .equals([userId, analysisPeriod])
      .toArray();

    return progressData;
  }

  async findLatest(
    userId: string,
    analysisPeriod?: 'week' | 'month' | 'year'
  ): Promise<ProgressData | null> {
    let query = db.progress.where('userId').equals(userId);

    if (analysisPeriod) {
      const data = await query
        .and((p) => p.analysisPeriod === analysisPeriod)
        .reverse()
        .sortBy('analysisDate');
      return data[0] || null;
    }

    const data = await query.reverse().sortBy('analysisDate');
    return data[0] || null;
  }

  async delete(id: number): Promise<void> {
    await db.progress.delete(id);
  }

  async deleteByUserId(userId: string): Promise<void> {
    await db.progress.where('userId').equals(userId).delete();
  }
}
