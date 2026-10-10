import { router } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PinPad } from "@/components/PinPad";
import {
  Avatar,
  Banner,
  Bubble,
  Button,
  Card,
  Chip,
  ChipRow,
  FadeIn,
  Field,
  Header,
  HeaderIcon,
  Hero,
  Icon,
  PulseRings,
  Row,
  Screen,
  StatusPill,
  Waveform,
} from "@/components/ui";
import { endSuspicionQuietly, endWithPin, startSuspicionSession, SUSPICION_MINUTES } from "@/lib/actions";
import { meStore } from "@/lib/account";
import { panicStore } from "@/lib/panic";
import { saveActive, sessionStore } from "@/lib/session";
import { useStore } from "@/lib/store";
import { saveSuspicionSettings, speechAvailable, startListening, stopListening, suspicionStore } from "@/lib/suspicion";
import { colors, fonts, gradients, space, type } from "@/theme";

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
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!on) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [on]);

  useEffect(() => {
    if (on && active?.suspicionEndsAt && now >= active.suspicionEndsAt) void endSuspicionQuietly();
  }, [on, now, active?.suspicionEndsAt]);

  useEffect(() => {
    if (panic.active) router.replace("/sos");
  }, [panic.active]);

  const start = async () => {
    setError(null);
    if (!me?.contacts.some((c) => c.tier === "inner")) return setError("Add someone to your inner circle in your profile first.");
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
      stopListening();
      if (active) await saveActive({ ...active, suspicionEndsAt: undefined });
    }
  };

  const onPin = async (pin: string) => {
    const r = await endWithPin(pin);
    if (r === "wrong") return setPinError("That PIN didn't match. Try again.");
    if (r === "unset") return setPinError("Set your PIN in your profile first.");
    setAskPin(false);
    router.replace("/");
  };

  const back = <HeaderIcon icon="chevron-back" label="Back" onPress={() => (askPin ? setAskPin(false) : router.back())} />;

  if (askPin) {
    return (
      <Screen header={<Header title="Turn off" left={back} />} bottomInset={40}>
        <PinPad title="Enter your PIN" hint="To turn off uneasy mode" onComplete={onPin} error={pinError} onCancel={() => setAskPin(false)} />
      </Screen>
    );
  }

  const left = active?.suspicionEndsAt ? Math.max(0, active.suspicionEndsAt - now) : 0;
  const mins = Math.floor(left / 60000);
  const secs = Math.floor((left % 60000) / 1000);
  const words = ["help", "bachao", s.customWord].filter(Boolean);
  const listening = s.listening && !s.paused;

  if (on) {
    return (
      <Screen
        header={<Header title="Stay with me" accent={s.paused ? "Paused in your private zone" : listening ? "Listening" : "Starting…"} accentIcon="radio-outline" left={back} />}
        footer={
          <View style={[styles.footer, { paddingBottom: insets.bottom + space.md }]}>
            <Button label="Turn off" icon="stop-circle-outline" size="lg" onPress={stop} />
          </View>
        }
        bottomInset={110}
      >
        <FadeIn>
          <Hero title="I'm listening." accent="Say a help word and your circle hears at once" style={{ marginBottom: space.sm }} />
        </FadeIn>
        <FadeIn index={1} style={{ alignItems: "center" }}>
          <View style={styles.micRow}>
            <Waveform active={listening} color={colors.magenta} />
            <View style={styles.micOrb}>
              <View style={styles.glow} />
              <PulseRings size={96} color="rgba(201,42,102,0.5)" active={listening} />
              <View style={listening ? styles.mic : styles.micIdle}>
                <Icon name={s.paused ? "pause" : "mic"} size={36} color={colors.white} />
              </View>
            </View>
            <Waveform active={listening} color={colors.magenta} />
          </View>
          <StatusPill text={s.paused ? "Paused here" : listening ? "Listening on this phone" : "Starting…"} tone={s.paused ? "safe" : "magenta"} pulse={listening} />
        </FadeIn>

        <FadeIn index={2} style={{ marginTop: space.xl }}>
          <Bubble style={{ maxWidth: "100%" }}>
            <Text style={type.small}>Safety words</Text>
            <Text style={[type.title, { fontSize: 19 }]}>“{words.join(" · ")}”</Text>
            {s.lastHeard ? (
              <Text style={[type.small, { fontFamily: fonts.serifItalic, marginTop: 6 }]} numberOfLines={2}>
                Heard: “{s.lastHeard}”
              </Text>
            ) : null}
          </Bubble>
          {firstInner ? (
            <Bubble style={{ maxWidth: "100%" }}>
              <Row style={{ gap: space.sm }}>
                <Avatar name={firstInner.name} size={38} square />
                <View style={{ flex: 1 }}>
                  <Text style={type.small}>Alert goes to</Text>
                  <Text style={type.cardTitle}>
                    {firstInner.name}
                    {me && me.contacts.length > 1 ? ` + ${me.contacts.length - 1} more` : ""}
                  </Text>
                </View>
                <StatusPill text={firstInner.linked ? "Linked" : "Not linked"} tone={firstInner.linked ? "safe" : "amber"} />
              </Row>
            </Bubble>
          ) : null}
          <Card>
            <Row style={{ justifyContent: "space-between" }}>
              <View>
                <Text style={type.small}>Turns itself off in</Text>
                <Text style={styles.timer}>
                  {mins}:{String(secs).padStart(2, "0")}
                </Text>
              </View>
              <Button label="+30 min" icon="add" variant="outline" size="sm" onPress={extend} />
            </Row>
          </Card>
        </FadeIn>
      </Screen>
    );
  }

  return (
    <Screen header={<Header title="I feel uneasy" accent={`I'll stay with you for ${SUSPICION_MINUTES} min`} left={back} />} bottomInset={40}>
      <FadeIn>
        <Hero title="I feel uneasy." accent="Say a help word and your circle is alerted at once. Nothing is recorded unless that happens." />
      </FadeIn>
      <FadeIn index={1}>
        <Card>
          <Text style={[type.small, { fontFamily: fonts.sansMedium, marginBottom: 8 }]}>Safety words</Text>
          <ChipRow wrap>
            <Chip icon="checkmark" label="help" selected />
            <Chip icon="checkmark" label="bachao" selected />
          </ChipRow>
          <Field icon="add-circle-outline" placeholder="Add your own word (optional)" value={word} onChangeText={setWord} maxLength={40} autoCapitalize="none" />
          <Text style={[type.small, { fontFamily: fonts.sansMedium, marginBottom: 8 }]}>Listen in</Text>
          <ChipRow wrap>
            <Chip label="हिन्दी + English" selected={s.lang === "hi-IN"} onPress={() => void saveSuspicionSettings({ lang: "hi-IN" })} />
            <Chip label="English (India)" selected={s.lang === "en-IN"} onPress={() => void saveSuspicionSettings({ lang: "en-IN" })} />
          </ChipRow>
          {!speechAvailable() ? <Banner tone="amber" text="Keyword listening isn't available in this app (e.g. Expo Go). Your circle can still follow you live, and SOS works." /> : null}
          {error || s.error ? <Banner text={(error ?? s.error)!} tone="sos" /> : null}
          <Button label="Stay with me" icon="mic-outline" iconRight="arrow-forward" size="lg" loading={busy} onPress={start} />
        </Card>
      </FadeIn>
      <FadeIn index={2}>
        <Bubble>
          <Row style={{ gap: 8, alignItems: "flex-start" }}>
            <Icon name="lock-closed-outline" size={15} color={colors.inkSoft} />
            <Text style={[type.small, { flex: 1 }]}>Listening happens on your phone and stops the moment a word is heard, so the alert and recording can start. It pauses inside your private zones.</Text>
          </Row>
        </Bubble>
      </FadeIn>
    </Screen>
  );
}

const styles = StyleSheet.create({
  micRow: { flexDirection: "row", alignItems: "center", gap: space.md, marginVertical: space.lg },
  micOrb: { width: 124, height: 124, alignItems: "center", justifyContent: "center" },
  glow: { position: "absolute", width: 170, height: 170, borderRadius: 85, experimental_backgroundImage: gradients.pinkGlow },
  mic: { width: 92, height: 92, borderRadius: 46, alignItems: "center", justifyContent: "center", backgroundColor: colors.magenta, experimental_backgroundImage: "linear-gradient(150deg, #E85A8E 0%, #C92A66 100%)", boxShadow: "0px 12px 26px rgba(201,42,102,0.35)" },
  micIdle: { width: 92, height: 92, borderRadius: 46, alignItems: "center", justifyContent: "center", backgroundColor: colors.inkFaint },
  timer: { fontFamily: fonts.serifBold, fontSize: 32, lineHeight: 40, color: colors.ink },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, padding: space.lg, experimental_backgroundImage: "linear-gradient(180deg, rgba(253,245,248,0) 0%, rgba(253,245,248,0.96) 35%)" },
});
