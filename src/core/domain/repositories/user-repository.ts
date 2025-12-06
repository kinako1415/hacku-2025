/**
 * ユーザーリポジトリインターフェース
 * クリーンアーキテクチャ: ドメイン層
 */

import { User } from '@/shared/types/common';

/**
 * ユーザーリポジトリ
 */
export interface UserRepository {
  /**
   * ユーザーを保存
   * @param user ユーザー情報
   */
  save(user: User): Promise<void>;

  /**
   * IDでユーザーを取得
   * @param userId ユーザーID
   * @returns ユーザー情報（存在しない場合はnull）
   */
  findById(userId: string): Promise<User | null>;

  /**
   * 全ユーザーを取得
   * @returns ユーザー配列
   */
  findAll(): Promise<User[]>;

  /**
   * ユーザーを更新
   * @param user 更新するユーザー情報
   */
  update(user: User): Promise<void>;

  /**
   * ユーザーを削除
   * @param userId ユーザーID
   */
  delete(userId: string): Promise<void>;

  /**
   * ユーザー総数を取得
   * @returns ユーザー総数
   */
  count(): Promise<number>;
}
