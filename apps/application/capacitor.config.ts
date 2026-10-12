import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.gym4me.app",
  appName: "Gym4Me",
  webDir: ".next-native",
  // Bundle local assets for release; no remote server.url or cleartext exceptions.
  ios: { contentInset: "never" },
  android: { backgroundColor: "#F4FFF7" },
  plugins: {
    SystemBars: {
      insetsHandling: "css",
      initialViewportFitValueHint: "cover",
    },
  },
};
export default config;
