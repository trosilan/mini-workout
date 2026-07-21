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
  },
  profile: { nickname: string; points: number }
): Promise<string | null> {
  // 행이 없어 INSERT가 될 때도 NOT NULL 컬럼(nickname 등)을 채울 수 있게 프로필 포함
  const safePoints = Number.isFinite(profile.points) ? profile.points : 0;
  const { error } = await supabase.from("users").upsert(
    { user_key: userKey, nickname: profile.nickname, points: safePoints, ...settings },
    { onConflict: "user_key" }
  );
  if (error) {
    console.error("[supabase] upsertNotifySettings failed:", error.message, error);
    return error.message;
  }
  return null;
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

// ─── 친구 오늘 현황 + 콕 찌르기 ─────────────────────────────────────────────────

export interface FriendToday {
  user_key: string;
  nickname: string;
  doneHours: number[];
  routineStart: number;
  routineEnd: number;
  isRestDay: boolean;
  planned: number;
}

/** 친구들의 오늘 운동 현황 (point_events 기반). */
export async function fetchFriendsToday(userKey: string): Promise<FriendToday[]> {
  const keys = await fetchFriendKeys(userKey);
  if (keys.length === 0) return [];

  // 프로필 + 오늘 이벤트를 병렬 조회 (로딩 속도)
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const [usersRes, eventsRes] = await Promise.all([
    supabase
      .from("users")
      .select("user_key, nickname, notify_start_hour, notify_end_hour, notify_days")
      .in("user_key", keys),
    supabase
      .from("point_events")
      .select("user_key, created_at")
      .in("user_key", keys)
      .gte("created_at", dayStart),
  ]);
  const users = usersRes.data;
  if (usersRes.error || !users) {
    if (usersRes.error) console.error("[supabase] fetchFriendsToday failed:", usersRes.error.message);
    return [];
  }
  const events = eventsRes.data;

  const hoursByKey: Record<string, number[]> = {};
  (events ?? []).forEach((ev: { user_key: string; created_at: string }) => {
    const h = new Date(ev.created_at).getHours();
    (hoursByKey[ev.user_key] ??= []).push(h);
  });

  const dow = now.getDay();
  return users.map((u) => {
    const start = u.notify_start_hour ?? 9;
    const end = u.notify_end_hour ?? 18;
    const days: number[] = u.notify_days ?? [1, 2, 3, 4, 5];
    const planned = start < end ? end - start : 24 - start + end;
    return {
      user_key: u.user_key,
      nickname: u.nickname,
      doneHours: [...new Set(hoursByKey[u.user_key] ?? [])].sort((a, b) => a - b),
      routineStart: start,
      routineEnd: end,
      isRestDay: !days.includes(dow),
      planned,
    };
  });
}

/** 콕 찌르기 — 같은 상대에게 시간당 1회. 발송기(GitHub Actions)가 큐를 읽어 푸시 전송. */
export async function sendPoke(fromKey: string, toKey: string): Promise<"ok" | "already" | "error"> {
  const now = new Date();
  const hourKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}T${String(now.getHours()).padStart(2, "0")}`;
  const { error } = await supabase
    .from("pokes")
    .insert({ from_key: fromKey, to_key: toKey, hour_key: hourKey });
  if (!error) return "ok";
  if (error.code === "23505") return "already"; // 시간당 1회 제한(unique)
  console.error("[supabase] sendPoke failed:", error.message);
  return "error";
}

// ─── 친구 코드 (링크 대신 수동 입력용) ──────────────────────────────────────────

function genFriendCode(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // 혼동 문자(I,L,O,0,1) 제외
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

/** 내 친구 코드를 반환. 없으면 생성해서 저장(유니크 충돌 시 재시도). */
export async function getOrCreateFriendCode(userKey: string): Promise<string | null> {
  const { data } = await supabase
    .from("users")
    .select("friend_code")
    .eq("user_key", userKey)
    .maybeSingle();
  if (data?.friend_code) return data.friend_code;

  for (let i = 0; i < 5; i++) {
    const code = genFriendCode();
    const { error } = await supabase
      .from("users")
      .update({ friend_code: code })
      .eq("user_key", userKey);
    if (!error) return code;
  }
  console.error("[supabase] friend_code 생성 실패");
  return null;
}

/** 친구 코드로 유저 찾기. */
export async function findUserByFriendCode(code: string): Promise<UserRow | null> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return null;
  const { data, error } = await supabase
    .from("users")
    .select("user_key, nickname, points")
    .eq("friend_code", normalized)
    .maybeSingle();
  if (error) {
    console.error("[supabase] findUserByFriendCode failed:", error.message);
    return null;
  }
  return data ?? null;
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
