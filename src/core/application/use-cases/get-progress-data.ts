/**
 * 進捗データ取得ユースケース
 * クリーンアーキテクチャ: アプリケーション層
 */

import { ProgressRepository } from '@/core/domain/repositories/progress-repository';
import { MotionMeasurementRepository } from '@/core/domain/repositories/measurement-repository';
import { ProgressData } from '@/shared/types/common';

/**
 * 進捗データ取得の入力パラメータ
 */
export interface GetProgressDataInput {
  userId: string;
  analysisPeriod: 'week' | 'month' | 'year';
}

/**
 * 進捗データ取得ユースケース
 * 指定期間の進捗データを取得・計算
 */
export class GetProgressDataUseCase {
  constructor(
    private progressRepo: ProgressRepository,
    private measurementRepo: MotionMeasurementRepository
  ) {}

  /**
   * 進捗データを取得
   * @param input ユーザーID、分析期間
   * @returns 進捗データ
   */
  async execute(input: GetProgressDataInput): Promise<ProgressData> {
    // 既存の進捗データを取得
    const existing = await this.progressRepo.findLatest(
      input.userId,
      input.analysisPeriod
    );

    // 最新データがあり、本日のものであれば返す
    if (existing && this.isToday(existing.analysisDate)) {
      return existing;
    }

    // 期間の開始日と終了日を計算
    const { startDate, endDate } = this.calculateDateRange(input.analysisPeriod);

    // 期間内の測定データを取得
    const measurements = await this.measurementRepo.findByDateRange(
      input.userId,
      startDate,
      endDate
    );

    if (measurements.length === 0) {
      // データがない場合はデフォルト値を返す
      return this.createDefaultProgressData(input.userId, input.analysisPeriod);
    }

    // 統計情報を計算
    const angles = measurements.map((m) => m.angleValue);
    const averageAngle = this.average(angles);
    const maxAngle = Math.max(...angles);
    const minAngle = Math.min(...angles);

    // 改善率を計算（前回データとの比較）
    const improvementRate = await this.calculateImprovementRate(
      input.userId,
      input.analysisPeriod,
      averageAngle
    );

    // 進捗データを作成
    const progressData: ProgressData = {
      userId: input.userId,
      analysisDate: Date.now(),
      analysisPeriod: input.analysisPeriod,
      averageAngle,
      maxAngle,
      minAngle,
      measurementCount: measurements.length,
      improvementRate,
      createdAt: Date.now(),
    };

    // データベースに保存
    await this.progressRepo.save(progressData);

    return progressData;
  }

  /**
   * 日付が今日かチェック
   */
  private isToday(timestamp: number): boolean {
    const date = new Date(timestamp);
    const today = new Date();
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  }

  /**
   * 分析期間から日付範囲を計算
   */
  private calculateDateRange(
    period: 'week' | 'month' | 'year'
  ): { startDate: number; endDate: number } {
    const now = Date.now();
    const endDate = now;

    let startDate: number;
    switch (period) {
      case 'week':
        startDate = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case 'month':
        startDate = now - 30 * 24 * 60 * 60 * 1000;
        break;
      case 'year':
        startDate = now - 365 * 24 * 60 * 60 * 1000;
        break;
    }

    return { startDate, endDate };
  }

  /**
   * 平均を計算
   */
  private average(values: number[]): number {
    const sum = values.reduce((acc, val) => acc + val, 0);
    return Math.round((sum / values.length) * 10) / 10;
  }

  /**
   * 改善率を計算
   */
  private async calculateImprovementRate(
    userId: string,
    period: 'week' | 'month' | 'year',
    currentAverage: number
  ): Promise<number> {
    // 前回の進捗データを取得
    const previousData = await this.progressRepo.findLatest(userId, period);

    if (!previousData) {
      return 0; // 前回データがない場合は0
    }

    const previousAverage = previousData.averageAngle;
    if (previousAverage === 0) {
      return 0;
    }

    const improvement =
      ((currentAverage - previousAverage) / previousAverage) * 100;
    return Math.round(improvement * 10) / 10;
  }

  /**
   * デフォルトの進捗データを作成
   */
  private createDefaultProgressData(
    userId: string,
    period: 'week' | 'month' | 'year'
  ): ProgressData {
    return {
      userId,
      analysisDate: Date.now(),
      analysisPeriod: period,
      averageAngle: 0,
      maxAngle: 0,
      minAngle: 0,
      measurementCount: 0,
      improvementRate: 0,
      createdAt: Date.now(),
    };
  }
}
