/**
 * Progress Data API Route
 * 進捗データ管理のRESTful API
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/data-manager/database';
import {
  createProgressData,
  validateProgressData,
  getAnalysisPeriodDays,
  calculateAngleTrend,
  calculateOverallTrend,
  calculateOverallImprovement,
  calculateDataQuality,
  isImprovementTrend,
  needsAttention,
} from '@/lib/data-manager/models/progress-data';
import type {
  CreateProgressDataInput,
  ProgressData,
  AnalysisPeriod,
  MotionProgress,
  ActivityProgress,
} from '@/lib/data-manager/models/progress-data';

/**
 * GET /api/progress
 * 進捗データの取得（分析期間フィルタ対応）
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // データベース初期化確認
    if (!db.isOpen()) {
      await db.open();
    }

    // クエリパラメータの解析
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const analysisPeriod = url.searchParams.get(
      'period'
    ) as AnalysisPeriod | null;
    const latest = url.searchParams.get('latest') === 'true';
    const includeInsights = url.searchParams.get('insights') === 'true';

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'ユーザーIDは必須です',
        },
        { status: 400 }
      );
    }

    // 基本クエリ
    let query = db.progress.where('userId').equals(userId);

    // 分析期間フィルタ
    if (analysisPeriod) {
      query = query.and(
        (progress) => progress.analysisPeriod === analysisPeriod
      );
    }

    let progressData = await query.reverse().sortBy('analysisDate');

    // 最新のみ取得
    if (latest && progressData.length > 0) {
      const latestItem = progressData[0];
      if (latestItem) {
        progressData = [latestItem];
      }
    }

    // インサイト情報の追加
    const insights = includeInsights
      ? generateProgressInsights(progressData)
      : null;

    return NextResponse.json({
      success: true,
      data: progressData,
      count: progressData.length,
      insights,
    });
  } catch (error) {
    console.error('Progress GET API エラー:', error);

    return NextResponse.json(
      {
        success: false,
        error: '進捗データ取得に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/progress
 * 新規進捗データの作成（自動分析付き）
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // リクエストボディの解析
    const body = await request.json();
    const { userId, analysisPeriod, forceRecalculate } = body;

    if (!userId || !analysisPeriod) {
      return NextResponse.json(
        {
          success: false,
          error: 'ユーザーIDと分析期間は必須です',
        },
        { status: 400 }
      );
    }

    // データベース初期化確認
    if (!db.isOpen()) {
      await db.open();
    }

    // ユーザー存在確認
    const user = await db.users.get(userId);
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: '指定されたユーザーが見つかりません',
        },
        { status: 404 }
      );
    }

    // 既存の進捗データ確認
    const existingProgress = await db.progress
      .where('[userId+analysisPeriod]')
      .equals([userId, analysisPeriod])
      .first();

    if (existingProgress && !forceRecalculate) {
      return NextResponse.json(
        {
          success: false,
          error: '指定された期間の進捗データが既に存在します',
          existingData: {
            id: existingProgress.id,
            analysisDate: existingProgress.analysisDate,
          },
          message: '再計算する場合は forceRecalculate=true を指定してください',
        },
        { status: 409 }
      );
    }

    // 進捗データを自動生成
    const progressData = await generateProgressData(userId, analysisPeriod);

    if (!progressData) {
      return NextResponse.json(
        {
          success: false,
          error: '進捗データの生成に失敗しました',
          message: '十分な測定データまたはカレンダー記録が存在しません',
        },
        { status: 400 }
      );
    }

    // 既存データを更新または新規作成
    if (existingProgress && forceRecalculate) {
      progressData.id = existingProgress.id;
      progressData.createdAt = existingProgress.createdAt;
      await db.progress.put(progressData);
    } else {
      await db.progress.add(progressData);
    }

    return NextResponse.json(
      {
        success: true,
        data: progressData,
        message: '進捗データが正常に生成されました',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Progress POST API エラー:', error);

    return NextResponse.json(
      {
        success: false,
        error: '進捗データ作成に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/progress
 * 複数進捗データの一括削除
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    // リクエストボディの解析
    const body = await request.json();
    const { ids, userId, deleteAll } = body;

    // データベース初期化確認
    if (!db.isOpen()) {
      await db.open();
    }

    let deletedCount = 0;

    if (deleteAll && userId) {
      // 特定ユーザーの全進捗データを削除
      deletedCount = await db.progress.where('userId').equals(userId).delete();
    } else if (ids && Array.isArray(ids)) {
      // 指定されたIDの進捗データを削除
      await db.transaction('rw', [db.progress], async () => {
        for (const id of ids) {
          const existing = await db.progress.get(id);
          if (existing) {
            await db.progress.delete(id);
            deletedCount++;
          }
        }
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: '削除対象のIDまたはuserIdが指定されていません',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${deletedCount}件の進捗データが削除されました`,
      deletedCount,
    });
  } catch (error) {
    console.error('Progress DELETE API エラー:', error);

    return NextResponse.json(
      {
        success: false,
        error: '進捗データ削除に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * 進捗データの自動生成
 */
async function generateProgressData(
  userId: string,
  analysisPeriod: AnalysisPeriod
): Promise<ProgressData | null> {
  try {
    const periodDays = getAnalysisPeriodDays(analysisPeriod);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // 測定データの取得
    const measurements = await db.measurements
      .where('userId')
      .equals(userId)
      .and((m) => m.measurementDate >= startDate)
      .sortBy('measurementDate');

    // カレンダー記録の取得
    const records = await db.records
      .where('userId')
      .equals(userId)
      .and((r) => r.recordDate >= startDate)
      .sortBy('recordDate');

    if (measurements.length === 0 && records.length === 0) {
      return null;
    }

    // 動作進捗の計算
    const motionProgress = calculateMotionProgress(measurements);

    // 活動進捗の計算
    const activityProgress = calculateActivityProgress(records, periodDays);

    // データ品質の計算
    const dataQuality = calculateDataQuality(
      measurements.length,
      records.length,
      periodDays
    );

    // 進捗データ作成
    const createProgressInput: CreateProgressDataInput = {
      userId,
      analysisPeriod,
      motionProgress,
      activityProgress,
      measurementCount: measurements.length,
      recordCount: records.length,
      dataQuality,
    };

    return createProgressData(createProgressInput);
  } catch (error) {
    console.error('進捗データ生成エラー:', error);
    return null;
  }
}

/**
 * 動作進捗の計算
 */
function calculateMotionProgress(measurements: any[]): MotionProgress {
  if (measurements.length < 2) {
    // デフォルトの進捗データ
    const defaultTrend = {
      currentValue: 0,
      changeAmount: 0,
      changePercentage: 0,
      trend: 'stable' as const,
    };

    return {
      wristFlexion: defaultTrend,
      wristExtension: defaultTrend,
      wristUlnarDeviation: defaultTrend,
      wristRadialDeviation: defaultTrend,
      thumbFlexion: defaultTrend,
      thumbExtension: defaultTrend,
      thumbAdduction: defaultTrend,
      thumbAbduction: defaultTrend,
      overallTrend: 'stable',
      overallImprovement: 0,
    };
  }

  const latest = measurements[measurements.length - 1];
  const previous = measurements[measurements.length - 2];

  // 各角度のトレンド計算
  const wristFlexion = calculateAngleTrend(
    latest.wristFlexion,
    previous.wristFlexion
  );
  const wristExtension = calculateAngleTrend(
    latest.wristExtension,
    previous.wristExtension
  );
  const wristUlnarDeviation = calculateAngleTrend(
    latest.wristUlnarDeviation,
    previous.wristUlnarDeviation
  );
  const wristRadialDeviation = calculateAngleTrend(
    latest.wristRadialDeviation,
    previous.wristRadialDeviation
  );
  const thumbFlexion = calculateAngleTrend(
    latest.thumbFlexion,
    previous.thumbFlexion
  );
  const thumbExtension = calculateAngleTrend(
    latest.thumbExtension,
    previous.thumbExtension
  );
  const thumbAdduction = calculateAngleTrend(
    latest.thumbAdduction,
    previous.thumbAdduction
  );
  const thumbAbduction = calculateAngleTrend(
    latest.thumbAbduction,
    previous.thumbAbduction
  );

  const trends = [
    wristFlexion,
    wristExtension,
    wristUlnarDeviation,
    wristRadialDeviation,
    thumbFlexion,
    thumbExtension,
    thumbAdduction,
    thumbAbduction,
  ];

  return {
    wristFlexion,
    wristExtension,
    wristUlnarDeviation,
    wristRadialDeviation,
    thumbFlexion,
    thumbExtension,
    thumbAdduction,
    thumbAbduction,
    overallTrend: calculateOverallTrend(trends),
    overallImprovement: calculateOverallImprovement(trends),
  };
}

/**
 * 活動進捗の計算
 */
function calculateActivityProgress(
  records: any[],
  periodDays: number
): ActivityProgress {
  const rehabCompleted = records.filter((r) => r.rehabCompleted).length;
  const measurementCompleted = records.filter(
    (r) => r.measurementCompleted
  ).length;
  const totalRecords = records.length;

  return {
    rehabCompletionRate:
      totalRecords > 0 ? Math.round((rehabCompleted / totalRecords) * 100) : 0,
    measurementCompletionRate:
      totalRecords > 0
        ? Math.round((measurementCompleted / totalRecords) * 100)
        : 0,
    overallCompletionRate:
      totalRecords > 0
        ? Math.round(
            ((rehabCompleted + measurementCompleted) / (totalRecords * 2)) * 100
          )
        : 0,
    currentStreak: calculateCurrentStreak(records),
    longestStreak: calculateLongestStreak(records),
  };
}

/**
 * 現在の連続実施日数計算
 */
function calculateCurrentStreak(records: any[]): number {
  // 簡略化実装
  return records.length > 0 ? 1 : 0;
}

/**
 * 最長連続実施日数計算
 */
function calculateLongestStreak(records: any[]): number {
  // 簡略化実装
  return records.length;
}

/**
 * 進捗インサイトの生成
 */
function generateProgressInsights(progressData: ProgressData[]) {
  if (progressData.length === 0) return null;

  const latest = progressData[0];
  if (!latest) return null;

  return {
    isImproving: isImprovementTrend(latest),
    needsAttention: needsAttention(latest),
    dataQuality: latest.dataQuality,
    recommendedActions: generateRecommendations(latest),
  };
}

/**
 * 推奨アクション生成
 */
function generateRecommendations(progressData: ProgressData): string[] {
  const recommendations: string[] = [];

  if (progressData.dataQuality < 0.5) {
    recommendations.push('測定頻度を増やして、より正確な分析を行いましょう');
  }

  if (progressData.activityProgress.overallCompletionRate < 50) {
    recommendations.push('リハビリの実施率を向上させましょう');
  }

  if (progressData.motionProgress.overallTrend === 'declining') {
    recommendations.push('専門医に相談することをお勧めします');
  }

  return recommendations;
}
