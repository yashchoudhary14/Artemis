import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Share, StyleSheet, Text, Vibration, View } from "react-native";
import { PinPad } from "@/components/PinPad";
import { Banner, Brand, Card, Chip, Field, Hero, Muted, PillButton, Row, Screen } from "@/components/ui";
import { endWithPin, startWalk } from "@/lib/actions";
import { meStore } from "@/lib/account";
import { sessionStore } from "@/lib/session";
import { useStore } from "@/lib/store";
import { insideZoneStore } from "@/lib/zones";
import { colors, space, type } from "@/theme";

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
        <View style={styles.center}>
          <View style={styles.okCircle}>
            <Text style={{ fontSize: 40, color: colors.green }}>✓</Text>
          </View>
          <Text style={[type.hero, { textAlign: "center" }]}>Walk cancelled</Text>
          <Muted style={{ textAlign: "center", marginTop: space.sm }}>Glad you made it. Location sharing has stopped.</Muted>
          <PillButton label="Done" onPress={() => setEnded(false)} style={{ marginTop: space.xl, alignSelf: "stretch" }} />
        </View>
      </Screen>
    );
  }

  if (active && askPin) {
    return (
      <Screen>
        <Brand />
        <PinPad title="Enter your PIN" hint="To end your walk" onComplete={onPin} error={pinError} />
        <PillButton label="Back" variant="ghost" onPress={() => setAskPin(false)} />
      </Screen>
    );
  }

  if (active && active.kind !== "walk") {
    return (
      <Screen>
        <Brand />
        <Hero title={active.panic ? "SOS is on" : "Uneasy mode is on"} subtitle="Finish that first, then start a walk." />
        <PillButton label="Open it" onPress={() => router.push(active.panic ? "/sos" : "/uneasy")} />
      </Screen>
    );
  }

  if (active) {
    const left = active.timerEndsAt ? active.timerEndsAt - now : null;
    const overdue = left != null && left <= 0;
    return (
      <Screen>
        <Brand />
        <Text style={type.label}>Walking{active.destination ? ` to ${active.destination}` : ""}</Text>
        <Text style={[styles.clock, overdue && { color: colors.coral }]}>{left == null ? "On" : overdue ? "0:00" : mmss(left)}</Text>
        <Muted>
          {overdue
            ? "Your timer ran out, so your circle has been told. Enter your PIN when you're safe."
            : "If you don't check in before the timer ends, your circle gets an alert with your live location."}
        </Muted>
        <View style={{ height: space.lg }} />
        {zone.inside ? <Banner text={`Inside ${zone.zoneName ?? "a private zone"}: sharing paused. It resumes when you leave.`} /> : <Banner text="Your circle can see your live location." tone="green" />}
        <PillButton label="I've arrived" big onPress={() => setAskPin(true)} />
        <Row style={{ marginTop: space.md }}>
          <PillButton label="Share live link" variant="soft" style={{ flex: 1 }} onPress={() => Share.share({ message: `My SafeWalk live link: ${active.guardianUrl}` })} />
          <PillButton label="SOS" variant="coral" style={{ flex: 1 }} onPress={() => router.push("/sos")} />
        </Row>
      </Screen>
    );
  }

  return (
    <Screen>
      <Brand />
      <Hero title={"Walk your way."} subtitle="Set a check-in timer. If you don't check in, your circle hears from SafeWalk." />
      <Card>
        <Field label="Where are you going?" placeholder="e.g. Hostel" value={destination} onChangeText={setDestination} maxLength={120} />
        <Text style={[type.label, { marginBottom: 8 }]}>Check-in timer (minutes)</Text>
        <Row style={{ flexWrap: "wrap" }}>
          {TIMERS.map((m) => (
            <Chip key={m} label={`${m}`} selected={minutes === m} onPress={() => setMinutes(m)} />
          ))}
        </Row>
        {error ? <Banner text={error} tone="coral" /> : <View style={{ height: space.md }} />}
        <PillButton label="Start walk" big loading={busy} onPress={begin} />
      </Card>
      <Card onPress={() => router.push("/buddy")} tint="lilac">
        <Text style={type.h2}>Walk together</Text>
        <Muted>Find someone from your institute heading the same way.</Muted>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  clock: { fontFamily: type.hero.fontFamily, fontSize: 72, lineHeight: 80, color: colors.ink, marginVertical: space.sm },
  center: { alignItems: "center", paddingTop: 80 },
  okCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.greenSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space.lg,
  },
});
