import type { ConfigContext, ExpoConfig } from "expo/config";

// Static config lives in app.json. This file only injects secrets from the environment,
// so the Google Maps key is never committed. On EAS it comes from the project env var
// GOOGLE_MAPS_API_KEY (environment "development"); locally from mobile/.env.
export default ({ config }: ConfigContext): ExpoConfig => {
  const mapsKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!mapsKey) {
    console.warn("GOOGLE_MAPS_API_KEY is not set: maps will be blank in this build.");
  }
  return {
    ...(config as ExpoConfig),
    plugins: [
      ...(config.plugins ?? []),
      ["react-native-maps", { androidGoogleMapsApiKey: mapsKey }],
    ],
  };
};
