import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { AppState } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PanicRecorder } from "@/components/PanicRecorder";
import { ensureDemoSetup, refreshMe } from "@/lib/account";
import { flushQueue, panicStore, restorePanic } from "@/lib/panic";
import { flushPendingEnds, sessionStore } from "@/lib/session";
import { loadSuspicionSettings, startListening } from "@/lib/suspicion";
// Importing tracking registers the background heartbeat task at startup (must be global scope).
import { resumeTrackingIfActive } from "@/lib/tracking";
import { loadZones } from "@/lib/zones";
import { colors } from "@/theme";

export default function RootLayout() {
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
      <PanicRecorder />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
    </SafeAreaProvider>
  );
}
