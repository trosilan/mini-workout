import { colors } from "@toss/tds-colors";
import { Button, TextField, Top } from "@toss/tds-mobile";
import { appLogin, getTossShareLink, setClipboardText, share } from "@apps-in-toss/web-framework";
import { useEffect, useState } from "react";
import { getTotalPoints } from "../data";
import { inviteDeepLink } from "../referral";
import {
  fetchFriends,
  findUserByFriendCode,
  getOrCreateFriendCode,
  isNicknameTaken,
  recordFriendship,
  upsertUser,
  type UserRow,
} from "../supabase";

interface ProfilePageProps {
  onNicknameRequired?: () => void;
  onLogin?: () => void;
  userKey?: string | null;
}

export function ProfilePage({ onNicknameRequired, onLogin, userKey }: ProfilePageProps) {
  const [authCode, setAuthCode] = useState<string | null>(
    () => localStorage.getItem("jeongunwan.authCode")
  );
  const [loginLoading, setLoginLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [points] = useState(() => getTotalPoints());
  const [nickname, setNickname] = useState<string>(
    () => localStorage.getItem("jeongunwan.nickname") ?? ""
  );

  const [editing, setEditing] = useState(false);
  const [nicknameInput, setNicknameInput] = useState("");
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [nicknameChecking, setNicknameChecking] = useState(false);

  const [friends, setFriends] = useState<UserRow[]>([]);
  const [showFriends, setShowFriends] = useState(false);
  const [myCode, setMyCode] = useState<string | null>(null);
  const [codeInput, setCodeInput] = useState("");
  const [codeBusy, setCodeBusy] = useState(false);

  useEffect(() => {
    if (authCode && userKey) {
      fetchFriends(userKey).then(setFriends);
      getOrCreateFriendCode(userKey).then(setMyCode);
    }
  }, [authCode, userKey]);

  const handleLogin = async () => {
    setLoginLoading(true);
    try {
      const { authorizationCode } = await appLogin();
      localStorage.setItem("jeongunwan.authCode", authorizationCode);
      setAuthCode(authorizationCode);
      onLogin?.();
      const savedNick = localStorage.getItem("jeongunwan.nickname");
      if (!savedNick || savedNick.trim() === "") {
        onNicknameRequired?.();
      }
    } catch {
      // user cancelled or error
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("jeongunwan.authCode");
    setAuthCode(null);
  };

  const handleNicknameSave = async () => {
    const trimmed = nicknameInput.trim();
    if (!trimmed) return;
    setNicknameChecking(true);
    setNicknameError(null);
    try {
      const taken = await isNicknameTaken(trimmed, userKey ?? undefined);
      if (taken) {
        setNicknameError("이미 사용 중인 닉네임이에요.");
        return;
      }
      localStorage.setItem("jeongunwan.nickname", trimmed);
      setNickname(trimmed);
      setEditing(false);
      setNicknameInput("");
      if (userKey) {
        await upsertUser(userKey, trimmed, getTotalPoints());
      }
    } finally {
      setNicknameChecking(false);
    }
  };

  const handleInvite = async () => {
    try {
      const link = await getTossShareLink(inviteDeepLink(userKey ?? ""));
      await share({ message: `스트레칭각에서 나랑 같이 스트레칭 해요! 💪\n${link}` });
      return;
    } catch {
      // 토스앱 밖: 클립보드 폴백
    }
    try {
      await setClipboardText("https://toss.im/short-workout");
    } catch {
      try {
        await navigator.clipboard.writeText("https://toss.im/short-workout");
      } catch {
        // ignore
      }
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyCode = async () => {
    if (!myCode) return;
    try {
      await setClipboardText(myCode);
    } catch {
      try {
        await navigator.clipboard.writeText(myCode);
      } catch {
        // ignore
      }
    }
    alert("친구 코드가 복사됐어요!");
  };

  const handleAddByCode = async () => {
    if (!userKey) return;
    setCodeBusy(true);
    try {
      const found = await findUserByFriendCode(codeInput);
      if (!found) {
        alert("해당 코드의 친구를 찾지 못했어요. 코드를 다시 확인해주세요.");
        return;
      }
      if (found.user_key === userKey) {
        alert("본인 코드는 등록할 수 없어요 😅");
        return;
      }
      await recordFriendship(userKey, found.user_key);
      setCodeInput("");
      fetchFriends(userKey).then(setFriends);
      alert(`${found.nickname}님과 친구가 됐어요!`);
    } finally {
      setCodeBusy(false);
    }
  };

  // ── 비로그인 화면 ──────────────────────────────────────────────────────────
  if (!authCode) {
    return (
      <div style={{ paddingBottom: "80px" }}>
        <Top
          title={<Top.TitleParagraph size={22}>내 프로필</Top.TitleParagraph>}
          subtitleBottom={
            <Top.SubtitleParagraph size={17}>토스 계정을 연결하세요</Top.SubtitleParagraph>
          }
        />
        <div style={{ padding: "0 24px 20px" }}>
          <Button
            display="full"
            size="xlarge"
            color="primary"
            onClick={handleLogin}
            disabled={loginLoading}
          >
            {loginLoading ? "로그인 중..." : "토스로 로그인"}
          </Button>
        </div>
        <p style={{ padding: "16px 24px 0", margin: 0, fontSize: 11, color: colors.grey400, wordBreak: "break-all" }}>
          내 식별키: {userKey ?? "(로딩 중)"} · v2026.07.19
        </p>
      </div>
    );
  }

  // ── 로그인 화면 ────────────────────────────────────────────────────────────
  return (
    <div style={{ paddingBottom: "80px" }}>
      <Top title={<Top.TitleParagraph size={22}>내 프로필</Top.TitleParagraph>} />

      {/* 닉네임 + 연필 (인라인 수정) */}
      <div style={{ padding: "0 24px 16px" }}>
        {editing ? (
          <div>
            <TextField
              variant="box"
              label="새 닉네임"
              value={nicknameInput}
              onChange={(e) => { setNicknameInput(e.target.value); setNicknameError(null); }}
              placeholder="예: 활기찬거북이42"
              maxLength={12}
            />
            {nicknameError && (
              <p style={{ margin: "4px 0 0", fontSize: 13, color: colors.red500 }}>{nicknameError}</p>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <Button
                size="medium"
                color="dark"
                variant="weak"
                onClick={() => { setEditing(false); setNicknameError(null); }}
              >
                취소
              </Button>
              <Button
                size="medium"
                onClick={handleNicknameSave}
                disabled={nicknameInput.trim().length === 0 || nicknameChecking}
              >
                {nicknameChecking ? "확인 중..." : "저장"}
              </Button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 24, fontWeight: "bold", color: colors.grey900 }}>
              {nickname || "닉네임 없음"}
            </span>
            <button
              onClick={() => { setNicknameInput(nickname); setEditing(true); }}
              aria-label="닉네임 수정"
              style={{
                background: colors.grey100,
                border: "none",
                borderRadius: 8,
                padding: "6px 8px",
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              ✏️
            </button>
          </div>
        )}
      </div>

      {/* 포인트 카드 */}
      <div
        style={{
          margin: "0 24px 16px",
          padding: "16px",
          borderRadius: "12px",
          background: colors.grey100,
        }}
      >
        <p style={{ margin: 0, fontSize: "13px", color: colors.grey500 }}>내 포인트</p>
        <p style={{ margin: "4px 0 0", fontSize: "22px", fontWeight: "bold", color: colors.grey900 }}>
          {points.toLocaleString()} P
        </p>
      </div>

      {/* 친구 초대 */}
      <div style={{ padding: "0 24px 12px" }}>
        <Button display="full" size="xlarge" onClick={handleInvite}>
          {copied ? "링크 복사됐어요!" : "친구 초대하기"}
        </Button>
      </div>

      {/* 친구 코드 */}
      <div style={{ padding: "0 24px 16px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            background: colors.grey100,
            borderRadius: 12,
            marginBottom: 8,
          }}
        >
          <div>
            <p style={{ margin: 0, fontSize: 12, color: colors.grey500 }}>내 친구 코드</p>
            <p style={{ margin: "2px 0 0", fontSize: 18, fontWeight: "bold", letterSpacing: 2, color: colors.grey900 }}>
              {myCode ?? "생성 중..."}
            </p>
          </div>
          <Button size="small" variant="weak" onClick={handleCopyCode} disabled={!myCode}>
            복사
          </Button>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <TextField
              variant="box"
              label="친구 코드로 추가"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
              placeholder="예: AB3K7P"
              maxLength={6}
            />
          </div>
          <Button
            size="medium"
            onClick={handleAddByCode}
            disabled={codeBusy || codeInput.trim().length === 0}
          >
            {codeBusy ? "확인 중..." : "추가"}
          </Button>
        </div>
      </div>

      {/* 내 친구 — 접기/펼치기 */}
      <div style={{ padding: "0 24px 8px" }}>
        <button
          onClick={() => setShowFriends((v) => !v)}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 16px",
            background: colors.grey50,
            border: "none",
            borderRadius: 12,
            cursor: "pointer",
          }}
        >
          <span style={{ fontSize: 15, fontWeight: "bold", color: colors.grey800 }}>
            내 친구 {friends.length}명
          </span>
          <span style={{ fontSize: 13, color: colors.grey500 }}>{showFriends ? "접기 ▲" : "보기 ▼"}</span>
        </button>

        {showFriends && (
          <div style={{ padding: "4px 4px 0" }}>
            {friends.length === 0 ? (
              <p style={{ margin: "10px 0 0", fontSize: 13, color: colors.grey500, textAlign: "center" }}>
                아직 친구가 없어요. 초대 링크나 친구 코드로 추가해보세요!
              </p>
            ) : (
              friends.map((f) => (
                <div
                  key={f.user_key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 12px",
                  }}
                >
                  <span style={{ fontSize: 15, color: colors.grey800 }}>{f.nickname}</span>
                  <span style={{ fontSize: 13, color: colors.grey500 }}>
                    {Math.round(f.points).toLocaleString()}P
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* 하단: 계정 상태 · 로그아웃 · 식별키 */}
      <div style={{ padding: "20px 24px 0" }}>
        <p style={{ margin: 0, fontSize: 12, color: colors.grey500 }}>
          토스 계정 연결됨 ·{" "}
          <button
            onClick={handleLogout}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              fontSize: 12,
              color: colors.grey500,
              textDecoration: "underline",
              cursor: "pointer",
            }}
          >
            로그아웃
          </button>
        </p>
        <p style={{ margin: "6px 0 0", fontSize: 11, color: colors.grey400, wordBreak: "break-all" }}>
          내 식별키: {userKey ?? "(로딩 중)"} · v2026.07.19
        </p>
      </div>
    </div>
  );
}
