import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "Easyfest",
  slug: "easyfest",
  version: "0.0.1",
  orientation: "portrait",
  icon: "./assets/icon.png",
  scheme: "easyfest",
  userInterfaceStyle: "automatic",
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#FFF4E6",
  },
  assetBundlePatterns: ["**/*"],
  android: {
    package: "app.easyfest",
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#FF5E5B",
    },
    permissions: [
      "android.permission.CAMERA",
      "android.permission.INTERNET",
      "android.permission.ACCESS_NETWORK_STATE",
    ],
  },
  // iOS: pas de support natif V1 (verbatim Pam)
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/favicon.png",
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    [
      "expo-camera",
      {
        cameraPermission:
          "Easyfest accède à la caméra pour scanner les QR codes des bénévoles à l'entrée et à la prise de poste.",
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: { projectId: process.env["EAS_PROJECT_ID"] ?? "00000000-0000-0000-0000-000000000000" },
    supabaseUrl: process.env["EXPO_PUBLIC_SUPABASE_URL"],
    supabaseAnonKey: process.env["EXPO_PUBLIC_SUPABASE_ANON_KEY"],
    appUrl: process.env["EXPO_PUBLIC_APP_URL"] ?? "https://easyfest.app",
    sentryDsn: process.env["EXPO_PUBLIC_SENTRY_DSN_MOBILE"],
    posthogKey: process.env["EXPO_PUBLIC_POSTHOG_KEY"],
  },
};

export default config;
