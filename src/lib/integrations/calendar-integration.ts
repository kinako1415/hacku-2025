/**
 * カレンダー統合サービス
 * カレンダーコンポーネントとデータストレージを統合
 */

import { useState, useEffect, useCallback } from 'react';
import type { CalendarRecord } from '@/lib/data-manager/models/calendar-record';

/**
 * カレンダー統合フックの状態
 */
interface CalendarIntegrationState {
  records: CalendarRecord[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  selectedDate: Date | null;
  currentMonth: Date;
}

/**
 * カレンダー統合フック
 * カレンダーコンポーネントとローカルストレージを統合
 */
export const useCalendarIntegration = () => {
  const [state, setState] = useState<CalendarIntegrationState>({
    records: [],
    isLoading: false,
    isSaving: false,
    error: null,
    selectedDate: null,
    currentMonth: new Date(),
  });

  // ローカルストレージキー
  const STORAGE_KEY = 'rehabilitation-calendar-records';

  // レコード読み込み
  const loadRecords = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      // ローカルストレージから読み込み
      const savedRecords = localStorage.getItem(STORAGE_KEY);
      if (savedRecords) {
        const parsedRecords = JSON.parse(savedRecords).map((record: any) => ({
          ...record,
          recordDate: new Date(record.recordDate),
          createdAt: new Date(record.createdAt),
          updatedAt: new Date(record.updatedAt),
        }));

        setState((prev) => ({
          ...prev,
          records: parsedRecords,
          isLoading: false,
        }));
      } else {
        // サンプルデータを生成
        const sampleRecords = generateSampleRecords();
        setState((prev) => ({
          ...prev,
          records: sampleRecords,
          isLoading: false,
        }));

        // サンプルデータを保存
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleRecords));
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'データの読み込みに失敗しました';
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, [STORAGE_KEY]);

  // レコード保存
  const saveRecords = useCallback(
    async (records: CalendarRecord[]) => {
      try {
        setState((prev) => ({ ...prev, isSaving: true, error: null }));

        // ローカルストレージに保存
        localStorage.setItem(STORAGE_KEY, JSON.stringify(records));

        setState((prev) => ({
          ...prev,
          records,
          isSaving: false,
        }));
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'データの保存に失敗しました';
        setState((prev) => ({
          ...prev,
          isSaving: false,
          error: errorMessage,
        }));
      }
    },
    [STORAGE_KEY]
  );

  // レコード作成
  const createRecord = useCallback(
    async (recordData: Partial<CalendarRecord>) => {
      const newRecord: CalendarRecord = {
        id: Date.now(), // Use number instead of string
        userId: 'user-1', // 実際の実装では認証されたユーザーIDを使用
        recordDate: recordData.recordDate || new Date(),
        rehabCompleted: recordData.rehabCompleted ?? false,
        measurementCompleted: recordData.measurementCompleted ?? false,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...(recordData.performanceLevel && {
          performanceLevel: recordData.performanceLevel,
        }),
        ...(recordData.painLevel && { painLevel: recordData.painLevel }),
        ...(recordData.motivationLevel && {
          motivationLevel: recordData.motivationLevel,
        }),
        ...(recordData.notes && { notes: recordData.notes }),
      };

      const updatedRecords = [...state.records, newRecord];
      await saveRecords(updatedRecords);
      return newRecord;
    },
    [state.records, saveRecords]
  );

  // レコード更新
  const updateRecord = useCallback(
    async (id: number, updates: Partial<CalendarRecord>) => {
      const updatedRecords = state.records.map((record) =>
        record.id === id
          ? { ...record, ...updates, updatedAt: new Date() }
          : record
      );

      await saveRecords(updatedRecords);
      return updatedRecords.find((record) => record.id === id) || null;
    },
    [state.records, saveRecords]
  );

  // レコード削除
  const deleteRecord = useCallback(
    async (id: number) => {
      const updatedRecords = state.records.filter((record) => record.id !== id);
      await saveRecords(updatedRecords);
    },
    [state.records, saveRecords]
  );

  // 特定日のレコード取得
  const getRecordByDate = useCallback(
    (date: Date) => {
      const dateString = date.toISOString().split('T')[0];
      return state.records.find(
        (record) => record.recordDate.toISOString().split('T')[0] === dateString
      );
    },
    [state.records]
  );

  // 期間内のレコード取得
  const getRecordsByDateRange = useCallback(
    (startDate: Date, endDate: Date) => {
      return state.records.filter(
        (record) =>
          record.recordDate >= startDate && record.recordDate <= endDate
      );
    },
    [state.records]
  );

  // 月変更
  const changeMonth = useCallback((direction: 'prev' | 'next' | 'today') => {
    setState((prev) => {
      const newMonth = new Date(prev.currentMonth);

      switch (direction) {
        case 'prev':
          newMonth.setMonth(newMonth.getMonth() - 1);
          break;
        case 'next':
          newMonth.setMonth(newMonth.getMonth() + 1);
          break;
        case 'today':
          return { ...prev, currentMonth: new Date() };
      }

      return { ...prev, currentMonth: newMonth };
    });
  }, []);

  // 日付選択
  const selectDate = useCallback((date: Date | null) => {
    setState((prev) => ({ ...prev, selectedDate: date }));
  }, []);

  // エラークリア
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  // 統計計算
  const getStatistics = useCallback(
    (period: 'week' | 'month' | 'year' = 'month') => {
      const now = new Date();
      let startDate: Date;

      switch (period) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        case 'month':
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
      }

      const periodRecords = getRecordsByDateRange(startDate, now);

      const totalDays = periodRecords.length;
      const rehabCompleted = periodRecords.filter(
        (r) => r.rehabCompleted
      ).length;
      const measurementCompleted = periodRecords.filter(
        (r) => r.measurementCompleted
      ).length;

      const averagePain =
        periodRecords.length > 0
          ? periodRecords.reduce((sum, r) => sum + (r.painLevel || 0), 0) /
            periodRecords.length
          : 0;

      const averageMotivation =
        periodRecords.length > 0
          ? periodRecords.reduce(
              (sum, r) => sum + (r.motivationLevel || 0),
              0
            ) / periodRecords.length
          : 0;

      const averagePerformance =
        periodRecords.length > 0
          ? periodRecords.reduce(
              (sum, r) => sum + (r.performanceLevel || 0),
              0
            ) / periodRecords.length
          : 0;

      return {
        totalDays,
        rehabCompletionRate:
          totalDays > 0 ? (rehabCompleted / totalDays) * 100 : 0,
        measurementCompletionRate:
          totalDays > 0 ? (measurementCompleted / totalDays) * 100 : 0,
        averagePainLevel: averagePain,
        averageMotivationLevel: averageMotivation,
        averagePerformanceLevel: averagePerformance,
        streak: calculateStreak(periodRecords),
      };
    },
    [getRecordsByDateRange]
  );

  // 初期化
  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  return {
    // 状態
    ...state,

    // アクション
    loadRecords,
    createRecord,
    updateRecord,
    deleteRecord,
    getRecordByDate,
    getRecordsByDateRange,
    changeMonth,
    selectDate,
    clearError,
    getStatistics,
  };
};

/**
 * サンプルデータ生成
 */
const generateSampleRecords = (): CalendarRecord[] => {
  const records: CalendarRecord[] = [];
  const today = new Date();

  for (let i = 29; i >= 0; i--) {
    const recordDate = new Date(today);
    recordDate.setDate(today.getDate() - i);

    if (Math.random() > 0.2) {
      // 80%の確率で記録があるとする
      const progress = (30 - i) / 30;

      const recordData: CalendarRecord = {
        id: i, // Use number instead of string
        userId: 'user-1',
        recordDate,
        rehabCompleted: Math.random() > 0.15, // 85%の完了率
        measurementCompleted: Math.random() > 0.2, // 80%の完了率
        painLevel: Math.max(
          1,
          Math.min(5, Math.round(5 - progress * 3 + (Math.random() - 0.5) * 2))
        ) as 1 | 2 | 3 | 4 | 5,
        motivationLevel: Math.max(
          1,
          Math.min(5, Math.round(3 + progress * 2 + (Math.random() - 0.5) * 1))
        ) as 1 | 2 | 3 | 4 | 5,
        performanceLevel: Math.max(
          1,
          Math.min(5, Math.round(2 + progress * 3 + (Math.random() - 0.5) * 1))
        ) as 1 | 2 | 3 | 4 | 5,
        createdAt: recordDate,
        updatedAt: recordDate,
      };

      if (i % 10 === 0) {
        recordData.notes = '今日は調子が良かったです！';
      }

      records.push(recordData);
    }
  }

  return records;
};

/**
 * 連続記録日数を計算
 */
const calculateStreak = (records: CalendarRecord[]): number => {
  if (records.length === 0) return 0;

  const sortedRecords = records
    .filter((r) => r.rehabCompleted)
    .sort((a, b) => b.recordDate.getTime() - a.recordDate.getTime());

  if (sortedRecords.length === 0) return 0;

  const firstRecord = sortedRecords[0];
  if (!firstRecord) return 0;

  let streak = 1;
  let currentDate = new Date(firstRecord.recordDate);

  for (let i = 1; i < sortedRecords.length; i++) {
    const prevDate = new Date(currentDate);
    prevDate.setDate(prevDate.getDate() - 1);

    const currentRecord = sortedRecords[i];
    if (!currentRecord) continue;

    const recordDate = currentRecord.recordDate;

    if (recordDate.toDateString() === prevDate.toDateString()) {
      streak++;
      currentDate = recordDate;
    } else {
      break;
    }
  }

  return streak;
};
