import { colors } from "@toss/tds-colors";
import { List, ListRow, Top } from "@toss/tds-mobile";
import { useState } from "react";
import { loadWorkoutState, totalSessionsInRoutine, loadSettings } from "../data";

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function dateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

type DayStatus = "none" | "partial" | "success" | "perfect";

export function CalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const workoutState = loadWorkoutState();
  const settings = loadSettings();
  const total = totalSessionsInRoutine(settings);

  function getDayStatus(key: string): DayStatus {
    const hours = workoutState.dailyHours[key];
    if (!hours || hours.length === 0) return "none";
    if (hours.length >= total && total > 0) return "perfect";
    if (hours.length >= 5) return "success";
    return "partial";
  }

  const statusColors: Record<DayStatus, string> = {
    none: "transparent",
    partial: colors.yellow200,
    success: colors.blue200,
    perfect: colors.blue500,
  };

  const statusTextColors: Record<DayStatus, string> = {
    none: colors.grey800,
    partial: colors.grey800,
    success: colors.blue600,
    perfect: "white",
  };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDow = getFirstDayOfWeek(year, month);

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
    setSelectedDate(null);
  };

  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
    setSelectedDate(null);
  };

  const handleDayTap = (key: string) => {
    setSelectedDate((prev) => prev === key ? null : key);
  };

  const selectedHours = selectedDate
    ? (workoutState.dailyHours[selectedDate] ?? [])
    : [];

  const monthNames = ["1월", "2월", "3월", "4월", "5월", "6월",
    "7월", "8월", "9월", "10월", "11월", "12월"];
  const dowLabels = ["일", "월", "화", "수", "목", "금", "토"];

  return (
    <div style={{ paddingBottom: "80px" }}>
      <Top
        title={<Top.TitleParagraph size={22}>기록</Top.TitleParagraph>}
        subtitleBottom={
          <Top.SubtitleParagraph size={17}>날짜를 탭하면 상세 기록을 볼 수 있어요.</Top.SubtitleParagraph>
        }
      />

      {/* 월 이동 헤더 */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 24px 8px",
      }}>
        <button
          onClick={prevMonth}
          style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", padding: "8px", borderRadius: 8 }}
        >
          ‹
        </button>
        <span style={{ fontSize: "17px", fontWeight: "bold", color: colors.grey800 }}>
          {year}년 {monthNames[month]}
        </span>
        <button
          onClick={nextMonth}
          style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", padding: "8px", borderRadius: 8 }}
        >
          ›
        </button>
      </div>

      {/* 요일 헤더 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", padding: "0 16px 4px" }}>
        {dowLabels.map((d, i) => (
          <div key={d} style={{
            textAlign: "center", fontSize: "12px",
            color: i === 0 ? colors.red500 : i === 6 ? colors.blue500 : colors.grey600,
            padding: "4px 0",
          }}>
            {d}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", padding: "0 16px", gap: "4px" }}>
        {Array.from({ length: firstDow }).map((_, i) => <div key={`pad-${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const key = dateKey(year, month, day);
          const status = getDayStatus(key);
          const isToday = key === dateKey(today.getFullYear(), today.getMonth(), today.getDate());
          const isSelected = selectedDate === key;

          return (
            <div
              key={key}
              onClick={() => handleDayTap(key)}
              style={{
                aspectRatio: "1",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: statusColors[status],
                color: statusTextColors[status],
                fontSize: "13px",
                fontWeight: isToday || isSelected ? "bold" : "normal",
                border: isToday ? `2px solid ${colors.blue500}` : isSelected ? `2px solid ${colors.grey400}` : "none",
                cursor: "pointer",
                userSelect: "none",
              }}
            >
              {day}
            </div>
          );
        })}
      </div>

      {/* 범례 */}
      <div style={{ display: "flex", gap: "12px", padding: "12px 24px", flexWrap: "wrap" }}>
        {[
          { color: colors.yellow200, text: "부분 달성", textColor: colors.grey800 },
          { color: colors.blue200, text: "5회 이상", textColor: colors.blue600 },
          { color: colors.blue500, text: "완벽한 하루", textColor: "white" },
        ].map(({ color, text, textColor }) => (
          <div key={text} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{ width: "16px", height: "16px", borderRadius: "4px", backgroundColor: color }} />
            <span style={{ fontSize: "12px", color: colors.grey600 }}>{text}</span>
          </div>
        ))}
      </div>

      {/* 선택된 날짜 상세 */}
      {selectedDate && (
        <List groupTitle={`${selectedDate} 기록`}>
          {selectedHours.length === 0 ? (
            <ListRow
              verticalPadding="large"
              contents={
                <ListRow.Texts
                  type="1RowTypeA"
                  top="이 날은 운동 기록이 없어요."
                  topProps={{ color: colors.grey500 }}
                />
              }
            />
          ) : (
            selectedHours.map((h) => (
              <ListRow
                key={h}
                verticalPadding="medium"
                contents={
                  <ListRow.Texts
                    type="1RowTypeA"
                    top={`${String(h).padStart(2, "0")}:00 스트레칭 완료`}
                    topProps={{ color: colors.grey800 }}
                  />
                }
                right={
                  <span style={{ fontSize: "18px" }}>✅</span>
                }
              />
            ))
          )}
        </List>
      )}
    </div>
  );
}
