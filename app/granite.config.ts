import { defineConfig } from "@apps-in-toss/web-framework/config";

export default defineConfig({
  appName: "short-workout",
  brand: {
    displayName: "스트레칭각",
    primaryColor: "#3182F6",
    icon: "https://static.toss.im/appsintoss/50999/1afb72da-2dbc-440c-aff4-dea3ae61b929.png",
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
