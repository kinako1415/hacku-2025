/**
 * Individual User API Route
 * 個別ユーザー管理のRESTful API
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/data-manager/database';
import { updateUser, validateUser } from '@/lib/data-manager/models/user';
import type { UpdateUserInput } from '@/lib/data-manager/models/user';

/**
 * GET /api/users/[id]
 * 特定ユーザーの取得
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const userId = params.id;

    // データベース初期化確認
    if (!db.isOpen()) {
      await db.open();
    }

    // ユーザーを取得
    const user = await db.users.get(userId);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'ユーザーが見つかりません',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('User GET API エラー:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'ユーザー取得に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/users/[id]
 * ユーザー情報の更新
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const userId = params.id;
    const body = await request.json();

    // 入力データの検証
    const updateUserData: UpdateUserInput = {
      name: body.name,
      currentSymptomLevel: body.currentSymptomLevel,
      preferredHand: body.preferredHand,
    };

    // バリデーション実行（更新用の簡易バリデーション）
    const validationErrors: string[] = [];
    if (updateUserData.name !== undefined) {
      if (!updateUserData.name || updateUserData.name.trim().length === 0) {
        validationErrors.push('ユーザー名は必須です');
      } else if (updateUserData.name.length > 50) {
        validationErrors.push('ユーザー名は50文字以内で入力してください');
      }
    }
    if (updateUserData.currentSymptomLevel !== undefined) {
      if (
        updateUserData.currentSymptomLevel < 1 ||
        updateUserData.currentSymptomLevel > 5
      ) {
        validationErrors.push('症状レベルは1から5の範囲で設定してください');
      }
    }
    if (updateUserData.preferredHand !== undefined) {
      if (!['left', 'right'].includes(updateUserData.preferredHand)) {
        validationErrors.push('主測定手は左手または右手を選択してください');
      }
    }
    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'ユーザーデータが無効です',
          validationErrors,
        },
        { status: 400 }
      );
    }

    // データベース初期化確認
    if (!db.isOpen()) {
      await db.open();
    }

    // 既存ユーザーを取得
    const existingUser = await db.users.get(userId);
    if (!existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: 'ユーザーが見つかりません',
        },
        { status: 404 }
      );
    }

    // 名前重複チェック（自分以外）
    if (updateUserData.name && updateUserData.name !== existingUser.name) {
      const duplicateUser = await db.users
        .where('name')
        .equals(updateUserData.name)
        .and((user) => user.id !== userId)
        .first();

      if (duplicateUser) {
        return NextResponse.json(
          {
            success: false,
            error: '同じ名前のユーザーが既に存在します',
          },
          { status: 409 }
        );
      }
    }

    // ユーザー更新
    const updatedUser = updateUser(existingUser, updateUserData);

    // データベースに保存
    await db.users.put(updatedUser);

    return NextResponse.json({
      success: true,
      data: updatedUser,
      message: 'ユーザー情報が正常に更新されました',
    });
  } catch (error) {
    console.error('User PUT API エラー:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'ユーザー更新に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/users/[id]
 * ユーザーの削除（関連データも含む）
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const userId = params.id;

    // データベース初期化確認
    if (!db.isOpen()) {
      await db.open();
    }

    // ユーザー存在確認
    const existingUser = await db.users.get(userId);
    if (!existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: 'ユーザーが見つかりません',
        },
        { status: 404 }
      );
    }

    // 関連データの確認
    const [measurementCount, recordCount, progressCount] = await Promise.all([
      db.measurements.where('userId').equals(userId).count(),
      db.records.where('userId').equals(userId).count(),
      db.progress.where('userId').equals(userId).count(),
    ]);

    const totalRelatedData = measurementCount + recordCount + progressCount;

    // 関連データがある場合は警告
    if (totalRelatedData > 0) {
      // クエリパラメータで強制削除フラグを確認
      const url = new URL(request.url);
      const forceDelete = url.searchParams.get('force') === 'true';

      if (!forceDelete) {
        return NextResponse.json(
          {
            success: false,
            error: '関連データが存在します',
            relatedData: {
              measurements: measurementCount,
              records: recordCount,
              progress: progressCount,
              total: totalRelatedData,
            },
            message:
              '強制削除する場合は ?force=true パラメータを追加してください',
          },
          { status: 409 }
        );
      }
    }

    // ユーザーと関連データを削除
    await db.transaction(
      'rw',
      [db.users, db.measurements, db.records, db.progress],
      async () => {
        // 関連データを削除
        await db.measurements.where('userId').equals(userId).delete();
        await db.records.where('userId').equals(userId).delete();
        await db.progress.where('userId').equals(userId).delete();

        // ユーザーを削除
        await db.users.delete(userId);
      }
    );

    return NextResponse.json({
      success: true,
      message: 'ユーザーと関連データが正常に削除されました',
      deletedData: {
        user: 1,
        measurements: measurementCount,
        records: recordCount,
        progress: progressCount,
      },
    });
  } catch (error) {
    console.error('User DELETE API エラー:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'ユーザー削除に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
