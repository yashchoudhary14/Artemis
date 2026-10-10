import Slider from "@react-native-community/slider";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import MapView, { Circle, Marker, PROVIDER_GOOGLE, type MapPressEvent } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Banner, Button, Field, Icon, IconButton, Row } from "@/components/ui";
import { currentPosition } from "@/lib/geo";
import { useStore } from "@/lib/store";
import { insideZoneStore, loadZones, saveZones, zonesStore, type Zone } from "@/lib/zones";
import { colors, fonts, radius, shadows, space, type } from "@/theme";

// Demo default: IIT Guwahati.
const DEFAULT = { latitude: 26.1878, longitude: 91.6916 };

// Soft lilac Google map style to match the app.
const MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#f7f1f8" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#6b5a7a" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#fbf7fc" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#efe6f5" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#e3f1e6" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#fdf6fb" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#f3e3f0" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#d9d2f6" }] },
];

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
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFill}
        initialRegion={{ ...DEFAULT, latitudeDelta: 0.02, longitudeDelta: 0.02 }}
        customMapStyle={MAP_STYLE}
        showsUserLocation
        onPress={onPress}
      >
        {zones.map((z) => (
          <Circle
            key={z.id}
            center={{ latitude: z.lat, longitude: z.lng }}
            radius={z.radiusM}
            strokeColor="rgba(116,66,216,0.85)"
            fillColor="rgba(139,92,246,0.18)"
            strokeWidth={2}
          />
        ))}
        {center ? (
          <>
            <Circle center={center} radius={radiusM} strokeColor={colors.violet} fillColor="rgba(139,92,246,0.3)" strokeWidth={3} />
            <Marker coordinate={center} pinColor={colors.violet} />
          </>
        ) : null}
      </MapView>

      <View style={[styles.topBar, { top: insets.top + 8 }]}>
        <IconButton icon="chevron-back" label="Back" onPress={() => router.back()} />
        <View style={styles.titlePill}>
          <Icon name="school-outline" size={16} color={colors.violet} />
          <Text style={styles.titleText}>Private zones</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      <View style={[styles.sheet, { paddingBottom: insets.bottom + space.lg }]}>
        <View style={styles.handle} />
        <Text style={type.title}>Your space stays yours.</Text>
        <Row style={{ marginTop: space.sm, marginBottom: space.md, gap: space.xs, flexWrap: "wrap" }}>
          <View style={styles.tag}>
            <Icon name="pause-circle-outline" size={14} color={colors.violet} />
            <Text style={styles.tagText}>{inside.inside ? `Sharing paused · ${inside.zoneName}` : "Routine sharing paused inside zones"}</Text>
          </View>
        </Row>
        {center ? (
          <>
            <Row style={{ justifyContent: "space-between", alignItems: "baseline" }}>
              <Text style={type.bodyMedium}>Radius</Text>
              <Text style={styles.radius}>{radiusM} m</Text>
            </Row>
            <Slider
              minimumValue={50}
              maximumValue={500}
              step={10}
              value={radiusM}
              onValueChange={(v) => setRadiusM(Math.round(v))}
              minimumTrackTintColor={colors.violet}
              maximumTrackTintColor="rgba(74,40,102,0.15)"
              thumbTintColor={colors.violet}
            />
            <Row style={{ justifyContent: "space-between", marginBottom: space.sm }}>
              <Text style={type.small}>50 m</Text>
              <Text style={type.small}>500 m</Text>
            </Row>
            <Field icon="bookmark-outline" placeholder="Name it — Home, Hostel…" value={name} onChangeText={setName} maxLength={40} />
          </>
        ) : (
          <Row style={styles.hint}>
            <Icon name="finger-print-outline" size={18} color={colors.violet} />
            <Text style={[type.small, { flex: 1 }]}>Tap the map to place a zone. Inside it, SafeWalk stops sharing your location and listening — SOS still works.</Text>
          </Row>
        )}
        {msg ? <Banner text={msg} tone={msg.startsWith("Saved") ? "safe" : "amber"} /> : null}
        {center ? <Button label="Save private zone" icon="checkmark" variant="violet" size="lg" onPress={save} /> : null}
        {zones.length ? (
          <View style={{ marginTop: space.md }}>
            {zones.map((z) => (
              <Row key={z.id} style={styles.zoneRow}>
                <View style={styles.zoneDot} />
                <Text style={[type.h3, { flex: 1 }]}>
                  {z.name} <Text style={type.small}>· {z.radiusM} m</Text>
                </Text>
                <Pressable onPress={() => remove(z.id)} hitSlop={12} accessibilityRole="button" accessibilityLabel={`Remove ${z.name}`}>
                  <Icon name="trash-outline" size={18} color={colors.sosDeep} />
                </Pressable>
              </Row>
            ))}
          </View>
        ) : null}
        <Row style={{ justifyContent: "center", gap: 6, marginTop: space.md }}>
          <Icon name="shield-checkmark-outline" size={14} color={colors.safe} />
          <Text style={[type.small, { fontSize: 12 }]}>Boundary checked on this device · never uploaded</Text>
        </Row>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { position: "absolute", left: space.lg, right: space.lg, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  titlePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 18,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.glassStrong,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    boxShadow: shadows.soft,
  },
  titleText: { fontFamily: fonts.sansBold, fontSize: 15, color: colors.ink },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.97)",
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: space.xl,
    paddingTop: space.md,
    boxShadow: "0px -12px 40px rgba(74,40,102,0.16)",
    maxHeight: "64%",
  },
  handle: { alignSelf: "center", width: 44, height: 5, borderRadius: 3, backgroundColor: "rgba(74,40,102,0.15)", marginBottom: space.md },
  tag: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.violetWash, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7 },
  tagText: { fontFamily: fonts.sansSemi, fontSize: 13, color: colors.violet },
  radius: { fontFamily: fonts.display, fontSize: 28, color: colors.violet },
  hint: { gap: 10, alignItems: "flex-start", backgroundColor: colors.violetWash, borderRadius: radius.sm, padding: space.md, marginBottom: space.sm },
  zoneRow: { paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.hairline, gap: space.sm },
  zoneDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.violetSoft, borderWidth: 2, borderColor: colors.violet },
});
