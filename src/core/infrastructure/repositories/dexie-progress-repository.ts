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
    // Note: ProgressData type mismatch between shared/types and lib/data-manager
    // Using type assertion to allow deployment - needs refactoring
    const id = await db.progress.add(progress as any);
    return id as number;
  }

  async findById(id: number): Promise<ProgressData | null> {
    const progress = await db.progress.get(id);
    return (progress as any) || null;
  }

  async findByUserIdAndPeriod(
    userId: string,
    analysisPeriod: 'week' | 'month' | 'year'
  ): Promise<ProgressData[]> {
    const progressData = await db.progress
      .where('[userId+analysisPeriod]')
      .equals([userId, analysisPeriod as any])
      .toArray();

    return progressData as any;
  }

  async findLatest(
    userId: string,
    analysisPeriod?: 'week' | 'month' | 'year'
  ): Promise<ProgressData | null> {
    const query = db.progress.where('userId').equals(userId);

    if (analysisPeriod) {
      const data = await query
        .and((p) => (p.analysisPeriod as any) === analysisPeriod)
        .reverse()
        .sortBy('analysisDate');
      return (data[0] as any) || null;
    }

    const data = await query.reverse().sortBy('analysisDate');
    return (data[0] as any) || null;
  }

  async delete(id: number): Promise<void> {
    await db.progress.delete(id);
  }

  async deleteByUserId(userId: string): Promise<void> {
    await db.progress.where('userId').equals(userId).delete();
  }
}
