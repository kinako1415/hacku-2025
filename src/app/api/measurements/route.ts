/**
 * Measurements API Route
 * 可動域測定データ管理のRESTful API
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/data-manager/database';
import {
  createMeasurement,
  validateMeasurement,
} from '@/lib/data-manager/models/motion-measurement';
import type { CreateMeasurementInput } from '@/lib/data-manager/models/motion-measurement';

/**
 * GET /api/measurements
 * 測定データの取得（クエリフィルタ対応）
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
    const handUsed = url.searchParams.get('handUsed') as
      | 'left'
      | 'right'
      | null;
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const limit = parseInt(url.searchParams.get('limit') || '100');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // 基本クエリ
    let query = db.measurements.orderBy('measurementDate').reverse();

    // フィルタ適用
    if (userId) {
      query = db.measurements.where('userId').equals(userId);
    }

    let measurements = await query.toArray();

    // 追加フィルタリング
    if (handUsed) {
      measurements = measurements.filter((m) => m.handUsed === handUsed);
    }

    if (startDate) {
      const start = new Date(startDate);
      measurements = measurements.filter((m) => m.measurementDate >= start);
    }

    if (endDate) {
      const end = new Date(endDate);
      measurements = measurements.filter((m) => m.measurementDate <= end);
    }

    // ページネーション
    const total = measurements.length;
    const paginatedMeasurements = measurements.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      data: paginatedMeasurements,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error('Measurements GET API エラー:', error);

    return NextResponse.json(
      {
        success: false,
        error: '測定データ取得に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/measurements
 * 新規測定データの作成
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // リクエストボディの解析
    const body = await request.json();

    // 入力データの構築
    const createMeasurementData: CreateMeasurementInput = {
      userId: body.userId,
      measurementDate: body.measurementDate
        ? new Date(body.measurementDate)
        : new Date(),
      wristFlexion: body.wristFlexion,
      wristExtension: body.wristExtension,
      wristUlnarDeviation: body.wristUlnarDeviation,
      wristRadialDeviation: body.wristRadialDeviation,
      thumbFlexion: body.thumbFlexion,
      thumbExtension: body.thumbExtension,
      thumbAdduction: body.thumbAdduction,
      thumbAbduction: body.thumbAbduction,
      accuracyScore: body.accuracyScore,
      handUsed: body.handUsed,
    };

    // バリデーション実行
    const validationErrors = validateMeasurement(createMeasurementData);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: '測定データが無効です',
          validationErrors,
        },
        { status: 400 }
      );
    }

    // データベース初期化確認
    if (!db.isOpen()) {
      await db.open();
    }

    // ユーザー存在確認
    const user = await db.users.get(createMeasurementData.userId);
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: '指定されたユーザーが見つかりません',
        },
        { status: 404 }
      );
    }

    // 測定データ作成
    const newMeasurement = createMeasurement(createMeasurementData);

    // タイムゾーンに依存しないようにYYYY-MM-DD形式の文字列で比較
    const targetDate = new Date(newMeasurement.measurementDate);
    const targetDateString = `${targetDate.getFullYear()}-${String(
      targetDate.getMonth() + 1
    ).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;

    const existing = await db.measurements
      .where('userId')
      .equals(newMeasurement.userId)
      .filter((m) => {
        const recordDate = new Date(m.measurementDate);
        const recordDateString = `${recordDate.getFullYear()}-${String(
          recordDate.getMonth() + 1
        ).padStart(2, '0')}-${String(recordDate.getDate()).padStart(2, '0')}`;
        return recordDateString === targetDateString;
      })
      .first();

    // 既存データがあれば、そのIDを新しいデータに引き継ぐ
    if (existing?.id) {
      newMeasurement.id = existing.id;
    }

    // データベースに保存
    await db.measurements.put(newMeasurement);

    return NextResponse.json(
      {
        success: true,
        data: newMeasurement,
        message: '測定データが正常に保存されました',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Measurements POST API エラー:', error);

    return NextResponse.json(
      {
        success: false,
        error: '測定データ作成に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/measurements
 * 複数測定データの一括削除
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
      // 特定ユーザーの全測定データを削除
      deletedCount = await db.measurements
        .where('userId')
        .equals(userId)
        .delete();
    } else if (ids && Array.isArray(ids)) {
      // 指定されたIDの測定データを削除
      await db.transaction('rw', [db.measurements], async () => {
        for (const id of ids) {
          const existing = await db.measurements.get(id);
          if (existing) {
            await db.measurements.delete(id);
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
      message: `${deletedCount}件の測定データが削除されました`,
      deletedCount,
    });
  } catch (error) {
    console.error('Measurements DELETE API エラー:', error);

    return NextResponse.json(
      {
        success: false,
        error: '測定データ削除に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
