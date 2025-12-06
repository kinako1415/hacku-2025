/**
 * Users API Route
 * ユーザー管理のRESTful API
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/data-manager/database';
import { createUser, validateUser } from '@/lib/data-manager/models/user';
import type { CreateUserInput, User } from '@/lib/data-manager/models/user';

/**
 * GET /api/users
 * 全ユーザーの取得
 */
export async function GET(): Promise<NextResponse> {
  try {
    // データベース初期化確認
    if (!db.isOpen()) {
      await db.open();
    }

    // 全ユーザーを取得
    const users = await db.users.orderBy('createdAt').reverse().toArray();

    return NextResponse.json({
      success: true,
      data: users,
      count: users.length,
    });
  } catch (error) {
    console.error('Users GET API エラー:', error);

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
 * POST /api/users
 * 新規ユーザーの作成
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // リクエストボディの解析
    const body = await request.json();

    // 入力データの検証
    const createUserData: CreateUserInput = {
      name: body.name,
      rehabStartDate: body.rehabStartDate
        ? new Date(body.rehabStartDate)
        : new Date(),
      currentSymptomLevel: body.currentSymptomLevel,
      preferredHand: body.preferredHand,
    };

    // バリデーション実行
    const validationErrors = validateUser(createUserData);
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

    // 重複チェック（名前による簡易チェック）
    const existingUser = await db.users
      .where('name')
      .equals(createUserData.name)
      .first();

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: '同じ名前のユーザーが既に存在します',
        },
        { status: 409 }
      );
    }

    // ユーザー作成
    const newUser = createUser(createUserData);

    // データベースに保存
    await db.users.add(newUser);

    return NextResponse.json(
      {
        success: true,
        data: newUser,
        message: 'ユーザーが正常に作成されました',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Users POST API エラー:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'ユーザー作成に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
