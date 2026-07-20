import { colors } from "@toss/tds-colors";
import { Button, List, ListRow, Top } from "@toss/tds-mobile";
import { useEffect, useState } from "react";
import { getTossShareLink, share } from "@apps-in-toss/web-framework";
import {
  fetchFriendKeys,
  fetchFriends,
  fetchLeaderboard,
  fetchLeaderboardSince,
  type UserRow,
} from "../supabase";
import { getOrCreateNickname, getTotalPoints, monthStartISO, weekStartISO } from "../data";
import { inviteDeepLink } from "../referral";

const DUMMY_LEADERBOARD = [
  { id: "dummy-1", name: "운동왕 김철수", points: 980 },
  { id: "dummy-2", name: "스트레칭마스터", points: 850 },
  { id: "dummy-3", name: "건강한하루", points: 720 },
  { id: "dummy-4", name: "매일운동러", points: 610 },
  { id: "dummy-5", name: "스트레칭각팬클럽", points: 540 },
];

type Period = "all" | "week" | "month";
type Scope = "all" | "friends";

interface LeaderboardPageProps {
  userKey: string | null;
  isLoggedIn: boolean;
  onLoginRequired?: () => void;
}

interface Entry {
  id: string;
  name: string;
  points: number;
}

export function LeaderboardPage({ userKey, isLoggedIn, onLoginRequired }: LeaderboardPageProps) {
  const [period, setPeriod] = useState<Period>("all");
  const [scope, setScope] = useState<Scope>("all");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);

  const myNickname = getOrCreateNickname();
  const myAllTimePoints = getTotalPoints();

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      let rows: UserRow[] = [];
      try {
        if (period === "all") {
          rows =
            scope === "all"
              ? await fetchLeaderboard()
              : userKey
              ? await fetchFriends(userKey)
              : [];
        } else {
          const since = period === "week" ? weekStartISO() : monthStartISO();
          if (scope === "all") {
            rows = await fetchLeaderboardSince(since);
          } else if (userKey) {
            const keys = [userKey, ...(await fetchFriendKeys(userKey))];
            rows = await fetchLeaderboardSince(since, keys);
          }
        }
      } catch {
        rows = [];
      }
      if (cancelled) return;

      let list: Entry[] = rows.map((r) => ({
        id: r.user_key,
        name: r.user_key === userKey ? myNickname : r.nickname,
        points:
          r.user_key === userKey && period === "all" ? myAllTimePoints : Math.round(r.points),
      }));

      // 전체 기간에서는 내 항목이 없으면 추가(로그인 상태)
      if (isLoggedIn && userKey && period === "all" && !list.some((e) => e.id === userKey)) {
        list.push({ id: userKey, name: myNickname, points: myAllTimePoints });
      }

      list.sort((a, b) => b.points - a.points);
      setEntries(list);
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, scope, userKey, isLoggedIn]);

  const rankIcon = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `${rank}`;
  };

  const handleShare = async () => {
    try {
      const link = await getTossShareLink(inviteDeepLink(userKey ?? ""));
      await share({ message: `스트레칭각 리더보드에서 나랑 경쟁해봐요! 💪\n${link}` });
    } catch {
      // 토스 앱 밖에서는 무시
    }
  };

  // 전체/전체 화면에서 실데이터 없으면 더미로 채우기
  const showDummy = scope === "all" && period === "all" && entries.length === 0;
  const displayList: Entry[] = showDummy ? DUMMY_LEADERBOARD : entries;

  const periodLabel: Record<Period, string> = { all: "전체 누적", week: "주간", month: "월간" };
  const scopeLabel: Record<Scope, string> = { all: "전체 랭킹", friends: "친구" };

  return (
    <div style={{ paddingBottom: "80px" }}>
      <Top
        title={<Top.TitleParagraph size={22}>리더보드</Top.TitleParagraph>}
        subtitleBottom={
          <Top.SubtitleParagraph size={17}>
            {isLoggedIn ? `${myNickname}으로 참여 중` : "참여하려면 로그인이 필요해요"}
          </Top.SubtitleParagraph>
        }
      />

      {/* 스코프 탭: 전체 랭킹 / 친구 */}
      <div style={{ display: "flex", gap: 8, padding: "0 24px 10px" }}>
        {(["all", "friends"] as Scope[]).map((s) => {
          const active = scope === s;
          return (
            <button
              key={s}
              onClick={() => setScope(s)}
              style={{
                flex: 1,
                padding: "10px 0",
                borderRadius: 10,
                border: "none",
                fontSize: 15,
                fontWeight: active ? "bold" : "normal",
                backgroundColor: active ? colors.blue500 : colors.grey100,
                color: active ? colors.white : colors.grey700,
                cursor: "pointer",
              }}
            >
              {scopeLabel[s]}
            </button>
          );
        })}
      </div>

      {/* 기간 탭: 전체 / 주간 / 월간 */}
      <div style={{ display: "flex", gap: 8, padding: "0 24px 16px" }}>
        {(["all", "week", "month"] as Period[]).map((p) => {
          const active = period === p;
          return (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                flex: 1,
                padding: "8px 0",
                borderRadius: 20,
                border: `1.5px solid ${active ? colors.blue500 : colors.grey200}`,
                fontSize: 14,
                fontWeight: active ? "bold" : "normal",
                backgroundColor: active ? colors.blue50 : colors.white,
                color: active ? colors.blue500 : colors.grey600,
                cursor: "pointer",
              }}
            >
              {periodLabel[p]}
            </button>
          );
        })}
      </div>

      {/* 로그인+친구 탭인데 초대 유도 */}
      {isLoggedIn && (
        <div style={{ padding: "0 24px 12px" }}>
          <Button display="full" size="medium" onClick={handleShare}>
            친구 초대하기
          </Button>
        </div>
      )}

      {/* 친구 탭인데 친구 없음 */}
      {isLoggedIn && scope === "friends" && !loading && entries.length <= 1 ? (
        <div style={{ padding: "24px", textAlign: "center" }}>
          <p style={{ margin: "0 0 4px", fontSize: 15, fontWeight: "bold", color: colors.grey800 }}>
            아직 친구가 없어요
          </p>
          <p style={{ margin: 0, fontSize: 13, color: colors.grey500 }}>
            초대 링크나 친구 코드로 친구를 추가해보세요
          </p>
        </div>
      ) : !loading && displayList.length === 0 ? (
        <div style={{ padding: "24px", textAlign: "center" }}>
          <p style={{ margin: "0 0 4px", fontSize: 15, fontWeight: "bold", color: colors.grey800 }}>
            {period === "week" ? "이번 주" : "이번 달"} 기록이 아직 없어요
          </p>
          <p style={{ margin: 0, fontSize: 13, color: colors.grey500 }}>
            운동을 완료하면 여기에 올라와요 💪
          </p>
        </div>
      ) : (
        <List>
          {displayList.map((entry, idx) => {
            const isMe = entry.id === userKey;
            const rank = idx + 1;
            return (
              <ListRow
                key={entry.id}
                verticalPadding="large"
                contents={
                  <ListRow.Texts
                    type="2RowTypeA"
                    top={entry.name}
                    topProps={{
                      color: isMe ? colors.blue500 : colors.grey800,
                      fontWeight: isMe ? "bold" : "medium",
                    }}
                    bottom={`${entry.points.toLocaleString()}P`}
                    bottomProps={{ color: colors.grey600 }}
                  />
                }
                right={
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: rank <= 3 ? "20px" : "14px",
                      fontWeight: "bold",
                      backgroundColor: isMe ? colors.blue100 : colors.grey100,
                      color: isMe ? colors.blue500 : colors.grey700,
                    }}
                  >
                    {rankIcon(rank)}
                  </div>
                }
              />
            );
          })}
        </List>
      )}

      {/* 로그인 안 됐을 때 하단 참여 유도 */}
      {!isLoggedIn && (
        <div style={{ padding: "16px 24px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ backgroundColor: colors.blue50, borderRadius: 12, padding: "16px", textAlign: "center" }}>
            <p style={{ margin: "0 0 2px", fontSize: 14, fontWeight: "bold", color: colors.blue700 }}>
              나도 리더보드에 참여하고 싶다면?
            </p>
            <p style={{ margin: 0, fontSize: 13, color: colors.blue500 }}>
              토스 로그인 후 내 순위를 확인해요
            </p>
          </div>
          <Button display="full" size="xlarge" color="primary" onClick={onLoginRequired}>
            토스로 로그인하기
          </Button>
        </div>
      )}
    </div>
  );
}
