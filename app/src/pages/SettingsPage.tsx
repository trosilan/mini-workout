import { colors } from "@toss/tds-colors";
import {
  Button,
  List,
  ListRow,
  Switch,
  Top,
} from "@toss/tds-mobile";
import { requestNotificationAgreement } from "@apps-in-toss/web-framework";
import React, { useEffect, useRef, useState } from "react";

import {
  EXERCISES,
  loadSettings,
  saveSettings,
  type Settings,
} from "../data";

const NOTIFICATION_TEMPLATE_CODE = "short-workout-notice";

interface SettingsPageProps {
  onBack: () => void;
}

const TIME_OPTIONS = Array.from({ length: 24 }, (_, hour) => {
  const label = `${String(hour).padStart(2, "0")}:00`;
  return { value: label, label };
});

const OFFSET_VALUES = Array.from({ length: 12 }, (_, i) => i * 5); // 0~55분 (정각~55분)
const ITEM_WIDTH = 72; // px (버튼 너비 + gap)
const CLONE_COUNT = 3; // 앞뒤로 복제할 세트 수
const CLONED = [
  ...OFFSET_VALUES,
  ...OFFSET_VALUES,
  ...OFFSET_VALUES,
  ...OFFSET_VALUES,
  ...OFFSET_VALUES,
]; // 5세트 복제 (가운데가 진짜)

function InfiniteOffsetCarousel({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isScrolling = useRef(false);

  const getScrollLeft = (index: number) => {
    const el = scrollRef.current;
    const containerWidth = el ? el.offsetWidth : 0;
    return index * ITEM_WIDTH - containerWidth / 2 + (ITEM_WIDTH - 8) / 2;
  };

  const centerIndex = OFFSET_VALUES.length * CLONE_COUNT + OFFSET_VALUES.indexOf(value);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollLeft = getScrollLeft(centerIndex);
  }, []);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el || isScrolling.current) return;

    const containerWidth = el.offsetWidth;
    const centeredScrollLeft = el.scrollLeft + containerWidth / 2 - (ITEM_WIDTH - 8) / 2;
    const idx = Math.round(centeredScrollLeft / ITEM_WIDTH);
    const realIdx = ((idx % OFFSET_VALUES.length) + OFFSET_VALUES.length) % OFFSET_VALUES.length;
    const realValue = OFFSET_VALUES[realIdx];

    const min = ITEM_WIDTH * OFFSET_VALUES.length;
    const max = ITEM_WIDTH * OFFSET_VALUES.length * (CLONE_COUNT * 2);
    if (el.scrollLeft < min || el.scrollLeft > max) {
      isScrolling.current = true;
      const newCenter = OFFSET_VALUES.length * CLONE_COUNT + realIdx;
      el.scrollLeft = getScrollLeft(newCenter);
      isScrolling.current = false;
    }

    if (realValue !== value) onChange(realValue);
  };

  return (
    <div style={{ padding: "8px 24px 16px" }}>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{
          display: "flex",
          gap: "8px",
          overflowX: "auto",
          scrollbarWidth: "none",
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {CLONED.map((minutes, i) => {
          const selected = minutes === value;
          return (
            <button
              key={i}
              onClick={() => {
                onChange(minutes);
                const el = scrollRef.current;
                if (!el) return;
                const realIdx = OFFSET_VALUES.indexOf(minutes);
                const newCenter = OFFSET_VALUES.length * CLONE_COUNT + realIdx;
                el.scrollLeft = getScrollLeft(newCenter);
              }}
              style={{
                flexShrink: 0,
                width: `${ITEM_WIDTH - 8}px`,
                padding: "8px 0",
                borderRadius: "20px",
                border: `1.5px solid ${selected ? colors.blue500 : colors.grey200}`,
                backgroundColor: selected ? colors.blue500 : colors.white,
                color: selected ? colors.white : colors.grey700,
                fontSize: "14px",
                fontWeight: selected ? "bold" : "normal",
                cursor: "pointer",
                scrollSnapAlign: "center",
                transition: "background-color 0.15s, border-color 0.15s",
              }}
            >
              {minutes === 0 ? ":00" : `:${String(minutes).padStart(2, "0")}`}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function SettingsPage({ onBack }: SettingsPageProps) {
  const [settings, setSettings] = React.useState<Settings>(() => loadSettings());
  const [notifyAgreed, setNotifyAgreed] = useState(
    () => localStorage.getItem("jeongunwan.notifyAgreed") === "1"
  );

  const update = (next: Partial<Settings>) => {
    const merged = { ...settings, ...next };
    setSettings(merged);
    saveSettings(merged);
  };

  const selectExercise = (id: string) => {
    update({ enabledExerciseId: id });
  };

  const requestNotify = () => {
    try {
      const cleanup = requestNotificationAgreement({
        options: { templateCode: NOTIFICATION_TEMPLATE_CODE },
        onEvent: ({ type }) => {
          cleanup();
          if (type === "newAgreement" || type === "alreadyAgreed") {
            localStorage.setItem("jeongunwan.notifyAgreed", "1");
            setNotifyAgreed(true);
          }
        },
        onError: (e) => {
          cleanup();
          alert("알림 동의 요청에 실패했어요: " + String(e));
        },
      });
    } catch (e) {
      alert("이 환경에서는 알림 동의를 받을 수 없어요: " + String(e));
    }
  };

  return (
    <div style={{ paddingBottom: 80 }}>
      <Top
        title={<Top.TitleParagraph size={22}>설정</Top.TitleParagraph>}
        subtitleBottom={
          <Top.SubtitleParagraph size={17}>
            알림 시간과 스트레칭 종목을 설정해요.
          </Top.SubtitleParagraph>
        }
      />

      {/* 알림 동의 안 한 유저에게만 표시 — 동의하면 사라짐 */}
      {!notifyAgreed && (
        <List groupTitle="알림 받기">
          <ListRow
            verticalPadding="large"
            contents={
              <ListRow.Texts
                type="2RowTypeA"
                top="운동 알림 받기"
                topProps={{ color: colors.grey800, fontWeight: "bold" }}
                bottom="동의하면 설정한 시간에 알림을 받아요"
                bottomProps={{ color: colors.grey600 }}
              />
            }
            right={
              <Button size="small" variant="weak" onClick={requestNotify}>
                동의하기
              </Button>
            }
          />
        </List>
      )}

      <List groupTitle="알림 시간">
        <ListRow
          verticalPadding="large"
          contents={
            <ListRow.Texts
              type="2RowTypeA"
              top="시작 시간"
              topProps={{ color: colors.grey800, fontWeight: "bold" }}
              bottom={`매일 ${settings.notifyStart}부터 알려드려요`}
              bottomProps={{ color: colors.grey600 }}
            />
          }
          right={
            <select
              value={settings.notifyStart}
              onChange={(e) => {
                if (e.target.value !== settings.notifyEnd) update({ notifyStart: e.target.value });
              }}
              style={{
                fontSize: "15px",
                padding: "6px 10px",
                borderRadius: "8px",
                border: `1px solid ${colors.grey200}`,
              }}
            >
              {TIME_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          }
        />

        <ListRow
          verticalPadding="large"
          contents={
            <ListRow.Texts
              type="2RowTypeA"
              top="종료 시간"
              topProps={{ color: colors.grey800, fontWeight: "bold" }}
              bottom={`매일 ${settings.notifyEnd}까지 알려드려요`}
              bottomProps={{ color: colors.grey600 }}
            />
          }
          right={
            <select
              value={settings.notifyEnd}
              onChange={(e) => {
                if (e.target.value !== settings.notifyStart) update({ notifyEnd: e.target.value });
              }}
              style={{
                fontSize: "15px",
                padding: "6px 10px",
                borderRadius: "8px",
                border: `1px solid ${colors.grey200}`,
              }}
            >
              {TIME_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          }
        />
      </List>

      <List groupTitle="알림 요일">
        <ListRow
          verticalPadding="large"
          contents={
            <ListRow.Texts
              type="2RowTypeA"
              top="어떤 요일에 알림 받을까요?"
              topProps={{ color: colors.grey800, fontWeight: "bold" }}
              bottom={
                settings.enabledDays.length === 7
                  ? "매일"
                  : settings.enabledDays.length === 0
                  ? "없음"
                  : ["일", "월", "화", "수", "목", "금", "토"]
                      .filter((_, i) => settings.enabledDays.includes(i))
                      .join(", ")
              }
              bottomProps={{ color: colors.grey600 }}
            />
          }
        />
        <div style={{ display: "flex", gap: "8px", padding: "8px 24px 16px" }}>
          {["일", "월", "화", "수", "목", "금", "토"].map((label, day) => {
            const selected = settings.enabledDays.includes(day);
            return (
              <button
                key={day}
                onClick={() => {
                  const next = selected
                    ? settings.enabledDays.filter((d) => d !== day)
                    : [...settings.enabledDays, day].sort((a, b) => a - b);
                  if (next.length > 0) update({ enabledDays: next });
                }}
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  border: `1.5px solid ${selected ? colors.blue500 : colors.grey200}`,
                  backgroundColor: selected ? colors.blue500 : colors.white,
                  color: selected ? colors.white : colors.grey700,
                  fontSize: "14px",
                  fontWeight: selected ? "bold" : "normal",
                  cursor: "pointer",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </List>

      <List groupTitle="알림 타이밍">
        <ListRow
          verticalPadding="large"
          contents={
            <ListRow.Texts
              type="2RowTypeA"
              top="매 시간 몇 분에 알려드릴까요?"
              topProps={{ color: colors.grey800, fontWeight: "bold" }}
              bottom={
                settings.offsetMinutes === 0
                  ? "매 시간 정각에 알려드려요"
                  : `매 시간 ${settings.offsetMinutes}분에 알려드려요`
              }
              bottomProps={{ color: colors.grey600 }}
            />
          }
        />
        <InfiniteOffsetCarousel
          value={settings.offsetMinutes}
          onChange={(v) => update({ offsetMinutes: v })}
        />
      </List>

      <List groupTitle="스트레칭 종목">
        {EXERCISES.map((exercise) => {
          const isSelected = settings.enabledExerciseId === exercise.id;
          return (
            <ListRow
              key={exercise.id}
              verticalPadding="large"
              contents={
                <ListRow.Texts
                  type="2RowTypeA"
                  top={exercise.name}
                  topProps={{ color: colors.grey800, fontWeight: "bold" }}
                  bottom={exercise.target}
                  bottomProps={{ color: colors.grey600 }}
                />
              }
              right={
                <Switch
                  checked={isSelected}
                  disabled={false}
                  onChange={() => selectExercise(exercise.id)}
                />
              }
            />
          );
        })}
      </List>

      <div style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        padding: "12px 24px 40px",
        background: "#fff",
        borderTop: "1px solid #f0f0f0",
      }}>
        <Button display="full" size="large" onClick={onBack}>
          설정 완료
        </Button>
      </div>
    </div>
  );
}
