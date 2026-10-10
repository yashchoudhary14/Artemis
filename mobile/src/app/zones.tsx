import Slider from "@react-native-community/slider";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import MapView, { Circle, Marker, PROVIDER_GOOGLE, type MapPressEvent } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Banner, Button, Chip, ChipRow, Field, Icon, RoundIconButton, Row } from "@/components/ui";
import { currentPosition } from "@/lib/geo";
import { useStore } from "@/lib/store";
import { insideZoneStore, loadZones, saveZones, zonesStore, type Zone } from "@/lib/zones";
import { colors, fonts, radius, shadows, space, type } from "@/theme";

// Demo default: IIT Guwahati.
const DEFAULT = { latitude: 26.1878, longitude: 91.6916 };

// Soft pink Google map style to match the app (Android). iOS uses Apple Maps.
const MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#fbf1f4" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#7a6670" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#fdf8fa" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#f4e6ec" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#e6f2e8" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#f7e1ea" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#e3d6f3" }] },
];

const NAMES = ["Home", "Hostel", "Library", "Department"];

export default function Zones() {
  const insets = useSafeAreaInsets();
  const zones = useStore(zonesStore);
  const inside = useStore(insideZoneStore);
  const map = useRef<MapView>(null);
  const [center, setCenter] = useState<{ latitude: number; longitude: number } | null>(null);
  const [radiusM, setRadiusM] = useState(200);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    void loadZones();
    void currentPosition().then((p) => {
      if (!p) return;
      const here = { latitude: p.coords.latitude, longitude: p.coords.longitude };
      map.current?.animateToRegion({ ...here, latitudeDelta: 0.012, longitudeDelta: 0.012 }, 600);
    });
  }, []);

  const onPress = (e: MapPressEvent) => {
    setCenter(e.nativeEvent.coordinate);
    setMsg(null);
  };

  const save = async () => {
    if (!center) return setMsg("Tap the map to place the centre of the zone.");
    if (!name.trim()) return setMsg("Give the zone a name, like Home or Hostel.");
    const zone: Zone = { id: `z${Date.now()}`, name: name.trim(), lat: center.latitude, lng: center.longitude, radiusM };
    await saveZones([...zones, zone]);
    setCenter(null);
    setName("");
    setMsg(`Saved "${zone.name}". It stays on this phone.`);
  };

  const remove = (id: string) => saveZones(zones.filter((z) => z.id !== id));

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <MapView
        ref={map}
        // Google (styled) on Android; Apple Maps on iOS, where Expo Go has no Google Maps SDK.
        provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
        style={StyleSheet.absoluteFill}
        initialRegion={{ ...DEFAULT, latitudeDelta: 0.02, longitudeDelta: 0.02 }}
        customMapStyle={MAP_STYLE}
        showsUserLocation
        onPress={onPress}
      >
        {zones.map((z) => (
          <Circle key={z.id} center={{ latitude: z.lat, longitude: z.lng }} radius={z.radiusM} strokeColor="rgba(201,42,102,0.85)" fillColor="rgba(201,42,102,0.14)" strokeWidth={2} />
        ))}
        {center ? (
          <>
            <Circle center={center} radius={radiusM} strokeColor={colors.magenta} fillColor="rgba(201,42,102,0.24)" strokeWidth={3} />
            <Marker coordinate={center} pinColor={colors.magenta} />
          </>
        ) : null}
      </MapView>

      <View style={[styles.topBar, { top: insets.top + 8 }]}>
        <RoundIconButton icon="chevron-back" label="Back" tone="light" onPress={() => router.back()} />
        <View style={styles.titlePill}>
          <Text style={[type.header, { fontSize: 15 }]}>Private zones</Text>
          <Text style={[type.accent, { fontSize: 11 }]}>Checked on this phone</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      <View style={[styles.sheet, { paddingBottom: insets.bottom + space.lg }]}>
        <View style={styles.handle} />
        <Text style={[type.hero, { textAlign: "left", fontSize: 23, lineHeight: 30 }]}>Your space stays yours.</Text>
        <Row style={{ marginTop: space.xs, marginBottom: space.md }}>
          <Icon name="pause-circle-outline" size={15} color={colors.magenta} />
          <Text style={type.accent}>{inside.inside ? `Sharing paused · ${inside.zoneName}` : "Routine sharing pauses inside zones"}</Text>
        </Row>
        {center ? (
          <>
            <Row style={{ justifyContent: "space-between", alignItems: "baseline" }}>
              <Text style={type.bodySoft}>Radius</Text>
              <Text style={styles.radius}>{radiusM} m</Text>
            </Row>
            <Slider
              minimumValue={50}
              maximumValue={500}
              step={10}
              value={radiusM}
              onValueChange={(v) => setRadiusM(Math.round(v))}
              minimumTrackTintColor={colors.ink}
              maximumTrackTintColor="rgba(26,23,28,0.15)"
              thumbTintColor={colors.ink}
            />
            <ChipRow wrap>
              {NAMES.map((n) => (
                <Chip key={n} label={n} selected={name === n} onPress={() => setName(n)} />
              ))}
            </ChipRow>
            <Field icon="bookmark-outline" placeholder="Or type a name" value={name} onChangeText={setName} maxLength={40} />
          </>
        ) : (
          <Row style={styles.hint}>
            <Icon name="hand-left-outline" size={17} color={colors.magenta} />
            <Text style={[type.small, { flex: 1 }]}>Tap the map to place a zone. Inside it, SafeWalk stops sharing your location and stops listening — SOS still works.</Text>
          </Row>
        )}
        {msg ? <Banner text={msg} tone={msg.startsWith("Saved") ? "safe" : "amber"} /> : null}
        {center ? <Button label="Save private zone" iconRight="arrow-forward" size="lg" onPress={save} /> : null}
        {zones.length ? (
          <View style={{ marginTop: space.md }}>
            {zones.map((z) => (
              <Row key={z.id} style={styles.zoneRow}>
                <View style={styles.zoneDot} />
                <Text style={[type.cardTitle, { flex: 1, fontSize: 14.5 }]}>
                  {z.name} <Text style={type.small}>· {z.radiusM} m</Text>
                </Text>
                <Pressable onPress={() => remove(z.id)} hitSlop={12} accessibilityRole="button" accessibilityLabel={`Remove ${z.name}`}>
                  <Icon name="trash-outline" size={18} color={colors.sosDeep} />
                </Pressable>
              </Row>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { position: "absolute", left: space.lg, right: space.lg, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  titlePill: { alignItems: "center", paddingHorizontal: 18, paddingVertical: 6, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.95)", boxShadow: shadows.bubble },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(253,248,250,0.98)",
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: space.xl,
    paddingTop: space.md,
    boxShadow: "0px -12px 40px rgba(120,60,90,0.14)",
    maxHeight: "66%",
  },
  handle: { alignSelf: "center", width: 44, height: 5, borderRadius: 3, backgroundColor: "rgba(26,23,28,0.15)", marginBottom: space.md },
  radius: { fontFamily: fonts.serifBold, fontSize: 26, color: colors.ink },
  hint: { gap: 10, alignItems: "flex-start", backgroundColor: colors.magentaWash, borderRadius: radius.sm, padding: space.md, marginBottom: space.sm },
  zoneRow: { paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.hairline, gap: space.sm },
  zoneDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.magentaWash, borderWidth: 2, borderColor: colors.magenta },
});
