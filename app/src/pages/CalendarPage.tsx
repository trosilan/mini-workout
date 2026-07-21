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

const TAB_BAR_HEIGHT = 80;

export function CalendarPage() {
  const today = new Date();
  const todayKey = dateKey(today.getFullYear(), today.getMonth(), today.getDate());
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  // 진입 시 오늘 날짜가 바로 선택되어 상세가 보임
  const [selectedDate, setSelectedDate] = useState<string>(todayKey);

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

  // 월 이동 시: 오늘이 있는 달이면 오늘, 아니면 1일 선택
  const selectForMonth = (y: number, m: number) => {
    if (y === today.getFullYear() && m === today.getMonth()) {
      setSelectedDate(todayKey);
    } else {
      setSelectedDate(dateKey(y, m, 1));
    }
  };

  const prevMonth = () => {
    const y = month === 0 ? year - 1 : year;
    const m = month === 0 ? 11 : month - 1;
    setYear(y);
    setMonth(m);
    selectForMonth(y, m);
  };

  const nextMonth = () => {
    const y = month === 11 ? year + 1 : year;
    const m = month === 11 ? 0 : month + 1;
    setYear(y);
    setMonth(m);
    selectForMonth(y, m);
  };

  const selectedHours = [...(workoutState.dailyHours[selectedDate] ?? [])].sort((a, b) => a - b);

  const monthNames = ["1월", "2월", "3월", "4월", "5월", "6월",
    "7월", "8월", "9월", "10월", "11월", "12월"];
  const dowLabels = ["일", "월", "화", "수", "목", "금", "토"];

  const selectedLabel = (() => {
    const [, m, d] = selectedDate.split("-");
    return `${parseInt(m)}월 ${parseInt(d)}일`;
  })();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: `calc(100vh - ${TAB_BAR_HEIGHT}px)`,
        overflow: "hidden",
      }}
    >
      {/* ── 고정 영역: 헤더 + 달력 ── */}
      <div style={{ flexShrink: 0 }}>
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
            const isToday = key === todayKey;
            const isSelected = selectedDate === key;

            return (
              <div
                key={key}
                onClick={() => setSelectedDate(key)}
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
                  border: isSelected ? `2px solid ${colors.blue500}` : isToday ? `2px solid ${colors.blue200}` : "none",
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
        <div style={{ display: "flex", gap: "12px", padding: "12px 24px 4px", flexWrap: "wrap" }}>
          {[
            { color: colors.yellow200, text: "부분 달성" },
            { color: colors.blue200, text: "5회 이상" },
            { color: colors.blue500, text: "완벽한 하루" },
          ].map(({ color, text }) => (
            <div key={text} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{ width: "16px", height: "16px", borderRadius: "4px", backgroundColor: color }} />
              <span style={{ fontSize: "12px", color: colors.grey600 }}>{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── 스크롤 영역: 선택된 날짜의 기록 ── */}
      <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch", paddingBottom: 16 }}>
        <List groupTitle={`${selectedLabel} 기록${selectedHours.length > 0 ? ` (${selectedHours.length}회)` : ""}`}>
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
      </div>
    </div>
  );
}
