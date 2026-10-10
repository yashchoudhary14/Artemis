import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, Share, StyleSheet, Text, Vibration, View } from "react-native";
import { PinPad } from "@/components/PinPad";
import {
  ArtemisLabel,
  Banner,
  Bubble,
  Button,
  Card,
  Chip,
  ChipRow,
  FadeIn,
  Header,
  Hero,
  Icon,
  IconBubble,
  PulseRings,
  Row,
  Screen,
  StatusPill,
  Waveform,
  prefersReducedMotion,
} from "@/components/ui";
import { endWithPin } from "@/lib/actions";
import { meStore } from "@/lib/account";
import { alarmStore, startAlarm, stopAlarm } from "@/lib/alarm";
import { api, type Delivery, type SessionStatus } from "@/lib/api";
import { dial, medicalFastDial } from "@/lib/medical";
import { panicStore, startPanic } from "@/lib/panic";
import { useStore } from "@/lib/store";
import { colors, fonts, gradients, shadows, space, type } from "@/theme";

const HOLD_MS = 1000;
const clock = (ms: number) => new Date(ms).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }).toLowerCase();

const names = (list: string[]) => (list.length <= 1 ? list.join("") : `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`);

function why(error: string | null) {
  if (!error) return "";
  if (/not opened the Telegram link/i.test(error)) return "hasn't linked Telegram yet";
  if (/TELEGRAM_BOT_TOKEN/i.test(error)) return "Telegram isn't set up on the server";
  return "couldn't be reached";
}

/** Latest delivery per contact for one kind of message. */
function latestPerContact(deliveries: Delivery[], kinds: string[]) {
  const map = new Map<string, Delivery>();
  for (const d of deliveries) if (kinds.includes(d.kind)) map.set(d.name, d);
  return [...map.values()];
}

export default function Sos() {
  const panic = useStore(panicStore);
  const alarm = useStore(alarmStore);
  const { me } = useStore(meStore);
  const [askPin, setAskPin] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [stopped, setStopped] = useState(false);
  const [status, setStatus] = useState<SessionStatus | null>(null);
  const [lastSession, setLastSession] = useState<string | null>(null);
  const hold = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!panic.active || !panic.sessionId) return;
    let alive = true;
    const load = () =>
      api
        .status(panic.sessionId!)
        .then((s) => alive && setStatus(s))
        .catch(() => undefined);
    void load();
    const t = setInterval(load, 3000);
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
    const sid = panic.sessionId;
    const r = await endWithPin(pin);
    if (r === "wrong") return setPinError("That PIN didn't match. Try again.");
    if (r === "unset") return setPinError("Set your PIN in your profile first.");
    setPinError(null);
    setAskPin(false);
    setStatus(null);
    if (sid) setLastSession(sid);
    setStopped(true); // identical for real and duress PIN (safety rule 7)
  };

  const medical = async () => {
    await medicalFastDial();
    router.push({ pathname: "/help", params: { medical: "1" } });
  };

  if (stopped && !panic.active) {
    return (
      <Screen header={<Header title="SOS" />}>
        <FadeIn style={{ alignItems: "center", paddingTop: 48 }}>
          <View style={styles.doneOrb}>
            <Icon name="checkmark" size={40} color={colors.safe} />
          </View>
          <Text style={[type.hero, { marginTop: space.xl }]}>SOS stopped</Text>
          <Text style={[type.bodySoft, { textAlign: "center", marginTop: space.xs }]}>Recording, the alarm and location sharing have stopped.</Text>
          {lastSession ? (
            <Button label="See incident report" iconRight="arrow-forward" onPress={() => router.push({ pathname: "/report", params: { id: lastSession } })} style={{ marginTop: space.xxl }} />
          ) : null}
          <Button label="Done" variant="outline" onPress={() => setStopped(false)} style={{ marginTop: space.sm }} />
        </FadeIn>
      </Screen>
    );
  }

  if (panic.active && askPin) {
    return (
      <Screen header={<Header title="Stop SOS" />} background={gradients.urgent}>
        <PinPad title="Enter your PIN" hint="To stop SOS" onComplete={onPin} error={pinError} onCancel={() => setAskPin(false)} />
      </Screen>
    );
  }

  if (panic.active) {
    const alertTo = latestPerContact(status?.deliveries ?? [], ["alert"]);
    const failed = alertTo.filter((d) => !d.ok);
    const acks = status?.acks ?? [];
    const delivered = alertTo.filter((d) => d.ok);
    const circle = me?.contacts ?? [];
    const helper = acks[0]?.name ?? circle[0]?.name ?? "Circle";
    const ai = (status?.agent ?? []).filter((a) => a.kind === "message" || a.kind === "summary");
    const steps: { text: string; time: string; done: boolean; ai?: boolean }[] = [];
    if (panic.alertSent) {
      steps.push({
        text: delivered.length ? `Told ${names(delivered.map((d) => d.name))}, with your live link` : "Alert sent to your circle",
        time: panic.startedAt ? clock(panic.startedAt) : "",
        done: true,
      });
    } else {
      steps.push({ text: panic.error ? `No signal yet, retrying (${panic.error})` : "Sending your alert…", time: "Now", done: false });
    }
    for (const d of failed) steps.push({ text: `Couldn't reach ${d.name}: ${why(d.error)}`, time: clock(d.at), done: true });
    for (const a of ai.slice(-2)) steps.push({ text: a.text, time: clock(a.at), done: true, ai: true });
    for (const a of acks) steps.push({ text: `${a.name} pressed I'm on it`, time: clock(a.at), done: true });
    if (status?.escalation?.nextAt && !status.escalation.done && !acks.length) {
      steps.push({ text: `If no one answers by ${clock(status.escalation.nextAt)}, Artemis asks the next person`, time: "Next", done: false });
    }

    return (
      <Screen
        background={gradients.urgent}
        footer={
          <View style={styles.footer}>
            <View style={styles.night}>
              <Text style={styles.nightText}>{acks.length ? `${names(acks.map((a) => a.name))} ${acks.length > 1 ? "are" : "is"} coming.` : "Artemis keeps going until someone answers."}</Text>
              <Row style={{ gap: space.xs, marginTop: space.sm }}>
                <Button label="Call 112" icon="call" variant="sos" size="sm" style={{ flex: 1 }} onPress={() => dial("112")} />
                <Button label="I'm safe" variant="light" size="sm" style={{ flex: 1 }} onPress={() => setAskPin(true)} />
              </Row>
            </View>
          </View>
        }
        bottomInset={330}
      >
        <FadeIn>
          <Row style={{ justifyContent: "space-between", marginTop: space.xs }}>
            <StatusPill text={`Recording · ${panic.chunksSent} clip${panic.chunksSent === 1 ? "" : "s"} sent`} tone="sos" pulse />
            <Pressable onPress={() => void (alarm.on ? stopAlarm() : startAlarm())} accessibilityRole="button" accessibilityState={{ selected: alarm.on }} style={styles.siren}>
              <Text style={type.label}>{alarm.on ? "Siren on" : "Siren off"}</Text>
            </Pressable>
          </Row>
        </FadeIn>
        <FadeIn index={1}>
          <Text style={[type.hero, { fontSize: 52, lineHeight: 54, marginTop: space.lg }]}>{panic.alertSent ? "Help is on\nthe way." : "Sending\nyour alert."}</Text>
        </FadeIn>
        <FadeIn index={2}>
          <Card padded={false} style={{ marginTop: space.lg }}>
            <Row style={{ padding: 20, paddingBottom: 16, justifyContent: "space-between" }}>
              <View>
                <Text style={styles.passName}>You</Text>
                <Text style={type.small}>{panic.reason === "keyword" ? `Heard “${panic.keyword}”` : "Pressed SOS"}</Text>
              </View>
              <View style={styles.dash} />
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.passName} numberOfLines={1}>{helper}</Text>
                <Text style={type.small}>{acks.length ? "On the way" : "Alerted"}</Text>
              </View>
            </Row>
            <Row style={styles.passGrid}>
              <View style={{ flex: 1 }}>
                <Text style={[type.small, { fontSize: 11 }]}>Started</Text>
                <Text style={type.label}>{panic.startedAt ? clock(panic.startedAt) : "Now"}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[type.small, { fontSize: 11 }]}>Circle told</Text>
                <Text style={type.label}>{alertTo.length ? `${delivered.length} of ${alertTo.length}` : panic.alertSent ? "Sent" : "…"}</Text>
              </View>
              <Pressable
                style={{ flex: 1 }}
                disabled={!panic.guardianUrl}
                onPress={() => Share.share({ message: `My Artemis live link: ${panic.guardianUrl}` })}
                accessibilityRole="button"
                accessibilityLabel="Share live link"
              >
                <Text style={[type.small, { fontSize: 11 }]}>Live link</Text>
                <Text style={[type.label, { textDecorationLine: panic.guardianUrl ? "underline" : "none" }]}>{panic.guardianUrl ? "Share" : "…"}</Text>
              </Pressable>
            </Row>
          </Card>
        </FadeIn>
        <FadeIn index={3}>
          <View style={{ marginTop: space.lg }}>
            <ArtemisLabel text="Artemis agent" note="Can only raise the alert" />
            <View style={{ marginTop: 14 }}>
              {steps.map((st, i) => (
                <View key={i} style={styles.step}>
                  <View style={[styles.stepDot, st.done ? { backgroundColor: colors.ink } : { borderWidth: 1.5, borderColor: "#C9708D", backgroundColor: colors.white }]} />
                  <View style={{ flex: 1 }}>
                    {st.ai ? <Text style={[type.accent, { fontSize: 11, marginBottom: 2 }]}>AI follow-up, may contain errors</Text> : null}
                    <Text style={[type.body, !st.done && { color: colors.inkSoft }]} numberOfLines={st.ai ? 3 : 2}>
                      {st.text}
                    </Text>
                  </View>
                  <Text style={[type.small, { fontSize: 12, color: colors.inkFaint }]}>{st.time}</Text>
                </View>
              ))}
            </View>
            {panic.alertSent && circle.length === 0 ? <Banner tone="amber" text="You have no contacts yet. Add them in your profile so Artemis can reach someone." /> : null}
          </View>
        </FadeIn>
      </Screen>
    );
  }

  const ringScale = hold.interpolate({ inputRange: [0, 1], outputRange: [1, 1.07] });
  const fillOpacity = hold.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  return (
    <Screen>
      <FadeIn>
        <Hero title={"Need help\nright now?"} accent="Hold the button for one second" style={{ marginBottom: space.md }} />
      </FadeIn>
      <FadeIn index={1} style={styles.center}>
        <View style={styles.halo} />
        <PulseRings size={200} color="rgba(236,71,87,0.5)" active={!prefersReducedMotion()} />
        <Pressable onPressIn={pressIn} onPressOut={pressOut} onLongPress={fire} delayLongPress={HOLD_MS} accessibilityRole="button" accessibilityLabel="Hold for SOS">
          <Animated.View style={[styles.outer, { transform: [{ scale: ringScale }] }]}>
            <Animated.View style={[styles.holdFill, { opacity: fillOpacity }]} />
            <View style={styles.big}>
              <Text style={styles.bigText}>SOS</Text>
              <Text style={styles.bigSub}>hold</Text>
            </View>
          </Animated.View>
        </Pressable>
      </FadeIn>
      <FadeIn index={2}>
        <ChipRow wrap>
          <Chip icon="volume-high-outline" label="Loud alarm" />
          <Chip icon="paper-plane-outline" label="Alerts your circle" />
          <Chip icon="mic-outline" label="Records audio" />
          <Chip icon="navigate-outline" label="Shares location" />
        </ChipRow>
        <Card onPress={medical}>
          <Row style={{ gap: space.sm }}>
            <IconBubble icon="medkit" tint={colors.sosWash} color={colors.sos} size={44} />
            <View style={{ flex: 1 }}>
              <Text style={type.cardTitle}>Medical emergency</Text>
              <Text style={type.small}>One tap calls the ambulance and tells your circle where you are.</Text>
            </View>
            <Icon name="chevron-forward" size={16} color={colors.inkFaint} />
          </Row>
        </Card>
        <Text style={[type.small, { textAlign: "center", marginTop: space.xs }]}>Works everywhere — even inside your private zones.</Text>
      </FadeIn>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center", height: 290, marginBottom: space.sm },
  halo: { position: "absolute", width: 300, height: 300, borderRadius: 150, experimental_backgroundImage: gradients.sosGlow },
  outer: {
    width: 210,
    height: 210,
    borderRadius: 105,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.8)",
    boxShadow: shadows.lifted,
    overflow: "hidden",
  },
  holdFill: { position: "absolute", width: 210, height: 210, borderRadius: 105, backgroundColor: "rgba(236,71,87,0.22)" },
  big: {
    width: 164,
    height: 164,
    borderRadius: 82,
    backgroundColor: colors.sos,
    experimental_backgroundImage: gradients.sos,
    alignItems: "center",
    justifyContent: "center",
    boxShadow: shadows.sos,
  },
  bigText: { color: colors.white, fontFamily: fonts.sansSemi, fontSize: 40, letterSpacing: 1 },
  bigSub: { color: "rgba(255,255,255,0.9)", fontFamily: fonts.sans, fontSize: 14, marginTop: 2 },
  footer: { position: "absolute", left: 12, right: 12, bottom: 110 },
  night: { borderRadius: 26, backgroundColor: colors.dark, padding: 18, boxShadow: shadows.dark },
  nightText: { fontFamily: fonts.serif, fontSize: 22, lineHeight: 26, color: colors.white },
  siren: { height: 36, paddingHorizontal: 14, borderRadius: 18, borderWidth: 1, borderColor: "rgba(23,20,26,0.1)", backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  passName: { fontFamily: fonts.sans, fontSize: 28, lineHeight: 32, color: colors.ink, letterSpacing: -0.5, maxWidth: 140 },
  dash: { flex: 1, marginHorizontal: 14, borderTopWidth: 1, borderStyle: "dashed", borderColor: "rgba(23,20,26,0.2)" },
  passGrid: { paddingHorizontal: 20, paddingVertical: 14, borderTopWidth: 1, borderStyle: "dashed", borderColor: "rgba(23,20,26,0.12)" },
  step: { flexDirection: "row", gap: 12, paddingBottom: 16 },
  stepDot: { width: 10, height: 10, borderRadius: 5, marginTop: 6 },
  deliveryRow: { gap: 8, paddingVertical: 6, borderTopWidth: 1, borderTopColor: colors.hairline },
  tick: { width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  doneOrb: { width: 92, height: 92, borderRadius: 46, backgroundColor: colors.safeWash, alignItems: "center", justifyContent: "center", borderWidth: 4, borderColor: colors.white },
});
