/**
 * 測定処理ユースケース
 * クリーンアーキテクチャ: アプリケーション層
 */

import { MeasurementResultRepository } from '@/core/domain/repositories/measurement-repository';
import { MeasurementResult, StepId } from '@/core/domain/types/measurement';
import { Point3D } from '@/core/domain/types/hand-landmark';
import { angleCalculator } from '@/core/infrastructure/mediapipe/angle-calculator';

/**
 * 測定処理の入力パラメータ
 */
export interface ProcessMeasurementInput {
  sessionId: string;
  stepId: StepId;
  landmarks: Point3D[];
}

/**
 * 測定結果の出力
 */
export interface ProcessMeasurementOutput {
  result: MeasurementResult;
  isValid: boolean;
  accuracy: number;
}

/**
 * 測定処理ユースケース
 * ランドマークから角度を計算し、測定結果を保存
 */
export class ProcessMeasurementUseCase {
  constructor(private resultRepo: MeasurementResultRepository) {}

  /**
   * 測定を処理
   * @param input セッションID、ステップID、ランドマーク
   * @returns 測定結果
   */
  async execute(
    input: ProcessMeasurementInput
  ): Promise<ProcessMeasurementOutput> {
    // ランドマークの有効性を検証
    const isValidLandmarks = angleCalculator.validateLandmarks(input.landmarks);
    if (!isValidLandmarks) {
      throw new Error('無効なランドマークデータ');
    }

    // ステップに応じた角度を計算
    const angleValue = angleCalculator.calculateAngleForStep(
      input.landmarks,
      input.stepId
    );

    // 角度計算結果を取得（信頼度付き）
    const angleResult = angleCalculator.calculateAngle3Points(
      input.landmarks[0],
      input.landmarks[5],
      input.landmarks[9]
    );

    // 目標角度を取得
    const targetAngle = this.getTargetAngle(input.stepId);

    // 達成率を計算
    const achievement = this.calculateAchievement(angleValue, targetAngle);

    // 測定結果を作成
    const result: MeasurementResult = {
      resultId: this.generateResultId(),
      sessionId: input.sessionId,
      stepId: input.stepId,
      stepName: this.getStepName(input.stepId),
      angleValue,
      targetAngle,
      achievement,
      accuracy: angleResult.accuracy,
      timestamp: new Date(),
      isCompleted: true,
    };

    // データベースに保存
    await this.resultRepo.save(result);

    return {
      result,
      isValid: angleResult.isValid,
      accuracy: angleResult.accuracy,
    };
  }

  /**
   * ステップIDからステップ名を取得
   */
  private getStepName(stepId: StepId): string {
    const stepNames: Record<StepId, string> = {
      'palmar-flexion': '掌屈',
      'dorsal-flexion': '背屈',
      'ulnar-deviation': '尺屈',
      'radial-deviation': '橈屈',
    };
    return stepNames[stepId];
  }

  /**
   * ステップIDから目標角度を取得
   */
  private getTargetAngle(stepId: StepId): number {
    const targetAngles: Record<StepId, number> = {
      'palmar-flexion': 90,
      'dorsal-flexion': 70,
      'ulnar-deviation': 45,
      'radial-deviation': 45,
    };
    return targetAngles[stepId];
  }

  /**
   * 達成率を計算
   */
  private calculateAchievement(angleValue: number, targetAngle: number): number {
    const achievement = (angleValue / targetAngle) * 100;
    return Math.min(Math.round(achievement * 10) / 10, 100); // 小数点1桁、最大100%
  }

  /**
   * 結果IDを生成
   */
  private generateResultId(): string {
    return `result_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
