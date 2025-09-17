/**
 * カレンダーページ
 * リハビリテーション記録のカレンダー表示と記録詳細管理
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

import styles from './page.module.scss';
import Card from '@/components/layout/card';
import { Calendar } from '@/components/calendar/Calendar';

/**
 * カレンダーページコンポーネント
 */
export default function CalendarPage(): React.JSX.Element {
  const router = useRouter();

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
          title="今日の記録"
          description="今日の測定状況を表示します"
          role="未測定"
          width={400}
          height={211}
          isBlue={true}
        />

        {/* 改善率カード */}
        <Card
          title="今日の記録"
          description="今日の測定状況を表示します"
          role="未測定"
          width={400}
          height={211}
          isBlue={true}
        />
      </div>

      <div className={styles.rightContent}>
        <Calendar />
      </div>
    </div>
  );
}
