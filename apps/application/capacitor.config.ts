import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.gym4me.app",
  appName: "Gym4Me",
  webDir: ".next-native",
  // Bridge traces include secure-storage results and authenticated request headers.
  loggingBehavior: "none",
  appendUserAgent: " Gym4Me/0.1 (com.gym4me.app)",
  // Bundle local assets for release; no remote server.url or cleartext exceptions.
  ios: { contentInset: "never" },
  android: { backgroundColor: "#101113" },
  plugins: {
    SystemBars: {
      insetsHandling: "css",
      initialViewportFitValueHint: "cover",
    },
  },
};
export default config;
