import { TossAds } from "@apps-in-toss/web-framework";

/**
 * TossAds 초기화는 비동기(onInitialized 콜백)이고 attachBanner는 초기화 완료 후에만
 * 정상 동작한다. 앱 전역에서 단 한 번만 초기화하고, 완료를 기다릴 수 있게 Promise로 공유한다.
 */
let readyPromise: Promise<boolean> | null = null;

export function ensureAdsInitialized(): Promise<boolean> {
  if (readyPromise) return readyPromise;

  readyPromise = new Promise<boolean>((resolve) => {
    try {
      const supported = TossAds.initialize.isSupported?.() ?? false;
      if (!supported) {
        console.info("[ads] TossAds not supported in this environment");
        resolve(false);
        return;
      }

      // 안전장치: onInitialized가 오지 않아도 5초 후 진행
      const timer = setTimeout(() => {
        console.warn("[ads] initialize timed out (no onInitialized within 5s)");
        resolve(true);
      }, 5000);

      TossAds.initialize({
        callbacks: {
          onInitialized: () => {
            clearTimeout(timer);
            console.log("[ads] initialized");
            resolve(true);
          },
          onInitializationFailed: (e) => {
            clearTimeout(timer);
            console.error("[ads] initialization failed:", e);
            resolve(false);
          },
        },
      });
    } catch (e) {
      console.error("[ads] initialize threw:", e);
      resolve(false);
    }
  });

  return readyPromise;
}
