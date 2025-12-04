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
    await db.users.add({
      id: user.id,
      name: user.name,
      createdAt: user.createdAt,
    });
  }

  async findById(userId: string): Promise<User | null> {
    const user = await db.users.get(userId);
    return user || null;
  }

  async findAll(): Promise<User[]> {
    const users = await db.users.toArray();
    return users;
  }

  async update(user: User): Promise<void> {
    await db.users.update(user.id, {
      name: user.name,
    });
  }

  async delete(userId: string): Promise<void> {
    await db.users.delete(userId);
  }

  async count(): Promise<number> {
    return await db.users.count();
  }
}
