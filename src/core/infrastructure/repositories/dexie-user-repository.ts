/**
 * Dexie.jsによるユーザーリポジトリ実装
 * クリーンアーキテクチャ: インフラ層
 */

import { db } from '@/lib/data-manager/database';
import { User } from '@/shared/types/common';
import { UserRepository } from '@/core/domain/repositories/user-repository';

/**
 * Dexie.jsユーザーリポジトリ実装
 */
export class DexieUserRepository implements UserRepository {
  async save(user: User): Promise<void> {
    // Note: User type mismatch between shared/types and lib/data-manager
    await db.users.add(user as any);
  }

  async findById(userId: string): Promise<User | null> {
    const user = await db.users.get(userId);
    return (user as any) || null;
  }

  async findAll(): Promise<User[]> {
    const users = await db.users.toArray();
    return users as any;
  }

  async update(user: User): Promise<void> {
    await db.users.update(user.id, user as any);
  }

  async delete(userId: string): Promise<void> {
    await db.users.delete(userId);
  }

  async count(): Promise<number> {
    return await db.users.count();
  }
}
