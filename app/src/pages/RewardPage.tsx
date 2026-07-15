import { colors } from "@toss/tds-colors";
import { List, ListRow, TextButton, Top } from "@toss/tds-mobile";

import {
  BONUS_REWARD_POINTS,
  BONUS_THRESHOLD_COUNT,
  GENERAL_REWARD_POINTS,
  loadRewardState,
} from "../data";

interface RewardPageProps {
  onBack: () => void;
}

function todayKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function RewardPage({ onBack }: RewardPageProps) {
  const state = loadRewardState();
  const today = state.history[todayKey()];
  const todayCount = today?.count ?? 0;
  const todayPoints = today?.points ?? 0;

  const recentDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const key = `${y}-${m}-${dd}`;
    return { key, label: `${m}.${dd}`, entry: state.history[key] };
  });

  return (
    <>
      <Top
        title={<Top.TitleParagraph size={22}>리워드</Top.TitleParagraph>}
        subtitleBottom={
          <Top.SubtitleParagraph size={17}>
            정각마다 스트레칭하고 포인트를 모아보세요.
          </Top.SubtitleParagraph>
        }
      />

      <List groupTitle="내 포인트">
        <ListRow
          verticalPadding="large"
          contents={
            <ListRow.Texts
              type="2RowTypeA"
              top="누적 포인트"
              topProps={{ color: colors.grey600 }}
              bottom={`${state.totalPoints.toLocaleString()}P`}
              bottomProps={{ color: colors.grey800, fontWeight: "bold" }}
            />
          }
        />
        <ListRow
          verticalPadding="large"
          contents={
            <ListRow.Texts
              type="2RowTypeA"
              top="오늘 완료 횟수"
              topProps={{ color: colors.grey600 }}
              bottom={`${todayCount}회 · ${todayPoints.toLocaleString()}P`}
              bottomProps={{ color: colors.grey800, fontWeight: "bold" }}
            />
          }
        />
      </List>

      <List groupTitle="최근 7일">
        {recentDays.map(({ key, label, entry }) => (
          <ListRow
            key={key}
            verticalPadding="medium"
            contents={
              <ListRow.Texts
                type="2RowTypeA"
                top={label}
                topProps={{ color: colors.grey800 }}
                bottom={
                  entry
                    ? `${entry.count}회 · ${entry.points.toLocaleString()}P`
                    : "기록 없음"
                }
                bottomProps={{ color: colors.grey600 }}
              />
            }
          />
        ))}
      </List>

      <List groupTitle="포인트 안내">
        <ListRow
          verticalPadding="medium"
          contents={
            <ListRow.Texts
              type="2RowTypeA"
              top="기본 적립"
              topProps={{ color: colors.grey800 }}
              bottom={`스트레칭 완료 1회당 ${GENERAL_REWARD_POINTS}P (1시간에 한 번만 적립)`}
              bottomProps={{ color: colors.grey600 }}
            />
          }
        />
        <ListRow
          verticalPadding="medium"
          contents={
            <ListRow.Texts
              type="2RowTypeA"
              top="보너스 적립"
              topProps={{ color: colors.grey800 }}
              bottom={`하루 ${BONUS_THRESHOLD_COUNT}회 달성 시 ${BONUS_REWARD_POINTS}P 추가 적립`}
              bottomProps={{ color: colors.grey600 }}
            />
          }
        />
      </List>

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
