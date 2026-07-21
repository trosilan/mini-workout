// 운동 알림 발송기 — GitHub Actions에서 5분마다 실행
// 유저가 설정한 요일/시간대/분에 맞춰 토스 스마트 발송(대량) API 호출.
// mTLS 필요 → Supabase Edge Runtime에서는 불가능해서 여기(Node)에서 실행.
import https from "node:https";

const SUPABASE_URL = need("SUPABASE_URL");
const SERVICE_KEY = need("SUPABASE_SERVICE_ROLE_KEY");
const MTLS_CERT = need("TOSS_MTLS_CERT");
const MTLS_KEY = need("TOSS_MTLS_KEY");
const TEMPLATE_SET_CODE = process.env.TEMPLATE_SET_CODE ?? "short-workout-push";

const TOSS_HOST = "apps-in-toss-api.toss.im";
const BULK_PATH = "/api-partner/v1/apps-in-toss/messenger/send-bulk-message";
const CHUNK_SIZE = 2500;

function need(name) {
  const v = process.env[name];
  if (!v || v.trim() === "") {
    console.error(`Missing env: ${name}`);
    process.exit(1);
  }
  return v;
}

// ── KST 현재 시각 ────────────────────────────────────────────────────────────
const now = new Date();
const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
const kstHour = kst.getUTCHours();
const kstMinute = kst.getUTCMinutes();
const kstDay = kst.getUTCDay(); // 0=일 ~ 6=토
const hourKey = `${kst.getUTCFullYear()}-${String(kst.getUTCMonth() + 1).padStart(2, "0")}-${String(
  kst.getUTCDate()
).padStart(2, "0")}T${String(kstHour).padStart(2, "0")}`; // 예: 2026-07-08T14 (KST 기준)

// ── Supabase REST 헬퍼 ───────────────────────────────────────────────────────
async function sb(method, pathAndQuery, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${pathAndQuery}`, {
    method,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    throw new Error(`Supabase ${method} ${pathAndQuery} → ${res.status} ${await res.text()}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// ── 홈 화면과 동일한 시간대 판정 (자정 넘김 지원) ─────────────────────────────
function inWindow(hour, start, end) {
  if (start === end) return false;
  if (start < end) return hour >= start && hour < end;
  return hour >= start || hour < end;
}

// ── 토스 대량 발송 (mTLS) ────────────────────────────────────────────────────
function sendBulk(anonKeys) {
  const body = JSON.stringify({
    templateSetCode: TEMPLATE_SET_CODE,
    contextList: anonKeys.map((k) => ({ anonKey: k, context: {} })),
  });
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        host: TOSS_HOST,
        path: BULK_PATH,
        method: "POST",
        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
        cert: MTLS_CERT,
        key: MTLS_KEY,
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => resolve({ status: res.statusCode ?? 0, body: data }));
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// ── 단건 테스트 모드: TEST_ANON_KEY가 있으면 그 키로만 1건 발송하고 종료 ────────
const testKey = (process.env.TEST_ANON_KEY ?? "").trim();
if (testKey) {
  const body = JSON.stringify({ templateSetCode: TEMPLATE_SET_CODE, context: {} });
  const res = await new Promise((resolve, reject) => {
    const req = https.request(
      {
        host: TOSS_HOST,
        path: "/api-partner/v1/apps-in-toss/messenger/send-message",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
          "x-anon-key": testKey,
        },
        cert: MTLS_CERT,
        key: MTLS_KEY,
      },
      (r) => {
        let data = "";
        r.on("data", (c) => (data += c));
        r.on("end", () => resolve({ status: r.statusCode ?? 0, body: data }));
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
  console.log(`[test] key=${testKey.slice(0, 8)}... → HTTP ${res.status}`);
  console.log(`[test] response: ${res.body}`);
  process.exit(0);
}

// ── 메인 ─────────────────────────────────────────────────────────────────────
const users = await sb(
  "GET",
  "/users?select=user_key,notify_start_hour,notify_end_hour,notify_offset_minutes,notify_days,last_notified_hour&notify_agreed=eq.true"
);

const due = (users ?? []).filter((u) => {
  const days = Array.isArray(u.notify_days) ? u.notify_days : [1, 2, 3, 4, 5];
  if (!days.includes(kstDay)) return false;
  if (!inWindow(kstHour, u.notify_start_hour ?? 9, u.notify_end_hour ?? 18)) return false;
  // 이번 시간의 목표 분(offset)이 지났고, 아직 이번 시간에 안 보냈으면 발송
  if (kstMinute < (u.notify_offset_minutes ?? 0)) return false;
  if (u.last_notified_hour === hourKey) return false;
  return true;
});

console.log(`[send] KST ${hourKey}:${String(kstMinute).padStart(2, "0")} agreed=${users?.length ?? 0} due=${due.length}`);

if (due.length === 0) process.exit(0);

let sentKeys = [];
for (let i = 0; i < due.length; i += CHUNK_SIZE) {
  const chunk = due.slice(i, i + CHUNK_SIZE).map((u) => u.user_key);
  const res = await sendBulk(chunk);
  console.log(`[send] bulk ${chunk.length}명 → HTTP ${res.status} ${res.body.slice(0, 300)}`);
  if (res.status === 200) sentKeys = sentKeys.concat(chunk);
}

// 중복 발송 방지 마킹
if (sentKeys.length > 0) {
  const list = sentKeys.map((k) => `"${k}"`).join(",");
  await sb("PATCH", `/users?user_key=in.(${encodeURIComponent(list)})`, {
    last_notified_hour: hourKey,
  });
  console.log(`[send] marked ${sentKeys.length} users as notified for ${hourKey}`);
}
