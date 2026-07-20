export interface Exercise {
  id: string;
  name: string;
  target: string;
  description: string;
  guide: string[];
  hold: number;
  reps: number;
  restBetweenReps: number;
  sides?: "both" | "leftRight";
  image?: string;
}

export const EXERCISES: Exercise[] = [
  {
    id: "neck-w",
    name: "거북목 탈출 W 스트레칭",
    target: "능형근 및 하부승모근",
    description: "양 팔꿈치를 뒤로 당겨 날개뼈를 모으고, 턱은 살짝 들어주세요.",
    guide: [
      "팔꿈치를 90도로 굽혀 W 모양을 만들어요.",
      "날개뼈를 모으듯 팔꿈치를 뒤로 당겨요.",
      "턱을 살짝 들고 30초간 유지해요.",
    ],
    hold: 30,
    reps: 1,
    restBetweenReps: 0,
    sides: "both",
    image: "/exercises/neck-w.png",
  },
  {
    id: "chair-squat",
    name: "전신 깨우기 의자 스쿼트",
    target: "대퇴사두근 및 둔근",
    description: "의자 끝에 앉아 무릎이 발끝을 넘지 않게 일어났다 앉아요.",
    guide: [
      "의자 끝에 걸쳐 앉아요.",
      "3초간 천천히 일어나고 1초에 앉아요.",
      "무릎이 발끝보다 앞으로 나가지 않게 주의해요.",
    ],
    hold: 30,
    reps: 1,
    restBetweenReps: 0,
    sides: "both",
    image: "/exercises/chair-squat.png",
  },
  {
    id: "chair-twist",
    name: "의자 트위스트 (몸통 비틀기)",
    target: "척추기립근 및 요방형근",
    description: "의자 등받이를 잡고 상체를 비틀어 양쪽을 번갈아 늘려줘요.",
    guide: [
      "의자 등받이를 양손으로 잡아요.",
      "상체를 천천히 한쪽으로 비틀어 15초 유지해요.",
      "반대쪽도 동일하게 진행해요.",
    ],
    hold: 30,
    reps: 1,
    restBetweenReps: 0,
    sides: "leftRight",
    image: "/exercises/chair-twist.png",
  },
  {
    id: "side-stretch",
    name: "양팔 기지개 옆구리 늘리기",
    target: "광배근 및 옆구리 근육",
    description: "양손을 깍지 껴 머리 위로 올리고 옆구리를 번갈아 늘려줘요.",
    guide: [
      "양손을 깍지 껴 손바닥을 위로 향하게 머리 위로 들어요.",
      "한쪽으로 15초간 기울여 옆구리를 늘려요.",
      "반대쪽도 번갈아 진행해요.",
    ],
    hold: 30,
    reps: 1,
    restBetweenReps: 0,
    sides: "both",
    image: "/exercises/side-stretch.png",
  },
  {
    id: "wrist-stretch",
    name: "손목 굴곡근 이완 스트레칭",
    target: "손목 굴곡근 / 손목터널증후군 예방",
    description: "팔을 펴고 손가락을 부드럽게 당겨 손목 안쪽을 늘려줘요.",
    guide: [
      "한쪽 팔을 앞으로 곧게 펴요.",
      "반대쪽 손으로 손가락을 살짝 당겨 15초 유지해요.",
      "반대쪽 손목도 동일하게 진행해요.",
    ],
    hold: 30,
    reps: 1,
    restBetweenReps: 0,
    sides: "leftRight",
    image: "/exercises/wrist-stretch.png",
  },
];

// ─── Settings ────────────────────────────────────────────────────────────────

export interface Settings {
  notifyStart: string; // "09:00"
  notifyEnd: string;   // "18:00"
  offsetMinutes: number; // 0, 5, 10
  enabledExerciseId: string;
  enabledDays: number[]; // 0=일, 1=월, ..., 6=토
}

export const DEFAULT_SETTINGS: Settings = {
  notifyStart: "09:00",
  notifyEnd: "18:00",
  offsetMinutes: 0,
  enabledExerciseId: EXERCISES[0].id,
  enabledDays: [1, 2, 3, 4, 5], // 평일 기본값
};

// ─── Workout State ────────────────────────────────────────────────────────────

export interface WorkoutState {
  /** key: "YYYY-MM-DD", value: 완료한 시(0-23) 목록 */
  dailyHours: Record<string, number[]>;
  lastCompletedAt: number | null;
}

export const DEFAULT_WORKOUT_STATE: WorkoutState = {
  dailyHours: {},
  lastCompletedAt: null,
};

// ─── Points ───────────────────────────────────────────────────────────────────

export interface FriendEntry {
  id: string;
  name: string;
  totalPoints: number;
}

export interface PointState {
  totalPoints: number;
  invitedFriends: number;
  friends: FriendEntry[];
  dailyPoints: Record<string, number>; // key: "YYYY-MM-DD"
  streakDays: number;
  lastStreakDate: string | null; // "YYYY-MM-DD"
}

export const DEFAULT_POINT_STATE: PointState = {
  totalPoints: 0,
  invitedFriends: 0,
  friends: [],
  dailyPoints: {},
  streakDays: 0,
  lastStreakDate: null,
};

// ─── Storage Keys ─────────────────────────────────────────────────────────────

const SETTINGS_KEY = "jeongunwan.settings";
const WORKOUT_KEY = "jeongunwan.workout";
const POINT_KEY = "jeongunwan.points";

// ─── Settings ─────────────────────────────────────────────────────────────────

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: Settings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// ─── Workout State ─────────────────────────────────────────────────────────────

export function loadWorkoutState(): WorkoutState {
  try {
    const raw = localStorage.getItem(WORKOUT_KEY);
    if (!raw) return { ...DEFAULT_WORKOUT_STATE, dailyHours: {} };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_WORKOUT_STATE, ...parsed, dailyHours: parsed.dailyHours ?? {} };
  } catch {
    return { ...DEFAULT_WORKOUT_STATE, dailyHours: {} };
  }
}

export function saveWorkoutState(state: WorkoutState): void {
  localStorage.setItem(WORKOUT_KEY, JSON.stringify(state));
}

// ─── Point State ──────────────────────────────────────────────────────────────

export function loadPointState(): PointState {
  try {
    const raw = localStorage.getItem(POINT_KEY);
    if (!raw) return { ...DEFAULT_POINT_STATE };
    const parsed = JSON.parse(raw);
    // 레거시/충돌 방어: 이 키에 순수 정수가 들어있던 경우 totalPoints로 승격
    if (typeof parsed === "number") {
      return { ...DEFAULT_POINT_STATE, totalPoints: Number.isFinite(parsed) ? parsed : 0 };
    }
    return {
      ...DEFAULT_POINT_STATE,
      ...parsed,
      friends: parsed.friends ?? [],
      dailyPoints: parsed.dailyPoints ?? {},
    };
  } catch {
    return { ...DEFAULT_POINT_STATE };
  }
}

export function savePointState(state: PointState): void {
  localStorage.setItem(POINT_KEY, JSON.stringify(state));
}

/** 화면 표시·서버 동기화에 쓰는 단일 진실값. 항상 이 함수로 포인트를 읽으세요. */
export function getTotalPoints(): number {
  const t = loadPointState().totalPoints;
  return Number.isFinite(t) ? t : 0;
}

/** 서버에서 받은 포인트 총합을 로컬 PointState에 병합(덮어쓰기 아님). */
export function setTotalPoints(total: number): void {
  const state = loadPointState();
  savePointState({ ...state, totalPoints: Number.isFinite(total) ? Math.round(total) : 0 });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function todayKey(): string {
  return dateKey(new Date());
}

export function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export const ONE_HOUR_MS = 60 * 60 * 1000;

// ─── 닉네임 ───────────────────────────────────────────────────────────────────

const NICK_ADJ = ["활기찬", "유연한", "상쾌한", "기운찬", "느긋한", "날쌘", "튼튼한", "씩씩한"];
const NICK_NOUN = ["스트레처", "거북이", "기린", "수달", "펭귄", "치타", "알파카", "판다"];

/** 저장된 닉네임을 반환하고, 없으면 무해한 랜덤 닉네임을 만들어 저장 후 반환. */
export function getOrCreateNickname(): string {
  const saved = localStorage.getItem("jeongunwan.nickname");
  if (saved && saved.trim() !== "") return saved;
  const nick =
    NICK_ADJ[Math.floor(Math.random() * NICK_ADJ.length)] +
    NICK_NOUN[Math.floor(Math.random() * NICK_NOUN.length)] +
    String(Math.floor(10 + Math.random() * 90));
  localStorage.setItem("jeongunwan.nickname", nick);
  return nick;
}

/** 이번 주 시작(월요일 00:00) ISO 문자열 */
export function weekStartISO(): string {
  const now = new Date();
  const day = now.getDay(); // 0=일
  const diff = (day + 6) % 7; // 월요일까지 거슬러 올라갈 일수
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff);
  return monday.toISOString();
}

/** 이번 달 시작(1일 00:00) ISO 문자열 */
export function monthStartISO(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

export function totalSessionsInRoutine(settings: Settings): number {
  const [sh] = settings.notifyStart.split(":").map(Number);
  const [eh] = settings.notifyEnd.split(":").map(Number);
  if (sh === eh) return 0;
  if (sh < eh) return eh - sh;
  return (24 - sh) + eh;
}

export function getHoursInRoutine(settings: Settings): number[] {
  const [sh] = settings.notifyStart.split(":").map(Number);
  const [eh] = settings.notifyEnd.split(":").map(Number);
  const hours: number[] = [];
  if (sh === eh) return hours;
  if (sh < eh) {
    for (let h = sh; h < eh; h++) hours.push(h);
  } else {
    for (let h = sh; h < 24; h++) hours.push(h);
    for (let h = 0; h < eh; h++) hours.push(h);
  }
  return hours;
}

export function getTodayHours(): number[] {
  const state = loadWorkoutState();
  return state.dailyHours[todayKey()] ?? [];
}

export function canCompleteNow(): boolean {
  const state = loadWorkoutState();
  if (!state.lastCompletedAt) return true;
  return Date.now() - state.lastCompletedAt >= ONE_HOUR_MS;
}

export function isCurrentHourDone(): boolean {
  const hours = getTodayHours();
  return hours.includes(new Date().getHours());
}

export interface CompleteResult {
  awarded: boolean;
  pointsEarned: number;
  todayCount: number;
  dailySuccess: boolean;
  perfectDay: boolean;
}

export function completeExercise(): CompleteResult {
  const workoutState = loadWorkoutState();
  const pointState = loadPointState();
  const now = Date.now();
  const settings = loadSettings();
  const totalSessions = totalSessionsInRoutine(settings);

  const todayHoursBefore = workoutState.dailyHours[todayKey()] ?? [];
  if (workoutState.lastCompletedAt && now - workoutState.lastCompletedAt < ONE_HOUR_MS) {
    return {
      awarded: false,
      pointsEarned: 0,
      todayCount: todayHoursBefore.length,
      dailySuccess: false,
      perfectDay: false,
    };
  }

  const key = todayKey();
  const todayHours = [...(workoutState.dailyHours[key] ?? [])];
  const currentHour = new Date().getHours();
  if (!todayHours.includes(currentHour)) {
    todayHours.push(currentHour);
  }
  workoutState.dailyHours[key] = todayHours;
  workoutState.lastCompletedAt = now;
  saveWorkoutState(workoutState);

  const todayCount = todayHours.length;
  const dailySuccess = todayCount >= 5;
  const perfectDay = totalSessions > 0 && todayCount >= totalSessions;

  let pointsEarned = 1;
  if (dailySuccess && todayCount === 5) pointsEarned += 2;
  if (perfectDay && todayCount === totalSessions) pointsEarned += 3;

  // streak
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = dateKey(yesterday);
  if (pointState.lastStreakDate === yesterdayKey) {
    pointState.streakDays += 1;
  } else if (pointState.lastStreakDate !== key) {
    pointState.streakDays = dailySuccess ? 1 : 0;
  }
  if (dailySuccess) {
    pointState.lastStreakDate = key;
    if (pointState.streakDays > 0 && pointState.streakDays % 5 === 0) {
      pointsEarned += 5;
    }
  }

  const todayPointsBefore = pointState.dailyPoints[key] ?? 0;
  pointState.dailyPoints[key] = todayPointsBefore + pointsEarned;
  pointState.totalPoints += pointsEarned;
  savePointState(pointState);

  return { awarded: true, pointsEarned, todayCount, dailySuccess, perfectDay };
}

// ─── Legacy stubs (InAppAdsPage 등 기존 코드와의 호환) ───────────────────────

export interface RewardHistoryEntry {
  date: string;
  count: number;
  points: number;
}

export interface RewardState {
  totalPoints: number;
  lastCompletedAt: number | null;
  history: Record<string, RewardHistoryEntry>;
}

export const DEFAULT_REWARD_STATE: RewardState = {
  totalPoints: 0,
  lastCompletedAt: null,
  history: {},
};

export const GENERAL_REWARD_POINTS = 10;
export const BONUS_REWARD_POINTS = 50;
export const BONUS_THRESHOLD_COUNT = 8;

export function loadRewardState(): RewardState {
  return { totalPoints: 0, lastCompletedAt: null, history: {} };
}

export function saveRewardState(_state: RewardState): void {}
