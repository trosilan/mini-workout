import { TossAds } from "@apps-in-toss/web-framework";
import { useEffect, useRef } from "react";

import { ensureAdsInitialized } from "../ads";

interface BannerAdProps {
  adGroupId: string;
  position?: "fixed" | "static";
}

export function BannerAd({ adGroupId, position = "fixed" }: BannerAdProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let banner: ReturnType<typeof TossAds.attachBanner> | null = null;
    let cancelled = false;

    // 초기화 완료를 기다린 뒤 배너 부착 (초기화 전에 attach하면 안 뜸)
    ensureAdsInitialized().then((ready) => {
      if (!ready || cancelled || !containerRef.current) return;
      try {
        banner = TossAds.attachBanner(adGroupId, containerRef.current, {
          theme: "auto",
          callbacks: {
            onAdRendered: () => console.log("[ads] banner rendered:", adGroupId),
            onAdViewable: () => console.log("[ads] banner viewable:", adGroupId),
            onNoFill: () => console.warn("[ads] banner no fill (승인/재고 확인):", adGroupId),
            onAdFailedToRender: (p) =>
              console.error("[ads] banner failed to render:", adGroupId, p?.error),
          },
        });
      } catch (e) {
        console.error("[ads] attachBanner threw:", adGroupId, e);
      }
    });

    return () => {
      cancelled = true;
      try {
        banner?.destroy();
      } catch {
        // ignore
      }
    };
  }, [adGroupId]);

  return (
    <div
      style={{
        position,
        bottom: position === "fixed" ? 0 : undefined,
        left: position === "fixed" ? 0 : undefined,
        right: position === "fixed" ? 0 : undefined,
        minHeight: "96px",
        background: "transparent",
      }}
    >
      <div ref={containerRef} style={{ width: "100%", minHeight: "96px" }} />
    </div>
  );
}
