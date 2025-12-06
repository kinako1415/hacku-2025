/**
 * Individual Measurement API Route
 * 個別測定データ管理のRESTful API
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/data-manager/database';
import {
  createMeasurement,
  validateMeasurement,
} from '@/lib/data-manager/models/motion-measurement';
import type { CreateMeasurementInput } from '@/lib/data-manager/models/motion-measurement';

/**
 * GET /api/measurements/[id]
 * 特定測定データの取得
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const measurementId = params.id;

    // データベース初期化確認
    if (!db.isOpen()) {
      await db.open();
    }

    // 測定データを取得
    const measurement = await db.measurements.get(measurementId);

    if (!measurement) {
      return NextResponse.json(
        {
          success: false,
          error: '測定データが見つかりません',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: measurement,
    });
  } catch (error) {
    console.error('Measurement GET API エラー:', error);

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
 * PUT /api/measurements/[id]
 * 測定データの更新
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const measurementId = params.id;
    const body = await request.json();

    // データベース初期化確認
    if (!db.isOpen()) {
      await db.open();
    }

    // 既存測定データを取得
    const existingMeasurement = await db.measurements.get(measurementId);
    if (!existingMeasurement) {
      return NextResponse.json(
        {
          success: false,
          error: '測定データが見つかりません',
        },
        { status: 404 }
      );
    }

    // 更新データの構築（部分更新対応）
    const updateData: CreateMeasurementInput = {
      userId: body.userId ?? existingMeasurement.userId,
      measurementDate: body.measurementDate
        ? new Date(body.measurementDate)
        : existingMeasurement.measurementDate,
      wristFlexion: body.wristFlexion ?? existingMeasurement.wristFlexion,
      wristExtension: body.wristExtension ?? existingMeasurement.wristExtension,
      wristUlnarDeviation:
        body.wristUlnarDeviation ?? existingMeasurement.wristUlnarDeviation,
      wristRadialDeviation:
        body.wristRadialDeviation ?? existingMeasurement.wristRadialDeviation,
      thumbFlexion: body.thumbFlexion ?? existingMeasurement.thumbFlexion,
      thumbExtension: body.thumbExtension ?? existingMeasurement.thumbExtension,
      thumbAdduction: body.thumbAdduction ?? existingMeasurement.thumbAdduction,
      thumbAbduction: body.thumbAbduction ?? existingMeasurement.thumbAbduction,
      accuracyScore: body.accuracyScore ?? existingMeasurement.accuracyScore,
      handUsed: body.handUsed ?? existingMeasurement.handUsed,
    };

    // バリデーション実行
    const validationErrors = validateMeasurement(updateData);
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

    // ユーザー存在確認（ユーザーIDが変更された場合）
    if (updateData.userId !== existingMeasurement.userId) {
      const user = await db.users.get(updateData.userId);
      if (!user) {
        return NextResponse.json(
          {
            success: false,
            error: '指定されたユーザーが見つかりません',
          },
          { status: 404 }
        );
      }
    }

    // 新しい測定データを作成（比較結果も再計算）
    const updatedMeasurement = createMeasurement(updateData);

    // IDと作成日時を保持
    updatedMeasurement.id = measurementId;
    updatedMeasurement.createdAt = existingMeasurement.createdAt;

    // データベースに保存
    await db.measurements.put(updatedMeasurement);

    return NextResponse.json({
      success: true,
      data: updatedMeasurement,
      message: '測定データが正常に更新されました',
    });
  } catch (error) {
    console.error('Measurement PUT API エラー:', error);

    return NextResponse.json(
      {
        success: false,
        error: '測定データ更新に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/measurements/[id]
 * 測定データの削除
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const measurementId = params.id;

    // データベース初期化確認
    if (!db.isOpen()) {
      await db.open();
    }

    // 測定データ存在確認
    const existingMeasurement = await db.measurements.get(measurementId);
    if (!existingMeasurement) {
      return NextResponse.json(
        {
          success: false,
          error: '測定データが見つかりません',
        },
        { status: 404 }
      );
    }

    // 測定データを削除
    await db.measurements.delete(measurementId);

    return NextResponse.json({
      success: true,
      message: '測定データが正常に削除されました',
      deletedData: {
        id: measurementId,
        measurementDate: existingMeasurement.measurementDate,
        handUsed: existingMeasurement.handUsed,
      },
    });
  } catch (error) {
    console.error('Measurement DELETE API エラー:', error);

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
