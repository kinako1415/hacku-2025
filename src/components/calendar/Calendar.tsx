'use client';

import style from './Calendar.module.scss';
import { FC, useEffect, useState } from 'react';
import Image from 'next/image';
import { useCalendar } from './useCalendar';
import dayjs from 'dayjs';

// 仮　型定義とデータ
interface User {
  id: string;
  name: string;
  avatar?: string;
}

interface ChatRoom {
  id: string;
  name: string;
}

interface YohakuParticipant extends User {
  joinedAt: Date;
}

interface Yohaku {
  yohakuId: string;
  title: string;
  startDate: Date;
  endDate: Date;
  author: User;
  participants: YohakuParticipant[];
  chatRoom: ChatRoom;
  place: string;
  createdAt: Date;
}

type CalendarProps = {
  yohakus?: Yohaku[];
  selectedDate?: string;
  onDateChange?: (date: string) => void;
};

export const Calendar: FC<CalendarProps> = ({
  selectedDate: externalSelectedDate,
  onDateChange,
}) => {
  const {
    selectedMonth,
    selectedDate: internalSelectedDate,
    calenderData,
    selectedWeekList,
    handlePrevMonth,
    handleNextMonth,
    handleSelectDate: internalHandleSelectedDate,
  } = useCalendar(
    externalSelectedDate ? { initialDate: dayjs(externalSelectedDate) } : {}
  );

  // 現在の月かどうかを判定
  const isCurrentMonth = internalSelectedDate.isSame(dayjs(), 'month');

  useEffect(() => {
    if (
      externalSelectedDate &&
      !dayjs(externalSelectedDate).isSame(internalSelectedDate, 'day')
    ) {
      internalHandleSelectedDate(dayjs(externalSelectedDate));
    }
  }, [externalSelectedDate, internalSelectedDate, internalHandleSelectedDate]);

  const handleSelectDate = (date: dayjs.Dayjs) => {
    internalHandleSelectedDate(date);
    if (onDateChange) {
      const formattedDate = date.format('YYYY-MM-DD');
      onDateChange(formattedDate);
    }
  };

  // 前月移動
  const internalHandlePrevMonth = () => {
    handlePrevMonth();

    // 前月移動後の新しい日付を外部に通知
    setTimeout(() => {
      if (onDateChange) {
        const newMonth = selectedMonth.subtract(1, 'month');
        const currentDay = internalSelectedDate.date();
        const lastDayOfPrevMonth = newMonth.daysInMonth();
        const targetDay = Math.min(currentDay, lastDayOfPrevMonth);
        const newDate = newMonth.date(targetDay);

        onDateChange(newDate.format('YYYY-MM-DD'));
      }
    }, 0);
  };

  // 次月移動
  const internalHandleNextMonth = () => {
    handleNextMonth();

    // 次月移動後の新しい日付を外部に通知
    setTimeout(() => {
      if (onDateChange) {
        const newMonth = selectedMonth.add(1, 'month');
        const currentDay = internalSelectedDate.date();
        const lastDayOfNextMonth = newMonth.daysInMonth();
        const targetDay = Math.min(currentDay, lastDayOfNextMonth);
        const newDate = newMonth.date(targetDay);

        onDateChange(newDate.format('YYYY-MM-DD'));
      }
    }, 0);
  };

  const weekView = false;
  const now = dayjs();

  return (
    <div className={style.content}>
      <div className={style.header}>
        <div className={style.PrevNextMonthButton}>
          <button
            type="button"
            className={style.navButton}
            onClick={internalHandlePrevMonth}
          >
            <Image src="/left.svg" alt="前の月" width={20} height={20} />
          </button>
          <button
            type="button"
            className={style.navButton}
            onClick={internalHandleNextMonth}
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
            {['日', '月', '火', '水', '木', '金', '土'].map((day, index) => (
              <th
                key={index}
                className={`
								${style.headerTh}
								${index === 0 ? style.sundayHeader : ''}
								${index === 6 ? style.saturdayHeader : ''}
								`}
              >
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weekView ? (
            <tr className={style.mainCols}>
              {selectedWeekList.map((date, index) => (
                <td key={index} className={style.mainTh}>
                  <button
                    type="button"
                    onClick={() => handleSelectDate(date)}
                    className={`
											${style.day} 
											${date.isSame(internalSelectedDate, 'day') ? style.selectedDay : ''}
                      ${date.isSame(now, 'day') ? style.selectedToDay : ''}
											${date.month() !== selectedMonth.month() ? style.outside : ''}
                      `}
                  >
                    {date.date()}
                  </button>
                </td>
              ))}
            </tr>
          ) : (
            calenderData.map((calendar, index) => (
              <tr key={index} className={style.mainCols}>
                {calendar.map((date, index) => (
                  <td key={index} className={style.mainTh}>
                    <button
                      type="button"
                      onClick={() => handleSelectDate(date)}
                      className={`
                        ${style.day} 
                        ${date.isSame(internalSelectedDate, 'day') ? style.selectedDay : ''}
                        ${date.isSame(now, 'day') ? style.selectedToDay : ''}
                        ${date.month() !== selectedMonth.month() ? style.outside : ''}
                        ${date.isSame(now, 'day') ? style.measured : ''}
                    `}
                    >
                      {date.date()}
                    </button>
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};
