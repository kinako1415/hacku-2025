/**
 * カレンダーページ
 * リハビリテーション記録のカレンダー表示と記録詳細管理
 */

import React from 'react';

import styles from './page.module.scss';
import Card from '@/components/layout/card';
import { Calendar } from '@/components/calendar/Calendar';

/**
 * カレンダーページコンポーネント
 */
export default function CalendarPage(): React.JSX.Element {
  return (
    <div className={styles.calendarPage}>
      <div className={styles.leftSidebar}>
        {/* 今日の記録カード */}
        <Card
          title="今日の記録"
          description="今日の測定状況を表示します"
          role="未測定"
          width={400}
          height={211}
          isBlue={true}
        />

        {/* 今月の記録カード */}
        <Card
          title="今月の記録"
          description="今月の測定回数を表示します"
          role="３回"
          width={400}
          height={211}
        />

        {/* 改善率カード */}
        <Card
          title="改善率"
          description="過去の記録と比較して、どの程度改善が見られているかをパーセンテージで示します。"
          role="１０％"
          width={400}
          height={211}
        />
      </div>

      <div className={styles.rightContent}>
        <Calendar />
      </div>
    </div>
  );
}
