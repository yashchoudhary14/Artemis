import Slider from "@react-native-community/slider";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import MapView, { Circle, Marker, PROVIDER_GOOGLE, type MapPressEvent } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Banner, Field, Muted, PillButton, Row } from "@/components/ui";
import { currentPosition } from "@/lib/geo";
import { useStore } from "@/lib/store";
import { insideZoneStore, loadZones, saveZones, zonesStore, type Zone } from "@/lib/zones";
import { colors, radius, space, type } from "@/theme";

// Demo default: IIT Guwahati.
const DEFAULT = { latitude: 26.1878, longitude: 91.6916 };

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
        showsUserLocation
        onPress={onPress}
      >
        {zones.map((z) => (
          <Circle
            key={z.id}
            center={{ latitude: z.lat, longitude: z.lng }}
            radius={z.radiusM}
            strokeColor="rgba(139,92,246,0.9)"
            fillColor="rgba(139,92,246,0.18)"
            strokeWidth={2}
          />
        ))}
        {center ? (
          <>
            <Circle center={center} radius={radiusM} strokeColor={colors.lilac} fillColor="rgba(139,92,246,0.28)" strokeWidth={3} />
            <Marker coordinate={center} pinColor={colors.lilac} />
          </>
        ) : null}
      </MapView>

      <View style={[styles.topBar, { top: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={{ fontSize: 20, color: colors.ink }}>‹</Text>
        </Pressable>
        <View style={styles.pill}>
          <Text style={{ fontWeight: "700", color: colors.ink }}>Private zones</Text>
        </View>
      </View>

      <View style={[styles.sheet, { paddingBottom: insets.bottom + space.lg }]}>
        <View style={styles.handle} />
        <Text style={type.title}>Your space stays yours.</Text>
        <Row style={{ marginTop: space.sm, marginBottom: space.md, flexWrap: "wrap" }}>
          <View style={styles.tag}>
            <Text style={styles.tagText}>{inside.inside ? `Routine sharing paused · ${inside.zoneName}` : "Routine sharing paused inside zones"}</Text>
          </View>
        </Row>
        {center ? (
          <>
            <Text style={type.body}>
              Radius: <Text style={{ fontWeight: "800" }}>{radiusM} m</Text>
            </Text>
            <Slider
              minimumValue={50}
              maximumValue={500}
              step={10}
              value={radiusM}
              onValueChange={(v) => setRadiusM(Math.round(v))}
              minimumTrackTintColor={colors.lilac}
              maximumTrackTintColor={colors.line}
              thumbTintColor={colors.lilac}
            />
            <Row style={{ justifyContent: "space-between", marginBottom: space.sm }}>
              <Muted>50 m</Muted>
              <Muted>500 m</Muted>
            </Row>
            <Field placeholder="Name (Home, Hostel…)" value={name} onChangeText={setName} maxLength={40} />
          </>
        ) : (
          <Muted style={{ marginBottom: space.md }}>Tap the map to place a zone. Inside a zone, SafeWalk stops sharing your location and stops listening, but SOS still works.</Muted>
        )}
        {msg ? <Banner text={msg} tone={msg.startsWith("Saved") ? "green" : "amber"} /> : null}
        {center ? <PillButton label="Save zone" variant="lilac" onPress={save} /> : null}
        {zones.length ? (
          <View style={{ marginTop: space.md }}>
            {zones.map((z) => (
              <Row key={z.id} style={styles.zoneRow}>
                <Text style={{ flex: 1, color: colors.ink, fontWeight: "600" }}>
                  {z.name} · {z.radiusM} m
                </Text>
                <Pressable onPress={() => remove(z.id)} hitSlop={10}>
                  <Text style={{ color: colors.coral, fontWeight: "700" }}>Remove</Text>
                </Pressable>
              </Row>
            ))}
          </View>
        ) : null}
        <Muted style={{ textAlign: "center", marginTop: space.md }}>ⓘ Boundary checked on this device. Zones are never uploaded.</Muted>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { position: "absolute", left: space.lg, right: space.lg, flexDirection: "row", alignItems: "center", gap: space.sm },
  back: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.white, alignItems: "center", justifyContent: "center", elevation: 3 },
  pill: { paddingHorizontal: 16, height: 44, borderRadius: 22, backgroundColor: colors.white, justifyContent: "center", elevation: 3 },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: space.lg,
    elevation: 12,
    maxHeight: "62%",
  },
  handle: { alignSelf: "center", width: 44, height: 5, borderRadius: 3, backgroundColor: colors.line, marginBottom: space.md },
  tag: { backgroundColor: colors.lilacSoft, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  tagText: { color: colors.lilacDeep, fontSize: 13, fontWeight: "600" },
  zoneRow: { paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.line },
});
