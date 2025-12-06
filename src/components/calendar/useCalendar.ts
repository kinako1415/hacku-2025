import dayjs from "dayjs";
import ja from "dayjs/locale/ja";
import React, { useState, useMemo, useCallback } from "react";

dayjs.locale(ja);

export const useCalendar = (options?: { initialDate?: dayjs.Dayjs }) => {
  const { initialDate } = options || {};
  const [selectedMonth, setSelectedMonth] = useState(initialDate || dayjs());
  const [selectedDate, setSelectedDate] = useState(initialDate || dayjs());

  React.useEffect(() => {
    if (initialDate && !initialDate.isSame(selectedDate, "day")) {
      setSelectedDate(initialDate);
      setSelectedMonth(initialDate);
    }
  }, [initialDate]);

  // 前月に移動（月表示も更新）
  const handlePrevMonth = useCallback(() => {
    const newMonth = selectedMonth.subtract(1, "month");
    setSelectedMonth(newMonth);

    // 選択日も前月の同じ日に移動（存在しない場合は月末）
    const currentDay = selectedDate.date();
    const lastDayOfPrevMonth = newMonth.daysInMonth();
    const targetDay = Math.min(currentDay, lastDayOfPrevMonth);
    const newDate = newMonth.date(targetDay);

    setSelectedDate(newDate);
  }, [selectedMonth, selectedDate]);

  // 次月に移動（月表示も更新）
  const handleNextMonth = useCallback(() => {
    const newMonth = selectedMonth.add(1, "month");
    setSelectedMonth(newMonth);

    // 選択日も次月の同じ日に移動（存在しない場合は月末）
    const currentDay = selectedDate.date();
    const lastDayOfNextMonth = newMonth.daysInMonth();
    const targetDay = Math.min(currentDay, lastDayOfNextMonth);
    const newDate = newMonth.date(targetDay);

    setSelectedDate(newDate);
  }, [selectedMonth, selectedDate]);
  

  // 表示している月の日数を取得
  const daysInMonth = selectedMonth.daysInMonth();
  // 表示している月の年を取得
  const selectedYear = selectedMonth.year();

  // 表示している月の日数分配列を作成する
  const selectedMonthDateList = Array.from({ length: daysInMonth }, (_, i) =>
    selectedMonth.startOf("month").add(i, "day")
  );

  // 日付を選択したときの処理
  const handleSelectDate = useCallback(
    (date: dayjs.Dayjs) => {
      setSelectedDate(date);

      // 選択した日が別の月の場合、月も更新
      if (!date.isSame(selectedMonth, "month")) {
        setSelectedMonth(date);
      }
    },
    [selectedMonth]
  );

  // 表示している月の初日の曜日を取得
  const selectedMonthStartDay = selectedMonth.startOf("month").day();

  // 表示している月の最後の曜日を取得
  const selectedMonthEndDay = selectedMonth.endOf("month").day();

  // 表示している月の最初の日の曜日と、日曜日までの差を計算し、その差の数だけ前月の日を取得
  const prevMonthDateList = Array.from({ length: selectedMonthStartDay }, (_, i) =>
    selectedMonth.startOf("month").subtract(i + 1, "day")
  ).reverse();
  //.reverse()並びを日付の昇順

  // 日曜日基準なので、週の最後の曜日（土曜日）を表す6を定義
  const LAST_DAY_OF_WEEK_INDEX = 6;

  // 表示している月の最終日の曜日と、土曜日までの差を計算し、その差の数だけ次月の日を取得
  const nextMonthDateList = Array.from(
    {
      length: LAST_DAY_OF_WEEK_INDEX - selectedMonthEndDay,
    },
    (_, i) => selectedMonth.endOf("month").add(i + 1, "day")
  );
  //曜日始まり 週を取得
  const selectedWeekList = useMemo(() => {
    const weekStart = selectedDate.startOf("week");
    return Array.from({ length: 7 }, (_, i) => weekStart.add(i, "day"));
  }, [selectedDate]);

  // 前月、当月、次月の日付を結合し、週ごとに分ける
  const calenderData = useMemo(() => {
    const weeklyCalendarData = Object.values(
      [...prevMonthDateList, ...selectedMonthDateList, ...nextMonthDateList].reduce(
        (acc, date, index) => {
          const weekIndex = Math.floor(index / 7);

          return {
            ...acc,
            [weekIndex]: [...(acc[weekIndex] ?? []), date],
          };
        },
        [] as dayjs.Dayjs[][]
      )
    );

    return weeklyCalendarData;
  }, [prevMonthDateList, selectedMonthDateList, nextMonthDateList]);

  return {
    selectedYear,
    selectedMonth,
    selectedDate,
    setSelectedDate,
    calenderData,
    selectedWeekList,
    handlePrevMonth,
    handleNextMonth,
    handleSelectDate,
  };
};
