/**
 * Individual Progress Data API Route
 * 個別進捗データ管理のRESTful API
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/data-manager/database';
import { 
  createProgressData, 
  validateProgressData,
  isImprovementTrend,
  needsAttention
} from '@/lib/data-manager/models/progress-data';
import type { CreateProgressDataInput, ProgressData } from '@/lib/data-manager/models/progress-data';

/**
 * GET /api/progress/[id]
 * 特定進捗データの取得
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const progressId = params.id;

    // データベース初期化確認
    if (!db.isOpen()) {
      await db.open();
    }

    // 進捗データを取得
    const progressData = await db.progress.get(progressId);

    if (!progressData) {
      return NextResponse.json({
        success: false,
        error: '進捗データが見つかりません',
      }, { status: 404 });
    }

    // 詳細情報の追加
    const insights = {
      isImproving: isImprovementTrend(progressData),
      needsAttention: needsAttention(progressData),
      dataQuality: progressData.dataQuality,
      recommendations: generateDetailedRecommendations(progressData),
    };

    return NextResponse.json({
      success: true,
      data: progressData,
      insights,
    });

  } catch (error) {
    console.error('Progress GET API エラー:', error);
    
    return NextResponse.json({
      success: false,
      error: '進捗データ取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

/**
 * PUT /api/progress/[id]
 * 進捗データの更新
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const progressId = params.id;
    const body = await request.json();

    // データベース初期化確認
    if (!db.isOpen()) {
      await db.open();
    }

    // 既存進捗データを取得
    const existingProgress = await db.progress.get(progressId);
    if (!existingProgress) {
      return NextResponse.json({
        success: false,
        error: '進捗データが見つかりません',
      }, { status: 404 });
    }

    // 更新データの構築
    const updateData: CreateProgressDataInput = {
      userId: body.userId ?? existingProgress.userId,
      analysisPeriod: body.analysisPeriod ?? existingProgress.analysisPeriod,
      motionProgress: body.motionProgress ?? existingProgress.motionProgress,
      activityProgress: body.activityProgress ?? existingProgress.activityProgress,
      measurementCount: body.measurementCount ?? existingProgress.measurementCount,
      recordCount: body.recordCount ?? existingProgress.recordCount,
      dataQuality: body.dataQuality ?? existingProgress.dataQuality,
    };

    // バリデーション実行
    const validationErrors = validateProgressData(updateData);
    if (validationErrors.length > 0) {
      return NextResponse.json({
        success: false,
        error: '進捗データが無効です',
        validationErrors,
      }, { status: 400 });
    }

    // ユーザー存在確認（ユーザーIDが変更された場合）
    if (updateData.userId !== existingProgress.userId) {
      const user = await db.users.get(updateData.userId);
      if (!user) {
        return NextResponse.json({
          success: false,
          error: '指定されたユーザーが見つかりません',
        }, { status: 404 });
      }
    }

    // 新しい進捗データを作成
    const updatedProgress = createProgressData(updateData);
    
    // IDと作成日時を保持
    updatedProgress.id = progressId;
    updatedProgress.createdAt = existingProgress.createdAt;
    
    // データベースに保存
    await db.progress.put(updatedProgress);

    return NextResponse.json({
      success: true,
      data: updatedProgress,
      message: '進捗データが正常に更新されました',
    });

  } catch (error) {
    console.error('Progress PUT API エラー:', error);
    
    return NextResponse.json({
      success: false,
      error: '進捗データ更新に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

/**
 * DELETE /api/progress/[id]
 * 進捗データの削除
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const progressId = params.id;

    // データベース初期化確認
    if (!db.isOpen()) {
      await db.open();
    }

    // 進捗データ存在確認
    const existingProgress = await db.progress.get(progressId);
    if (!existingProgress) {
      return NextResponse.json({
        success: false,
        error: '進捗データが見つかりません',
      }, { status: 404 });
    }

    // 進捗データを削除
    await db.progress.delete(progressId);

    return NextResponse.json({
      success: true,
      message: '進捗データが正常に削除されました',
      deletedData: {
        id: progressId,
        analysisDate: existingProgress.analysisDate,
        analysisPeriod: existingProgress.analysisPeriod,
        userId: existingProgress.userId,
      },
    });

  } catch (error) {
    console.error('Progress DELETE API エラー:', error);
    
    return NextResponse.json({
      success: false,
      error: '進捗データ削除に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

/**
 * 詳細な推奨事項の生成
 */
function generateDetailedRecommendations(progressData: ProgressData): Array<{
  category: string;
  priority: 'high' | 'medium' | 'low';
  message: string;
}> {
  const recommendations: Array<{
    category: string;
    priority: 'high' | 'medium' | 'low';
    message: string;
  }> = [];

  // データ品質による推奨事項
  if (progressData.dataQuality < 0.3) {
    recommendations.push({
      category: 'data_quality',
      priority: 'high',
      message: 'データ品質が低いため、測定頻度を大幅に増やすことをお勧めします',
    });
  } else if (progressData.dataQuality < 0.6) {
    recommendations.push({
      category: 'data_quality',
      priority: 'medium',
      message: '測定頻度を増やして、より正確な分析を行いましょう',
    });
  }

  // 活動実施率による推奨事項
  if (progressData.activityProgress.overallCompletionRate < 30) {
    recommendations.push({
      category: 'activity',
      priority: 'high',
      message: 'リハビリの実施率が低いため、継続的な取り組みが必要です',
    });
  } else if (progressData.activityProgress.overallCompletionRate < 70) {
    recommendations.push({
      category: 'activity',
      priority: 'medium',
      message: 'リハビリの実施率向上により、より良い結果が期待できます',
    });
  }

  // 動作進捗による推奨事項
  if (progressData.motionProgress.overallTrend === 'declining') {
    recommendations.push({
      category: 'motion',
      priority: 'high',
      message: '可動域の改善傾向が見られません。専門医への相談をお勧めします',
    });
  } else if (progressData.motionProgress.overallTrend === 'stable') {
    recommendations.push({
      category: 'motion',
      priority: 'medium',
      message: '現在の取り組みを継続し、追加的なエクササイズの検討をお勧めします',
    });
  } else {
    recommendations.push({
      category: 'motion',
      priority: 'low',
      message: '良好な改善傾向が見られます。現在の取り組みを継続してください',
    });
  }

  // 連続実施による推奨事項
  if (progressData.activityProgress.currentStreak === 0) {
    recommendations.push({
      category: 'consistency',
      priority: 'high',
      message: '継続的な実施が重要です。毎日少しずつでも取り組みましょう',
    });
  } else if (progressData.activityProgress.currentStreak < 7) {
    recommendations.push({
      category: 'consistency',
      priority: 'medium',
      message: '1週間連続実施を目標にしましょう',
    });
  }

  return recommendations;
}
