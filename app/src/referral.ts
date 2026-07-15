import { getSchemeUri } from "@apps-in-toss/web-framework";

const SHARE_PATH = "intoss://short-workout";

/** 초대 링크(공유용) 딥링크 경로. 내 userKey를 ref로 심는다. */
export function inviteDeepLink(myUserKey: string): string {
  return `${SHARE_PATH}?ref=${encodeURIComponent(myUserKey)}`;
}

/**
 * 앱이 진입한 스킴/URL에서 초대한 사람(ref)의 userKey를 읽는다.
 * 토스앱에선 getSchemeUri(), 그 외 환경에선 window.location으로 폴백.
 */
export function readReferralKey(): string | null {
  let uri = "";
  try {
    uri = getSchemeUri() ?? "";
  } catch {
    // 미지원 환경
  }
  if (!uri) {
    try {
      uri = window.location.href;
    } catch {
      // ignore
    }
  }
  if (!uri || uri.indexOf("?") === -1) return null;
  try {
    const query = uri.substring(uri.indexOf("?") + 1);
    const ref = new URLSearchParams(query).get("ref");
    return ref && ref.trim() !== "" ? ref : null;
  } catch {
    return null;
  }
}

/**
 * 앱이 진입한 딥링크의 경로(screenName)를 읽는다.
 * 예: intoss://short-workout/workout → "workout"
 */
export function readLaunchPath(): string | null {
  let uri = "";
  try {
    uri = getSchemeUri() ?? "";
  } catch {
    // 미지원 환경
  }
  if (!uri) {
    try {
      uri = window.location.href;
    } catch {
      // ignore
    }
  }
  if (!uri) return null;
  try {
    const noQuery = uri.split("?")[0];
    const m = noQuery.match(/short-workout\/([^/?#]+)/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}
