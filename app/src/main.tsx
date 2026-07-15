import { TDSMobileAITProvider } from "@toss/tds-mobile-ait";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import config from "../granite.config.ts";
import App from "./App.tsx";
import { ensureAdsInitialized } from "./ads.ts";
import "./index.css";

// 광고 SDK를 앱 시작 시 미리 초기화(비동기 완료는 배너가 기다림)
ensureAdsInitialized();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <TDSMobileAITProvider brandPrimaryColor={config.brand.primaryColor}>
      <App />
    </TDSMobileAITProvider>
  </StrictMode>,
);
