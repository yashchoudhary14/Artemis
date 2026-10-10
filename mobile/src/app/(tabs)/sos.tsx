import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, Vibration, View } from "react-native";
import { PinPad } from "@/components/PinPad";
import {
  Banner,
  Brand,
  Button,
  Card,
  FadeIn,
  Hero,
  Icon,
  IconCircle,
  PulseRings,
  Row,
  Screen,
  StatusPill,
  Waveform,
  prefersReducedMotion,
  type IconName,
} from "@/components/ui";
import { endWithPin } from "@/lib/actions";
import { api, type SessionStatus } from "@/lib/api";
import { dial, medicalFastDial } from "@/lib/medical";
import { panicStore, startPanic } from "@/lib/panic";
import { useStore } from "@/lib/store";
import { colors, fonts, gradients, radius, shadows, space, type } from "@/theme";

const HOLD_MS = 1000;

function timeOf(ms: number) {
  return new Date(ms).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }).toLowerCase();
}

export default function Sos() {
  const panic = useStore(panicStore);
  const [askPin, setAskPin] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [stopped, setStopped] = useState(false);
  const [status, setStatus] = useState<SessionStatus | null>(null);
  const hold = useRef(new Animated.Value(0)).current;

  // "Stay with me" timeline from the server.
  useEffect(() => {
    if (!panic.active || !panic.sessionId) return;
    let alive = true;
    const load = () =>
      api
        .status(panic.sessionId!)
        .then((s) => alive && setStatus(s))
        .catch(() => undefined);
    void load();
    const t = setInterval(load, 4000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [panic.active, panic.sessionId]);

  const pressIn = () => {
    Vibration.vibrate(20);
    Animated.timing(hold, { toValue: 1, duration: HOLD_MS, easing: Easing.linear, useNativeDriver: true }).start();
  };
  const pressOut = () => Animated.timing(hold, { toValue: 0, duration: 200, useNativeDriver: true }).start();
  const fire = () => {
    Vibration.vibrate(300);
    setStopped(false);
    void startPanic("sos");
  };

  const onPin = async (pin: string) => {
    const r = await endWithPin(pin);
    if (r === "wrong") return setPinError("That PIN didn't match. Try again.");
    if (r === "unset") return setPinError("Set your PIN in Rise first.");
    setPinError(null);
    setAskPin(false);
    setStatus(null);
    setStopped(true); // identical for real and duress PIN (safety rule 7)
  };

  const medical = async () => {
    await medicalFastDial();
    router.push({ pathname: "/help", params: { medical: "1" } });
  };

  if (stopped && !panic.active) {
    return (
      <Screen>
        <Brand />
        <FadeIn style={{ alignItems: "center", paddingTop: 60 }}>
          <View style={styles.doneInner}>
            <Icon name="checkmark" size={44} color={colors.safe} />
          </View>
          <Text style={[type.hero, { textAlign: "center", marginTop: space.xl }]}>SOS stopped</Text>
          <Text style={[type.body, { textAlign: "center", color: colors.inkSoft, marginTop: space.xs }]}>Recording and location sharing have stopped.</Text>
          <Button label="Done" size="lg" onPress={() => setStopped(false)} style={{ marginTop: space.xxl, alignSelf: "stretch" }} />
        </FadeIn>
      </Screen>
    );
  }

  if (panic.active && askPin) {
    return (
      <Screen>
        <Brand />
        <PinPad title="Enter your PIN" hint="To stop SOS" onComplete={onPin} error={pinError} onCancel={() => setAskPin(false)} />
      </Screen>
    );
  }

  if (panic.active) {
    const acks = status?.acks ?? [];
    const agent = (status?.agent ?? []).filter((a) => a.kind === "message" || a.kind === "summary" || a.kind === "fallback");
    const recipients = [...new Set(agent.flatMap((a) => a.recipients))];
    return (
      <Screen background={gradients.night}>
        <StatusBar style="light" />
        <Brand light />
        <FadeIn style={{ alignItems: "center" }}>
          <Text style={[type.hero, { color: colors.white, textAlign: "center" }]}>Stay with me</Text>
          <Text style={[type.body, { color: "rgba(255,255,255,0.72)", textAlign: "center", marginTop: 6 }]}>
            Your circle is being told. Keep your phone with you if you can.
          </Text>
          <View style={styles.micRow}>
            <Waveform color={colors.roseSoft} />
            <View style={styles.micOrb}>
              <PulseRings size={92} color={colors.sos} />
              <View style={styles.mic}>
                <Icon name="mic" size={34} color={colors.white} />
              </View>
            </View>
            <Waveform color={colors.roseSoft} />
          </View>
          <StatusPill text={panic.chunksSent ? `Recording · ${panic.chunksSent} clip${panic.chunksSent === 1 ? "" : "s"} sent` : "Recording"} tone="sos" pulse />
        </FadeIn>

        <FadeIn index={1} style={{ marginTop: space.xl }}>
          <Card tone="night">
            <Step icon="paper-plane" done={panic.alertSent} text={panic.alertSent ? "Alert sent to your circle" : "Sending your alert…"} time={panic.startedAt} />
            <Step icon="mic" done={panic.chunksSent > 0} text={`Audio clips: ${panic.chunksSent} sent${panic.chunksWaiting ? ` · ${panic.chunksWaiting} waiting` : ""}`} />
            <Step icon="location" done text="Sharing your location every 5 seconds" />
            {recipients.length ? <Step icon="sparkles" done text={`AI follow-up sent to ${recipients.join(", ")}`} /> : null}
            {acks.length ? (
              <Step icon="checkmark-circle" done highlight text={`${acks.map((a) => a.name).join(", ")} ${acks.length > 1 ? "are" : "is"} on it`} time={acks[0].at} last />
            ) : (
              <Step
                icon="hourglass"
                done={false}
                text={status?.escalation?.nextAt && !status.escalation.done ? `Waiting for a reply · next reminder ${timeOf(status.escalation.nextAt)}` : "Waiting for someone to respond"}
                last
              />
            )}
          </Card>
          {panic.error ? <Banner text={`Still trying: ${panic.error}`} tone="amber" /> : null}
          {panic.reason === "keyword" ? <Banner text={`Started because your phone heard “${panic.keyword}”.`} icon="ear" /> : null}
          <Button label="Call 112" icon="call" variant="sos" size="lg" onPress={() => dial("112")} />
          <Pressable onPress={() => setAskPin(true)} style={styles.stopBtn} accessibilityRole="button" accessibilityLabel="I'm safe, stop SOS">
            <Icon name="stop-circle-outline" size={20} color={colors.white} />
            <Text style={[type.button, { color: colors.white }]}>I'm safe — stop</Text>
          </Pressable>
        </FadeIn>
      </Screen>
    );
  }

  const ringScale = hold.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const fillOpacity = hold.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  return (
    <Screen>
      <FadeIn>
        <Brand />
        <Hero title={"Help is\n"} accent="one hold away." subtitle="Hold the button for one second. Your circle is alerted at once and your phone starts recording." />
      </FadeIn>
      <FadeIn index={1} style={styles.center}>
        <View style={styles.halo} />
        <PulseRings size={210} color="rgba(240,78,94,0.55)" active={!prefersReducedMotion()} />
        <Pressable onPressIn={pressIn} onPressOut={pressOut} onLongPress={fire} delayLongPress={HOLD_MS} accessibilityRole="button" accessibilityLabel="Hold for SOS">
          <Animated.View style={[styles.outer, { transform: [{ scale: ringScale }] }]}>
            <Animated.View style={[styles.holdFill, { opacity: fillOpacity }]} />
            <View style={styles.big}>
              <Text style={styles.bigText}>SOS</Text>
              <Text style={styles.bigSub}>hold 1 sec</Text>
            </View>
          </Animated.View>
        </Pressable>
      </FadeIn>
      <FadeIn index={2}>
        <Row style={{ justifyContent: "center", gap: space.xs, flexWrap: "wrap", marginBottom: space.xl }}>
          <Feature icon="people" text="Alerts your circle" />
          <Feature icon="mic" text="Records audio" />
          <Feature icon="location" text="Shares location" />
        </Row>
        <Card tone="rose" onPress={medical}>
          <Row style={{ gap: space.md }}>
            <IconCircle icon="medkit" tint={colors.white} color={colors.rose} size={48} />
            <View style={{ flex: 1 }}>
              <Text style={type.h3}>Medical emergency</Text>
              <Text style={type.small}>One tap calls the ambulance and tells your circle where you are.</Text>
            </View>
            <Icon name="chevron-forward" size={18} color={colors.inkSoft} />
          </Row>
        </Card>
        <Text style={[type.small, { textAlign: "center" }]}>Works everywhere — even inside your private zones.</Text>
      </FadeIn>
    </Screen>
  );
}

function Feature({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={styles.feature}>
      <Icon name={icon} size={14} color={colors.sosDeep} />
      <Text style={[type.smallBold, { fontSize: 12 }]}>{text}</Text>
    </View>
  );
}

function Step({ icon, done, text, highlight, time, last }: { icon: IconName; done: boolean; text: string; highlight?: boolean; time?: number | null; last?: boolean }) {
  return (
    <Row style={[styles.step, !last && styles.stepDivider]}>
      <View style={[styles.stepIcon, done && { backgroundColor: highlight ? "rgba(30,138,90,0.35)" : "rgba(255,255,255,0.14)" }]}>
        <Icon name={icon} size={17} color={highlight ? "#7BE0AE" : done ? colors.white : "rgba(255,255,255,0.5)"} />
      </View>
      <Text style={[type.bodyMedium, { flex: 1, color: highlight ? "#7BE0AE" : done ? colors.white : "rgba(255,255,255,0.6)" }]}>{text}</Text>
      {time ? <Text style={[type.small, { color: "rgba(255,255,255,0.55)" }]}>{timeOf(time)}</Text> : null}
    </Row>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center", height: 300, marginBottom: space.md },
  halo: { position: "absolute", width: 320, height: 320, borderRadius: 160, experimental_backgroundImage: gradients.sosGlow },
  outer: {
    width: 220,
    height: 220,
    borderRadius: 110,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.75)",
    borderWidth: 1,
    borderColor: colors.glassBorder,
    boxShadow: shadows.lifted,
    overflow: "hidden",
  },
  holdFill: { position: "absolute", width: 220, height: 220, borderRadius: 110, backgroundColor: "rgba(240,78,94,0.25)" },
  big: {
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: colors.sos,
    experimental_backgroundImage: gradients.sos,
    alignItems: "center",
    justifyContent: "center",
    boxShadow: shadows.sos,
  },
  bigText: { color: colors.white, fontFamily: fonts.sansExtra, fontSize: 42, letterSpacing: 2 },
  bigSub: { color: "rgba(255,255,255,0.88)", fontFamily: fonts.sansSemi, fontSize: 12, letterSpacing: 1.2, textTransform: "uppercase", marginTop: 2 },
  feature: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.8)",
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  micRow: { flexDirection: "row", alignItems: "center", gap: space.md, marginVertical: space.xl },
  micOrb: { width: 120, height: 120, alignItems: "center", justifyContent: "center" },
  mic: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.sos,
    experimental_backgroundImage: gradients.sos,
    boxShadow: shadows.sos,
  },
  step: { gap: space.sm, paddingVertical: 12 },
  stepDivider: { borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)" },
  stepIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.06)" },
  stopBtn: {
    marginTop: space.sm,
    minHeight: 54,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  doneInner: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.safeWash, alignItems: "center", justifyContent: "center", borderWidth: 4, borderColor: colors.white, boxShadow: shadows.soft },
});
