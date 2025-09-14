/**
 * IndexedDB スキーマ定義とDexie設定
 * クライアントサイドデータベース管理
 */

import Dexie, { Table } from 'dexie';
import { User } from './models/user';
import { MotionMeasurement } from './models/motion-measurement';
import { CalendarRecord } from './models/calendar-record';
import { ProgressData } from './models/progress-data';

/**
 * リハビリテーションアプリケーション用データベース
 */
export class RehabDatabase extends Dexie {
  // テーブル定義
  users!: Table<User>;
  measurements!: Table<MotionMeasurement>;
  records!: Table<CalendarRecord>;
  progress!: Table<ProgressData>;

  constructor() {
    super('RehabDatabase');
    
    // データベーススキーマ定義
    this.version(1).stores({
      // ユーザーテーブル
      users: 'id, name, createdAt',
      
      // 測定データテーブル
      measurements: 'id, userId, measurementDate, handUsed, createdAt, [userId+measurementDate]',
      
      // カレンダー記録テーブル  
      records: 'id, userId, recordDate, createdAt, updatedAt, [userId+recordDate]',
      
      // 進捗データテーブル
      progress: 'id, userId, analysisDate, analysisPeriod, createdAt, [userId+analysisPeriod]'
    });

    // スキーマアップグレード時のマイグレーション
    this.version(1).upgrade(async (transaction) => {
      console.log('RehabDatabase: 初期スキーマを作成しました');
    });
  }
}

// データベースインスタンス
export const db = new RehabDatabase();

/**
 * データベース接続状態ハンドリング
 */
db.on('ready', () => {
  console.log('RehabDatabase: データベース接続が完了しました');
});

// Dexieのエラーハンドリングは初期化時に実行
db.on('close', () => {
  console.log('RehabDatabase: データベース接続が閉じられました');
});

/**
 * データベース初期化関数
 */
export const initializeDatabase = async (): Promise<void> => {
  try {
    await db.open();
    console.log('RehabDatabase: データベースが正常に開かれました');
  } catch (error) {
    console.error('RehabDatabase: データベース初期化エラー:', error);
    throw error;
  }
};

/**
 * データベース状態確認
 */
export const getDatabaseStatus = async () => {
  try {
    const isOpen = db.isOpen();
    const userCount = isOpen ? await db.users.count() : 0;
    const measurementCount = isOpen ? await db.measurements.count() : 0;
    const recordCount = isOpen ? await db.records.count() : 0;
    const progressCount = isOpen ? await db.progress.count() : 0;

    return {
      isOpen,
      version: db.verno,
      tables: {
        users: userCount,
        measurements: measurementCount,
        records: recordCount,
        progress: progressCount,
      },
      totalRecords: userCount + measurementCount + recordCount + progressCount,
    };
  } catch (error) {
    console.error('RehabDatabase: ステータス取得エラー:', error);
    return {
      isOpen: false,
      version: 0,
      tables: { users: 0, measurements: 0, records: 0, progress: 0 },
      totalRecords: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * データベースリセット（開発用）
 */
export const resetDatabase = async (): Promise<void> => {
  try {
    await db.delete();
    console.log('RehabDatabase: データベースがリセットされました');
    
    // 新しいインスタンスを作成
    await db.open();
    console.log('RehabDatabase: 新しいデータベースインスタンスが作成されました');
  } catch (error) {
    console.error('RehabDatabase: リセットエラー:', error);
    throw error;
  }
};

/**
 * データベースエクスポート（バックアップ用）
 */
export const exportDatabase = async () => {
  try {
    const users = await db.users.toArray();
    const measurements = await db.measurements.toArray();
    const records = await db.records.toArray();
    const progress = await db.progress.toArray();

    return {
      version: db.verno,
      exportDate: new Date().toISOString(),
      data: {
        users,
        measurements,
        records,
        progress,
      },
    };
  } catch (error) {
    console.error('RehabDatabase: エクスポートエラー:', error);
    throw error;
  }
};

/**
 * データベースインポート（リストア用）
 */
export const importDatabase = async (exportData: any): Promise<void> => {
  try {
    await db.transaction('rw', [db.users, db.measurements, db.records, db.progress], async () => {
      // 既存データをクリア
      await db.users.clear();
      await db.measurements.clear();
      await db.records.clear();
      await db.progress.clear();

      // データをインポート
      if (exportData.data.users) {
        await db.users.bulkAdd(exportData.data.users);
      }
      if (exportData.data.measurements) {
        await db.measurements.bulkAdd(exportData.data.measurements);
      }
      if (exportData.data.records) {
        await db.records.bulkAdd(exportData.data.records);
      }
      if (exportData.data.progress) {
        await db.progress.bulkAdd(exportData.data.progress);
      }
    });

    console.log('RehabDatabase: データベースインポートが完了しました');
  } catch (error) {
    console.error('RehabDatabase: インポートエラー:', error);
    throw error;
  }
};

/**
 * ユーザーデータの完全削除
 */
export const deleteUserData = async (userId: string): Promise<void> => {
  try {
    await db.transaction('rw', [db.users, db.measurements, db.records, db.progress], async () => {
      await db.users.where('id').equals(userId).delete();
      await db.measurements.where('userId').equals(userId).delete();
      await db.records.where('userId').equals(userId).delete();
      await db.progress.where('userId').equals(userId).delete();
    });

    console.log(`RehabDatabase: ユーザー ${userId} のデータを削除しました`);
  } catch (error) {
    console.error('RehabDatabase: ユーザーデータ削除エラー:', error);
    throw error;
  }
};

/**
 * ストレージ使用量の概算取得
 */
export const getStorageUsage = async () => {
  try {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        quota: estimate.quota,
        usage: estimate.usage,
        available: estimate.quota && estimate.usage 
          ? estimate.quota - estimate.usage 
          : undefined,
      };
    }
    return null;
  } catch (error) {
    console.error('RehabDatabase: ストレージ使用量取得エラー:', error);
    return null;
  }
};
