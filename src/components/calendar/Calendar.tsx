'use client';

import style from './Calendar.module.scss';
import { FC, useEffect } from 'react';
import Image from 'next/image';
import { useCalendar } from './useCalendar';
import dayjs from 'dayjs';

type CalendarProps = {
  selectedDate?: string;
  onDateChange?: (date: string) => void;
  measuredDates?: Date[];
};

export const Calendar: FC<CalendarProps> = ({
  selectedDate: externalSelectedDate,
  onDateChange,
  measuredDates = [],
}) => {
  const {
    selectedMonth,
    selectedDate: internalSelectedDate,
    calenderData,
    handlePrevMonth,
    handleNextMonth,
    handleSelectDate: internalHandleSelectedDate,
  } = useCalendar(
    externalSelectedDate ? { initialDate: dayjs(externalSelectedDate) } : {}
  );

  useEffect(() => {
    if (
      externalSelectedDate &&
      !dayjs(externalSelectedDate).isSame(internalSelectedDate, 'day')
    ) {
      internalHandleSelectedDate(dayjs(externalSelectedDate));
    }
  }, [externalSelectedDate, internalSelectedDate, internalHandleSelectedDate]);

  // 日付選択
  const handleSelectDate = (date: dayjs.Dayjs) => {
    internalHandleSelectedDate(date);
    if (onDateChange) {
      onDateChange(date.format('YYYY-MM-DD'));
    }
  };

  const weekView = false;
  const now = dayjs();

  // 測定済みの日付をチェックする関数
  const isMeasuredDate = (date: dayjs.Dayjs) => {
    return measuredDates.some((measuredDate) =>
      date.isSame(dayjs(measuredDate), 'day')
    );
  };

  // 日付セルのクラス名を生成
  const getDateCellClasses = (date: dayjs.Dayjs) => {
    const classes = [style.day];

    if (date.isSame(now, 'day')) {
      classes.push(style.today);
    }

    if (date.month() !== selectedMonth.month()) {
      classes.push(style.outside);
    }

    // 測定済みの日付にmeasuredクラスを追加
    if (isMeasuredDate(date)) {
      classes.push(style.measured);
    }

    return classes.join(' ');
  };

  // 曜日ヘッダーのクラス名を生成
  const getWeekdayClasses = (index: number) => {
    const classes = [style.headerTh];

    if (index === 0) classes.push(style.sundayHeader);
    if (index === 6) classes.push(style.saturdayHeader);

    return classes.join(' ');
  };

  // 日付セルをレンダリング
  const renderDateCell = (date: dayjs.Dayjs, index: number) => (
    <td key={index} className={style.mainTh}>
      <button
        type="button"
        onClick={() => handleSelectDate(date)}
        className={getDateCellClasses(date)}
      >
        {date.date()}
      </button>
    </td>
  );

  // 月表示をレンダリング
  const renderMonthView = () =>
    calenderData.map((calendar, weekIndex) => (
      <tr key={weekIndex} className={style.mainCols}>
        {calendar.map(renderDateCell)}
      </tr>
    ));

  const weekdayLabels = ['日', '月', '火', '水', '木', '金', '土'];

  return (
    <div className={style.content}>
      <div className={style.header}>
        <div className={style.PrevNextMonthButton}>
          <button
            type="button"
            className={style.navButton}
            onClick={handlePrevMonth}
          >
            <Image src="/left.svg" alt="前の月" width={20} height={20} />
          </button>
          <button
            type="button"
            className={style.navButton}
            onClick={handleNextMonth}
          >
            <Image src="/right.svg" alt="次の月" width={20} height={20} />
          </button>
        </div>

        {/* 日にちを表示 */}
        <div className={style.headerLeft}>
          <span className={style.dateText}>
            {selectedMonth.format('YYYY')}
            <span className={style.dateSeparator}>年</span>
            {selectedMonth.format('M')}
            <span className={style.dateSeparator}>月</span>
            {internalSelectedDate.format('D')}
            <span className={style.dateSeparator}>日</span>
          </span>
        </div>
      </div>

      <table className={style.table}>
        <thead>
          <tr className={style.headerCols}>
            {weekdayLabels.map((day, index) => (
              <th key={index} className={getWeekdayClasses(index)}>
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{renderMonthView()}</tbody>
      </table>
    </div>
  );
};
