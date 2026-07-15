import { colors } from "@toss/tds-colors";
import { Button, ProgressBar, Top } from "@toss/tds-mobile";
import { useEffect, useRef, useState } from "react";
import { EXERCISES, completeExercise, loadSettings, type CompleteResult } from "../data";

type Phase = "ready" | "exercise" | "rest" | "done";

interface Props {
  onClose: () => void;
}

export function WorkoutPage({ onClose }: Props) {
  const settings = loadSettings();
  const exercises = EXERCISES.filter((e) =>
    settings.enabledExerciseIds.includes(e.id)
  );
  const exercise = exercises.length > 0 ? exercises[Math.floor(Math.random() * exercises.length)] : EXERCISES[0];

  const [phase, setPhase] = useState<Phase>("ready");
  const [countdown, setCountdown] = useState(3);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<CompleteResult | null>(null);
  const [cheated, setCheated] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Page Visibility API — 화면에서 나가면 부정행위 감지
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "hidden" && (phase === "exercise" || phase === "rest")) {
        setCheated(true);
        clearInterval(intervalRef.current!);
        setPhase("done");
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [phase]);

  // 카운트다운 (ready)
  useEffect(() => {
    if (phase !== "ready") return;
    intervalRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(intervalRef.current!);
          setPhase("exercise");
          setElapsed(0);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current!);
  }, [phase]);

  // 운동/휴식 타이머
  useEffect(() => {
    if (phase !== "exercise" && phase !== "rest") return;
    const duration = phase === "exercise" ? exercise.hold : exercise.restBetweenReps;
    if (duration === 0) {
      // 휴식 없음 → 즉시 완료
      finishExercise();
      return;
    }
    intervalRef.current = setInterval(() => {
      setElapsed((e) => {
        if (e + 1 >= duration) {
          clearInterval(intervalRef.current!);
          if (phase === "exercise") {
            if (exercise.restBetweenReps > 0) {
              setPhase("rest");
              setElapsed(0);
            } else {
              finishExercise();
            }
          } else {
            finishExercise();
          }
          return duration;
        }
        return e + 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current!);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function finishExercise() {
    const r = completeExercise();
    setResult(r);
    setPhase("done");
  }

  const totalDuration = phase === "exercise" ? exercise.hold : exercise.restBetweenReps;
  const progress = totalDuration > 0 ? elapsed / totalDuration : 0;

  if (phase === "ready") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", background: colors.grey50 }}>
        <div style={{ fontSize: "80px", marginBottom: "24px" }}>🧘</div>
        <h2 style={{ fontSize: "22px", fontWeight: "bold", color: colors.grey800, margin: "0 0 8px" }}>
          {exercise.name}
        </h2>
        <p style={{ fontSize: "15px", color: colors.grey600, textAlign: "center", margin: "0 0 32px" }}>
          {exercise.description}
        </p>
        <div style={{ fontSize: "64px", fontWeight: "bold", color: colors.blue500, margin: "0 0 16px" }}>
          {countdown}
        </div>
        <p style={{ fontSize: "15px", color: colors.grey500 }}>잠시 후 시작해요</p>
        <div style={{ marginTop: "40px" }}>
          <Button color="dark" variant="weak" size="large" onClick={onClose}>취소</Button>
        </div>
      </div>
    );
  }

  if (phase === "exercise") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", padding: "0", background: colors.white }}>
        <Top
          title={<Top.TitleParagraph size={22}>{exercise.name}</Top.TitleParagraph>}
          subtitleBottom={<Top.SubtitleParagraph size={15} color={colors.blue500}>{exercise.target}</Top.SubtitleParagraph>}
        />
        <div style={{ padding: "0 24px" }}>
          <ProgressBar progress={progress} size="bold" color={colors.blue500} animate />
          <div style={{ textAlign: "center", marginTop: "32px" }}>
            <div style={{ fontSize: "72px", fontWeight: "bold", color: colors.blue500 }}>
              {exercise.hold - elapsed}
            </div>
            <p style={{ fontSize: "17px", color: colors.grey600, margin: "8px 0 0" }}>초 유지하세요</p>
          </div>
          <div style={{ marginTop: "40px", background: colors.grey50, borderRadius: "16px", padding: "20px" }}>
            {exercise.guide.map((g, i) => (
              <p key={i} style={{ margin: i === 0 ? 0 : "8px 0 0", fontSize: "15px", color: colors.grey700, lineHeight: "1.5" }}>
                {i + 1}. {g}
              </p>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (phase === "rest") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", background: colors.blue50 }}>
        <div style={{ fontSize: "60px", marginBottom: "16px" }}>💨</div>
        <h2 style={{ fontSize: "22px", fontWeight: "bold", color: colors.grey800, margin: "0 0 24px" }}>잠깐 쉬어가요</h2>
        <ProgressBar progress={1 - progress} size="bold" color={colors.blue300} animate />
        <div style={{ fontSize: "48px", fontWeight: "bold", color: colors.blue500, marginTop: "24px" }}>
          {exercise.restBetweenReps - elapsed}초
        </div>
      </div>
    );
  }

  // done
  if (cheated) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px" }}>
        <div style={{ fontSize: "64px", marginBottom: "16px" }}>🚫</div>
        <h2 style={{ fontSize: "22px", fontWeight: "bold", color: colors.red500, margin: "0 0 8px" }}>
          앱에서 나갔어요
        </h2>
        <p style={{ fontSize: "15px", color: colors.grey600, margin: "0 0 40px", textAlign: "center" }}>
          운동 중 앱을 벗어나면 포인트가 적립되지 않아요.
        </p>
        <Button display="full" size="xlarge" color="dark" variant="weak" onClick={onClose}>
          홈으로 돌아가기
        </Button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ fontSize: "80px", marginBottom: "16px" }}>🎉</div>
      <h2 style={{ fontSize: "22px", fontWeight: "bold", color: colors.grey800, margin: "0 0 8px" }}>
        {result?.awarded ? "운동 완료!" : "이미 완료했어요"}
      </h2>
      {result?.awarded && (
        <>
          <p style={{ fontSize: "17px", color: colors.blue500, fontWeight: "bold", margin: "0 0 4px" }}>
            +{result.pointsEarned}pt 적립!
          </p>
          {result.dailySuccess && !result.perfectDay && (
            <p style={{ fontSize: "13px", color: colors.grey600, margin: "0 0 4px" }}>하루 5회 달성 보너스 포함</p>
          )}
          {result.perfectDay && (
            <p style={{ fontSize: "13px", color: colors.blue500, margin: "0 0 4px" }}>🏆 완벽한 하루 달성!</p>
          )}
          <p style={{ fontSize: "13px", color: colors.grey500, margin: "0 0 32px" }}>
            오늘 {result.todayCount}회째 운동
          </p>
        </>
      )}
      {!result?.awarded && (
        <p style={{ fontSize: "15px", color: colors.grey600, margin: "0 0 32px", textAlign: "center" }}>
          1시간에 1번만 포인트가 적립돼요.
        </p>
      )}
      <Button display="full" size="xlarge" onClick={onClose}>
        완료
      </Button>
    </div>
  );
}
