import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Share, StyleSheet, Text, Vibration, View } from "react-native";
import { PinPad } from "@/components/PinPad";
import {
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
  Row,
  Screen,
  StatusPill,
} from "@/components/ui";
import { endWithPin, startWalk } from "@/lib/actions";
import { meStore } from "@/lib/account";
import { sessionStore } from "@/lib/session";
import { useStore } from "@/lib/store";
import { insideZoneStore } from "@/lib/zones";
import { colors, fonts, gradients, radius, space, type } from "@/theme";

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

const mmss = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};
const clock = (ms: number) => new Date(ms).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }).toLowerCase();

export default function Walk() {
  const params = useLocalSearchParams<{ destination?: string }>();
  const active = useStore(sessionStore);
  const { me } = useStore(meStore);
  const zone = useStore(insideZoneStore);
  const [destination, setDestination] = useState(params.destination ?? "");
  const [minutes, setMinutes] = useState(10);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [askPin, setAskPin] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [ended, setEnded] = useState(false);
  const now = useNow(Boolean(active));

  useEffect(() => {
    if (params.destination) setDestination(params.destination);
  }, [params.destination]);

  const begin = async () => {
    setError(null);
    if (!me) return setError("Set up your account in your profile first.");
    if (!me.contacts.some((c) => c.tier === "inner")) return setError("Add at least one person to your inner circle first.");
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
    if (r === "unset") return setPinError("Set your PIN in your profile first.");
    // Real PIN and duress PIN land here identically (safety rule 7).
    Vibration.vibrate(60);
    setPinError(null);
    setAskPin(false);
    setEnded(true);
  };

  const header = (title: string, accent?: string) => (
    <Header title={title} accent={accent} accentIcon={accent ? "sync-outline" : undefined} right={<HeaderIcon icon="ellipsis-horizontal" label="Profile" onPress={() => router.push("/profile")} />} />
  );

  if (ended && !active) {
    return (
      <Screen header={header("Your walk")}>
        <FadeIn style={{ alignItems: "center", paddingTop: 48 }}>
          <View style={styles.doneOrb}>
            <Icon name="checkmark" size={40} color={colors.safe} />
          </View>
          <Text style={[type.hero, { marginTop: space.xl }]}>Walk cancelled</Text>
          <Text style={[type.bodySoft, { textAlign: "center", marginTop: space.xs }]}>Glad you made it. Location sharing has stopped.</Text>
          <Button label="Done" iconRight="arrow-forward" onPress={() => setEnded(false)} style={{ marginTop: space.xxl }} />
        </FadeIn>
      </Screen>
    );
  }

  if (active && askPin) {
    return (
      <Screen header={header("End walk")}>
        <PinPad title="Enter your PIN" hint="To end your walk" onComplete={onPin} error={pinError} onCancel={() => setAskPin(false)} />
      </Screen>
    );
  }

  if (active && active.kind !== "walk") {
    return (
      <Screen header={header("Walk")}>
        <Hero title={active.panic ? "SOS is running right now." : "Uneasy mode is on."} accent="Finish that first" />
        <Button label="Open it" iconRight="arrow-forward" onPress={() => router.push(active.panic ? "/sos" : "/uneasy")} style={{ alignSelf: "center" }} />
      </Screen>
    );
  }

  if (active) {
    const total = active.timerEndsAt ? active.timerEndsAt - active.startedAt : 0;
    const left = active.timerEndsAt ? active.timerEndsAt - now : null;
    const overdue = left != null && left <= 0;
    const progress = left != null && total > 0 ? Math.min(1, Math.max(0, 1 - left / total)) : 0;
    return (
      <Screen
        header={header(active.destination ? `To ${active.destination}` : "Your walk", zone.inside ? "Sharing paused" : "Live with your circle")}
        footer={
          <View style={styles.footer}>
            <Button label="I've arrived" icon="checkmark-circle-outline" size="lg" onPress={() => setAskPin(true)} />
            <Row style={{ gap: space.xs, marginTop: space.xs }}>
              <Button label="Share link" icon="share-outline" variant="light" size="sm" style={{ flex: 1 }} onPress={() => Share.share({ message: `My SafeWalk live link: ${active.guardianUrl}` })} />
              <Button label="SOS" icon="call" variant="sos" size="sm" style={{ flex: 1 }} onPress={() => router.push("/sos")} />
            </Row>
          </View>
        }
        bottomInset={210}
      >
        <FadeIn>
          <Bubble side="right" time={clock(active.startedAt)} read>
            <Text style={type.body}>I'm walking{active.destination ? ` to ${active.destination}` : ""}. Stay with me?</Text>
          </Bubble>
        </FadeIn>
        <FadeIn index={1}>
          <Bubble time={clock(active.startedAt)}>
            <Text style={type.body}>Of course. Your circle can follow your live location now, and I'll check on you when the timer ends.</Text>
          </Bubble>
        </FadeIn>
        <FadeIn index={2}>
          <Card style={styles.timerCard}>
            <Row style={{ justifyContent: "space-between" }}>
              <Text style={[type.small, { fontFamily: fonts.sansMedium }]}>{active.timerEndsAt ? `Check in by ${clock(active.timerEndsAt)}` : "No timer"}</Text>
              <StatusPill text={zone.inside ? "Paused" : "Live"} tone={zone.inside ? "safe" : "magenta"} pulse={!zone.inside} />
            </Row>
            <Text style={[styles.countdown, overdue && { color: colors.sosDeep }]}>{left == null ? "—" : overdue ? "0:00" : mmss(left)}</Text>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.round(progress * 100)}%` }, overdue && { experimental_backgroundImage: gradients.sos }]} />
            </View>
            <Text style={[type.small, { marginTop: space.sm }]}>
              {zone.inside ? `Inside ${zone.zoneName ?? "a private zone"} — nothing is shared here.` : "Updates every 15 seconds, even with the screen off."}
            </Text>
          </Card>
        </FadeIn>
        {overdue ? (
          <FadeIn>
            <Bubble>
              <Text style={[type.cardTitle, { color: colors.sosDeep }]}>Your timer ran out.</Text>
              <Text style={[type.body, { marginTop: 4 }]}>I've told your circle where you are. Enter your PIN when you're safe.</Text>
            </Bubble>
          </FadeIn>
        ) : null}
      </Screen>
    );
  }

  return (
    <Screen header={header("New walk", "Check-in timer")}>
      <FadeIn>
        <Hero title="Where are you going, and how long will it take?" />
      </FadeIn>
      <FadeIn index={1}>
        <Card>
          <Field label="Destination" icon="flag-outline" placeholder="e.g. Hostel" value={destination} onChangeText={setDestination} maxLength={120} />
          <Text style={[type.small, { marginBottom: 8, fontFamily: fonts.sansMedium }]}>Check-in timer</Text>
          <ChipRow wrap>
            {TIMERS.map((m) => (
              <Chip key={m} icon="time-outline" label={`${m} min`} selected={minutes === m} onPress={() => setMinutes(m)} />
            ))}
          </ChipRow>
          <Row style={styles.note}>
            <Icon name="shield-checkmark-outline" size={16} color={colors.magenta} />
            <Text style={[type.small, { flex: 1 }]}>Your circle sees your live location only during the walk. If you don't check in, they hear from SafeWalk.</Text>
          </Row>
          {error ? <Banner text={error} tone="sos" /> : null}
          <Button label="Start walk" iconRight="arrow-forward" size="lg" loading={busy} onPress={begin} />
        </Card>
      </FadeIn>
      <FadeIn index={2}>
        <Bubble>
          <Text style={type.cardTitle}>Rather not walk alone?</Text>
          <Text style={[type.bodySoft, { marginTop: 4 }]}>Find a verified student heading the same way.</Text>
          <Button label="Walk together" iconRight="arrow-forward" variant="outline" size="sm" onPress={() => router.push("/buddy")} style={{ alignSelf: "flex-start", marginTop: space.sm }} />
        </Bubble>
      </FadeIn>
    </Screen>
  );
}

const styles = StyleSheet.create({
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.sm,
    experimental_backgroundImage: "linear-gradient(180deg, rgba(253,245,248,0) 0%, rgba(253,245,248,0.96) 30%)",
  },
  timerCard: { padding: space.lg, marginTop: space.xs, marginBottom: space.sm },
  countdown: { fontFamily: fonts.serifBold, fontSize: 64, lineHeight: 76, color: colors.ink, marginTop: space.sm, letterSpacing: -1 },
  track: { height: 6, borderRadius: 3, backgroundColor: "rgba(26,23,28,0.08)", overflow: "hidden" },
  fill: { height: 6, borderRadius: 3, backgroundColor: colors.magenta, experimental_backgroundImage: "linear-gradient(90deg, #F09BB9 0%, #C92A66 100%)" },
  note: { gap: 8, alignItems: "flex-start", backgroundColor: colors.magentaWash, borderRadius: radius.sm, padding: space.sm, marginBottom: space.md },
  doneOrb: { width: 92, height: 92, borderRadius: 46, backgroundColor: colors.safeWash, alignItems: "center", justifyContent: "center", borderWidth: 4, borderColor: colors.white },
});
