import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import {
  Banner,
  Bubble,
  Button,
  Card,
  Chip,
  ChipRow,
  FadeIn,
  Header,
  HeaderIcon,
  Hero,
  Icon,
  IconBubble,
  ListItem,
  Muted,
  Row,
  RoundIconButton,
  Screen,
  SectionTitle,
} from "@/components/ui";
import { api, type Place } from "@/lib/api";
import { addressFor, currentPosition, stateFor } from "@/lib/geo";
import { cachedHelplines, dial, fetchHelplines, medicalFastDial, type HelplineCache } from "@/lib/medical";
import { colors, fonts, gradients, radius, shadows, space, type } from "@/theme";

const km = (m: number) => (m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1)} km`);
function host(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export default function Help() {
  const params = useLocalSearchParams<{ medical?: string }>();
  const [lines, setLines] = useState<HelplineCache | null>(null);
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [placeType, setPlaceType] = useState<"hospital" | "police">("hospital");
  const [places, setPlaces] = useState<Place[] | null>(null);
  const [placesError, setPlacesError] = useState<string | null>(null);
  const [medicalMode, setMedicalMode] = useState(params.medical === "1");
  const [medicalMsg, setMedicalMsg] = useState<string | null>(null);

  useEffect(() => {
    if (params.medical === "1") {
      setMedicalMode(true);
      setPlaceType("hospital");
    }
  }, [params.medical]);

  useEffect(() => {
    void cachedHelplines().then((c) => c && setLines((cur) => cur ?? c));
    void (async () => {
      const p = await currentPosition();
      if (!p) return;
      const here = { lat: p.coords.latitude, lng: p.coords.longitude };
      setPos(here);
      const [state, addr] = await Promise.all([stateFor(here.lat, here.lng), addressFor(here.lat, here.lng)]);
      setAddress(addr);
      fetchHelplines(state).then(setLines).catch(() => undefined);
    })();
  }, []);

  const loadPlaces = useCallback(async () => {
    if (!pos) return;
    setPlaces(null);
    setPlacesError(null);
    try {
      setPlaces((await api.nearby(placeType, pos.lat, pos.lng)).places);
    } catch (err) {
      setPlacesError((err as Error).message);
      setPlaces([]);
    }
  }, [pos, placeType]);

  useEffect(() => {
    void loadPlaces();
  }, [loadPlaces]);

  const fastDial = async () => {
    setMedicalMode(true);
    setPlaceType("hospital");
    setMedicalMsg("Telling your circle…");
    const { notify } = await medicalFastDial();
    notify
      .then(() => setMedicalMsg("Your circle has your location."))
      .catch(() => setMedicalMsg("Couldn't reach the server — your circle wasn't told. Call them if you can."));
  };

  const ambulance = lines?.ambulanceNumber ?? "112";

  return (
    <Screen header={<Header title="Help" accent="Verified numbers only" accentIcon="shield-checkmark-outline" right={<HeaderIcon icon="ellipsis-horizontal" label="Profile" onPress={() => router.push("/profile")} />} />}>
      <FadeIn>
        <Hero title="Help, when you need it." accent={lines?.state ? `Numbers for ${lines.state} and all of India` : undefined} />
      </FadeIn>

      <FadeIn index={1}>
        <View style={styles.medical}>
          <Row style={{ gap: space.sm, alignItems: "flex-start" }}>
            <IconBubble icon="medkit" tint="rgba(255,255,255,0.25)" color={colors.white} size={46} />
            <View style={{ flex: 1 }}>
              <Text style={[type.title, { color: colors.white, fontSize: 21 }]}>Medical emergency</Text>
              <Text style={[type.body, { color: "rgba(255,255,255,0.9)", marginTop: 4 }]}>One tap calls {ambulance} and sends your location to your circle at the same moment.</Text>
            </View>
          </Row>
          <Button label={`Call ambulance · ${ambulance}`} icon="call" variant="light" size="lg" onPress={fastDial} style={{ marginTop: space.lg }} />
        </View>
      </FadeIn>

      {medicalMode ? (
        <FadeIn>
          <Bubble style={{ maxWidth: "100%" }}>
            <Text style={type.accent}>Read this to the operator</Text>
            <Text style={styles.address}>{address ?? (pos ? `${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}` : "Finding your location…")}</Text>
            {pos && address ? <Muted>GPS {pos.lat.toFixed(5)}, {pos.lng.toFixed(5)}</Muted> : null}
            {medicalMsg ? <View style={{ marginTop: space.sm }}><Banner text={medicalMsg} tone={medicalMsg.startsWith("Couldn't") ? "amber" : "safe"} /></View> : null}
            <Button label="Show my medical card" icon="heart-outline" variant="outline" size="sm" onPress={() => router.push("/profile")} style={{ alignSelf: "flex-start" }} />
          </Bubble>
        </FadeIn>
      ) : null}

      <FadeIn index={2}>
        <SectionTitle title="Nearby" icon="locate-outline" onIcon={() => void loadPlaces()} />
        <ChipRow>
          <Chip icon="medical-outline" label="Hospitals" selected={placeType === "hospital"} onPress={() => setPlaceType("hospital")} />
          <Chip icon="shield-outline" label="Police stations" selected={placeType === "police"} onPress={() => setPlaceType("police")} />
        </ChipRow>
        <Card style={{ paddingVertical: space.xs }}>
          {!pos ? <Muted style={{ paddingVertical: space.md }}>Turn on location to see places near you.</Muted> : null}
          {pos && places === null ? <ActivityIndicator color={colors.magenta} style={{ paddingVertical: space.lg }} /> : null}
          {placesError ? <Banner text={placesError} tone="amber" /> : null}
          {places?.length === 0 && !placesError ? <Muted style={{ paddingVertical: space.md }}>Nothing found nearby.</Muted> : null}
          {places?.map((p, i) => (
            <ListItem
              key={`${p.name}${i}`}
              icon={placeType === "hospital" ? "medical" : "shield"}
              iconTint={placeType === "hospital" ? colors.sosWash : colors.lilacWash}
              iconColor={placeType === "hospital" ? colors.sos : colors.lilac}
              title={p.name}
              subtitle={`${km(p.distanceM)}${p.address ? ` · ${p.address}` : ""}`}
              last={i === places.length - 1}
              right={
                p.phone ? (
                  <RoundIconButton icon="call" label={`Call ${p.name}`} onPress={() => dial(p.phone!.replace(/\s/g, ""))} size={40} />
                ) : (
                  <RoundIconButton icon="navigate" label={`Open ${p.name} in Maps`} tone="light" onPress={() => Linking.openURL(p.mapsUrl)} size={40} />
                )
              }
            />
          ))}
          {places?.length ? (
            <Row style={{ justifyContent: "flex-end", gap: 5, paddingBottom: space.xs }}>
              <Icon name="logo-google" size={11} color={colors.inkSoft} />
              <Text style={[type.small, { fontSize: 11 }]}>Source: Google Maps</Text>
            </Row>
          ) : null}
        </Card>
      </FadeIn>

      <FadeIn index={3}>
        <SectionTitle title="Helplines" />
        {!lines ? <ActivityIndicator color={colors.magenta} /> : null}
        {lines?.helplines.map((h) => (
          <Card key={h.number} style={{ paddingVertical: space.sm }}>
            <Row style={{ gap: space.md }}>
              <View style={styles.num}>
                <Text style={styles.numText}>{h.number}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[type.cardTitle, { fontSize: 14.5 }]}>{h.purpose}</Text>
                <Pressable onPress={() => Linking.openURL(h.sourceUrl)} hitSlop={8} accessibilityRole="link">
                  <Text style={[type.small, { fontSize: 11.5, marginTop: 2 }]}>
                    {h.coverage} · {host(h.sourceUrl)} ↗
                  </Text>
                </Pressable>
              </View>
              <RoundIconButton icon="call" label={`Call ${h.number}`} onPress={() => dial(h.number)} size={40} />
            </Row>
          </Card>
        ))}
        <Row style={{ justifyContent: "center", gap: 6, marginTop: space.xs }}>
          <Icon name="checkmark-done" size={14} color={colors.safe} />
          <Text style={[type.small, { fontSize: 11.5 }]}>Every number comes from an official government page.</Text>
        </Row>
      </FadeIn>
    </Screen>
  );
}

const styles = StyleSheet.create({
  medical: {
    borderRadius: radius.lg,
    padding: space.lg,
    marginBottom: space.md,
    backgroundColor: colors.sos,
    experimental_backgroundImage: gradients.sos,
    boxShadow: shadows.sos,
  },
  address: { fontFamily: fonts.serifBold, fontSize: 24, lineHeight: 33, color: colors.ink, marginVertical: space.xs },
  num: { minWidth: 64, height: 46, paddingHorizontal: 8, borderRadius: 14, backgroundColor: colors.magentaWash, alignItems: "center", justifyContent: "center" },
  numText: { fontFamily: fonts.serifBold, fontSize: 18, color: colors.magenta },
});
