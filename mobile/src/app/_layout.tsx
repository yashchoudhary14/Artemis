// Per-weight imports so only the font files we use are bundled.
import { Geist_400Regular } from "@expo-google-fonts/geist/400Regular";
import { Geist_500Medium } from "@expo-google-fonts/geist/500Medium";
import { Geist_600SemiBold } from "@expo-google-fonts/geist/600SemiBold";
import { InstrumentSerif_400Regular } from "@expo-google-fonts/instrument-serif/400Regular";
import { InstrumentSerif_400Regular_Italic } from "@expo-google-fonts/instrument-serif/400Regular_Italic";
import { Marcellus_400Regular } from "@expo-google-fonts/marcellus/400Regular";
import { PlayfairDisplay_700Bold } from "@expo-google-fonts/playfair-display/700Bold";
import { PlayfairDisplay_900Black } from "@expo-google-fonts/playfair-display/900Black";
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
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    InstrumentSerif_400Regular,
    InstrumentSerif_400Regular_Italic,
    Marcellus_400Regular,
    PlayfairDisplay_700Bold,
    PlayfairDisplay_900Black,
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
          <ActivityIndicator color={colors.ink} />
        </View>
      )}
    </SafeAreaProvider>
  );
}
