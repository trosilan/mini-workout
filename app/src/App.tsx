import { Tab } from "@toss/tds-mobile";
import { useEffect, useState } from "react";
import { getAnonymousKey } from "@apps-in-toss/web-framework";
import "./App.css";
import { fetchUser, upsertUser, upsertNotifySettings, recordFriendship, logPointEvent } from "./supabase";
import { getTotalPoints, loadSettings, setTotalPoints } from "./data";
import { readLaunchPath, readReferralKey } from "./referral";
import { CalendarPage } from "./pages/CalendarPage";
import { HomePage } from "./pages/HomePage";
import { InAppAdsPage } from "./pages/InAppAdsPage";
import { LeaderboardPage } from "./pages/LeaderboardPage";
import { NicknamePage } from "./pages/NicknamePage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { ProfilePage } from "./pages/ProfilePage";
import { RewardPage } from "./pages/RewardPage";
import { SettingsPage } from "./pages/SettingsPage";
import { TimerPage } from "./pages/TimerPage";
import { WorkoutPage } from "./pages/WorkoutPage";

function App() {
  const [onboarded, setOnboarded] = useState(
    () => localStorage.getItem("jeongunwan.onboarded") !== null
  );
  const [userKey, setUserKey] = useState<string | null>(null);

  useEffect(() => {
    const initUser = async () => {
      let key: string | null = null;

      try {
        const result = await getAnonymousKey();
        const hash = result?.hash;
        if (hash && typeof hash === "string" && hash.length > 0) {
          key = hash;
        }
      } catch {
        // getAnonymousKey 실패 (샌드박스 등)
      }

      // fallback: 로컬 UUID
      if (!key) {
        let local = localStorage.getItem("jeongunwan.localUserKey");
        if (!local) {
          local = crypto.randomUUID();
          localStorage.setItem("jeongunwan.localUserKey", local);
        }
        key = local;
      }

      setUserKey(key);

      try {
        const row = await fetchUser(key);
        if (row) {
          localStorage.setItem("jeongunwan.nickname", row.nickname);
          setTotalPoints(row.points);
        } else {
          const nickname = localStorage.getItem("jeongunwan.nickname") ?? "나";
          await upsertUser(key, nickname, getTotalPoints());
        }
      } catch {
        // Supabase 연결 실패 시 무시
      }

      // 초대 링크로 들어왔으면 친구 등록 (한 번만)
      try {
        const ref = readReferralKey();
        if (ref && ref !== key && localStorage.getItem("jeongunwan.referralDone") !== "1") {
          await recordFriendship(key, ref);
          localStorage.setItem("jeongunwan.referralDone", "1");
        }
      } catch {
        // ignore
      }
    };

    initUser();
  }, []);
  const [authCode, setAuthCode] = useState<string | null>(
    () => localStorage.getItem("jeongunwan.authCode")
  );
  const [tab, setTab] = useState(0);
  const [showWorkout, setShowWorkout] = useState(false);
  const [showIaa, setShowIaa] = useState(false);
  const [showEditRoutine, setShowEditRoutine] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showTimer, setShowTimer] = useState(false);
  const [showReward, setShowReward] = useState(false);
  const [showNickname, setShowNickname] = useState(false);

  // 푸시 알림 딥링크(intoss://short-workout/workout)로 진입하면 운동 화면 바로 열기
  useEffect(() => {
    const path = readLaunchPath();
    if (path === "workout" || path === "timer") {
      setShowTimer(true);
    }
  }, []);

  // 상태가 아직 준비 안 됐어도 그 자리에서 키를 다시 구한다 (동기화 유실 방지)
  const resolveUserKey = async (): Promise<string | null> => {
    if (userKey) return userKey;
    try {
      const result = await getAnonymousKey();
      const hash = result?.hash;
      if (hash && typeof hash === "string" && hash.length > 0) return hash;
    } catch {
      // ignore
    }
    return localStorage.getItem("jeongunwan.localUserKey");
  };

  // 알림 동의 여부 + 루틴 설정을 Supabase에 동기화 (발송기가 이 값을 읽음)
  const syncNotifySettings = async () => {
    const key = await resolveUserKey();
    if (!key) {
      alert("설정 저장 실패: 사용자 키를 가져오지 못했어요.");
      return;
    }
    const s = loadSettings();
    const agreed = localStorage.getItem("jeongunwan.notifyAgreed") === "1";
    const err = await upsertNotifySettings(
      key,
      {
        notify_agreed: agreed,
        notify_start_hour: parseInt(s.notifyStart.split(":")[0]),
        notify_end_hour: parseInt(s.notifyEnd.split(":")[0]),
        notify_offset_minutes: s.offsetMinutes,
        notify_days: s.enabledDays,
      },
      {
        nickname: localStorage.getItem("jeongunwan.nickname") ?? "나",
        points: getTotalPoints(),
      }
    );
    // 실패만 사용자에게 알림 (조용한 실패 방지)
    if (err) {
      alert("설정 서버 저장 실패: " + err);
    }
  };

  if (!onboarded) {
    return (
      <OnboardingPage
        onLoginDone={() => setAuthCode(localStorage.getItem("jeongunwan.authCode"))}
        onComplete={() => {
          localStorage.setItem("jeongunwan.onboarded", "1");
          setOnboarded(true); // 화면 먼저 전환
          syncNotifySettings(); // DB 동기화는 백그라운드로
        }}
      />
    );
  }

  if (showIaa) {
    return <InAppAdsPage onBack={() => setShowIaa(false)} />;
  }

  if (showEditRoutine) {
    return (
      <OnboardingPage
        onComplete={() => {
          localStorage.setItem("jeongunwan.onboarded", "1");
          setShowEditRoutine(false); // 화면 먼저 전환
          syncNotifySettings(); // DB 동기화는 백그라운드로
        }}
        onCancel={() => setShowEditRoutine(false)}
      />
    );
  }

  if (showWorkout) {
    return (
      <WorkoutPage
        onClose={async () => {
          setShowWorkout(false);
          if (userKey) {
            const nickname = localStorage.getItem("jeongunwan.nickname") ?? "나";
            await upsertUser(userKey, nickname, getTotalPoints());
          }
        }}
      />
    );
  }

  if (showSettings) {
    return (
      <SettingsPage
        onBack={() => {
          setShowSettings(false);
          syncNotifySettings(); // 설정 변경/동의 여부를 DB에 반영
        }}
        onAgreed={syncNotifySettings}
      />
    );
  }

  if (showTimer) {
    return (
      <TimerPage
        onBack={() => setShowTimer(false)}
        onAward={async (pointsEarned) => {
          if (!userKey) return;
          const nickname = localStorage.getItem("jeongunwan.nickname") ?? "나";
          await Promise.all([
            upsertUser(userKey, nickname, getTotalPoints()),
            logPointEvent(userKey, pointsEarned),
          ]);
        }}
      />
    );
  }

  if (showReward) {
    return <RewardPage onBack={() => setShowReward(false)} />;
  }

  if (showNickname) {
    if (!authCode) {
      setShowNickname(false);
      setTab(3);
      return null;
    }
    return <NicknamePage userKey={userKey} onComplete={() => setShowNickname(false)} />;
  }

  const TAB_BAR_HEIGHT = 80;

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <div style={{ flex: 1, paddingBottom: TAB_BAR_HEIGHT }}>
        {tab === 0 && (
          <HomePage
            onStartWorkout={() => setShowTimer(true)}
            onEditSettings={() => setShowEditRoutine(true)}
            onOpenSettings={() => setShowSettings(true)}
            onOpenTimer={() => setShowTimer(true)}
            onOpenReward={() => setShowReward(true)}
          />
        )}
        {tab === 1 && <CalendarPage />}
        {tab === 2 && (
          <LeaderboardPage
            userKey={userKey}
            isLoggedIn={!!authCode}
            onLoginRequired={() => setTab(3)}
          />
        )}
        {tab === 3 && (
          <ProfilePage
            userKey={userKey}
            onNicknameRequired={() => setShowNickname(true)}
            onLogin={async () => {
              setAuthCode(localStorage.getItem("jeongunwan.authCode"));
              if (userKey) {
                const nickname = localStorage.getItem("jeongunwan.nickname") ?? "나";
                await upsertUser(userKey, nickname, getTotalPoints());
              }
            }}
          />
        )}
      </div>

      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          height: TAB_BAR_HEIGHT,
          background: "white",
          borderTop: "1px solid #f0f0f0",
        }}
      >
        <Tab onChange={(index) => setTab(index)}>
          <Tab.Item selected={tab === 0}>홈</Tab.Item>
          <Tab.Item selected={tab === 1}>운동기록</Tab.Item>
          <Tab.Item selected={tab === 2}>리더보드</Tab.Item>
          <Tab.Item selected={tab === 3}>내 프로필</Tab.Item>
        </Tab>
      </div>
    </div>
  );
}

export default App;
