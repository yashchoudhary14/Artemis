// Per-weight imports so only the 8 font files we use are bundled.
import { PlayfairDisplay_500Medium } from "@expo-google-fonts/playfair-display/500Medium";
import { PlayfairDisplay_500Medium_Italic } from "@expo-google-fonts/playfair-display/500Medium_Italic";
import { PlayfairDisplay_600SemiBold } from "@expo-google-fonts/playfair-display/600SemiBold";
import { PlusJakartaSans_400Regular } from "@expo-google-fonts/plus-jakarta-sans/400Regular";
import { PlusJakartaSans_500Medium } from "@expo-google-fonts/plus-jakarta-sans/500Medium";
import { PlusJakartaSans_600SemiBold } from "@expo-google-fonts/plus-jakarta-sans/600SemiBold";
import { PlusJakartaSans_700Bold } from "@expo-google-fonts/plus-jakarta-sans/700Bold";
import { PlusJakartaSans_800ExtraBold } from "@expo-google-fonts/plus-jakarta-sans/800ExtraBold";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ActivityIndicator, AppState, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PanicRecorder } from "@/components/PanicRecorder";
import { ensureDemoSetup, refreshMe } from "@/lib/account";
import { flushQueue, panicStore, restorePanic } from "@/lib/panic";
import { flushPendingEnds, sessionStore } from "@/lib/session";
import { loadSuspicionSettings, startListening } from "@/lib/suspicion";
// Importing tracking registers the background heartbeat task at startup (must be global scope).
import { resumeTrackingIfActive } from "@/lib/tracking";
import { loadZones } from "@/lib/zones";
import { colors, gradients } from "@/theme";

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    PlayfairDisplay_500Medium,
    PlayfairDisplay_500Medium_Italic,
    PlayfairDisplay_600SemiBold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    ...Ionicons.font,
  });

  useEffect(() => {
    void (async () => {
      await Promise.all([loadZones(), loadSuspicionSettings(), restorePanic()]);
      await ensureDemoSetup();
      await resumeTrackingIfActive();
      // Uneasy mode survives an app restart (until its 30 minutes are up).
      const active = sessionStore.get();
      if (active?.suspicionEndsAt && active.suspicionEndsAt > Date.now() && !panicStore.get().active) void startListening();
      void refreshMe();
      void flushPendingEnds();
    })();
    // Keep retrying unsent audio chunks and session ends.
    const timer = setInterval(() => {
      void flushQueue();
      void flushPendingEnds();
    }, 15_000);
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") {
        void refreshMe();
        void flushQueue();
      }
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {/* The recorder must stay mounted even while fonts load (an SOS can be restored at startup). */}
      <PanicRecorder />
      {fontsLoaded || fontError ? (
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: "fade_from_bottom" }} />
      ) : (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", experimental_backgroundImage: gradients.screen, backgroundColor: colors.bg }}>
          <ActivityIndicator color={colors.violet} />
        </View>
      )}
    </SafeAreaProvider>
  );
}
