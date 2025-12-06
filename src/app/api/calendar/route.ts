/**
 * Calendar Records API Route
 * カレンダー記録管理のRESTful API
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/data-manager/database';
import {
  createCalendarRecord,
  updateCalendarRecord,
  validateCalendarRecord,
  parseRecordDate,
  calculateWeeklyStats,
} from '@/lib/data-manager/models/calendar-record';
import type {
  CreateCalendarRecordInput,
  UpdateCalendarRecordInput,
  CalendarRecord,
} from '@/lib/data-manager/models/calendar-record';

/**
 * GET /api/calendar
 * カレンダー記録の取得（期間フィルタ対応）
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
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const includeStats = url.searchParams.get('stats') === 'true';

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
    const query = db.records
      .where('userId')
      .equals(userId)
      .sortBy('recordDate');
    let records = await query;

    // 日付フィルタリング
    if (startDate) {
      const start = parseRecordDate(startDate);
      records = records.filter((r) => r.recordDate >= start);
    }

    if (endDate) {
      const end = parseRecordDate(endDate);
      records = records.filter((r) => r.recordDate <= end);
    }

    // 統計情報の計算
    let weeklyStats = null;
    if (includeStats && records.length > 0) {
      weeklyStats = calculateWeeklyStats(records);
    }

    return NextResponse.json({
      success: true,
      data: records,
      count: records.length,
      stats: weeklyStats,
    });
  } catch (error) {
    console.error('Calendar GET API エラー:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'カレンダー記録取得に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/calendar
 * 新規カレンダー記録の作成
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // リクエストボディの解析
    const body = await request.json();

    // 入力データの構築
    const createRecordData: CreateCalendarRecordInput = {
      userId: body.userId,
      recordDate: body.recordDate
        ? parseRecordDate(body.recordDate)
        : new Date(),
      rehabCompleted: body.rehabCompleted ?? false,
      measurementCompleted: body.measurementCompleted ?? false,
      performanceLevel: body.performanceLevel,
      painLevel: body.painLevel,
      motivationLevel: body.motivationLevel,
      notes: body.notes,
    };

    // バリデーション実行
    const validationErrors = validateCalendarRecord(createRecordData);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'カレンダー記録データが無効です',
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
    const user = await db.users.get(createRecordData.userId);
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: '指定されたユーザーが見つかりません',
        },
        { status: 404 }
      );
    }

    // カレンダー記録作成
    const newRecord = createCalendarRecord(createRecordData);

    // タイムゾーンに依存しないようにYYYY-MM-DD形式の文字列で比較
    const targetDate = new Date(newRecord.recordDate);
    const targetDateString = `${targetDate.getFullYear()}-${String(
      targetDate.getMonth() + 1
    ).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;

    const existingRecord = await db.records
      .where('userId')
      .equals(newRecord.userId)
      .filter((r) => {
        const recordDate = new Date(r.recordDate);
        const recordDateString = `${recordDate.getFullYear()}-${String(
          recordDate.getMonth() + 1
        ).padStart(2, '0')}-${String(recordDate.getDate()).padStart(2, '0')}`;
        return recordDateString === targetDateString;
      })
      .first();

    // 既存データがあれば、そのIDを新しいデータに引き継ぐ
    if (existingRecord?.id) {
      newRecord.id = existingRecord.id;
    }

    // データベースに保存 (putで上書き/新規作成)
    await db.records.put(newRecord);

    return NextResponse.json(
      {
        success: true,
        data: newRecord,
        message: existingRecord
          ? 'カレンダー記録が正常に更新されました'
          : 'カレンダー記録が正常に作成されました',
      },
      { status: existingRecord ? 200 : 201 }
    );
  } catch (error) {
    console.error('Calendar POST API エラー:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'カレンダー記録作成に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/calendar
 * 複数カレンダー記録の一括更新
 */
export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    // リクエストボディの解析
    const body = await request.json();
    const { updates } = body; // Array of { id, ...updateData }

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: '更新データが指定されていません',
        },
        { status: 400 }
      );
    }

    // データベース初期化確認
    if (!db.isOpen()) {
      await db.open();
    }

    const updatedRecords: CalendarRecord[] = [];
    const errors: Array<{ id: string; error: string }> = [];

    // トランザクションで一括更新
    await db.transaction('rw', [db.records], async () => {
      for (const update of updates) {
        try {
          const { id, ...updateData } = update;

          // 既存記録を取得
          const existingRecord = await db.records.get(id);
          if (!existingRecord) {
            errors.push({ id, error: '記録が見つかりません' });
            continue;
          }

          // 更新データの構築
          const updateRecordData: UpdateCalendarRecordInput = {
            rehabCompleted: updateData.rehabCompleted,
            measurementCompleted: updateData.measurementCompleted,
            performanceLevel: updateData.performanceLevel,
            painLevel: updateData.painLevel,
            motivationLevel: updateData.motivationLevel,
            notes: updateData.notes,
          };

          // 記録更新
          const updatedRecord = updateCalendarRecord(
            existingRecord,
            updateRecordData
          );

          // データベースに保存
          await db.records.put(updatedRecord);
          updatedRecords.push(updatedRecord);
        } catch (error) {
          errors.push({
            id: update.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: updatedRecords,
      updatedCount: updatedRecords.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `${updatedRecords.length}件のカレンダー記録が更新されました`,
    });
  } catch (error) {
    console.error('Calendar PUT API エラー:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'カレンダー記録更新に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/calendar
 * 複数カレンダー記録の一括削除
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
      // 特定ユーザーの全カレンダー記録を削除
      deletedCount = await db.records.where('userId').equals(userId).delete();
    } else if (ids && Array.isArray(ids)) {
      // 指定されたIDのカレンダー記録を削除
      await db.transaction('rw', [db.records], async () => {
        for (const id of ids) {
          const existing = await db.records.get(id);
          if (existing) {
            await db.records.delete(id);
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
      message: `${deletedCount}件のカレンダー記録が削除されました`,
      deletedCount,
    });
  } catch (error) {
    console.error('Calendar DELETE API エラー:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'カレンダー記録削除に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
