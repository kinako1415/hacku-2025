/**
 * 測定完了ユースケース
 * クリーンアーキテクチャ: アプリケーション層
 */

import {
  MeasurementRepository,
  MeasurementResultRepository,
} from '@/core/domain/repositories/measurement-repository';
import { MeasurementSession, MeasurementResult } from '@/core/domain/types/measurement';

/**
 * 測定完了の入力パラメータ
 */
export interface CompleteMeasurementInput {
  sessionId: string;
}

/**
 * 測定完了の出力
 */
export interface CompleteMeasurementOutput {
  session: MeasurementSession;
  results: MeasurementResult[];
  averageAngle: number;
  overallAchievement: number;
}

/**
 * 測定完了ユースケース
 * 測定セッションを完了し、統計情報を計算
 */
export class CompleteMeasurementUseCase {
  constructor(
    private sessionRepo: MeasurementRepository,
    private resultRepo: MeasurementResultRepository
  ) {}

  /**
   * 測定セッションを完了
   * @param input セッションID
   * @returns 完了したセッションと結果
   */
  async execute(
    input: CompleteMeasurementInput
  ): Promise<CompleteMeasurementOutput> {
    // セッションを取得
    const session = await this.sessionRepo.findById(input.sessionId);
    if (!session) {
      throw new Error(`セッションが見つかりません: ${input.sessionId}`);
    }

    // セッションの測定結果を取得
    const results = await this.resultRepo.findBySessionId(input.sessionId);

    if (results.length === 0) {
      throw new Error('測定結果が見つかりません');
    }

    // 統計情報を計算
    const averageAngle = this.calculateAverageAngle(results);
    const overallAchievement = this.calculateOverallAchievement(results);

    // セッションを完了状態に更新
    const completedSession: MeasurementSession = {
      ...session,
      status: 'completed',
      endTime: new Date(),
      completedSteps: results.length,
    };

    await this.sessionRepo.update(completedSession);

    return {
      session: completedSession,
      results,
      averageAngle,
      overallAchievement,
    };
  }

  /**
   * 平均角度を計算
   */
  private calculateAverageAngle(results: MeasurementResult[]): number {
    const sum = results.reduce((acc, result) => acc + result.angleValue, 0);
    return Math.round((sum / results.length) * 10) / 10;
  }

  /**
   * 全体達成率を計算
   */
  private calculateOverallAchievement(results: MeasurementResult[]): number {
    const sum = results.reduce((acc, result) => acc + result.achievement, 0);
    return Math.round((sum / results.length) * 10) / 10;
  }
}
