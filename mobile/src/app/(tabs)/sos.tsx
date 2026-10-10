import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, Share, StyleSheet, Text, Vibration, View } from "react-native";
import { PinPad } from "@/components/PinPad";
import {
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
    const r = await endWithPin(pin);
    if (r === "wrong") return setPinError("That PIN didn't match. Try again.");
    if (r === "unset") return setPinError("Set your PIN in your profile first.");
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
      <Screen header={<Header title="SOS" />}>
        <FadeIn style={{ alignItems: "center", paddingTop: 48 }}>
          <View style={styles.doneOrb}>
            <Icon name="checkmark" size={40} color={colors.safe} />
          </View>
          <Text style={[type.hero, { marginTop: space.xl }]}>SOS stopped</Text>
          <Text style={[type.bodySoft, { textAlign: "center", marginTop: space.xs }]}>Recording, the alarm and location sharing have stopped.</Text>
          <Button label="Done" iconRight="arrow-forward" onPress={() => setStopped(false)} style={{ marginTop: space.xxl }} />
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
    const aiTo = latestPerContact(status?.deliveries ?? [], ["ai"]);
    const ai = (status?.agent ?? []).filter((a) => a.kind === "message" || a.kind === "summary");
    const lastAi = ai[ai.length - 1];
    const acks = status?.acks ?? [];
    const delivered = alertTo.filter((d) => d.ok).length;
    return (
      <Screen
        background={gradients.urgent}
        header={<Header title="Stay with me" accent={panic.alertSent ? "SOS sent" : "Sending SOS…"} accentIcon="radio-outline" />}
        footer={
          <View style={styles.footer}>
            <Row style={{ gap: space.xs }}>
              <Button label="Call 112" icon="call" variant="sos" style={{ flex: 1 }} onPress={() => dial("112")} />
              <Button label="I'm safe" icon="stop-circle-outline" style={{ flex: 1 }} onPress={() => setAskPin(true)} />
            </Row>
          </View>
        }
        bottomInset={140}
      >
        {/* Alarm control */}
        <FadeIn>
          <Card tint={alarm.on ? "#FFE4E7" : undefined} style={{ paddingVertical: space.sm }}>
            <Row style={{ gap: space.sm }}>
              <IconBubble icon={alarm.on ? "volume-high" : "volume-mute-outline"} tint={alarm.on ? colors.sos : "rgba(26,23,28,0.06)"} color={alarm.on ? colors.white : colors.inkSoft} />
              <View style={{ flex: 1 }}>
                <Text style={type.cardTitle}>{alarm.on ? "Alarm is sounding" : "Alarm is off"}</Text>
                <Text style={type.small}>{alarm.on ? "Loud siren so people nearby notice" : "Recording continues quietly"}</Text>
              </View>
              <Button label={alarm.on ? "Silence" : "Sound"} variant={alarm.on ? "outline" : "sos"} size="sm" onPress={() => void (alarm.on ? stopAlarm() : startAlarm())} />
            </Row>
          </Card>
        </FadeIn>

        <FadeIn index={1}>
          <Bubble side="right" time={panic.startedAt ? clock(panic.startedAt) : undefined} read={panic.alertSent}>
            <Text style={type.cardTitle}>SOS — I need help.</Text>
            <Text style={[type.small, { marginTop: 2 }]}>{panic.reason === "keyword" ? `Started when your phone heard “${panic.keyword}”` : "Sent from the SOS button"}</Text>
          </Bubble>
        </FadeIn>

        {/* Who got the message — the most important thing on this screen */}
        <FadeIn index={2}>
          <Bubble style={{ maxWidth: "92%" }}>
            <Row style={{ gap: 6, marginBottom: 6 }}>
              <Icon name="paper-plane" size={15} color={colors.magenta} />
              <Text style={type.cardTitle}>{!panic.alertSent ? "Sending your alert…" : alertTo.length ? `Alert sent · ${delivered} of ${alertTo.length} delivered` : "Alert sent to your circle"}</Text>
            </Row>
            {!panic.alertSent ? <Text style={type.bodySoft}>{panic.error ? `No signal yet — retrying (${panic.error})` : "Contacting the SafeWalk server…"}</Text> : null}
            {alertTo.map((d) => (
              <Row key={d.name} style={styles.deliveryRow}>
                <View style={[styles.tick, { backgroundColor: d.ok ? colors.safe : colors.sos }]}>
                  <Icon name={d.ok ? "checkmark" : "close"} size={12} color={colors.white} />
                </View>
                <Text style={[type.body, { flex: 1 }]}>
                  <Text style={{ fontFamily: fonts.serifBold }}>{d.name}</Text>
                  {d.ok ? " · message delivered" : ` · ${why(d.error)}`}
                </Text>
                <Text style={[type.small, { fontSize: 11 }]}>{clock(d.at)}</Text>
              </Row>
            ))}
            {panic.alertSent && alertTo.length === 0 && (me?.contacts.length ?? 0) === 0 ? (
              <Banner tone="amber" text="You have no contacts yet — add them in your profile so SafeWalk can reach someone." />
            ) : null}
          </Bubble>
        </FadeIn>

        <FadeIn index={3}>
          <Bubble>
            <Row style={{ gap: space.sm }}>
              <Waveform color={colors.magenta} height={26} bars={9} />
              <View style={{ flex: 1 }}>
                <Text style={type.cardTitle}>Recording audio</Text>
                <Text style={type.small}>
                  {panic.chunksSent} clip{panic.chunksSent === 1 ? "" : "s"} sent{panic.chunksWaiting ? ` · ${panic.chunksWaiting} waiting for signal` : ""}
                </Text>
              </View>
            </Row>
          </Bubble>
        </FadeIn>

        <FadeIn index={4}>
          <Bubble>
            <Row style={{ gap: space.sm }}>
              <IconBubble icon="navigate" size={34} />
              <View style={{ flex: 1 }}>
                <Text style={type.cardTitle}>Sharing your location</Text>
                <Text style={type.small}>Every 5 seconds, on your live link</Text>
              </View>
              {panic.guardianUrl ? (
                <Pressable onPress={() => Share.share({ message: `My SafeWalk live link: ${panic.guardianUrl}` })} hitSlop={10} accessibilityRole="button" accessibilityLabel="Share live link">
                  <Icon name="share-outline" size={20} color={colors.ink} />
                </Pressable>
              ) : null}
            </Row>
          </Bubble>
        </FadeIn>

        {lastAi ? (
          <FadeIn>
            <Bubble style={{ maxWidth: "92%" }}>
              <Row style={{ gap: 6, marginBottom: 4 }}>
                <Icon name="sparkles" size={14} color={colors.magenta} />
                <Text style={type.accent}>AI follow-up · sent to {aiTo.filter((d) => d.ok).map((d) => d.name).join(", ") || lastAi.recipients.join(", ")}</Text>
              </Row>
              <Text style={type.bodySoft} numberOfLines={5}>
                {lastAi.text}
              </Text>
              <Text style={[type.small, { marginTop: 6, fontStyle: "italic" }]}>AI summary — may contain errors</Text>
            </Bubble>
          </FadeIn>
        ) : null}

        <FadeIn>
          {acks.length ? (
            <Bubble>
              <Row style={{ gap: 6 }}>
                <Icon name="checkmark-circle" size={18} color={colors.safe} />
                <Text style={[type.cardTitle, { color: colors.safe }]}>
                  {acks.map((a) => a.name).join(", ")} {acks.length > 1 ? "are" : "is"} on it
                </Text>
              </Row>
              <Text style={[type.small, { marginTop: 2 }]}>{clock(acks[0].at)} · they pressed “I'm on it”</Text>
            </Bubble>
          ) : (
            <Bubble>
              <Row style={{ gap: 6 }}>
                <Icon name="hourglass-outline" size={16} color={colors.inkSoft} />
                <Text style={type.bodySoft}>
                  {status?.escalation?.nextAt && !status.escalation.done ? `Waiting for a reply · next reminder ${clock(status.escalation.nextAt)}` : "Waiting for someone to reply…"}
                </Text>
              </Row>
            </Bubble>
          )}
        </FadeIn>
      </Screen>
    );
  }

  const ringScale = hold.interpolate({ inputRange: [0, 1], outputRange: [1, 1.07] });
  const fillOpacity = hold.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  return (
    <Screen header={<Header title="SOS" accent="Hold for one second" accentIcon="hand-left-outline" />}>
      <FadeIn>
        <Hero title="Need help right now?" style={{ marginBottom: space.md }} />
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
  bigText: { color: colors.white, fontFamily: fonts.serifBold, fontSize: 40, letterSpacing: 1 },
  bigSub: { color: "rgba(255,255,255,0.9)", fontFamily: fonts.serifItalic, fontSize: 14, marginTop: 2 },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    experimental_backgroundImage: "linear-gradient(180deg, rgba(253,245,247,0) 0%, rgba(253,245,247,0.96) 35%)",
  },
  deliveryRow: { gap: 8, paddingVertical: 6, borderTopWidth: 1, borderTopColor: colors.hairline },
  tick: { width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  doneOrb: { width: 92, height: 92, borderRadius: 46, backgroundColor: colors.safeWash, alignItems: "center", justifyContent: "center", borderWidth: 4, borderColor: colors.white },
});
