'use client';

import React, { useState, useEffect } from 'react';
import styles from './page.module.scss';
import Card from '@/components/layout/card';
import { Calendar } from '@/components/calendar/Calendar';
import { db as measurementDb } from '@/lib/database/measurement-db';
import dayjs from 'dayjs';
import { useAtom } from 'jotai';
import {
  rightHandImprovementRateAtom,
  leftHandImprovementRateAtom,
} from '@/atom/improvement';
/**
 * カレンダーページコンポーネント
 */
export default function CalendarPage(): React.JSX.Element {
  const [measuredDates, setMeasuredDates] = useState<Date[]>([]);

  const [rightHandImprovementRate] = useAtom(rightHandImprovementRateAtom);
  const [leftHandImprovementRate] = useAtom(leftHandImprovementRateAtom);

  useEffect(() => {
    const fetchMeasuredDates = async () => {
      try {
        const sessions = await measurementDb.getSessions();
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

  useEffect(() => {
    // スクロール禁止
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const newestDate = measuredDates
    .slice() // 元の配列を変更しないためコピー
    .sort((a, b) => b.getTime() - a.getTime())[0];

  const isTodayMeasured = newestDate
    ? dayjs(newestDate).isSame(dayjs(), 'day')
    : false;

  const uniqueDays = new Set(
    measuredDates.map((date) => dayjs(date).format('YYYY-MM-DD'))
  );

  // 月ごとの件数を集計
  const monthCount: { [month: string]: number } = {};
  uniqueDays.forEach((dayStr) => {
    const month = dayStr.slice(5, 7); // 'YYYY-MM-DD'からMMだけ抜き出し
    monthCount[month] = (monthCount[month] || 0) + 1;
  });

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
          role={monthCount[dayjs().format('MM')] || 0}
          width={400}
          height={211}
        />

        {/* 改善率カード */}
        <Card
          description="改善率"
          role={`${rightHandImprovementRate.toFixed(2)}%`}
          left={`${leftHandImprovementRate.toFixed(2)}%`}
          width={400}
          height={211}
          isImprovements={true}
        />
      </div>

      <div className={styles.rightContent}>
        <Calendar measuredDates={measuredDates} />
      </div>
    </div>
  );
}
