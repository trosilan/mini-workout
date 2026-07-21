import { colors } from "@toss/tds-colors";
import { Button, Top } from "@toss/tds-mobile";
import { useEffect, useState } from "react";
import {
  EXERCISES,
  getHoursInRoutine,
  getTodayHours,
  isCurrentHourDone,
  loadSettings,
  totalSessionsInRoutine,
} from "../data";
import { fetchFriendsToday, sendPoke, type FriendToday } from "../supabase";

interface HomePageProps {
  onStartWorkout: () => void;
  onEditSettings: () => void;
  onOpenSettings: () => void;
  onOpenTimer: () => void;
  onOpenReward: () => void;
  userKey?: string | null;
}

function formatHourLabel(h: number): string {
  if (h < 12) return `오전 ${h}시`;
  if (h === 12) return "오후 12시";
  return `오후 ${h - 12}시`;
}

function friendRoutineHours(f: FriendToday): number[] {
  const hours: number[] = [];
  if (f.routineStart === f.routineEnd) return hours;
  if (f.routineStart < f.routineEnd) {
    for (let h = f.routineStart; h < f.routineEnd; h++) hours.push(h);
  } else {
    for (let h = f.routineStart; h < 24; h++) hours.push(h);
    for (let h = 0; h < f.routineEnd; h++) hours.push(h);
  }
  return hours;
}

export function HomePage({ onStartWorkout, onEditSettings, onOpenSettings, onOpenTimer, onOpenReward, userKey }: HomePageProps) {
  const [friendsToday, setFriendsToday] = useState<FriendToday[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<FriendToday | null>(null);
  const [pokeBusy, setPokeBusy] = useState(false);

  useEffect(() => {
    if (userKey) {
      fetchFriendsToday(userKey).then(setFriendsToday);
    }
  }, [userKey]);

  const handlePoke = async () => {
    if (!userKey || !selectedFriend) return;
    setPokeBusy(true);
    try {
      const r = await sendPoke(userKey, selectedFriend.user_key);
      if (r === "ok") {
        alert(`${selectedFriend.nickname}님을 콕 찔렀어요! 곧 알림이 가요 👉`);
      } else if (r === "already") {
        alert("이번 시간에는 이미 찔렀어요. 다음 시간에 또 찔러보세요!");
      } else {
        alert("찌르기에 실패했어요. 잠시 후 다시 시도해주세요.");
      }
    } finally {
      setPokeBusy(false);
    }
  };

  const settings = loadSettings();
  const todayHours = getTodayHours();
  const routineHours = getHoursInRoutine(settings);
  const total = totalSessionsInRoutine(settings);
  const done = todayHours.length;

  const enabledExercises = EXERCISES.filter((e) =>
    e.id === settings.enabledExerciseId,
  );

  const startHour = parseInt(settings.notifyStart.split(":")[0]);
  const endHour = parseInt(settings.notifyEnd.split(":")[0]);

  const now = new Date();
  const currentHour = now.getHours();
  const currentDay = now.getDay();
  const isEnabledDay = settings.enabledDays.includes(currentDay);
  const isWorkoutTime = isEnabledDay && (
    startHour < endHour
      ? currentHour >= startHour && currentHour < endHour
      : currentHour >= startHour || currentHour < endHour
  );
  const alreadyDoneThisHour = isCurrentHourDone();

  const labelInterval = 1;

  type BarStatus = "done" | "missed" | "upcoming";
  const getBarStatus = (h: number): BarStatus => {
    if (todayHours.includes(h)) return "done";
    if (h < currentHour) return "missed";
    return "upcoming";
  };

  return (
    <div style={{ overflowY: "auto", flex: 1 }}>
      {/* 헤더 */}
      <Top
        upperGap={28}
        lowerGap={0}
        title={
          <Top.TitleParagraph size={22}>
            {isWorkoutTime ? "오늘도 스트레칭 해볼까요?" : "오늘도 수고했어요"}
          </Top.TitleParagraph>
        }
      />

      {/* 내 운동 섹션 헤더 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 20px 12px",
        }}
      >
        <span style={{ fontSize: 17, fontWeight: "bold", color: colors.grey900 }}>
          내 운동
        </span>
        <button
          onClick={onOpenSettings}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            fontSize: 14,
            color: colors.blue500,
            cursor: "pointer",
            fontWeight: 500,
            borderRadius: 8,
          }}
        >
          편집
        </button>
      </div>

      {/* 2열 카드 그리드 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          padding: "0 20px",
          alignItems: "stretch",
        }}
      >
        {/* 시간 카드 */}
        <div
          style={{
            padding: "16px 12px",
            backgroundColor: colors.grey100,
            borderRadius: 12,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
          }}
        >
          <img
            src="https://static.toss.im/icons/png/4x/icon-clock-10-hour.png"
            width={40}
            height={40}
            alt=""
            style={{ marginBottom: 6 }}
          />
          <span style={{ fontSize: 15, fontWeight: 500, color: colors.grey900 }}>
            {formatHourLabel(startHour)}부터
          </span>
          <span style={{ fontSize: 15, fontWeight: 500, color: colors.grey900 }}>
            {formatHourLabel(endHour)}까지
          </span>
        </div>

        {/* 운동 카드 */}
        <div
          style={{
            padding: "16px 12px",
            backgroundColor: colors.grey100,
            borderRadius: 12,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
          }}
        >
          <img
            src="https://static.toss.im/icons/png/4x/icon-arm-muscle-skin.png"
            width={40}
            height={40}
            alt=""
            style={{ marginBottom: 6 }}
          />
          {enabledExercises.length === 0 ? (
            <span style={{ fontSize: 15, fontWeight: 500, color: colors.grey900, textAlign: "center" }}>
              미설정
            </span>
          ) : (
            <>
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 500,
                  color: colors.grey900,
                  textAlign: "center",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: "100%",
                }}
              >
                {enabledExercises[0].name}
              </span>
              {enabledExercises.length > 1 && (
                <span style={{ fontSize: 15, fontWeight: 500, color: colors.grey900, textAlign: "center" }}>
                  외 {enabledExercises.length - 1}개
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* 구분선 */}
      <div style={{ height: 1, backgroundColor: colors.grey100, margin: "20px 0" }} />

      {/* 오늘 운동 기록 헤더 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px 12px",
        }}
      >
        <span style={{ fontSize: 17, fontWeight: "bold", color: colors.grey900 }}>
          오늘 운동 기록
        </span>
        <span style={{ fontSize: 14, color: colors.grey500 }}>
          {done}/{total}회
        </span>
      </div>

      {/* 커스텀 막대 차트 */}
      <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        {routineHours.length === 0 ? (
          <p style={{ fontSize: 14, color: colors.grey500, textAlign: "center", padding: "20px 0" }}>
            루틴 시간을 설정해주세요
          </p>
        ) : (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, padding: "8px 20px 0", width: "max-content" }}>
            {routineHours.map((h, i) => {
              const status = getBarStatus(h);
              const showLabel = i % labelInterval === 0;
              return (
                <div key={h} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 36 }}>
                  {/* 상단 아이콘 */}
                  <div style={{ height: 18, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>
                    {status === "done" && <span style={{ color: colors.green500 }}>✓</span>}
                    {status === "missed" && <span style={{ color: colors.grey400 }}>✕</span>}
                  </div>
                  {/* 막대 */}
                  <div
                    style={{
                      width: 28,
                      height: 80,
                      borderRadius: 6,
                      overflow: "hidden",
                      position: "relative",
                      backgroundColor:
                        status === "done" ? colors.green500 :
                        status === "missed" ? colors.grey200 :
                        "transparent",
                      border: status === "upcoming" ? `1.5px dashed ${colors.grey300}` : "none",
                    }}
                  />
                  {/* X축 라벨 */}
                  <div style={{ fontSize: 11, color: colors.grey500, marginTop: 4, whiteSpace: "nowrap" }}>
                    {showLabel ? `${h}시` : ""}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 오늘 친구들은 */}
      {friendsToday.length > 0 && (
        <>
          <div style={{ height: 1, backgroundColor: colors.grey100, margin: "20px 0" }} />
          <div style={{ padding: "0 20px 12px" }}>
            <span style={{ fontSize: 17, fontWeight: "bold", color: colors.grey900 }}>
              오늘 친구들은
            </span>
          </div>
          <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            <div style={{ display: "flex", gap: 10, padding: "0 20px 4px", width: "max-content" }}>
              {friendsToday.map((f) => (
                <button
                  key={f.user_key}
                  onClick={() => setSelectedFriend(f)}
                  style={{
                    width: 110,
                    padding: "14px 12px",
                    borderRadius: 12,
                    border: "none",
                    background: colors.grey100,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: 20,
                      fontWeight: "bold",
                      color: f.isRestDay
                        ? colors.grey400
                        : f.doneHours.length > 0
                        ? colors.blue600
                        : colors.grey600,
                    }}
                  >
                    {f.isRestDay ? "휴식" : `${f.doneHours.length}/${f.planned}`}
                  </p>
                  <p
                    style={{
                      margin: "4px 0 0",
                      fontSize: 13,
                      color: colors.grey700,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {f.nickname}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* 친구 상세 팝업 */}
      {selectedFriend && (
        <div
          onClick={() => setSelectedFriend(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", maxWidth: 340, background: "#fff", borderRadius: 16, padding: 20 }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <span style={{ fontSize: 18, fontWeight: "bold", color: colors.grey900 }}>
                {selectedFriend.nickname}
              </span>
              <button
                onClick={() => setSelectedFriend(null)}
                style={{ background: "none", border: "none", fontSize: 18, color: colors.grey500, cursor: "pointer" }}
              >
                ✕
              </button>
            </div>
            <p style={{ margin: "0 0 12px", fontSize: 13, color: colors.grey500 }}>
              {selectedFriend.isRestDay
                ? "오늘은 쉬는 날이에요"
                : `오늘 ${selectedFriend.doneHours.length}/${selectedFriend.planned}회 완료`}
            </p>

            {/* 친구의 오늘 시간대 차트 */}
            {!selectedFriend.isRestDay && (
              <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", marginBottom: 16 }}>
                <div style={{ display: "flex", gap: 4, width: "max-content", paddingBottom: 4 }}>
                  {friendRoutineHours(selectedFriend).map((h) => {
                    const isDone = selectedFriend.doneHours.includes(h);
                    const isPast = h < new Date().getHours();
                    return (
                      <div key={h} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 30 }}>
                        <div
                          style={{
                            width: 22,
                            height: 48,
                            borderRadius: 5,
                            backgroundColor: isDone
                              ? colors.green500
                              : isPast
                              ? colors.grey200
                              : "transparent",
                            border: !isDone && !isPast ? `1.5px dashed ${colors.grey300}` : "none",
                          }}
                        />
                        <span style={{ fontSize: 10, color: colors.grey500, marginTop: 3 }}>{h}시</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <Button display="full" size="large" onClick={handlePoke} disabled={pokeBusy}>
              {pokeBusy ? "찌르는 중..." : "👉 콕 찌르기"}
            </Button>
            <p style={{ margin: "8px 0 0", fontSize: 11, color: colors.grey400, textAlign: "center" }}>
              찌르면 친구에게 운동 독려 알림이 가요 (시간당 1번)
            </p>
          </div>
        </div>
      )}

      {/* 스트레칭 버튼 고정 영역 확보 */}
      <div style={{ height: 120 }} />

      {/* 스트레칭 버튼 (fixed) */}
      <div style={{ position: "fixed", bottom: 100, left: 20, right: 20, zIndex: 10 }}>
        <Button
          display="full"
          size="xlarge"
          onClick={isWorkoutTime && !alreadyDoneThisHour ? onStartWorkout : undefined}
          disabled={!isWorkoutTime || alreadyDoneThisHour}
        >
          {!isWorkoutTime
            ? "지금은 스트레칭 시간이 아니에요"
            : alreadyDoneThisHour
            ? "이번 시간 스트레칭 완료!"
            : "지금 스트레칭 하기"}
        </Button>
      </div>
    </div>
  );
}
