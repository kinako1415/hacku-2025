'use client';

import React, { useState, useEffect } from 'react';
import styles from './page.module.scss';
import Card from '@/components/layout/card';
import { Calendar } from '@/components/calendar/Calendar';
import { db } from '@/lib/database/measurement-db'; // DBをインポート

import dayjs from 'dayjs';
import { is } from 'zod/locales';

/**
 * カレンダーページコンポーネント
 */
export default function CalendarPage(): React.JSX.Element {
  const [measuredDates, setMeasuredDates] = useState<Date[]>([]);

  useEffect(() => {
    const fetchMeasuredDates = async () => {
      try {
        const sessions = await db.getSessions();
        const dates = sessions
          .filter((session) => session.isCompleted && session.endTime)
          .map((session) => new Date(session.endTime!));
        setMeasuredDates(dates);
      } catch (error) {
        console.error('測定日の取得に失敗しました:', error);
      }
    };

    fetchMeasuredDates();
  }, []);

  const newestDate = measuredDates
    .slice() // 元の配列を変更しないためコピー
    .sort((a, b) => b.getTime() - a.getTime())[0];

  const isTodayMeasured = newestDate
    ? dayjs(newestDate).isSame(dayjs(), 'day')
    : false;

  console.log(isTodayMeasured);

  return (
    <div className={styles.calendarPage}>
      <div className={styles.leftSidebar}>
        {/* 今日の記録カード */}
        <Card
          title="今日の記録"
          description="今日の測定状況を表示します"
          role={isTodayMeasured ? '測定済' : '未測定'}
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
        <Calendar measuredDates={measuredDates} />
      </div>
    </div>
  );
}
