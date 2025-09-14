/**
 * Userエンティティモデル
 * 患者の基本情報と設定
 */

export interface User {
  id: string; // UUID
  name: string; // 患者名
  rehabStartDate: Date; // リハビリ開始日
  currentSymptomLevel: 1 | 2 | 3 | 4 | 5; // 症状レベル(1=軽微, 5=重症)
  preferredHand: 'left' | 'right'; // 主測定手
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  name: string;
  rehabStartDate: Date;
  currentSymptomLevel: 1 | 2 | 3 | 4 | 5;
  preferredHand: 'left' | 'right';
}

export interface UpdateUserInput {
  name?: string;
  currentSymptomLevel?: 1 | 2 | 3 | 4 | 5;
  preferredHand?: 'left' | 'right';
}

/**
 * ユーザーデータ検証ルール
 */
export const validateUser = (userData: CreateUserInput): string[] => {
  const errors: string[] = [];

  // name: 1-50文字、空文字不可
  if (!userData.name || userData.name.trim().length === 0) {
    errors.push('名前は必須です');
  } else if (userData.name.trim().length > 50) {
    errors.push('名前は50文字以下で入力してください');
  }

  // rehabStartDate: 未来日不可
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (userData.rehabStartDate > today) {
    errors.push('リハビリ開始日は未来の日付に設定できません');
  }

  // currentSymptomLevel: 1-5の整数のみ
  if (![1, 2, 3, 4, 5].includes(userData.currentSymptomLevel)) {
    errors.push('症状レベルは1から5の範囲で選択してください');
  }

  // preferredHand: 'left' | 'right'のみ
  if (!['left', 'right'].includes(userData.preferredHand)) {
    errors.push('主測定手は左手または右手を選択してください');
  }

  return errors;
};

/**
 * ユーザーエンティティの作成
 */
export const createUser = (input: CreateUserInput): User => {
  const errors = validateUser(input);
  if (errors.length > 0) {
    throw new Error(`ユーザー作成エラー: ${errors.join(', ')}`);
  }

  const now = new Date();
  return {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    rehabStartDate: input.rehabStartDate,
    currentSymptomLevel: input.currentSymptomLevel,
    preferredHand: input.preferredHand,
    createdAt: now,
    updatedAt: now,
  };
};

/**
 * ユーザーエンティティの更新
 */
export const updateUser = (
  existingUser: User,
  updates: UpdateUserInput
): User => {
  const updatedUser: User = {
    ...existingUser,
    ...updates,
    updatedAt: new Date(),
  };

  // 更新後のデータを検証（name以外は必須ではないのでpartial validation）
  if (updates.name !== undefined) {
    if (!updates.name || updates.name.trim().length === 0) {
      throw new Error('名前は必須です');
    }
    if (updates.name.trim().length > 50) {
      throw new Error('名前は50文字以下で入力してください');
    }
    updatedUser.name = updates.name.trim();
  }

  if (updates.currentSymptomLevel !== undefined) {
    if (![1, 2, 3, 4, 5].includes(updates.currentSymptomLevel)) {
      throw new Error('症状レベルは1から5の範囲で選択してください');
    }
  }

  if (updates.preferredHand !== undefined) {
    if (!['left', 'right'].includes(updates.preferredHand)) {
      throw new Error('主測定手は左手または右手を選択してください');
    }
  }

  return updatedUser;
};
