import { colors } from "@toss/tds-colors";
import { Button, List, ListRow, TextField, Top } from "@toss/tds-mobile";
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
  const [myCode, setMyCode] = useState<string | null>(null);
  const [codeInput, setCodeInput] = useState("");
  const [codeBusy, setCodeBusy] = useState(false);

  useEffect(() => {
    if (authCode && userKey) {
      fetchFriends(userKey).then(setFriends);
      getOrCreateFriendCode(userKey).then(setMyCode);
    }
  }, [authCode, userKey]);

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

  return (
    <div style={{ paddingBottom: "80px" }}>
      <Top
        title={<Top.TitleParagraph size={22}>내 프로필</Top.TitleParagraph>}
        subtitleBottom={
          <Top.SubtitleParagraph size={17}>
            {authCode && nickname ? nickname : "토스 계정을 연결하세요"}
          </Top.SubtitleParagraph>
        }
      />

      {/* 포인트 카드 — 로그인 후에만 표시 */}
      {authCode && (
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
      )}

      {/* 토스 로그인 / 로그인 상태 */}
      {!authCode ? (
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
      ) : (
        <div
          style={{
            margin: "0 24px 16px",
            padding: "16px",
            borderRadius: "12px",
            background: colors.grey100,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <p style={{ margin: 0, fontSize: "13px", color: colors.grey500 }}>로그인 상태</p>
            <p style={{ margin: "2px 0 0", fontSize: "15px", fontWeight: "bold", color: colors.grey900 }}>
              토스 계정 연결됨
            </p>
          </div>
          <button
            onClick={handleLogout}
            style={{
              background: "none",
              border: "none",
              fontSize: "13px",
              color: colors.grey500,
              cursor: "pointer",
              padding: "4px 8px",
            }}
          >
            로그아웃
          </button>
        </div>
      )}

      {/* 닉네임 수정 */}
      {authCode && (
        editing ? (
          <div style={{ padding: "0 24px 16px" }}>
            <TextField
              variant="box"
              label="새 닉네임"
              value={nicknameInput}
              onChange={(e) => { setNicknameInput(e.target.value); setNicknameError(null); }}
              placeholder="예: 운동왕 김철수"
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
          <div style={{ padding: "0 24px 16px" }}>
            <Button
              display="full"
              size="medium"
              color="dark"
              variant="weak"
              onClick={() => { setNicknameInput(nickname); setEditing(true); }}
            >
              닉네임 변경하기
            </Button>
          </div>
        )
      )}

      {/* 친구 초대 */}
      {authCode && (
        <div style={{ padding: "0 24px 16px" }}>
          <Button display="full" size="xlarge" onClick={handleInvite}>
            {copied ? "링크 복사됐어요!" : "친구 초대하기"}
          </Button>
        </div>
      )}

      {/* 친구 코드 */}
      {authCode && (
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
      )}

      {/* 친구 리스트 */}
      {authCode && (
        <List groupTitle={`내 친구 ${friends.length > 0 ? `(${friends.length})` : ""}`}>
          {friends.length === 0 ? (
            <ListRow
              verticalPadding="large"
              contents={
                <ListRow.Texts
                  type="2RowTypeA"
                  top="아직 친구가 없어요"
                  topProps={{ color: colors.grey800, fontWeight: "bold" }}
                  bottom="초대 링크를 보내면 친구로 등록돼요"
                  bottomProps={{ color: colors.grey600 }}
                />
              }
            />
          ) : (
            friends.map((f) => (
              <ListRow
                key={f.user_key}
                verticalPadding="large"
                contents={
                  <ListRow.Texts
                    type="2RowTypeA"
                    top={f.nickname}
                    topProps={{ color: colors.grey800, fontWeight: "bold" }}
                    bottom={`${Math.round(f.points).toLocaleString()}P`}
                    bottomProps={{ color: colors.grey600 }}
                  />
                }
              />
            ))
          )}
        </List>
      )}

      {/* 진단용: 내 식별키 + 앱 버전 */}
      <p style={{ padding: "16px 24px 0", margin: 0, fontSize: 11, color: colors.grey400, wordBreak: "break-all" }}>
        내 식별키: {userKey ?? "(로딩 중)"} · v2026.07.19
      </p>
    </div>
  );
}
