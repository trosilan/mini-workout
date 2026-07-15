import { colors } from "@toss/tds-colors";
import { Button, TextField, Top } from "@toss/tds-mobile";
import { useState } from "react";
import { isNicknameTaken } from "../supabase";

interface NicknamePageProps {
  onComplete: (nickname: string) => void;
  userKey?: string | null;
}

export function NicknamePage({ onComplete, userKey }: NicknamePageProps) {
  const [nickname, setNickname] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trimmed = nickname.trim();

  const handleSubmit = async () => {
    if (!trimmed) return;
    setChecking(true);
    setError(null);
    try {
      const taken = await isNicknameTaken(trimmed, userKey ?? undefined);
      if (taken) {
        setError("이미 사용 중인 닉네임이에요. 다른 닉네임을 입력해주세요.");
        return;
      }
      localStorage.setItem("jeongunwan.nickname", trimmed);
      onComplete(trimmed);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        padding: "0 24px",
      }}
    >
      <Top
        title={<Top.TitleParagraph size={22}>닉네임 설정</Top.TitleParagraph>}
        subtitleBottom={
          <Top.SubtitleParagraph size={17}>
            리더보드에서 사용할 이름을 입력해주세요
          </Top.SubtitleParagraph>
        }
      />

      <div style={{ marginTop: 8 }}>
        <TextField
          variant="box"
          label="닉네임"
          value={nickname}
          onChange={(e) => { setNickname(e.target.value); setError(null); }}
          placeholder="예: 운동왕 김철수"
          maxLength={12}
        />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
          {error ? (
            <p style={{ margin: 0, fontSize: "13px", color: colors.red500 }}>{error}</p>
          ) : (
            <span />
          )}
          <p style={{ margin: 0, fontSize: "13px", color: colors.grey500 }}>
            {trimmed.length}/12
          </p>
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <Button
          display="full"
          size="xlarge"
          onClick={handleSubmit}
          disabled={trimmed.length === 0 || checking}
        >
          {checking ? "확인 중..." : "완료"}
        </Button>
      </div>
    </div>
  );
}
