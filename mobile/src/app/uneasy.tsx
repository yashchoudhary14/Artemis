import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { PinPad } from "@/components/PinPad";
import { Banner, Brand, Card, Chip, Field, Hero, Muted, PillButton, Row, Screen } from "@/components/ui";
import { endSuspicionQuietly, endWithPin, startSuspicionSession, SUSPICION_MINUTES } from "@/lib/actions";
import { meStore } from "@/lib/account";
import { panicStore } from "@/lib/panic";
import { saveActive, sessionStore } from "@/lib/session";
import { useStore } from "@/lib/store";
import { saveSuspicionSettings, startListening, stopListening, suspicionStore } from "@/lib/suspicion";
import { colors, space, type } from "@/theme";

// F2: "I feel uneasy" — 15 s heartbeats + on-device keyword listening, auto-off after 30 min.
export default function Uneasy() {
  const active = useStore(sessionStore);
  const s = useStore(suspicionStore);
  const panic = useStore(panicStore);
  const { me } = useStore(meStore);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [word, setWord] = useState(s.customWord);
  const [now, setNow] = useState(Date.now());
  const [askPin, setAskPin] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const on = Boolean(active?.suspicionEndsAt) && !panic.active;

  useEffect(() => {
    if (!on) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [on]);

  // Auto-off after 30 minutes unless extended (battery + privacy).
  useEffect(() => {
    if (on && active?.suspicionEndsAt && now >= active.suspicionEndsAt) void endSuspicionQuietly();
  }, [on, now, active?.suspicionEndsAt]);

  // Panic took over: go to the SOS screen.
  useEffect(() => {
    if (panic.active) router.replace("/sos");
  }, [panic.active]);

  const start = async () => {
    setError(null);
    if (!me?.contacts.some((c) => c.tier === "inner")) return setError("Add someone to your inner circle in Rise first.");
    setBusy(true);
    try {
      await saveSuspicionSettings({ customWord: word.trim().toLowerCase() });
      await startSuspicionSession();
      if (!(await startListening())) setError(suspicionStore.get().error);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const extend = async () => {
    if (!active) return;
    await saveActive({ ...active, suspicionEndsAt: Date.now() + SUSPICION_MINUTES * 60_000 });
  };

  const stop = async () => {
    // Ending a plain uneasy session needs no PIN only if it is still quiet; a walk keeps running.
    if (active?.kind === "suspicion") setAskPin(true);
    else {
      stopListening();
      if (active) await saveActive({ ...active, suspicionEndsAt: undefined });
    }
  };

  const onPin = async (pin: string) => {
    const r = await endWithPin(pin);
    if (r === "wrong") return setPinError("That PIN didn't match. Try again.");
    if (r === "unset") return setPinError("Set your PIN in Rise first.");
    setAskPin(false);
    router.replace("/");
  };

  if (askPin) {
    return (
      <Screen>
        <Brand />
        <PinPad title="Enter your PIN" hint="To turn off uneasy mode" onComplete={onPin} error={pinError} />
        <PillButton label="Back" variant="ghost" onPress={() => setAskPin(false)} />
      </Screen>
    );
  }

  const left = active?.suspicionEndsAt ? Math.max(0, active.suspicionEndsAt - now) : 0;
  const mins = Math.floor(left / 60000);
  const secs = Math.floor((left % 60000) / 1000);

  return (
    <Screen>
      <Brand right={<Pressable onPress={() => router.back()}><Text style={{ fontSize: 15, color: colors.muted }}>Close</Text></Pressable>} />
      <Hero title={"Feeling uneasy?"} subtitle="SafeWalk stays with you: your circle can see where you are, and saying your safety word sends an alert straight away." />

      {on ? (
        <Card tint="lilac">
          <Row>
            <View style={[styles.pulse, s.listening && !s.paused ? styles.pulseOn : null]} />
            <Text style={type.h2}>{s.paused ? "Paused in your private zone" : s.listening ? "Listening for your words" : "Starting…"}</Text>
          </Row>
          <Text style={styles.timer}>
            {mins}:{String(secs).padStart(2, "0")}
          </Text>
          <Muted>Turns itself off when the time runs out, unless you extend it.</Muted>
          {s.lastHeard ? <Muted style={{ marginTop: space.sm }}>Last heard: “{s.lastHeard.slice(0, 80)}”</Muted> : null}
          <Row style={{ marginTop: space.lg }}>
            <PillButton label="+30 min" variant="soft" style={{ flex: 1 }} onPress={extend} />
            <PillButton label="Turn off" variant="dark" style={{ flex: 1 }} onPress={stop} />
          </Row>
        </Card>
      ) : (
        <Card>
          <Text style={[type.label, { marginBottom: 8 }]}>Safety words</Text>
          <Muted>"help" and "bachao" always work. Add one word of your own:</Muted>
          <View style={{ height: space.sm }} />
          <Field placeholder="Your own word (optional)" value={word} onChangeText={setWord} maxLength={40} autoCapitalize="none" />
          <Text style={[type.label, { marginBottom: 8 }]}>Listen in</Text>
          <Row style={{ marginBottom: space.md }}>
            <Chip label="हिन्दी + English" selected={s.lang === "hi-IN"} onPress={() => saveSuspicionSettings({ lang: "hi-IN" })} />
            <Chip label="English (India)" selected={s.lang === "en-IN"} onPress={() => saveSuspicionSettings({ lang: "en-IN" })} />
          </Row>
          {error || s.error ? <Banner text={(error ?? s.error)!} tone="coral" /> : null}
          <PillButton label={`Stay with me for ${SUSPICION_MINUTES} min`} big loading={busy} onPress={start} />
        </Card>
      )}
      <Banner text="Listening happens on your phone and stops the moment a word is heard, so the alert and recording can start. Nothing is recorded before that." />
    </Screen>
  );
}

const styles = StyleSheet.create({
  pulse: { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.faint },
  pulseOn: { backgroundColor: colors.coral },
  timer: { fontFamily: type.hero.fontFamily, fontSize: 56, lineHeight: 64, color: colors.ink, marginVertical: space.sm },
});
