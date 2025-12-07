/**
 * 測定開始ユースケース
 * クリーンアーキテクチャ: アプリケーション層
 */

import { MeasurementRepository } from '@/core/domain/repositories/measurement-repository';
import { MeasurementSession } from '@/core/domain/types/measurement';

/**
 * 測定開始の入力パラメータ
 */
export interface StartMeasurementInput {
  userId: string;
  hand: 'left' | 'right';
}

/**
 * 測定開始ユースケース
 * 新しい測定セッションを開始し、データベースに保存
 */
export class StartMeasurementUseCase {
  constructor(private measurementRepo: MeasurementRepository) {}

  /**
   * 測定セッションを開始
   * @param input ユーザーID、測定する手
   * @returns 作成された測定セッション
   */
  async execute(input: StartMeasurementInput): Promise<MeasurementSession> {
    // セッションIDを生成（ULIDまたはUUID）
    const sessionId = this.generateSessionId();

    // 測定セッションを作成
    const session: MeasurementSession = {
      sessionId,
      userId: input.userId,
      hand: input.hand,
      startTime: new Date(),
      status: 'active',
      totalSteps: 6, // 掌屈、背屈、尺屈、橈屈、回内、回外
      completedSteps: 0,
    };

    // データベースに保存
    await this.measurementRepo.save(session);

    return session;
  }

  /**
   * セッションIDを生成
   */
  private generateSessionId(): string {
    // 簡易的なID生成（本番ではULIDライブラリを使用）
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
