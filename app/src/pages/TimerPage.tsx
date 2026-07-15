import { loadFullScreenAd, showFullScreenAd } from "@apps-in-toss/web-framework";
import { colors } from "@toss/tds-colors";
import {
  BottomSheet,
  Button,
  List,
  ListRow,
  ProgressBar,
  TextButton,
  Top,
} from "@toss/tds-mobile";
import { useEffect, useRef, useState } from "react";

import { BannerAd } from "../components/BannerAd";
import {
  completeExercise,
  EXERCISES,
  loadSettings,
  type Exercise,
} from "../data";

const INTERSTITIAL_AD_ID = "ait.v2.live.e8db03813d1948dc";
const BANNER_WORKOUT_ID = "ait.v2.live.12cde15067354989";
const BANNER_DONE_ID = "ait.v2.live.db4d595317484420";

interface TimerPageProps {
  onBack: () => void;
  onAward?: (pointsEarned: number) => void;
}

type Phase = "ready" | "hold" | "rest" | "done";

const SIDE_LABEL: Record<NonNullable<Exercise["sides"]>, string[]> = {
  both: ["진행"],
  leftRight: ["왼쪽", "오른쪽"],
};

export function TimerPage({ onBack, onAward }: TimerPageProps) {
  const settings = loadSettings();
  const exercises = EXERCISES.filter((e) =>
    e.id === settings.enabledExerciseId,
  );

  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [repIndex, setRepIndex] = useState(0);
  const [sideIndex, setSideIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("ready");
  const [remaining, setRemaining] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [result, setResult] = useState<ReturnType<
    typeof completeExercise
  > | null>(null);

  const [showExitSheet, setShowExitSheet] = useState(false);

  const intervalRef = useRef<number | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const adLoadedRef = useRef(false);
  const unregisterAdRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    try {
      if (!loadFullScreenAd.isSupported()) return;
      unregisterAdRef.current = loadFullScreenAd({
        options: { adGroupId: INTERSTITIAL_AD_ID },
        onEvent: (event) => {
          if (event.type === "loaded") adLoadedRef.current = true;
        },
        onError: () => { adLoadedRef.current = false; },
      });
    } catch { /* 지원 안 되는 환경 무시 */ }
    return () => {
      try { unregisterAdRef.current?.(); } catch { /* ignore */ }
    };
  }, []);

  const exercise = exercises[exerciseIndex];
  const sides = exercise?.sides ? SIDE_LABEL[exercise.sides] : ["진행"];
  const sideCount = exercise?.sides === "leftRight" ? 2 : 1;

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPaused(document.visibilityState === "hidden");
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );
  }, []);

  useEffect(() => {
    if (phase !== "hold" && phase !== "rest") return;
    if (isPaused) return;

    if (remaining <= 0) {
      goToNextStep();
      return;
    }

    intervalRef.current = window.setTimeout(() => {
      setRemaining((prev) => prev - 1);
    }, 1000);

    return () => {
      if (intervalRef.current) clearTimeout(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, remaining, isPaused]);

  const goToNextStep = () => {
    if (!exercise) return;

    if (phase === "hold") {
      const isLastSide = sideIndex >= sideCount - 1;
      if (!isLastSide) {
        setSideIndex((prev) => prev + 1);
        setPhase("hold");
        setRemaining(exercise.hold);
        return;
      }

      const isLastRep = repIndex >= exercise.reps - 1;
      if (!isLastRep && exercise.restBetweenReps > 0) {
        setPhase("rest");
        setRemaining(exercise.restBetweenReps);
        return;
      }

      if (!isLastRep) {
        setRepIndex((prev) => prev + 1);
        setSideIndex(0);
        setPhase("hold");
        setRemaining(exercise.hold);
        return;
      }

      finishExercise();
      return;
    }

    if (phase === "rest") {
      setRepIndex((prev) => prev + 1);
      setSideIndex(0);
      setPhase("hold");
      setRemaining(exercise.hold);
    }
  };

  const finishExercise = () => {
    const isLastExercise = exerciseIndex >= exercises.length - 1;
    if (!isLastExercise) {
      setExerciseIndex((prev) => prev + 1);
      setRepIndex(0);
      setSideIndex(0);
      setPhase("ready");
      setRemaining(0);
      return;
    }

    const elapsed = startedAtRef.current ? Date.now() - startedAtRef.current : Infinity;
    if (elapsed < 30000) {
      return;
    }

    const completeResult = completeExercise();

    // 포인트 적립됐으면 서버 동기화 + 이벤트 기록(주간/월간 집계용)
    if (completeResult.awarded && completeResult.pointsEarned > 0) {
      onAward?.(completeResult.pointsEarned);
    }

    const showAd = adLoadedRef.current && Math.random() < 0.2;
    if (showAd) {
      try {
        showFullScreenAd({
          options: { adGroupId: INTERSTITIAL_AD_ID },
          onEvent: (event) => {
            if (event.type === "dismissed" || event.type === "failedToShow") {
              setResult(completeResult);
              setPhase("done");
            }
          },
          onError: () => {
            setResult(completeResult);
            setPhase("done");
          },
        });
        return;
      } catch { /* 실패 시 바로 완료 화면으로 */ }
    }

    setResult(completeResult);
    setPhase("done");
  };

  const startExercise = () => {
    if (!exercise) return;
    startedAtRef.current = Date.now();
    setPhase("hold");
    setRemaining(exercise.hold);
  };

  if (exercises.length === 0) {
    return (
      <>
        <Top
          title={<Top.TitleParagraph size={22}>스트레칭</Top.TitleParagraph>}
          subtitleBottom={
            <Top.SubtitleParagraph size={17}>
              설정에서 스트레칭 종목을 먼저 선택해주세요.
            </Top.SubtitleParagraph>
          }
        />
        <TextButton
          style={{ padding: "16px 24px" }}
          size="medium"
          color={colors.blue500}
          onClick={onBack}
        >
          ← 홈으로
        </TextButton>
      </>
    );
  }

  if (phase === "done") {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
        }}
      >
        {/* 축하 영역: 남은 공간 가운데 정렬 */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "72px", marginBottom: "24px" }}>🎉</div>

          <p style={{ margin: "0 0 8px", fontSize: "26px", fontWeight: "bold", color: colors.grey900 }}>
            운동 완료!
          </p>

          {result?.awarded ? (
            <p style={{ margin: "0 0 4px", fontSize: "18px", fontWeight: "bold", color: colors.blue500 }}>
              +{result.pointsEarned}pt 적립!{result.dailySuccess || result.perfectDay ? " 🎁" : ""}
            </p>
          ) : (
            <p style={{ margin: "0 0 4px", fontSize: "15px", color: colors.grey500 }}>
              1시간에 한 번만 적립돼요
            </p>
          )}

          <p style={{ margin: "0", fontSize: "14px", color: colors.grey500 }}>
            오늘 {result?.todayCount ?? 0}회차 운동
          </p>
        </div>

        {/* 완료 버튼 + 배너: 하단에 순서대로 쌓임 (겹침 없음) */}
        <div style={{ padding: "0 24px 12px" }}>
          <Button display="full" size="xlarge" onClick={onBack}>
            완료
          </Button>
        </div>
        <BannerAd adGroupId={BANNER_DONE_ID} position="static" />
      </div>
    );
  }

  if (phase === "ready") {
    return (
      <>
        <Top
          title={<Top.TitleParagraph size={22}>{exercise.name}</Top.TitleParagraph>}
          subtitleBottom={
            <Top.SubtitleParagraph size={17}>
              {exercise.description}
            </Top.SubtitleParagraph>
          }
        />

        {exercise.image && (
          <div style={{ padding: "0 24px 8px", textAlign: "center" }}>
            <img
              src={exercise.image}
              alt={exercise.name}
              style={{
                width: "100%",
                maxHeight: "220px",
                objectFit: "contain",
                borderRadius: "12px",
              }}
            />
          </div>
        )}

        <List groupTitle="동작 가이드">
          {exercise.guide.map((step, idx) => (
            <ListRow
              key={idx}
              verticalPadding="medium"
              left={
                <ListRow.AssetText shape="squircle" size="xsmall">
                  {idx + 1}
                </ListRow.AssetText>
              }
              contents={
                <ListRow.Texts
                  type="1RowTypeA"
                  top={step}
                  topProps={{ color: colors.grey800 }}
                />
              }
            />
          ))}
        </List>

        <List groupTitle="목표">
          <ListRow
            verticalPadding="large"
            contents={
              <ListRow.Texts
                type="2RowTypeA"
                top={`${exercise.hold}초 유지 x ${exercise.reps}회`}
                topProps={{ color: colors.grey800, fontWeight: "bold" }}
                bottom={`(${exerciseIndex + 1}/${exercises.length}번째 동작)`}
                bottomProps={{ color: colors.grey600 }}
              />
            }
          />
        </List>

        <div style={{ padding: "16px 24px" }}>
          <Button display="full" size="xlarge" onClick={startExercise}>
            시작하기
          </Button>
        </div>

        <TextButton
          style={{ padding: "16px 24px" }}
          size="medium"
          color={colors.blue500}
          onClick={onBack}
        >
          ← 홈으로
        </TextButton>
      </>
    );
  }

  const total = phase === "hold" ? exercise.hold : exercise.restBetweenReps;
  const progress = total > 0 ? (total - remaining) / total : 0;
  const sideLabel = sides[sideIndex] ?? sides[0];

  return (
    <div style={{ paddingBottom: "96px" }}>
      {/* 상단 뒤로가기 */}
      <div style={{ padding: "12px 16px 0" }}>
        <TextButton
          size="medium"
          color={colors.blue500}
          onClick={() => setShowExitSheet(true)}
        >
          ← 홈으로
        </TextButton>
      </div>

      <Top
        title={<Top.TitleParagraph size={22}>{exercise.name}</Top.TitleParagraph>}
        subtitleBottom={
          <Top.SubtitleParagraph size={17}>
            {exercise.target}
          </Top.SubtitleParagraph>
        }
      />

      {/* 이미지 */}
      {exercise.image && (
        <div style={{ padding: "0 24px 0", textAlign: "center" }}>
          <img
            src={exercise.image}
            alt={exercise.name}
            style={{
              width: "100%",
              maxHeight: "200px",
              objectFit: "contain",
              borderRadius: "12px",
            }}
          />
        </div>
      )}

      {/* 카운트다운 */}
      <div style={{ textAlign: "center", padding: "20px 24px 4px" }}>
        <div style={{ fontSize: "80px", fontWeight: "bold", color: colors.blue500, lineHeight: 1 }}>
          {remaining}
        </div>
        <div style={{ fontSize: "16px", color: colors.grey600, marginTop: "8px" }}>
          {phase === "hold" ? `${sideLabel} · 초 유지하세요` : "잠시 휴식해주세요"}
        </div>
      </div>

      {/* 프로그레스바 */}
      <div style={{ padding: "12px 24px 0" }}>
        <ProgressBar progress={progress} size="bold" animate />
      </div>

      {/* 가이드 */}
      {phase === "hold" && (
        <div style={{ padding: "16px 24px 0" }}>
          {exercise.guide.map((step, idx) => (
            <p key={idx} style={{ margin: "0 0 6px", fontSize: "14px", color: colors.grey600 }}>
              {idx + 1}. {step}
            </p>
          ))}
        </div>
      )}

      {isPaused && (
        <List>
          <ListRow
            verticalPadding="large"
            contents={
              <ListRow.Texts
                type="2RowTypeA"
                top="화면을 벗어났어요"
                topProps={{ color: colors.red500, fontWeight: "bold" }}
                bottom="돌아오면 타이머가 다시 시작돼요"
                bottomProps={{ color: colors.grey600 }}
              />
            }
          />
        </List>
      )}

      <BottomSheet
        open={showExitSheet}
        onClose={() => setShowExitSheet(false)}
        header={<BottomSheet.Header>지금 나가면 운동이 기록되지 않아요</BottomSheet.Header>}
        headerDescription={
          <BottomSheet.HeaderDescription>
            운동을 끝까지 완료해야 포인트가 적립돼요
          </BottomSheet.HeaderDescription>
        }
        cta={
          <BottomSheet.DoubleCTA
            primary={{ label: "계속 운동하기", onClick: () => setShowExitSheet(false) }}
            secondary={{ label: "나가기", onClick: onBack }}
          />
        }
      />

      {!showExitSheet && <BannerAd adGroupId={BANNER_WORKOUT_ID} />}
    </div>
  );
}
