/**
 * カレンダーグリッドコンポーネント
 * 月次表示でのリハビリ実施記録表示
 */

import React, { useState, useMemo } from 'react';
import type { CalendarRecord } from '@/lib/data-manager/models/calendar-record';
import styles from './CalendarGrid.module.scss';

/**
 * カレンダーグリッドコンポーネントのProps
 */
interface CalendarGridProps {
  records: CalendarRecord[];
  currentDate: Date;
  onDateSelect?: (date: Date) => void;
  onDateClick?: (date: Date, record?: CalendarRecord) => void;
  selectedDate?: Date;
  className?: string;
}

/**
 * 曜日の表示名
 */
const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

/**
 * 日付ユーティリティ関数
 */
const dateUtils = {
  isSameDay: (date1: Date, date2: Date): boolean => {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  },
  
  isSameMonth: (date1: Date, date2: Date): boolean => {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth();
  },
  
  isToday: (date: Date): boolean => {
    const today = new Date();
    return dateUtils.isSameDay(date, today);
  },
  
  startOfMonth: (date: Date): Date => {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  },
  
  endOfMonth: (date: Date): Date => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
  },
  
  eachDayOfInterval: (start: Date, end: Date): Date[] => {
    const days: Date[] = [];
    const current = new Date(start);
    
    while (current <= end) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  },
  
  formatMonth: (date: Date): string => {
    return `${date.getFullYear()}年${date.getMonth() + 1}月`;
  }
};

/**
 * カレンダーグリッドコンポーネント
 */
export const CalendarGrid: React.FC<CalendarGridProps> = ({
  records,
  currentDate,
  onDateSelect,
  onDateClick,
  selectedDate,
  className,
}) => {
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);

  /**
   * 現在月の日付範囲を計算
   */
  const monthDays = useMemo(() => {
    const start = dateUtils.startOfMonth(currentDate);
    const end = dateUtils.endOfMonth(currentDate);
    return dateUtils.eachDayOfInterval(start, end);
  }, [currentDate]);

  /**
   * 指定日の記録を取得
   */
  const getRecordForDate = (date: Date): CalendarRecord | undefined => {
    return records.find(record => 
      dateUtils.isSameDay(new Date(record.recordDate), date)
    );
  };

  /**
   * 日付セルのクリックハンドラ
   */
  const handleDateClick = (date: Date): void => {
    const record = getRecordForDate(date);
    
    if (onDateSelect) {
      onDateSelect(date);
    }
    
    if (onDateClick) {
      onDateClick(date, record);
    }
  };

  /**
   * 実施率を計算
   */
  const getCompletionRate = (record: CalendarRecord): number => {
    let completed = 0;
    let total = 2; // リハビリ + 測定の2項目
    
    if (record.rehabCompleted) completed++;
    if (record.measurementCompleted) completed++;
    
    return Math.round((completed / total) * 100);
  };

  /**
   * 実施率に基づく色の取得
   */
  const getCompletionColor = (completionRate: number): string => {
    if (completionRate >= 80) return '#4CAF50'; // 緑
    if (completionRate >= 60) return '#8BC34A'; // 薄緑
    if (completionRate >= 40) return '#FFC107'; // 黄
    if (completionRate >= 20) return '#FF9800'; // オレンジ
    if (completionRate > 0) return '#FF5722';   // 赤
    return '#E0E0E0'; // グレー（未実施）
  };

  /**
   * 日付セルのクラス名を生成
   */
  const getDateCellClassName = (date: Date, record?: CalendarRecord): string => {
    const classNames = [styles.dateCell];
    
    if (!dateUtils.isSameMonth(date, currentDate)) {
      classNames.push(styles.otherMonth);
    }
    
    if (dateUtils.isToday(date)) {
      classNames.push(styles.today);
    }
    
    if (selectedDate && dateUtils.isSameDay(date, selectedDate)) {
      classNames.push(styles.selected);
    }
    
    if (hoveredDate && dateUtils.isSameDay(date, hoveredDate)) {
      classNames.push(styles.hovered);
    }
    
    if (record) {
      const completionRate = getCompletionRate(record);
      if (completionRate >= 100) {
        classNames.push(styles.completed);
      } else if (completionRate > 0) {
        classNames.push(styles.partial);
      } else {
        classNames.push(styles.noRecord);
      }
    } else {
      classNames.push(styles.noRecord);
    }
    
    return classNames.join(' ');
  };

  /**
   * 月の統計情報を計算
   */
  const monthStats = useMemo(() => {
    const monthRecords = records.filter(record => 
      dateUtils.isSameMonth(new Date(record.recordDate), currentDate)
    );
    
    const totalDays = monthDays.length;
    const recordedDays = monthRecords.length;
    const completedDays = monthRecords.filter(r => 
      getCompletionRate(r) >= 100
    ).length;
    const averageCompletion = recordedDays > 0 
      ? Math.round(monthRecords.reduce((sum, r) => sum + getCompletionRate(r), 0) / recordedDays)
      : 0;
    
    return {
      totalDays,
      recordedDays,
      completedDays,
      averageCompletion,
      completionRate: Math.round((completedDays / totalDays) * 100),
    };
  }, [records, currentDate, monthDays]);

  return (
    <div className={`${styles.calendarGrid} ${className || ''}`}>
      {/* カレンダーヘッダー */}
      <div className={styles.calendarHeader}>
        <h3 className={styles.monthTitle}>
          {dateUtils.formatMonth(currentDate)}
        </h3>
        <div className={styles.monthStats}>
          <span className={styles.stat}>
            完了: {monthStats.completedDays}/{monthStats.totalDays}日
          </span>
          <span className={styles.stat}>
            平均: {monthStats.averageCompletion}%
          </span>
        </div>
      </div>

      {/* 曜日ヘッダー */}
      <div className={styles.weekdaysHeader}>
        {WEEKDAYS.map((weekday, index) => (
          <div 
            key={weekday}
            className={`${styles.weekdayCell} ${index === 0 ? styles.sunday : ''} ${index === 6 ? styles.saturday : ''}`}
          >
            {weekday}
          </div>
        ))}
      </div>

      {/* 日付グリッド */}
      <div className={styles.datesGrid}>
        {monthDays.map((date: Date) => {
          const record = getRecordForDate(date);
          const completionRate = record ? getCompletionRate(record) : 0;
          
          return (
            <div
              key={date.toISOString()}
              className={getDateCellClassName(date, record)}
              onClick={() => handleDateClick(date)}
              onMouseEnter={() => setHoveredDate(date)}
              onMouseLeave={() => setHoveredDate(null)}
              style={{
                '--completion-color': getCompletionColor(completionRate)
              } as React.CSSProperties}
            >
              {/* 日付番号 */}
              <span className={styles.dateNumber}>
                {date.getDate()}
              </span>

              {/* 実施状況インジケーター */}
              {record && (
                <div className={styles.recordIndicator}>
                  <div 
                    className={styles.completionBar}
                    style={{ 
                      width: `${completionRate}%`,
                      backgroundColor: getCompletionColor(completionRate)
                    }}
                  />
                  {completionRate >= 100 && (
                    <span className={styles.completionCheck}>✓</span>
                  )}
                </div>
              )}

              {/* 今日のマーカー */}
              {dateUtils.isToday(date) && (
                <div className={styles.todayMarker} />
              )}
            </div>
          );
        })}
      </div>

      {/* 凡例 */}
      <div className={styles.legend}>
        <h4>実施状況</h4>
        <div className={styles.legendItems}>
          <div className={styles.legendItem}>
            <div className={styles.legendColor} style={{ backgroundColor: '#4CAF50' }} />
            <span>80%以上</span>
          </div>
          <div className={styles.legendItem}>
            <div className={styles.legendColor} style={{ backgroundColor: '#8BC34A' }} />
            <span>60-79%</span>
          </div>
          <div className={styles.legendItem}>
            <div className={styles.legendColor} style={{ backgroundColor: '#FFC107' }} />
            <span>40-59%</span>
          </div>
          <div className={styles.legendItem}>
            <div className={styles.legendColor} style={{ backgroundColor: '#FF9800' }} />
            <span>20-39%</span>
          </div>
          <div className={styles.legendItem}>
            <div className={styles.legendColor} style={{ backgroundColor: '#FF5722' }} />
            <span>1-19%</span>
          </div>
          <div className={styles.legendItem}>
            <div className={styles.legendColor} style={{ backgroundColor: '#E0E0E0' }} />
            <span>未実施</span>
          </div>
        </div>
      </div>
    </div>
  );
};
