import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseKey);

export interface UserRow {
  user_key: string;
  nickname: string;
  points: number;
}

export async function fetchLeaderboard(): Promise<UserRow[]> {
  const { data, error } = await supabase
    .from("users")
    .select("user_key, nickname, points")
    .order("points", { ascending: false })
    .limit(50);
  if (error) return [];
  return data ?? [];
}

export async function upsertUser(userKey: string, nickname: string, points: number): Promise<void> {
  const safePoints = Number.isFinite(points) ? points : 0;
  const { error } = await supabase.from("users").upsert(
    { user_key: userKey, nickname, points: safePoints },
    { onConflict: "user_key" }
  );
  if (error) console.error("[supabase] upsertUser failed:", error.message, error);
}

export async function fetchUser(userKey: string): Promise<UserRow | null> {
  const { data, error } = await supabase
    .from("users")
    .select("user_key, nickname, points")
    .eq("user_key", userKey)
    .maybeSingle();
  if (error) console.error("[supabase] fetchUser failed:", error.message, error);
  return data ?? null;
}

export async function upsertNotifySettings(
  userKey: string,
  settings: {
    notify_agreed: boolean;
    notify_start_hour: number;
    notify_end_hour: number;
    notify_offset_minutes: number;
    notify_days: number[];
  }
): Promise<void> {
  const { error } = await supabase.from("users").upsert(
    { user_key: userKey, ...settings },
    { onConflict: "user_key" }
  );
  if (error) console.error("[supabase] upsertNotifySettings failed:", error.message, error);
}

export async function isNicknameTaken(nickname: string, currentUserKey?: string): Promise<boolean> {
  const query = supabase
    .from("users")
    .select("user_key")
    .eq("nickname", nickname);
  const { data } = await query;
  if (!data || data.length === 0) return false;
  // 본인 닉네임이면 중복 아님
  if (currentUserKey && data.every((row) => row.user_key === currentUserKey)) return false;
  return true;
}

// ─── 포인트 이벤트 (주간/월간 집계용) ───────────────────────────────────────────

export async function logPointEvent(userKey: string, points: number): Promise<void> {
  if (!Number.isFinite(points) || points <= 0) return;
  const { error } = await supabase.from("point_events").insert({ user_key: userKey, points });
  if (error) console.error("[supabase] logPointEvent failed:", error.message, error);
}

/** 기간 집계 리더보드. sinceISO 이후의 point_events 합계. keys를 주면 해당 유저들만. */
export async function fetchLeaderboardSince(
  sinceISO: string,
  keys?: string[]
): Promise<UserRow[]> {
  const { data, error } = await supabase.rpc("leaderboard_since", {
    since: sinceISO,
    keys: keys ?? null,
  });
  if (error) {
    console.error("[supabase] fetchLeaderboardSince failed:", error.message, error);
    return [];
  }
  return (data ?? []).map((r: { user_key: string; nickname: string; points: number }) => ({
    user_key: r.user_key,
    nickname: r.nickname,
    points: Number(r.points) || 0,
  }));
}

// ─── 친구 (초대 링크 기반 양방향 관계) ──────────────────────────────────────────

/** A와 B를 서로 친구로 등록(양방향). 초대 링크로 들어왔을 때 호출. */
export async function recordFriendship(userKey: string, friendKey: string): Promise<void> {
  if (!userKey || !friendKey || userKey === friendKey) return;
  const { error } = await supabase.from("friends").upsert(
    [
      { user_key: userKey, friend_key: friendKey },
      { user_key: friendKey, friend_key: userKey },
    ],
    { onConflict: "user_key,friend_key" }
  );
  if (error) console.error("[supabase] recordFriendship failed:", error.message, error);
}

/** 내 친구들의 user_key 목록. */
export async function fetchFriendKeys(userKey: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("friends")
    .select("friend_key")
    .eq("user_key", userKey);
  if (error) {
    console.error("[supabase] fetchFriendKeys failed:", error.message, error);
    return [];
  }
  return (data ?? []).map((r) => r.friend_key);
}

/** 내 친구들의 프로필(닉네임/누적포인트) 목록. */
export async function fetchFriends(userKey: string): Promise<UserRow[]> {
  const keys = await fetchFriendKeys(userKey);
  if (keys.length === 0) return [];
  const { data, error } = await supabase
    .from("users")
    .select("user_key, nickname, points")
    .in("user_key", keys)
    .order("points", { ascending: false });
  if (error) {
    console.error("[supabase] fetchFriends failed:", error.message, error);
    return [];
  }
  return data ?? [];
}
