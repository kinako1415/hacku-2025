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
   * カレンダー記録を読み込み
   */
  const loadCalendarRecords = async (): Promise<void> => {
    try {
      // ローカルストレージからデータを読み込み（モック実装）
      const savedRecords = localStorage.getItem('calendarRecords');
      if (savedRecords) {
        const parsedRecords = JSON.parse(savedRecords).map((record: any) => ({
          ...record,
          recordDate: new Date(record.recordDate),
          createdAt: new Date(record.createdAt),
          updatedAt: new Date(record.updatedAt),
        }));
        setCalendarRecords(parsedRecords);
      } else {
        // 初期データが無い場合は空配列
        setCalendarRecords([]);

        // サンプルデータを生成（デモ用）
        await generateSampleData();
      }
    } catch (err) {
      console.error('カレンダー記録読み込みエラー:', err);
      throw err;
    }
  };

  /**
   * サンプルデータ生成（デモ用）
   */
  const generateSampleData = async (): Promise<void> => {
    const sampleRecords: CalendarRecord[] = [];
    const today = new Date();

    // 過去30日間のランダムな記録を生成
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);

      // 70%の確率で記録を作成
      if (Math.random() > 0.3) {
        const record: CalendarRecord = {
          id: `record_${date.getTime()}`,
          userId: 'demo_user',
          recordDate: date,
          rehabCompleted: Math.random() > 0.3,
          measurementCompleted: Math.random() > 0.4,
          performanceLevel: (Math.floor(Math.random() * 5) + 1) as
            | 1
            | 2
            | 3
            | 4
            | 5,
          painLevel: (Math.floor(Math.random() * 5) + 1) as 1 | 2 | 3 | 4 | 5,
          motivationLevel: (Math.floor(Math.random() * 5) + 1) as
            | 1
            | 2
            | 3
            | 4
            | 5,
          ...(i % 5 === 0 && { notes: `${i}日前の記録メモ` }),
          createdAt: date,
          updatedAt: date,
        };
        sampleRecords.push(record);
      }
    }

    setCalendarRecords(sampleRecords);
    // ローカルストレージに保存
    localStorage.setItem('calendarRecords', JSON.stringify(sampleRecords));
  };

  /**
   * 日付選択ハンドラ
   */
  const handleDateSelect = useCallback(
    (date: Date): void => {
      setSelectedDate(date);

      // 選択された日付の記録を検索
      const record = calendarRecords.find(
        (r) => r.recordDate.toDateString() === date.toDateString()
      );

      setSelectedRecord(record);
      setIsDetailOpen(true);
    },
    [calendarRecords]
  );

  /**
   * 月変更ハンドラ
   */
  const handleMonthChange = useCallback((date: Date): void => {
    setCurrentMonth(date);
  }, []);

  /**
   * 記録保存ハンドラ
   */
  const handleSaveRecord = useCallback(
    async (
      data: CreateCalendarRecordInput | UpdateCalendarRecordInput
    ): Promise<void> => {
      try {
        setIsLoading(true);

        if (selectedRecord) {
          // 更新
          const updateData = data as UpdateCalendarRecordInput;
          const updatedRecord: CalendarRecord = {
            ...selectedRecord,
            ...updateData,
            updatedAt: new Date(),
          };

          const updatedRecords = calendarRecords.map((r) =>
            r.id === selectedRecord.id ? updatedRecord : r
          );

          setCalendarRecords(updatedRecords);
          setSelectedRecord(updatedRecord);
          localStorage.setItem(
            'calendarRecords',
            JSON.stringify(updatedRecords)
          );
        } else {
          // 新規作成
          const createData = data as CreateCalendarRecordInput;
          const newRecord: CalendarRecord = {
            id: `record_${Date.now()}`,
            userId: 'demo_user', // 実際の実装ではユーザーIDを使用
            recordDate: selectedDate,
            rehabCompleted: createData.rehabCompleted,
            measurementCompleted: createData.measurementCompleted,
            ...(createData.performanceLevel !== undefined && {
              performanceLevel: createData.performanceLevel,
            }),
            ...(createData.painLevel !== undefined && {
              painLevel: createData.painLevel,
            }),
            ...(createData.motivationLevel !== undefined && {
              motivationLevel: createData.motivationLevel,
            }),
            ...(createData.notes && { notes: createData.notes }),
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          const updatedRecords = [...calendarRecords, newRecord];
          setCalendarRecords(updatedRecords);
          setSelectedRecord(newRecord);
          localStorage.setItem(
            'calendarRecords',
            JSON.stringify(updatedRecords)
          );
        }

        setIsLoading(false);
      } catch (err) {
        console.error('記録保存エラー:', err);
        setError('記録の保存に失敗しました');
        setIsLoading(false);
      }
    },
    [selectedRecord, selectedDate, calendarRecords]
  );

  /**
   * 記録削除ハンドラ
   */
  const handleDeleteRecord = useCallback(
    async (recordId: string): Promise<void> => {
      try {
        const updatedRecords = calendarRecords.filter((r) => r.id !== recordId);
        setCalendarRecords(updatedRecords);
        setSelectedRecord(undefined);
        setIsDetailOpen(false);
        localStorage.setItem('calendarRecords', JSON.stringify(updatedRecords));
      } catch (err) {
        console.error('記録削除エラー:', err);
        setError('記録の削除に失敗しました');
      }
    },
    [calendarRecords]
  );

  /**
   * 詳細モーダルを閉じる
   */
  const handleCloseDetail = useCallback((): void => {
    setIsDetailOpen(false);
    setSelectedRecord(undefined);
  }, []);

  /**
   * エラーリセット
   */
  const handleResetError = useCallback((): void => {
    setError(null);
  }, []);

  /**
   * 今日の記録状況を取得
   */
  const getTodayStatus = (): { hasRecord: boolean; completionRate: number } => {
    const today = new Date();
    const todayRecord = calendarRecords.find(
      (r) => r.recordDate.toDateString() === today.toDateString()
    );

    if (!todayRecord) {
      return { hasRecord: false, completionRate: 0 };
    }

    const completed =
      Number(todayRecord.rehabCompleted) +
      Number(todayRecord.measurementCompleted);
    const completionRate = (completed / 2) * 100;

    return { hasRecord: true, completionRate };
  };

  /**
   * 月間統計を取得
   */
  const getMonthlyStats = () => {
    const monthStart = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      1
    );
    const monthEnd = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + 1,
      0
    );

    const monthRecords = calendarRecords.filter(
      (r) => r.recordDate >= monthStart && r.recordDate <= monthEnd
    );

    const totalDays = monthEnd.getDate();
    const recordedDays = monthRecords.length;
    const rehabCompletedDays = monthRecords.filter(
      (r) => r.rehabCompleted
    ).length;
    const measurementCompletedDays = monthRecords.filter(
      (r) => r.measurementCompleted
    ).length;

    return {
      totalDays,
      recordedDays,
      rehabCompletedDays,
      measurementCompletedDays,
      recordingRate: Math.round((recordedDays / totalDays) * 100),
      rehabRate: Math.round((rehabCompletedDays / totalDays) * 100),
      measurementRate: Math.round((measurementCompletedDays / totalDays) * 100),
    };
  };

  const todayStatus = getTodayStatus();
  const monthlyStats = getMonthlyStats();

  // ローディング画面
  if (isLoading && calendarRecords.length === 0) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}>
          <div className={styles.spinner}></div>
          <h2>カレンダーデータを読み込み中...</h2>
          <p>リハビリテーション記録を取得しています</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.calendarPage}>
      {/* ヘッダー */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>
            <span className={styles.titleIcon}>📅</span>
            リハビリカレンダー
          </h1>
          <nav className={styles.navigation}>
            <Link href="/measurement" className={styles.navLink}>
              📐 測定
            </Link>
            <Link href="/progress" className={styles.navLink}>
              📊 進捗
            </Link>
            <Link href="/setup" className={styles.navLink}>
              ⚙️ 設定
            </Link>
          </nav>
        </div>
      </header>

      {/* エラー表示 */}
      {error && (
        <div className={styles.errorContainer}>
          <div className={styles.errorMessage}>
            <span className={styles.errorIcon}>⚠️</span>
            <p>{error}</p>
            <button
              onClick={handleResetError}
              className={styles.errorResetButton}
            >
              閉じる
            </button>
          </div>
        </div>
      )}

      <main className={styles.mainContent}>
        {/* 今日のステータス */}
        <div className={styles.todayStatus}>
          <h2>📋 今日の記録状況</h2>
          <div className={styles.statusCard}>
            {todayStatus.hasRecord ? (
              <>
                <div className={styles.statusIndicator}>
                  <span className={styles.statusIcon}>✅</span>
                  <span>記録済み</span>
                </div>
                <div className={styles.completionRate}>
                  完了率: {todayStatus.completionRate}%
                </div>
              </>
            ) : (
              <>
                <div className={styles.statusIndicator}>
                  <span className={styles.statusIcon}>📝</span>
                  <span>未記録</span>
                </div>
                <button
                  className={styles.addRecordButton}
                  onClick={() => handleDateSelect(new Date())}
                >
                  今日の記録を追加
                </button>
              </>
            )}
          </div>
        </div>

        {/* カレンダーセクション */}
        <div className={styles.calendarSection}>
          <div className={styles.calendarHeader}>
            <h2>📅 月間カレンダー</h2>
            <div className={styles.monthNavigation}>
              <button
                className={styles.monthButton}
                onClick={() => {
                  const prevMonth = new Date(currentMonth);
                  prevMonth.setMonth(currentMonth.getMonth() - 1);
                  handleMonthChange(prevMonth);
                }}
              >
                ◀ 前月
              </button>
              <span className={styles.currentMonth}>
                {currentMonth.getFullYear()}年{currentMonth.getMonth() + 1}月
              </span>
              <button
                className={styles.monthButton}
                onClick={() => {
                  const nextMonth = new Date(currentMonth);
                  nextMonth.setMonth(currentMonth.getMonth() + 1);
                  handleMonthChange(nextMonth);
                }}
              >
                次月 ▶
              </button>
            </div>
          </div>

          <CalendarGrid
            records={calendarRecords}
            currentDate={currentMonth}
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
          />
        </div>

        {/* 月間統計 */}
        <div className={styles.statsSection}>
          <h2>📊 月間統計</h2>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>📅</div>
              <div className={styles.statContent}>
                <span className={styles.statLabel}>記録日数</span>
                <span className={styles.statValue}>
                  {monthlyStats.recordedDays}/{monthlyStats.totalDays}日
                </span>
                <span className={styles.statRate}>
                  {monthlyStats.recordingRate}%
                </span>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon}>🏃‍♂️</div>
              <div className={styles.statContent}>
                <span className={styles.statLabel}>リハビリ実施</span>
                <span className={styles.statValue}>
                  {monthlyStats.rehabCompletedDays}日
                </span>
                <span className={styles.statRate}>
                  {monthlyStats.rehabRate}%
                </span>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon}>📐</div>
              <div className={styles.statContent}>
                <span className={styles.statLabel}>測定実施</span>
                <span className={styles.statValue}>
                  {monthlyStats.measurementCompletedDays}日
                </span>
                <span className={styles.statRate}>
                  {monthlyStats.measurementRate}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 記録詳細モーダル */}
      {isDetailOpen && (
        <div className={styles.modalOverlay} onClick={handleCloseDetail}>
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <RecordDetail
              selectedDate={selectedDate}
              {...(selectedRecord && { record: selectedRecord })}
              onSave={handleSaveRecord}
              onDelete={handleDeleteRecord}
              onClose={handleCloseDetail}
              isLoading={isLoading}
            />
          </div>
        </div>
      )}

      {/* フッター */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <p>AI駆動リハビリテーション支援システム</p>
          <div className={styles.footerLinks}>
            <Link href="/measurement">測定</Link>
            <Link href="/progress">進捗分析</Link>
            <Link href="/setup">設定</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
