/**
 * 測定サービス用カスタムフック
 */

import { useCallback, useState } from 'react';
import { db } from '@/lib/data-manager/database';
import type { MotionMeasurement } from '@/lib/data-manager/models/motion-measurement';

/**
 * 測定サービスフックの戻り値型
 */
interface UseMeasurementServiceReturn {
  saveMotionMeasurement: (measurement: MotionMeasurement) => Promise<string>;
  getMeasurements: (
    userId?: string,
    limit?: number
  ) => Promise<MotionMeasurement[]>;
  getMeasurementById: (id: string) => Promise<MotionMeasurement | undefined>;
  deleteMeasurement: (id: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

/**
 * 測定サービス用カスタムフック
 */
export function useMeasurementService(): UseMeasurementServiceReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 測定データの保存
   */
  const saveMotionMeasurement = useCallback(
    async (measurement: MotionMeasurement): Promise<string> => {
      setIsLoading(true);
      setError(null);

      try {
        // データベース初期化確認
        if (!db.isOpen()) {
          await db.open();
        }

        // タイムゾーンに依存しないようにYYYY-MM-DD形式の文字列で比較
        const targetDate = new Date(measurement.measurementDate);
        const targetDateString = `${targetDate.getFullYear()}-${String(
          targetDate.getMonth() + 1
        ).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;

        const existing = await db.measurements
          .where('userId')
          .equals(measurement.userId)
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
          measurement.id = existing.id;
        }

        // putメソッドで保存（存在すれば更新、なければ新規作成）
        const id = await db.measurements.put(measurement);

        return String(id);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : '測定データの保存に失敗しました';
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * 測定データの取得（フィルタリング・ページネーション対応）
   */
  const getMeasurements = useCallback(
    async (userId?: string, limit = 20): Promise<MotionMeasurement[]> => {
      setIsLoading(true);
      setError(null);

      try {
        // データベース初期化確認
        if (!db.isOpen()) {
          await db.open();
        }

        let measurements: MotionMeasurement[];

        // ユーザーIDでフィルタリング
        if (userId) {
          measurements = await db.measurements
            .where('userId')
            .equals(userId)
            .reverse()
            .limit(limit)
            .toArray();
        } else {
          measurements = await db.measurements
            .orderBy('measurementDate')
            .reverse()
            .limit(limit)
            .toArray();
        }

        return measurements;

        return measurements;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : '測定データの取得に失敗しました';
        setError(errorMessage);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * 特定の測定データの取得
   */
  const getMeasurementById = useCallback(
    async (id: string): Promise<MotionMeasurement | undefined> => {
      setIsLoading(true);
      setError(null);

      try {
        // データベース初期化確認
        if (!db.isOpen()) {
          await db.open();
        }

        const measurement = await db.measurements.get(id);
        return measurement;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : '測定データの取得に失敗しました';
        setError(errorMessage);
        return undefined;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * 測定データの削除
   */
  const deleteMeasurement = useCallback(async (id: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      // データベース初期化確認
      if (!db.isOpen()) {
        await db.open();
      }

      await db.measurements.delete(id);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : '測定データの削除に失敗しました';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    saveMotionMeasurement,
    getMeasurements,
    getMeasurementById,
    deleteMeasurement,
    isLoading,
    error,
  };
}
