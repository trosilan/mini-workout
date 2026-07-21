import { colors } from "@toss/tds-colors";
import { Button, ProgressBar, TextField, Top } from "@toss/tds-mobile";
import { useState, useRef, useEffect } from "react";
import { appLogin, requestNotificationAgreement } from "@apps-in-toss/web-framework";
import { EXERCISES, DEFAULT_SETTINGS, getOrCreateNickname, saveSettings, type Settings } from "../data";
import { isNicknameTaken } from "../supabase";

interface OnboardingPageProps {
  onComplete: () => void;
  onCancel?: () => void;
  onLoginDone?: () => void;
}

type Step = 1 | 1.5 | 1.7 | 2 | 3 | 4 | 5 | 6;

function getSessionCount(start: string, end: string): number {
  const [sh] = start.split(":").map(Number);
  const [eh] = end.split(":").map(Number);
  return Math.max(0, eh - sh + 1);
}

// 드럼 스크롤 피커 컴포넌트
function DrumPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}:00`);
  const ITEM_HEIGHT = 52;
  const VISIBLE = 5;
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedIndex = hours.indexOf(value);

  useEffect(() => {
    const idx = hours.indexOf(value);
    if (idx >= 0) {
      containerRef.current?.scrollTo({ top: idx * ITEM_HEIGHT, behavior: "instant" });
    }
  }, []);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollTop / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(hours.length - 1, idx));
    if (hours[clamped] !== value) onChange(hours[clamped]);
  };

  const handleClick = (idx: number) => {
    onChange(hours[idx]);
    containerRef.current?.scrollTo({ top: idx * ITEM_HEIGHT, behavior: "smooth" });
  };

  return (
    <div style={{ position: "relative", height: ITEM_HEIGHT * VISIBLE, overflow: "hidden" }}>
      <div
        ref={containerRef}
        onScroll={handleScroll}
        style={{
          height: "100%",
          overflowY: "scroll",
          scrollSnapType: "y mandatory",
          paddingTop: ITEM_HEIGHT * 2,
          paddingBottom: ITEM_HEIGHT * 2,
          scrollbarWidth: "none",
          position: "relative",
          zIndex: 3,
        }}
      >
        {hours.map((h, idx) => (
          <div
            key={h}
            onClick={() => handleClick(idx)}
            style={{
              height: ITEM_HEIGHT,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              scrollSnapAlign: "center",
              fontSize: idx === selectedIndex ? 22 : 17,
              fontWeight: idx === selectedIndex ? "bold" : 500,
              color: idx === selectedIndex ? colors.grey800 : colors.grey400,
              cursor: "pointer",
              transition: "all 0.15s",
              userSelect: "none",
              position: "relative",
              zIndex: 3,
            }}
          >
            {h.replace(":00", "시")}
          </div>
        ))}
      </div>
      {/* 선택 영역 하이라이트 */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "100%",
          height: ITEM_HEIGHT,
          background: colors.grey100,
          borderRadius: 12,
          pointerEvents: "none",
          zIndex: 1,
        }}
      />
      {/* 위 아래 페이드 */}
      <div
        style={{
          position: "absolute",
          top: 0, left: 0, right: 0,
          height: ITEM_HEIGHT * 2,
          background: "linear-gradient(to bottom, white 40%, transparent)",
          zIndex: 2,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 0, left: 0, right: 0,
          height: ITEM_HEIGHT * 2,
          background: "linear-gradient(to top, white 40%, transparent)",
          zIndex: 2,
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

export function OnboardingPage({ onComplete, onCancel, onLoginDone }: OnboardingPageProps) {
  const [step, setStep] = useState<Step>(1);
  const [settings, setSettings] = useState<Settings>({ ...DEFAULT_SETTINGS, enabledExerciseId: "" });
  const [loginLoading, setLoginLoading] = useState(false);
  const [doneLoading, setDoneLoading] = useState(false);
  const agreementCleanupRef = useRef<(() => void) | null>(null);

  const update = (next: Partial<Settings>) =>
    setSettings((prev) => ({ ...prev, ...next }));

  const sessionCount = getSessionCount(settings.notifyStart, settings.notifyEnd);

  const handleDone = () => {
    if (doneLoading) return; // 연타 방지
    saveSettings(settings);
    setDoneLoading(true);

    // 알림 동의 요청 (콘솔 발송 코드와 동일)
    const NOTIFICATION_TEMPLATE_CODE = "short-workout-push";
    let finished = false;
    const finishOnce = (agreed: boolean) => {
      if (finished) return;
      finished = true;
      try {
        agreementCleanupRef.current?.();
      } catch { /* ignore */ }
      agreementCleanupRef.current = null;
      if (agreed) localStorage.setItem("jeongunwan.notifyAgreed", "1");
      setDoneLoading(false);
      onComplete();
    };

    // SDK가 응답을 안 주는 경우에도 12초 후 온보딩은 계속 진행
    const timer = setTimeout(() => finishOnce(false), 12000);

    try {
      // 이전 리스너가 남아있으면 정리 (중복 등록 방지)
      try {
        agreementCleanupRef.current?.();
      } catch { /* ignore */ }

      agreementCleanupRef.current = requestNotificationAgreement({
        options: { templateCode: NOTIFICATION_TEMPLATE_CODE },
        onEvent: ({ type }) => {
          clearTimeout(timer);
          finishOnce(type === "newAgreement" || type === "alreadyAgreed");
        },
        onError: (e) => {
          clearTimeout(timer);
          console.error("[onboarding] 알림 동의 요청 실패:", e);
          finishOnce(false);
        },
      });
    } catch (e) {
      clearTimeout(timer);
      console.error("[onboarding] 알림 동의 호출 불가:", e);
      finishOnce(false);
    }
  };

  const handleTossLogin = async () => {
    setLoginLoading(true);
    try {
      const { authorizationCode } = await appLogin();
      localStorage.setItem("jeongunwan.authCode", authorizationCode);
      onLoginDone?.();
      setStep(1.7);
    } catch (e) {
      alert("로그인 오류: " + String(e));
    } finally {
      setLoginLoading(false);
    }
  };

  // 닉네임 스텝 상태
  const [nickInput, setNickInput] = useState(() => getOrCreateNickname());
  const [nickError, setNickError] = useState<string | null>(null);
  const [nickChecking, setNickChecking] = useState(false);

  const handleNicknameNext = async () => {
    const trimmed = nickInput.trim();
    if (!trimmed) return;
    setNickChecking(true);
    setNickError(null);
    try {
      const mine = localStorage.getItem("jeongunwan.nickname");
      if (trimmed !== mine) {
        const taken = await isNicknameTaken(trimmed);
        if (taken) {
          setNickError("이미 사용 중인 닉네임이에요.");
          return;
        }
      }
      localStorage.setItem("jeongunwan.nickname", trimmed);
      setStep(2);
    } catch {
      // 네트워크 오류 시에도 온보딩은 계속 (로컬 저장)
      localStorage.setItem("jeongunwan.nickname", trimmed);
      setStep(2);
    } finally {
      setNickChecking(false);
    }
  };

  // Step 1: 인트로
  if (step === 1) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#fff" }}>
        <div style={{ flex: 1, padding: "0 0 0 0" }}>
          <Top
            upperGap={32}
            lowerGap={8}
            title={
              <Top.TitleParagraph size={22}>
                습관으로 목표를 이루는 여정,{"\n"}스트레칭각이 도와줄게요
              </Top.TitleParagraph>
            }
          />

          <div style={{ padding: "24px 24px 0" }}>
            {[
              {
                num: "1",
                title: "운동 알람 설정",
                desc: "스트레칭할 시간대를 설정해요",
                icon: "⏰",
              },
              {
                num: "2",
                title: "어떤 운동할지 정하고",
                desc: "좋아하는 스트레칭을 골라요",
                icon: "💪",
              },
              {
                num: "3",
                title: "매 시간 운동하기",
                desc: "포인트를 쌓고 건강해져요",
                icon: "🎯",
              },
            ].map(({ num, title, desc, icon }) => (
              <div
                key={num}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 16,
                  marginBottom: 20,
                }}
              >
                {/* 번호 원형 */}
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: colors.blue500,
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 16,
                    fontWeight: "bold",
                    flexShrink: 0,
                  }}
                >
                  {num}
                </div>
                {/* 텍스트 */}
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: "bold", color: colors.grey800 }}>
                    {title}
                  </p>
                  <p style={{ margin: "4px 0 0", fontSize: 14, color: colors.grey600 }}>{desc}</p>
                </div>
                {/* 아이콘 */}
                <div style={{ fontSize: 28, flexShrink: 0 }}>{icon}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: "0 24px 40px", display: "flex", flexDirection: "column", gap: 12 }}>
          <Button display="full" size="xlarge" onClick={() => onCancel ? setStep(2) : setStep(1.5)}>
            습관 루틴 만들기
          </Button>
          {onCancel && (
            <Button display="full" size="xlarge" color="dark" variant="weak" onClick={onCancel}>
              취소
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Step 1.5: 로그인 여부 선택 (최초 온보딩에만 표시)
  if (step === 1.5) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#fff" }}>
        <div style={{ flex: 1 }}>
          <Top
            upperGap={32}
            lowerGap={8}
            title={<Top.TitleParagraph size={22}>토스 계정으로{"\n"}로그인할까요?</Top.TitleParagraph>}
            subtitleBottom={
              <Top.SubtitleParagraph size={15} color={colors.grey600}>
                로그인하면 리더보드 참여와{"\n"}닉네임 설정을 할 수 있어요
              </Top.SubtitleParagraph>
            }
          />
          <div style={{ padding: "0 24px" }}>
            <div style={{ backgroundColor: colors.grey50, borderRadius: 16, padding: "20px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { icon: "🏆", text: "리더보드에서 친구들과 경쟁" },
                { icon: "👤", text: "나만의 닉네임 설정" },
                { icon: "🔄", text: "포인트 기록 기기 간 동기화" },
              ].map(({ icon, text }) => (
                <div key={text} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 20 }}>{icon}</span>
                  <span style={{ fontSize: 14, color: colors.grey700 }}>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ padding: "0 24px 40px", display: "flex", flexDirection: "column", gap: 12 }}>
          <Button
            display="full"
            size="xlarge"
            color="primary"
            onClick={handleTossLogin}
            disabled={loginLoading}
          >
            {loginLoading ? "로그인 중..." : "토스로 로그인하기"}
          </Button>
          <Button
            display="full"
            size="xlarge"
            color="dark"
            variant="weak"
            onClick={() => setStep(1.7)}
          >
            로그인 없이 시작하기
          </Button>
        </div>
      </div>
    );
  }

  // Step 1.7: 닉네임 설정 (랜덤 추천 미리 채움)
  if (step === 1.7) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#fff" }}>
        <div style={{ flex: 1 }}>
          <Top
            upperGap={32}
            lowerGap={8}
            title={<Top.TitleParagraph size={22}>어떻게 불러드릴까요?</Top.TitleParagraph>}
            subtitleBottom={
              <Top.SubtitleParagraph size={15} color={colors.grey600}>
                리더보드에 표시될 닉네임이에요{"\n"}나중에 프로필에서 바꿀 수 있어요
              </Top.SubtitleParagraph>
            }
          />
          <div style={{ padding: "0 24px" }}>
            <TextField
              variant="box"
              label="닉네임"
              value={nickInput}
              onChange={(e) => {
                setNickInput(e.target.value);
                setNickError(null);
              }}
              maxLength={12}
            />
            {nickError && (
              <p style={{ margin: "6px 0 0", fontSize: 13, color: colors.red500 }}>{nickError}</p>
            )}
          </div>
        </div>
        <div style={{ padding: "0 24px 40px" }}>
          <Button
            display="full"
            size="xlarge"
            onClick={handleNicknameNext}
            disabled={nickInput.trim().length === 0 || nickChecking}
          >
            {nickChecking ? "확인 중..." : "다음"}
          </Button>
        </div>
      </div>
    );
  }

  // Step 2: 시작 시간 선택
  if (step === 2) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#fff" }}>
        {/* 상단 진행 바 */}
        <div style={{ padding: "16px 24px 0" }}>
          <ProgressBar progress={1 / 5} size="bold" color={colors.blue500} animate />
        </div>

        <Top
          upperGap={20}
          lowerGap={8}
          title={<Top.TitleParagraph size={22}>언제부터 스트레칭할까요?</Top.TitleParagraph>}
          subtitleBottom={
            <Top.SubtitleParagraph size={15} color={colors.grey600}>
              운동 루틴을 시작할 시간을 골라요
            </Top.SubtitleParagraph>
          }
        />

        <div style={{ flex: 1, padding: "0 24px" }}>
          <DrumPicker
            value={settings.notifyStart}
            onChange={(v) => update({ notifyStart: v })}
          />
        </div>

        <div style={{ padding: "12px 24px 40px", display: "flex", gap: 12 }}>
          <Button display="full" size="xlarge" color="dark" variant="weak" onClick={() => setStep(1)}>
            이전
          </Button>
          <Button display="full" size="xlarge" onClick={() => setStep(3)}>
            다음
          </Button>
        </div>
      </div>
    );
  }

  // Step 3: 종료 시간 선택
  if (step === 3) {
    const startHour = parseInt(settings.notifyStart.split(":")[0]);
    const endHour = parseInt(settings.notifyEnd.split(":")[0]);
    const isValid = endHour - startHour >= 8;

    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#fff" }}>
        <div style={{ padding: "16px 24px 0" }}>
          <ProgressBar progress={2 / 5} size="bold" color={colors.blue500} animate />
        </div>

        <Top
          upperGap={20}
          lowerGap={8}
          title={<Top.TitleParagraph size={22}>언제까지 스트레칭할까요?</Top.TitleParagraph>}
          subtitleBottom={
            <Top.SubtitleParagraph size={15} color={colors.grey600}>
              운동 루틴을 끝낼 시간을 골라요
            </Top.SubtitleParagraph>
          }
        />

        <div style={{ flex: 1, padding: "0 24px" }}>
          <DrumPicker
            value={settings.notifyEnd}
            onChange={(v) => update({ notifyEnd: v })}
          />
          {!isValid && (
            <p style={{ textAlign: "center", fontSize: 13, color: colors.red500, marginTop: 8 }}>
              하루 최소 8회 스트레칭을 위해 8시간 이상 설정해주세요 (시작: {settings.notifyStart.replace(":00", "시")})
            </p>
          )}
          {isValid && (
            <p style={{ textAlign: "center", fontSize: 13, color: colors.blue500, marginTop: 8 }}>
              하루 {sessionCount}회 스트레칭 루틴이 만들어져요
            </p>
          )}
        </div>

        <div style={{ padding: "12px 24px 40px", display: "flex", gap: 12 }}>
          <Button display="full" size="xlarge" color="dark" variant="weak" onClick={() => setStep(2)}>
            이전
          </Button>
          <Button display="full" size="xlarge" onClick={() => setStep(4)} disabled={!isValid}>
            다음
          </Button>
        </div>
      </div>
    );
  }

  // Step 4: 알람 분 설정
  if (step === 4) {
    const minutes = Array.from({ length: 12 }, (_, i) => i * 5);
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#fff" }}>
        <div style={{ padding: "16px 24px 0" }}>
          <ProgressBar progress={3 / 5} size="bold" color={colors.blue500} animate />
        </div>

        <Top
          upperGap={20}
          lowerGap={8}
          title={<Top.TitleParagraph size={22}>몇 분에 알람을 받을까요?</Top.TitleParagraph>}
          subtitleBottom={
            <Top.SubtitleParagraph size={15} color={colors.grey600}>
              매 시간 알람이 울릴 분을 설정해요
            </Top.SubtitleParagraph>
          }
        />

        <div style={{ flex: 1, padding: "0 24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
            {minutes.map((m) => {
              const selected = settings.offsetMinutes === m;
              return (
                <button
                  key={m}
                  onClick={() => update({ offsetMinutes: m })}
                  style={{
                    padding: "16px 8px",
                    borderRadius: 12,
                    border: `2px solid ${selected ? colors.blue500 : colors.grey200}`,
                    background: selected ? colors.blue50 : "#fff",
                    cursor: "pointer",
                    fontSize: 16,
                    fontWeight: selected ? "bold" : 500,
                    color: selected ? colors.blue600 : colors.grey800,
                    transition: "all 0.15s",
                    outline: "none",
                  }}
                >
                  {m}분
                </button>
              );
            })}
          </div>
          <p style={{ textAlign: "center", fontSize: 13, color: colors.grey500, marginTop: 16 }}>
            예: 30분 → 매 시간 30분에 알람
          </p>
        </div>

        <div style={{ padding: "12px 24px 40px", display: "flex", gap: 12 }}>
          <Button display="full" size="xlarge" color="dark" variant="weak" onClick={() => setStep(3)}>
            이전
          </Button>
          <Button display="full" size="xlarge" onClick={() => setStep(5)}>
            다음
          </Button>
        </div>
      </div>
    );
  }

  // Step 5: 운동 종목 선택
  const EXERCISE_EMOJI: Record<string, string> = {
    "neck-w": "🐢",
    "chair-squat": "🦵",
    "chair-twist": "🪑",
    "side-stretch": "🤲",
    "wrist-stretch": "✋",
  };

  if (step === 5) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#fff" }}>
        <div style={{ padding: "16px 24px 0" }}>
          <ProgressBar progress={4 / 5} size="bold" color={colors.blue500} animate />
        </div>

        <Top
          upperGap={20}
          lowerGap={8}
          title={<Top.TitleParagraph size={22}>어떤 운동을 할까요?</Top.TitleParagraph>}
          subtitleBottom={
            <Top.SubtitleParagraph size={15} color={colors.grey600}>
              하고 싶은 스트레칭을 골라요
            </Top.SubtitleParagraph>
          }
        />

        <div style={{ flex: 1, padding: "0 24px", overflowY: "auto" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}
          >
            {EXERCISES.map((exercise) => {
              const selected = settings.enabledExerciseId === exercise.id;
              return (
                <button
                  key={exercise.id}
                  onClick={() => update({ enabledExerciseId: exercise.id })}
                  style={{
                    padding: "20px 12px 16px",
                    borderRadius: 16,
                    border: `2px solid ${selected ? colors.blue500 : colors.grey200}`,
                    background: selected ? colors.blue50 : "#fff",
                    cursor: "pointer",
                    textAlign: "center",
                    transition: "all 0.15s",
                    outline: "none",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                  }}
                >
                  <div style={{ fontSize: 36, marginBottom: 10 }}>
                    {EXERCISE_EMOJI[exercise.id] ?? "🏃"}
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 14,
                      fontWeight: "bold",
                      color: selected ? colors.blue600 : colors.grey800,
                      lineHeight: 1.4,
                    }}
                  >
                    {exercise.name}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ padding: "12px 24px 40px", display: "flex", gap: 12 }}>
          <Button display="full" size="xlarge" color="dark" variant="weak" onClick={() => setStep(4)}>
            이전
          </Button>
          <Button display="full" size="xlarge" onClick={() => setStep(6)} disabled={!settings.enabledExerciseId}>
            다음
          </Button>
        </div>
      </div>
    );
  }

  // Step 6: 완료
  const enabledExercises = EXERCISES.filter((e) => e.id === settings.enabledExerciseId);
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#fff",
        padding: "0 24px",
      }}
    >
      <div style={{ padding: "16px 0 0" }}>
        <ProgressBar progress={1} size="bold" color={colors.blue500} animate />
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingBottom: 100 }}>
        <div style={{ fontSize: 80, marginBottom: 20, textAlign: "center" }}>🎉</div>
        <h2
          style={{
            fontSize: 28,
            fontWeight: "bold",
            color: colors.grey900,
            textAlign: "center",
            margin: "0 0 8px",
          }}
        >
          루틴을 만들었어요!
        </h2>
        <p style={{ fontSize: 15, color: colors.grey600, textAlign: "center", margin: "0 0 28px", lineHeight: 1.6 }}>
          매 시간 알림을 보내드릴게요
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 18px", background: colors.grey50, borderRadius: 16 }}>
            <span style={{ fontSize: 24 }}>⏰</span>
            <div>
              <p style={{ margin: 0, fontSize: 12, color: colors.grey500, fontWeight: 500, marginBottom: 2 }}>스트레칭 시간</p>
              <p style={{ margin: 0, fontSize: 15, fontWeight: "bold", color: colors.grey900 }}>
                {settings.notifyStart.replace(":00", "시")} ~ {settings.notifyEnd.replace(":00", "시")}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 18px", background: colors.grey50, borderRadius: 16 }}>
            <span style={{ fontSize: 24 }}>🔥</span>
            <div>
              <p style={{ margin: 0, fontSize: 12, color: colors.grey500, fontWeight: 500, marginBottom: 2 }}>하루 횟수</p>
              <p style={{ margin: 0, fontSize: 15, fontWeight: "bold", color: colors.grey900 }}>
                총 {sessionCount}회
              </p>
            </div>
          </div>

          <div style={{ padding: "16px 18px", background: colors.grey50, borderRadius: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
              <span style={{ fontSize: 24 }}>💪</span>
              <p style={{ margin: 0, fontSize: 12, color: colors.grey500, fontWeight: 500 }}>선택한 운동</p>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, paddingLeft: 38 }}>
              {enabledExercises.map((e) => (
                <span
                  key={e.id}
                  style={{
                    padding: "5px 12px",
                    borderRadius: 20,
                    background: colors.blue50,
                    color: colors.blue600,
                    fontSize: 13,
                    fontWeight: 500,
                  }}
                >
                  {e.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        padding: "12px 24px 40px",
        background: "#fff",
        borderTop: "1px solid #f0f0f0",
      }}>
        <Button display="full" size="xlarge" onClick={handleDone} disabled={doneLoading}>
          {doneLoading ? "잠시만 기다려주세요..." : "시작하기"}
        </Button>
      </div>
    </div>
  );
}
