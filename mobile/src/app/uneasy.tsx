import { router } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { PinPad } from "@/components/PinPad";
import {
  Avatar,
  BackHeader,
  Banner,
  Button,
  Card,
  FadeIn,
  Field,
  Hero,
  Icon,
  IconCircle,
  PulseRings,
  Row,
  Screen,
  Segmented,
  StatusPill,
  Waveform,
} from "@/components/ui";
import { endSuspicionQuietly, endWithPin, startSuspicionSession, SUSPICION_MINUTES } from "@/lib/actions";
import { meStore } from "@/lib/account";
import { panicStore } from "@/lib/panic";
import { saveActive, sessionStore } from "@/lib/session";
import { useStore } from "@/lib/store";
import { saveSuspicionSettings, speechAvailable, startListening, stopListening, suspicionStore, type Lang } from "@/lib/suspicion";
import { colors, fonts, gradients, shadows, space, type } from "@/theme";

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
  const firstInner = me?.contacts.find((c) => c.tier === "inner");

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
    if (active?.kind === "suspicion") setAskPin(true);
    else {
      // Uneasy mode on top of a walk: just stop listening, the walk continues.
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
      <Screen bottomInset={40}>
        <BackHeader onBack={() => setAskPin(false)} />
        <PinPad title="Enter your PIN" hint="To turn off uneasy mode" onComplete={onPin} error={pinError} onCancel={() => setAskPin(false)} />
      </Screen>
    );
  }

  const left = active?.suspicionEndsAt ? Math.max(0, active.suspicionEndsAt - now) : 0;
  const mins = Math.floor(left / 60000);
  const secs = Math.floor((left % 60000) / 1000);
  const words = ["help", "bachao", s.customWord].filter(Boolean);
  const listening = s.listening && !s.paused;

  return (
    <Screen bottomInset={40}>
      <BackHeader title="Stay with me" onBack={() => router.back()} />

      {on ? (
        <>
          <FadeIn style={{ alignItems: "center" }}>
            <Text style={[type.body, { color: colors.inkSoft, textAlign: "center", maxWidth: 300 }]}>
              Speak naturally. SafeWalk listens for your safety words and acts the moment it hears one.
            </Text>
            <View style={styles.micRow}>
              <Waveform active={listening} color={colors.violetSoft} />
              <View style={styles.micOrb}>
                <View style={styles.micGlow} />
                <PulseRings size={96} color={colors.violetSoft} active={listening} />
                <View style={listening ? styles.mic : styles.micIdle}>
                  <Icon name={s.paused ? "pause" : "mic"} size={36} color={colors.white} />
                </View>
              </View>
              <Waveform active={listening} color={colors.violetSoft} />
            </View>
            <StatusPill text={s.paused ? "Paused in your private zone" : listening ? "Listening" : "Starting…"} tone={s.paused ? "safe" : "violet"} pulse={listening} />
            <Text style={[type.small, { marginTop: 6 }]}>Only during this session · nothing is recorded</Text>
          </FadeIn>

          <FadeIn index={1} style={{ marginTop: space.xl }}>
            <Card>
              <Row style={{ gap: space.sm }}>
                <IconCircle icon="chatbubble-ellipses-outline" size={42} />
                <View style={{ flex: 1 }}>
                  <Text style={type.small}>Safety words</Text>
                  <Text style={[type.h2, { fontSize: 19 }]}>“{words.join(" · ")}”</Text>
                </View>
              </Row>
              {s.lastHeard ? (
                <Text style={[type.small, styles.heard]} numberOfLines={2}>
                  Heard: “{s.lastHeard}”
                </Text>
              ) : null}
            </Card>
            {firstInner ? (
              <Card>
                <Row style={{ gap: space.sm }}>
                  <Avatar name={firstInner.name} size={42} />
                  <View style={{ flex: 1 }}>
                    <Text style={type.small}>Alert goes to</Text>
                    <Text style={type.h3}>
                      {firstInner.name}
                      {me && me.contacts.length > 1 ? ` + ${me.contacts.length - 1} more` : ""}
                    </Text>
                  </View>
                  <StatusPill text={firstInner.linked ? "Linked" : "Not linked"} tone={firstInner.linked ? "safe" : "amber"} />
                </Row>
              </Card>
            ) : null}
            <Card tone="violetSoft">
              <Row style={{ justifyContent: "space-between" }}>
                <View>
                  <Text style={type.small}>Turns itself off in</Text>
                  <Text style={styles.timer}>
                    {mins}:{String(secs).padStart(2, "0")}
                  </Text>
                </View>
                <Button label="+30 min" icon="add" variant="light" size="sm" onPress={extend} />
              </Row>
            </Card>
            <Button label="Turn off" icon="stop-circle-outline" variant="dark" size="lg" onPress={stop} />
          </FadeIn>
        </>
      ) : (
        <>
          <FadeIn>
            <Hero title={"Feeling\n"} accent="uneasy?" subtitle="Your circle can see where you are, and saying a safety word sends an alert straight away." />
          </FadeIn>
          <FadeIn index={1}>
            <Card>
              <Text style={[type.label, { marginBottom: space.sm }]}>Safety words</Text>
              <Row style={{ gap: space.xs, marginBottom: space.md, flexWrap: "wrap" }}>
                {["help", "bachao"].map((w) => (
                  <View key={w} style={styles.word}>
                    <Icon name="checkmark" size={14} color={colors.violet} />
                    <Text style={[type.smallBold, { color: colors.violet }]}>{w}</Text>
                  </View>
                ))}
              </Row>
              <Field icon="add-circle-outline" placeholder="Add your own word (optional)" value={word} onChangeText={setWord} maxLength={40} autoCapitalize="none" />
              <Text style={[type.label, { marginBottom: space.sm }]}>Listen in</Text>
              <Segmented<Lang>
                value={s.lang}
                onChange={(lang) => void saveSuspicionSettings({ lang })}
                options={[
                  { value: "hi-IN", label: "हिन्दी + English" },
                  { value: "en-IN", label: "English (India)" },
                ]}
              />
              {!speechAvailable() ? (
                <Banner tone="amber" text="Keyword listening isn't available in this app (e.g. Expo Go). Your circle can still follow you live, and SOS works." />
              ) : null}
              {error || s.error ? <Banner text={(error ?? s.error)!} tone="sos" /> : null}
              <Button label={`Stay with me · ${SUSPICION_MINUTES} min`} icon="mic" variant="violet" size="lg" loading={busy} onPress={start} />
            </Card>
          </FadeIn>
          <FadeIn index={2}>
            <Row style={styles.privacy}>
              <Icon name="lock-closed" size={16} color={colors.inkSoft} />
              <Text style={[type.small, { flex: 1 }]}>
                Listening happens on your phone and stops the moment a word is heard, so the alert and recording can start. It pauses inside your private zones.
              </Text>
            </Row>
          </FadeIn>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  micRow: { flexDirection: "row", alignItems: "center", gap: space.md, marginVertical: space.xl },
  micOrb: { width: 124, height: 124, alignItems: "center", justifyContent: "center" },
  micGlow: { position: "absolute", width: 170, height: 170, borderRadius: 85, experimental_backgroundImage: gradients.violetGlow },
  mic: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.violet,
    experimental_backgroundImage: gradients.violet,
    boxShadow: shadows.violet,
  },
  micIdle: { width: 96, height: 96, borderRadius: 48, alignItems: "center", justifyContent: "center", backgroundColor: colors.inkFaint },
  heard: { marginTop: space.sm, paddingTop: space.sm, borderTopWidth: 1, borderTopColor: colors.hairline, fontFamily: fonts.displayItalic },
  timer: { fontFamily: fonts.display, fontSize: 36, lineHeight: 42, color: colors.ink },
  word: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: colors.violetWash },
  privacy: { gap: 10, alignItems: "flex-start", paddingHorizontal: space.xs, marginTop: space.xs },
});
