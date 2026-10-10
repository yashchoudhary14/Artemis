import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Banner, Brand, Button, Card, FadeIn, Hero, Icon, IconCircle, Muted, Pressy, Row, Screen, SectionHeader, Segmented } from "@/components/ui";
import { api, type Place } from "@/lib/api";
import { addressFor, currentPosition, stateFor } from "@/lib/geo";
import { cachedHelplines, dial, fetchHelplines, medicalFastDial, type HelplineCache } from "@/lib/medical";
import { colors, fonts, radius, shadows, space, type } from "@/theme";

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

function CallButton({ onPress, label }: { onPress: () => void; label: string }) {
  return (
    <Pressy onPress={onPress} accessibilityLabel={label} scaleTo={0.9}>
      <View style={styles.callBtn}>
        <Icon name="call" size={18} color={colors.white} />
      </View>
    </Pressy>
  );
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
    notify
      .then(() => setMedicalMsg("Your circle has your location."))
      .catch(() => setMedicalMsg("Couldn't reach the server — your circle wasn't told. Call them if you can."));
  };

  const ambulance = lines?.ambulanceNumber ?? "112";

  return (
    <Screen>
      <FadeIn>
        <Brand />
        <Hero title={"Help, when\n"} accent="you need it." subtitle={lines?.state ? `Verified numbers for ${lines.state} and all of India.` : "Verified numbers and help near you."} />
      </FadeIn>

      <FadeIn index={1}>
        <Card tone="sos" style={{ padding: space.xl }}>
          <Row style={{ gap: space.md, alignItems: "flex-start" }}>
            <IconCircle icon="medkit" tint="rgba(255,255,255,0.22)" color={colors.white} size={50} />
            <View style={{ flex: 1 }}>
              <Text style={[type.title, { color: colors.white, fontSize: 24 }]}>Medical emergency</Text>
              <Text style={[type.body, { color: "rgba(255,255,255,0.88)", marginTop: 4 }]}>
                One tap calls {ambulance} and sends your location to your circle at the same moment.
              </Text>
            </View>
          </Row>
          <Button label={`Call ambulance · ${ambulance}`} icon="call" variant="light" size="lg" onPress={fastDial} style={{ marginTop: space.lg }} />
        </Card>
      </FadeIn>

      {medicalMode ? (
        <FadeIn>
          <Card>
            <Row style={{ gap: 8, marginBottom: space.xs }}>
              <Icon name="mic-outline" size={16} color={colors.violet} />
              <Text style={[type.label, { color: colors.violet }]}>Read this to the operator</Text>
            </Row>
            <Text style={styles.address}>{address ?? (pos ? `${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}` : "Finding your location…")}</Text>
            {pos && address ? <Muted>GPS {pos.lat.toFixed(5)}, {pos.lng.toFixed(5)}</Muted> : null}
            <View style={{ height: space.md }} />
            {medicalMsg ? <Banner text={medicalMsg} tone={medicalMsg.startsWith("Couldn't") ? "amber" : "safe"} /> : null}
            <Button label="Show my medical card" icon="heart-outline" variant="ghost" size="sm" onPress={() => router.push("/rise")} />
          </Card>
        </FadeIn>
      ) : null}

      <FadeIn index={2}>
        <SectionHeader title="Nearby" />
        <Segmented
          value={placeType}
          onChange={setPlaceType}
          options={[
            { value: "hospital", label: "Hospitals", icon: "medical" },
            { value: "police", label: "Police", icon: "shield" },
          ]}
        />
        <Card padded={false} style={{ paddingHorizontal: space.lg, paddingVertical: space.xs }}>
          {!pos ? <Muted style={{ paddingVertical: space.lg }}>Turn on location to see places near you.</Muted> : null}
          {pos && places === null ? <ActivityIndicator color={colors.violet} style={{ paddingVertical: space.xl }} /> : null}
          {placesError ? (
            <View style={{ paddingTop: space.md }}>
              <Banner text={placesError} tone="amber" />
            </View>
          ) : null}
          {places?.length === 0 && !placesError ? <Muted style={{ paddingVertical: space.lg }}>Nothing found nearby.</Muted> : null}
          {places?.map((p, i) => (
            <View key={`${p.name}${i}`} style={[styles.row, i < places.length - 1 && styles.divider]}>
              <IconCircle
                icon={placeType === "hospital" ? "medical" : "shield"}
                tint={placeType === "hospital" ? colors.roseWash : colors.violetWash}
                color={placeType === "hospital" ? colors.rose : colors.violet}
                size={42}
              />
              <View style={{ flex: 1 }}>
                <Text style={type.h3} numberOfLines={2}>
                  {p.name}
                </Text>
                <Text style={type.small} numberOfLines={1}>
                  <Text style={{ fontFamily: fonts.sansBold, color: colors.ink }}>{km(p.distanceM)}</Text>
                  {p.address ? ` · ${p.address}` : ""}
                </Text>
              </View>
              {p.phone ? (
                <CallButton onPress={() => dial(p.phone!.replace(/\s/g, ""))} label={`Call ${p.name}`} />
              ) : (
                <Pressy onPress={() => Linking.openURL(p.mapsUrl)} accessibilityLabel={`Open ${p.name} in Maps`} scaleTo={0.9}>
                  <View style={styles.mapBtn}>
                    <Icon name="navigate" size={18} color={colors.violet} />
                  </View>
                </Pressy>
              )}
            </View>
          ))}
          {places?.length ? (
            <Row style={styles.source}>
              <Icon name="logo-google" size={12} color={colors.inkSoft} />
              <Text style={[type.small, { fontSize: 12 }]}>Source: Google Maps</Text>
            </Row>
          ) : null}
        </Card>
      </FadeIn>

      <FadeIn index={3}>
        <SectionHeader title="Helplines" />
        {!lines ? <ActivityIndicator color={colors.violet} /> : null}
        {lines?.helplines.map((h) => (
          <Card key={h.number} style={{ paddingVertical: space.md }}>
            <Row style={{ gap: space.md }}>
              <View style={styles.numPill}>
                <Text style={styles.num}>{h.number}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={type.h3}>{h.purpose}</Text>
                <Pressable onPress={() => Linking.openURL(h.sourceUrl)} hitSlop={8}>
                  <Text style={[type.small, { fontSize: 12, marginTop: 2 }]}>
                    {h.coverage} · {host(h.sourceUrl)} <Icon name="open-outline" size={11} color={colors.inkSoft} />
                  </Text>
                </Pressable>
              </View>
              <CallButton onPress={() => dial(h.number)} label={`Call ${h.number}`} />
            </Row>
          </Card>
        ))}
        <Row style={{ justifyContent: "center", gap: 6, marginTop: space.xs }}>
          <Icon name="checkmark-done" size={14} color={colors.safe} />
          <Text style={[type.small, { fontSize: 12 }]}>Every number comes from an official government page.</Text>
        </Row>
      </FadeIn>
    </Screen>
  );
}

const styles = StyleSheet.create({
  address: { fontFamily: fonts.display, fontSize: 26, lineHeight: 34, color: colors.ink, marginVertical: space.xs },
  row: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingVertical: 14 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.hairline },
  callBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center", boxShadow: shadows.dark },
  mapBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.violetWash, alignItems: "center", justifyContent: "center" },
  numPill: { minWidth: 70, paddingHorizontal: 10, height: 48, borderRadius: radius.sm, backgroundColor: colors.violetWash, alignItems: "center", justifyContent: "center" },
  num: { fontFamily: fonts.sansExtra, fontSize: 19, color: colors.violet, letterSpacing: 0.3 },
  source: { justifyContent: "flex-end", gap: 5, paddingVertical: space.sm },
});
