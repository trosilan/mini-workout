import { defineConfig } from "@apps-in-toss/web-framework/config";

export default defineConfig({
  appName: "short-workout",
  brand: {
    displayName: "스트레칭각",
    primaryColor: "#3182F6",
    icon: "https://static.toss.im/appsintoss/50999/7b782b3b-f769-4ba7-89cb-da291ddf21fa.png",
  },
  web: {
    host: "localhost",
    port: 5173,
    commands: {
      dev: "vite dev",
      build: "vite build",
    },
  },
  permissions: [],
  outdir: "dist",
});
