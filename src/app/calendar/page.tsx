/**
 * カレンダーページ
 * リハビリテーション記録のカレンダー表示と記録詳細管理
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CalendarGrid } from '@/components/calendar/CalendarGrid';
import { RecordDetail } from '@/components/calendar/RecordDetail';
import type {
  CalendarRecord,
  CreateCalendarRecordInput,
  UpdateCalendarRecordInput,
} from '@/lib/data-manager/models/calendar-record';
import { db } from '@/lib/data-manager/database';
import styles from './page.module.scss';

/**
 * カレンダーページコンポーネント
 */
export default function CalendarPage(): React.JSX.Element {
  const router = useRouter();

  // 状態管理
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [calendarRecords, setCalendarRecords] = useState<CalendarRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<
    CalendarRecord | undefined
  >();
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * 初期化
   */
  useEffect(() => {
    const initializePage = async (): Promise<void> => {
      try {
        setIsLoading(true);
        await loadCalendarRecords();
        setIsLoading(false);
      } catch (err) {
        console.error('カレンダーページ初期化エラー:', err);
        setError('データの読み込みに失敗しました');
        setIsLoading(false);
      }
    };

    initializePage();
  }, [currentMonth]);

  /**
   * カレンダー記録を読み込み（実際のデータベースから）
   */
  const loadCalendarRecords = async (
    userId: string = 'default-user'
  ): Promise<void> => {
    try {
      // 現在の月の範囲を計算
      const startOfMonth = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        1
      );
      const endOfMonth = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() + 1,
        0
      );

      // データベースから記録を取得
      const records = await db.records
        .where('userId')
        .equals(userId)
        .and((record) => {
          const recordDate = record.recordDate;
          return recordDate >= startOfMonth && recordDate <= endOfMonth;
        })
        .toArray();

      setCalendarRecords(records);
    } catch (err) {
      console.error('カレンダー記録読み込みエラー:', err);
      throw err;
    }
  };

  /**
   * 新しい記録を作成
   */
  const createRecord = async (
    input: CreateCalendarRecordInput
  ): Promise<CalendarRecord> => {
    try {
      const now = new Date();
      const newRecord: CalendarRecord = {
        id: `record_${now.getTime()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: input.userId || 'default-user',
        recordDate: input.recordDate,
        rehabCompleted: input.rehabCompleted || false,
        measurementCompleted: input.measurementCompleted || false,
        performanceLevel: input.performanceLevel || 3,
        painLevel: input.painLevel || 3,
        motivationLevel: input.motivationLevel || 3,
        notes: input.notes || '',
        createdAt: now,
        updatedAt: now,
      };

      // データベースに保存
      await db.records.add(newRecord);

      // 状態を更新
      setCalendarRecords((prev) => [...prev, newRecord]);

      return newRecord;
    } catch (err) {
      console.error('記録作成エラー:', err);
      throw err;
    }
  };

  /**
   * 記録を更新
   */
  const updateRecord = async (
    id: string,
    input: UpdateCalendarRecordInput
  ): Promise<CalendarRecord> => {
    try {
      const updateData = {
        ...input,
        updatedAt: new Date(),
      };

      // データベースを更新
      await db.records.update(id, updateData);

      // 更新された記録を取得
      const updatedRecord = await db.records.get(id);
      if (!updatedRecord) {
        throw new Error('更新後の記録が見つかりません');
      }

      // 状態を更新
      setCalendarRecords((prev) =>
        prev.map((record) => (record.id === id ? updatedRecord : record))
      );

      return updatedRecord;
    } catch (err) {
      console.error('記録更新エラー:', err);
      throw err;
    }
  };

  /**
   * 記録を削除
   */
  const deleteRecord = async (id: string): Promise<void> => {
    try {
      // データベースから削除
      await db.records.delete(id);

      // 状態を更新
      setCalendarRecords((prev) => prev.filter((record) => record.id !== id));
    } catch (err) {
      console.error('記録削除エラー:', err);
      throw err;
    }
  };

  /**
   * 日付選択ハンドラー
   */
  const handleDateSelect = useCallback(
    (date: Date): void => {
      setSelectedDate(date);

      // 選択した日付に対応する記録を探す
      const recordForDate = calendarRecords.find((record) => {
        const recordDate = new Date(record.recordDate);
        return (
          recordDate.getFullYear() === date.getFullYear() &&
          recordDate.getMonth() === date.getMonth() &&
          recordDate.getDate() === date.getDate()
        );
      });

      setSelectedRecord(recordForDate);
      setIsDetailOpen(true);
    },
    [calendarRecords]
  );

  /**
   * 月変更ハンドラー
   */
  const handleMonthChange = useCallback((newMonth: Date): void => {
    setCurrentMonth(newMonth);
  }, []);

  /**
   * 記録保存ハンドラー
   */
  const handleSaveRecord = async (
    input: CreateCalendarRecordInput | UpdateCalendarRecordInput
  ): Promise<void> => {
    try {
      if (selectedRecord) {
        // 既存記録の更新
        await updateRecord(
          selectedRecord.id,
          input as UpdateCalendarRecordInput
        );
      } else {
        // 新規記録の作成
        const createInput: CreateCalendarRecordInput = {
          ...(input as CreateCalendarRecordInput),
          recordDate: selectedDate,
        };
        const newRecord = await createRecord(createInput);
        setSelectedRecord(newRecord);
      }
    } catch (err) {
      console.error('記録保存エラー:', err);
      setError('記録の保存に失敗しました');
    }
  };

  /**
   * 記録削除ハンドラー
   */
  const handleDeleteRecord = async (): Promise<void> => {
    if (!selectedRecord) return;

    try {
      await deleteRecord(selectedRecord.id);
      setSelectedRecord(undefined);
      setIsDetailOpen(false);
    } catch (err) {
      console.error('記録削除エラー:', err);
      setError('記録の削除に失敗しました');
    }
  };

  /**
   * 詳細画面を閉じる
   */
  const handleCloseDetail = useCallback((): void => {
    setIsDetailOpen(false);
    setError(null);
  }, []);

  /**
   * 測定ページに移動
   */
  const goToMeasurement = useCallback((): void => {
    router.push('/measurement');
  }, [router]);

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
        <p>カレンダーデータを読み込んでいます...</p>
      </div>
    );
  }

  return (
    <div className={styles.calendarPage}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>
            <span className={styles.titleIcon}>📅</span>
            リハビリカレンダー
          </h1>
          <div className={styles.headerActions}>
            <Link href="/measurement" className={styles.measurementButton}>
              今日の測定
            </Link>
            <Link href="/progress" className={styles.progressButton}>
              進捗確認
            </Link>
          </div>
        </div>
      </header>

      {error && (
        <div className={styles.errorContainer}>
          <div className={styles.errorMessage}>
            <span className={styles.errorIcon}>⚠️</span>
            <p>{error}</p>
            <button
              onClick={() => setError(null)}
              className={styles.errorResetButton}
            >
              閉じる
            </button>
          </div>
        </div>
      )}

      <main className={styles.mainContent}>
        <div className={styles.calendarContainer}>
          <CalendarGrid
            records={calendarRecords}
            currentDate={currentMonth}
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
          />
        </div>

        {isDetailOpen && selectedDate && (
          <RecordDetail
            selectedDate={selectedDate}
            {...(selectedRecord && { record: selectedRecord })}
            onSave={handleSaveRecord}
            {...(selectedRecord?.id && {
              onDelete: (id: string) => deleteRecord(id),
            })}
            onClose={handleCloseDetail}
          />
        )}

        {calendarRecords.length === 0 && !isLoading && (
          <div className={styles.noDataMessage}>
            <p>まだ記録がありません。</p>
            <p>測定を開始して記録を蓄積してください。</p>
            <button onClick={goToMeasurement} className={styles.startButton}>
              測定を開始
            </button>
          </div>
        )}

        <div className={styles.summary}>
          <div className={styles.summaryCard}>
            <h3>今月の記録</h3>
            <p className={styles.summaryValue}>{calendarRecords.length}日</p>
          </div>

          <div className={styles.summaryCard}>
            <h3>リハビリ完了</h3>
            <p className={styles.summaryValue}>
              {calendarRecords.filter((r) => r.rehabCompleted).length}日
            </p>
          </div>

          <div className={styles.summaryCard}>
            <h3>測定完了</h3>
            <p className={styles.summaryValue}>
              {calendarRecords.filter((r) => r.measurementCompleted).length}日
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
