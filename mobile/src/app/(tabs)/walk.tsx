import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Share, StyleSheet, Text, TextInput, Vibration, View } from "react-native";
import { PinPad } from "@/components/PinPad";
import {
  ArtemisLabel,
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
  Pressy,
  Row,
  Screen,
  StatusPill,
} from "@/components/ui";
import { endWithPin, startWalk } from "@/lib/actions";
import { meStore } from "@/lib/account";
import { useBriefing } from "@/lib/briefing";
import { sessionStore } from "@/lib/session";
import { useStore } from "@/lib/store";
import { insideZoneStore } from "@/lib/zones";
import { colors, fonts, gradients, radius, space, type } from "@/theme";

const TIMERS = [5, 10, 15, 20, 30];

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
  const { briefing, loading: loadingBrief } = useBriefing(destination, minutes, !active);

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
              <Button label="Share link" icon="share-outline" variant="light" size="sm" style={{ flex: 1 }} onPress={() => Share.share({ message: `My Artemis live link: ${active.guardianUrl}` })} />
              <Button label="SOS" icon="call" variant="sos" size="sm" style={{ flex: 1 }} onPress={() => router.push("/sos")} />
            </Row>
          </View>
        }
        bottomInset={300}
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
    <Screen
      header={<Header left={<HeaderIcon icon="chevron-back" label="Back" onPress={() => (router.canGoBack() ? router.back() : router.push("/"))} />} title="New walk" />}
      footer={
        <View style={styles.footer}>
          {error ? <Banner text={error} tone="sos" /> : null}
          <Button label="Start walk" iconRight="arrow-forward" size="lg" loading={busy} onPress={begin} />
        </View>
      }
      bottomInset={130}
    >
      <FadeIn>
        <Text style={type.small}>Where are you going?</Text>
        <TextInput
          value={destination}
          onChangeText={setDestination}
          placeholder="To the Library"
          placeholderTextColor={colors.inkFaint}
          maxLength={120}
          style={styles.dest}
          accessibilityLabel="Destination"
        />
      </FadeIn>
      <FadeIn index={1}>
        <Text style={[type.small, { marginTop: space.lg }]}>Tell my circle if I'm not there in</Text>
        <Row style={{ justifyContent: "space-between", marginTop: 4 }}>
          <Row style={{ alignItems: "baseline", gap: 6 }}>
            <Text style={styles.minutes}>{minutes}</Text>
            <Text style={[type.bodySoft, { fontSize: 16 }]}>min</Text>
          </Row>
          <Row style={{ gap: 8 }}>
            <Pressy onPress={() => setMinutes((m) => Math.max(2, m - 1))} accessibilityLabel="Less time" scaleTo={0.9}>
              <View style={styles.step}><Icon name="remove" size={20} /></View>
            </Pressy>
            <Pressy onPress={() => setMinutes((m) => Math.min(60, m + 1))} accessibilityLabel="More time" scaleTo={0.9}>
              <View style={styles.step}><Icon name="add" size={20} /></View>
            </Pressy>
          </Row>
        </Row>
        <ChipRow>
          {TIMERS.map((m) => (
            <Chip key={m} label={`${m} min`} selected={minutes === m} onPress={() => setMinutes(m)} />
          ))}
        </ChipRow>
      </FadeIn>
      <FadeIn index={2}>
        <Card style={{ padding: 20 }}>
          <ArtemisLabel text="Artemis briefing" note={briefing ? briefing.source : undefined} />
          {briefing ? (
            briefing.tips.map((t, i) => (
              <View key={i} style={styles.tipRow}>
                <Text style={styles.tipNum}>{String(i + 1).padStart(2, "0")}</Text>
                <Text style={[type.body, { flex: 1 }]}>{t}</Text>
              </View>
            ))
          ) : (
            <Text style={[type.bodySoft, { marginTop: 12 }]}>{loadingBrief ? "Reading your route, the time and help nearby…" : "No briefing right now. You can still start your walk."}</Text>
          )}
        </Card>
      </FadeIn>
      <FadeIn index={3}>
        <Row style={{ justifyContent: "space-between", marginTop: space.xs }}>
          <Row style={{ gap: 10 }}>
            <View style={{ flexDirection: "row" }}>
              {(me?.contacts ?? []).slice(0, 3).map((c, i) => (
                <View key={c.id} style={{ marginLeft: i ? -8 : 0 }}>
                  <Avatar name={c.name} index={i} size={30} />
                </View>
              ))}
            </View>
            <Text style={type.small}>{me?.contacts[0] ? `${me.contacts[0].name} is told first` : "Add your circle first"}</Text>
          </Row>
          <Pressable onPress={() => router.push("/buddy")} hitSlop={10} accessibilityRole="button">
            <Text style={[type.small, { textDecorationLine: "underline" }]}>Walk with someone</Text>
          </Pressable>
        </Row>
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
    paddingBottom: 110,
    experimental_backgroundImage: "linear-gradient(180deg, rgba(247,244,243,0) 0%, rgba(247,244,243,0.96) 25%)",
  },
  dest: { fontFamily: fonts.serif, fontSize: 44, lineHeight: 50, color: colors.ink, paddingVertical: 4, letterSpacing: -0.8 },
  minutes: { fontFamily: fonts.serif, fontSize: 88, lineHeight: 92, color: colors.ink, letterSpacing: -2 },
  step: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: "rgba(23,20,26,0.12)", alignItems: "center", justifyContent: "center" },
  tipRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  tipNum: { fontFamily: fonts.sans, fontSize: 12, color: colors.inkFaint, width: 20, paddingTop: 3 },
  timerCard: { padding: space.lg, marginTop: space.xs, marginBottom: space.sm },
  countdown: { fontFamily: fonts.serif, fontSize: 88, lineHeight: 96, color: colors.ink, marginTop: space.sm, letterSpacing: -1 },
  track: { height: 6, borderRadius: 3, backgroundColor: "rgba(26,23,28,0.08)", overflow: "hidden" },
  fill: { height: 6, borderRadius: 3, backgroundColor: colors.ink },
  note: { gap: 8, alignItems: "flex-start", backgroundColor: colors.magentaWash, borderRadius: radius.sm, padding: space.sm, marginBottom: space.md },
  doneOrb: { width: 92, height: 92, borderRadius: 46, backgroundColor: colors.safeWash, alignItems: "center", justifyContent: "center", borderWidth: 4, borderColor: colors.white },
});
