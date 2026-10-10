import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, Vibration, View } from "react-native";
import { PinPad } from "@/components/PinPad";
import { Banner, Brand, Card, Hero, Muted, PillButton, Row, Screen } from "@/components/ui";
import { endWithPin } from "@/lib/actions";
import { api, type SessionStatus } from "@/lib/api";
import { dial, medicalFastDial } from "@/lib/medical";
import { panicStore, startPanic } from "@/lib/panic";
import { useStore } from "@/lib/store";
import { colors, gradients, space, type } from "@/theme";

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

  const pressIn = () => Animated.timing(hold, { toValue: 1, duration: HOLD_MS, useNativeDriver: true }).start();
  const pressOut = () => Animated.timing(hold, { toValue: 0, duration: 150, useNativeDriver: true }).start();
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
        <View style={{ alignItems: "center", paddingTop: 80 }}>
          <View style={styles.okCircle}>
            <Text style={{ fontSize: 40, color: colors.green }}>✓</Text>
          </View>
          <Text style={[type.hero, { textAlign: "center" }]}>SOS stopped</Text>
          <Muted style={{ textAlign: "center", marginTop: space.sm }}>Recording and location sharing have stopped.</Muted>
          <PillButton label="Done" onPress={() => setStopped(false)} style={{ marginTop: space.xl, alignSelf: "stretch" }} />
        </View>
      </Screen>
    );
  }

  if (panic.active && askPin) {
    return (
      <Screen>
        <Brand />
        <PinPad title="Enter your PIN" hint="To stop SOS" onComplete={onPin} error={pinError} />
        <PillButton label="Back" variant="ghost" onPress={() => setAskPin(false)} />
      </Screen>
    );
  }

  if (panic.active) {
    const acks = status?.acks ?? [];
    const agent = (status?.agent ?? []).filter((a) => a.kind === "message" || a.kind === "summary" || a.kind === "fallback");
    return (
      <Screen>
        <Brand />
        <Hero title={"Stay with me."} subtitle="Your circle is being told. Keep your phone with you if you can." />
        <Card>
          <Step done={panic.alertSent} text={panic.alertSent ? `Alert sent to your circle${panic.startedAt ? ` · ${timeOf(panic.startedAt)}` : ""}` : "Sending your alert…"} />
          <Step done={panic.chunksSent > 0} text={`Recording audio · ${panic.chunksSent} clip${panic.chunksSent === 1 ? "" : "s"} sent${panic.chunksWaiting ? `, ${panic.chunksWaiting} waiting` : ""}`} />
          <Step done text="Sharing your location every 5 seconds" />
          {agent.length ? <Step done text={`AI follow-up sent to ${[...new Set(agent.flatMap((a) => a.recipients))].join(", ") || "your circle"}`} /> : null}
          {acks.length ? (
            <Step done text={`${acks.map((a) => a.name).join(", ")} ${acks.length > 1 ? "are" : "is"} on it`} highlight />
          ) : status?.escalation && !status.escalation.done && status.escalation.nextAt ? (
            <Step done={false} text={`Waiting for someone to respond · next reminder ${timeOf(status.escalation.nextAt)}`} />
          ) : null}
        </Card>
        {panic.error ? <Banner text={`Still trying: ${panic.error}`} tone="amber" /> : null}
        {panic.reason === "keyword" ? <Banner text={`Started because your phone heard "${panic.keyword}".`} /> : null}
        <Row>
          <PillButton label="Call 112" variant="coral" style={{ flex: 1 }} onPress={() => dial("112")} />
          <PillButton label="I'm safe" variant="dark" style={{ flex: 1 }} onPress={() => setAskPin(true)} />
        </Row>
      </Screen>
    );
  }

  return (
    <Screen>
      <Brand />
      <Hero title="SOS" subtitle="Hold the button for one second. Your circle is alerted at once and your phone starts recording audio." />
      <View style={styles.center}>
        <Pressable onPressIn={pressIn} onPressOut={pressOut} onLongPress={fire} delayLongPress={HOLD_MS} accessibilityLabel="Hold for SOS">
          <Animated.View
            style={[
              styles.ring,
              { transform: [{ scale: hold.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) }] },
            ]}
          >
            <View style={styles.big}>
              <Text style={styles.bigText}>SOS</Text>
              <Text style={styles.bigSub}>hold</Text>
            </View>
          </Animated.View>
        </Pressable>
      </View>
      <Muted style={{ textAlign: "center", marginBottom: space.lg }}>Works everywhere, even inside your private zones.</Muted>
      <Card onPress={medical} tint="pink">
        <Text style={type.h2}>Medical emergency</Text>
        <Muted>One tap: calls the ambulance and tells your circle where you are.</Muted>
      </Card>
    </Screen>
  );
}

function Step({ done, text, highlight }: { done: boolean; text: string; highlight?: boolean }) {
  return (
    <Row style={{ marginBottom: space.md, alignItems: "flex-start" }}>
      <View style={[styles.stepDot, done && { backgroundColor: highlight ? colors.green : colors.lilac, borderColor: "transparent" }]}>
        {done ? <Text style={{ color: colors.white, fontSize: 12, fontWeight: "800" }}>✓</Text> : null}
      </View>
      <Text style={[type.body, { flex: 1 }, highlight && { color: colors.green, fontWeight: "700" }]}>{text}</Text>
    </Row>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", marginVertical: space.xl },
  ring: { width: 230, height: 230, borderRadius: 115, backgroundColor: colors.coralSoft, alignItems: "center", justifyContent: "center" },
  big: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: colors.coral,
    experimental_backgroundImage: gradients.sos,
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
  },
  bigText: { color: colors.white, fontSize: 44, fontWeight: "800", letterSpacing: 1 },
  bigSub: { color: colors.white, opacity: 0.85, fontSize: 14, marginTop: 2 },
  stepDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.line, alignItems: "center", justifyContent: "center", marginTop: 1 },
  okCircle: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.greenSoft, alignItems: "center", justifyContent: "center", marginBottom: space.lg },
});
