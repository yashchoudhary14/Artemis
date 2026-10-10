import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Share, StyleSheet, Text, Vibration, View } from "react-native";
import { PinPad } from "@/components/PinPad";
import {
  Banner,
  Brand,
  Button,
  Card,
  FadeIn,
  Field,
  Hero,
  Icon,
  IconCircle,
  Pressy,
  Row,
  Screen,
  StatusPill,
} from "@/components/ui";
import { endWithPin, startWalk } from "@/lib/actions";
import { meStore } from "@/lib/account";
import { sessionStore } from "@/lib/session";
import { useStore } from "@/lib/store";
import { insideZoneStore } from "@/lib/zones";
import { colors, fonts, gradients, radius, shadows, space, type } from "@/theme";

const TIMERS = [2, 5, 10, 15, 30];

function useNow(active: boolean) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);
  return now;
}

function mmss(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function Walk() {
  const active = useStore(sessionStore);
  const { me } = useStore(meStore);
  const zone = useStore(insideZoneStore);
  const [destination, setDestination] = useState("");
  const [minutes, setMinutes] = useState(10);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [askPin, setAskPin] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [ended, setEnded] = useState(false);
  const now = useNow(Boolean(active));

  const begin = async () => {
    setError(null);
    if (!me) return setError("Set up your account in Rise first.");
    if (!me.contacts.some((c) => c.tier === "inner")) return setError("Add at least one person to your inner circle in Rise first.");
    setBusy(true);
    try {
      await startWalk({ destination: destination.trim() || undefined, timerMinutes: minutes });
      setEnded(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const onPin = async (pin: string) => {
    const r = await endWithPin(pin);
    if (r === "wrong") {
      Vibration.vibrate(200);
      return setPinError("That PIN didn't match. Try again.");
    }
    if (r === "unset") return setPinError("Set your PIN in Rise first.");
    // Real PIN and duress PIN land here identically (safety rule 7).
    Vibration.vibrate(60);
    setPinError(null);
    setAskPin(false);
    setEnded(true);
  };

  if (ended && !active) {
    return (
      <Screen>
        <Brand />
        <FadeIn style={{ alignItems: "center", paddingTop: 60 }}>
          <View style={styles.doneOrb}>
            <View style={styles.doneInner}>
              <Icon name="checkmark" size={44} color={colors.safe} />
            </View>
          </View>
          <Text style={[type.hero, { textAlign: "center", marginTop: space.xl }]}>Walk cancelled</Text>
          <Text style={[type.body, { textAlign: "center", color: colors.inkSoft, marginTop: space.xs }]}>Glad you made it. Location sharing has stopped.</Text>
          <Button label="Done" onPress={() => setEnded(false)} style={{ marginTop: space.xxl, alignSelf: "stretch" }} size="lg" />
        </FadeIn>
      </Screen>
    );
  }

  if (active && askPin) {
    return (
      <Screen>
        <Brand />
        <PinPad title="Enter your PIN" hint="To end your walk" onComplete={onPin} error={pinError} onCancel={() => setAskPin(false)} />
      </Screen>
    );
  }

  if (active && active.kind !== "walk") {
    return (
      <Screen>
        <Brand />
        <Hero title={active.panic ? "SOS is " : "Uneasy mode is "} accent="on." subtitle="Finish that first, then start a walk." />
        <Button label="Open it" iconRight="arrow-forward" onPress={() => router.push(active.panic ? "/sos" : "/uneasy")} />
      </Screen>
    );
  }

  if (active) {
    const total = active.timerEndsAt ? active.timerEndsAt - active.startedAt : 0;
    const left = active.timerEndsAt ? active.timerEndsAt - now : null;
    const overdue = left != null && left <= 0;
    const progress = left != null && total > 0 ? Math.min(1, Math.max(0, 1 - left / total)) : 0;
    return (
      <Screen>
        <Brand />
        <FadeIn>
          <View style={styles.liveCard}>
            <Row style={{ justifyContent: "space-between" }}>
              <StatusPill text={zone.inside ? "Sharing paused" : "Live location on"} tone="light" pulse={!zone.inside} />
              <Text style={styles.liveMeta}>{active.destination ? `→ ${active.destination}` : "Walk"}</Text>
            </Row>
            <View style={styles.ringWrap}>
              <View style={styles.ringGlow} />
              <View style={[styles.ring, overdue && { borderColor: "rgba(255,138,122,0.6)" }]}>
                <Text style={[styles.clock, overdue && { color: "#FFB4AB" }]}>{left == null ? "On" : overdue ? "0:00" : mmss(left)}</Text>
                <Text style={styles.clockLabel}>{overdue ? "timer ended" : "left to check in"}</Text>
              </View>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.round(progress * 100)}%` }, overdue && { experimental_backgroundImage: gradients.sos }]} />
            </View>
            <Text style={styles.liveNote}>
              {overdue
                ? "Your timer ran out, so your circle has been told. Enter your PIN when you're safe."
                : zone.inside
                  ? `Inside ${zone.zoneName ?? "a private zone"} — sharing resumes when you leave.`
                  : "If you don't check in in time, your circle gets your live location."}
            </Text>
          </View>
        </FadeIn>
        <FadeIn index={1}>
          <Button label="I've arrived" icon="checkmark-circle" variant="violet" size="lg" onPress={() => setAskPin(true)} />
          <Row style={{ marginTop: space.sm, gap: space.sm }}>
            <Button label="Share link" icon="share-social" variant="glass" style={{ flex: 1 }} onPress={() => Share.share({ message: `My SafeWalk live link: ${active.guardianUrl}` })} />
            <Button label="SOS" icon="call" variant="sos" style={{ flex: 1 }} onPress={() => router.push("/sos")} />
          </Row>
        </FadeIn>
      </Screen>
    );
  }

  return (
    <Screen>
      <FadeIn>
        <Brand />
        <Hero title={"Walk your\n"} accent="way." subtitle="Set a check-in timer. If you don't check in, your circle hears from SafeWalk." />
      </FadeIn>
      <FadeIn index={1}>
        <Card>
          <Field label="Where are you going?" icon="flag-outline" placeholder="e.g. Hostel" value={destination} onChangeText={setDestination} maxLength={120} />
          <Text style={[type.label, { marginBottom: space.sm }]}>Check-in timer</Text>
          <Row style={{ gap: space.xs, marginBottom: space.lg }}>
            {TIMERS.map((m) => {
              const on = minutes === m;
              return (
                <Pressy key={m} onPress={() => setMinutes(m)} style={{ flex: 1 }} accessibilityLabel={`${m} minutes`} scaleTo={0.94}>
                  <View style={[styles.timer, on && styles.timerOn]}>
                    <Text style={[styles.timerNum, on && { color: colors.white }]}>{m}</Text>
                    <Text style={[styles.timerUnit, on && { color: "rgba(255,255,255,0.75)" }]}>min</Text>
                  </View>
                </Pressy>
              );
            })}
          </Row>
          <Row style={styles.infoRow}>
            <Icon name="shield-checkmark" size={18} color={colors.violet} />
            <Text style={[type.small, { flex: 1 }]}>Your circle sees your live location only during the walk. End it with your PIN.</Text>
          </Row>
          {error ? <Banner text={error} tone="sos" /> : null}
          <Button label="Start walk" iconRight="arrow-forward" variant="violet" size="lg" loading={busy} onPress={begin} />
        </Card>
      </FadeIn>
      <FadeIn index={2}>
        <Card tone="violetSoft" onPress={() => router.push("/buddy")}>
          <Row style={{ gap: space.md }}>
            <IconCircle icon="people" tint={colors.white} color={colors.violet} size={46} />
            <View style={{ flex: 1 }}>
              <Text style={type.h3}>Walk together</Text>
              <Text style={type.small}>Find someone from campus heading your way.</Text>
            </View>
            <Icon name="chevron-forward" size={18} color={colors.inkSoft} />
          </Row>
        </Card>
      </FadeIn>
    </Screen>
  );
}

const styles = StyleSheet.create({
  liveCard: {
    borderRadius: radius.xl,
    padding: space.xl,
    marginBottom: space.lg,
    backgroundColor: colors.plum,
    experimental_backgroundImage: gradients.dusk,
    boxShadow: shadows.dark,
    overflow: "hidden",
  },
  liveMeta: { fontFamily: fonts.sansSemi, fontSize: 14, color: "rgba(255,255,255,0.85)" },
  ringWrap: { alignItems: "center", justifyContent: "center", marginVertical: space.xl },
  ringGlow: { position: "absolute", width: 260, height: 260, borderRadius: 130, experimental_backgroundImage: "radial-gradient(circle at 50% 50%, rgba(255,214,226,0.28) 0%, rgba(255,214,226,0) 65%)" },
  ring: {
    width: 210,
    height: 210,
    borderRadius: 105,
    borderWidth: 10,
    borderColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  clock: { fontFamily: fonts.display, fontSize: 58, lineHeight: 66, color: colors.white, letterSpacing: -1 },
  clockLabel: { fontFamily: fonts.sansSemi, fontSize: 12, letterSpacing: 1.4, textTransform: "uppercase", color: "rgba(255,255,255,0.7)" },
  track: { height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.18)", overflow: "hidden" },
  fill: { height: 8, borderRadius: 4, backgroundColor: colors.roseSoft, experimental_backgroundImage: "linear-gradient(90deg, #F6A6C1 0%, #FFE9F0 100%)" },
  liveNote: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 21, color: "rgba(255,255,255,0.82)", marginTop: space.md },
  timer: {
    minHeight: 64,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "rgba(74,40,102,0.1)",
  },
  timerOn: { backgroundColor: colors.ink, borderColor: colors.ink, boxShadow: shadows.dark },
  timerNum: { fontFamily: fonts.sansExtra, fontSize: 20, color: colors.ink },
  timerUnit: { fontFamily: fonts.sansMedium, fontSize: 11, color: colors.inkSoft, marginTop: -2 },
  infoRow: { gap: 10, backgroundColor: colors.violetWash, borderRadius: radius.sm, padding: space.sm, marginBottom: space.md, alignItems: "flex-start" },
  doneOrb: { width: 132, height: 132, borderRadius: 66, alignItems: "center", justifyContent: "center", experimental_backgroundImage: "radial-gradient(circle at 50% 50%, rgba(30,138,90,0.22) 0%, rgba(30,138,90,0) 70%)" },
  doneInner: { width: 92, height: 92, borderRadius: 46, backgroundColor: colors.safeWash, alignItems: "center", justifyContent: "center", borderWidth: 4, borderColor: colors.white, boxShadow: shadows.soft },
});
