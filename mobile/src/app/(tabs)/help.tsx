import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Banner, Brand, Card, Chip, Hero, Muted, PillButton, Row, Screen, SectionTitle } from "@/components/ui";
import { api, type Place } from "@/lib/api";
import { addressFor, currentPosition, stateFor } from "@/lib/geo";
import { cachedHelplines, dial, fetchHelplines, medicalFastDial, type HelplineCache } from "@/lib/medical";
import { colors, space, type } from "@/theme";

function km(m: number) {
  return m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1)} km`;
}

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

  // Location → state → helplines (cached for offline), address for the operator.
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
    notify.then(() => setMedicalMsg("Your circle has your location.")).catch(() => setMedicalMsg("Couldn't reach the server — your circle wasn't told. Call them if you can."));
  };

  const ambulance = lines?.ambulanceNumber ?? "112";

  return (
    <Screen>
      <Brand />
      <Hero title={"Help, when\nyou need it."} subtitle={lines?.state ? `Numbers for ${lines.state} and all of India.` : "Verified numbers and help near you."} />

      <Card tint="coral">
        <Text style={styles.medTitle}>Medical emergency</Text>
        <Text style={styles.medBody}>One tap calls {ambulance} and sends your location to your circle at the same time.</Text>
        <PillButton label={`Call ambulance · ${ambulance}`} variant="soft" big onPress={fastDial} style={{ marginTop: space.md }} />
      </Card>

      {medicalMode ? (
        <Card>
          <Text style={type.label}>Read this to the operator</Text>
          <Text style={styles.address}>{address ?? (pos ? `${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}` : "Finding your location…")}</Text>
          {pos && address ? <Muted>GPS: {pos.lat.toFixed(5)}, {pos.lng.toFixed(5)}</Muted> : null}
          {medicalMsg ? <Banner text={medicalMsg} tone={medicalMsg.startsWith("Couldn't") ? "amber" : "green"} /> : null}
          <PillButton label="Medical card" variant="ghost" onPress={() => router.push("/rise")} />
        </Card>
      ) : null}

      <SectionTitle title="Nearby" />
      <Row style={{ marginBottom: space.md }}>
        <Chip label="Hospitals" selected={placeType === "hospital"} onPress={() => setPlaceType("hospital")} />
        <Chip label="Police" selected={placeType === "police"} onPress={() => setPlaceType("police")} />
      </Row>
      <Card>
        {!pos ? <Muted>Turn on location to see places near you.</Muted> : null}
        {pos && places === null ? <ActivityIndicator color={colors.lilac} /> : null}
        {placesError ? <Banner text={placesError} tone="amber" /> : null}
        {places?.length === 0 && !placesError ? <Muted>Nothing found nearby.</Muted> : null}
        {places?.map((p, i) => (
          <View key={`${p.name}${i}`} style={[styles.place, i > 0 && styles.divider]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.placeName}>{p.name}</Text>
              <Muted>
                {km(p.distanceM)}
                {p.address ? ` · ${p.address}` : ""}
              </Muted>
            </View>
            {p.phone ? (
              <PillButton label="Call" variant="dark" onPress={() => dial(p.phone!.replace(/\s/g, ""))} style={styles.callBtn} />
            ) : (
              <PillButton label="Map" variant="ghost" onPress={() => Linking.openURL(p.mapsUrl)} style={styles.callBtn} />
            )}
          </View>
        ))}
        {places?.length ? <Text style={styles.source}>Source: Google Maps</Text> : null}
      </Card>

      <SectionTitle title="Helplines" />
      <Card>
        {!lines ? <ActivityIndicator color={colors.lilac} /> : null}
        {lines?.helplines.map((h, i) => (
          <View key={h.number} style={[styles.place, i > 0 && styles.divider]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.number}>{h.number}</Text>
              <Text style={type.body}>Use this for: {h.purpose.charAt(0).toLowerCase() + h.purpose.slice(1)}</Text>
              <Pressable onPress={() => Linking.openURL(h.sourceUrl)}>
                <Text style={styles.source}>
                  {h.coverage} · source: {host(h.sourceUrl)} · checked {h.dateVerified}
                </Text>
              </Pressable>
            </View>
            <PillButton label="Call" variant="dark" onPress={() => dial(h.number)} style={styles.callBtn} />
          </View>
        ))}
      </Card>
      <Muted style={{ textAlign: "center" }}>Every number here comes from an official government page. Calls open your dialler; you press call.</Muted>
    </Screen>
  );
}

const styles = StyleSheet.create({
  medTitle: { ...type.title, color: colors.white },
  medBody: { color: colors.white, marginTop: 6, fontSize: 15, lineHeight: 21 },
  address: { fontSize: 26, lineHeight: 34, fontWeight: "700", color: colors.ink, marginVertical: space.sm },
  place: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.md },
  divider: { borderTopWidth: 1, borderTopColor: colors.line },
  placeName: { fontSize: 16, fontWeight: "700", color: colors.ink },
  number: { fontSize: 24, fontWeight: "800", color: colors.ink },
  callBtn: { minHeight: 42, paddingHorizontal: 18 },
  source: { fontSize: 12, color: colors.muted, marginTop: 4 },
});
