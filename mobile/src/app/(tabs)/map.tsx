import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import MapView, { Circle, Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Chip, Icon, Pressy, prefersReducedMotion } from "@/components/ui";
import { api, type Place } from "@/lib/api";
import { currentPosition } from "@/lib/geo";
import { DEFAULT_CENTER, MAP_STYLE } from "@/lib/mapStyle";
import { useStore } from "@/lib/store";
import { zonesStore } from "@/lib/zones";
import { colors, fonts, shadows, space, type } from "@/theme";

type Filter = "zones" | "hospital" | "police";
const FILTERS: { value: Filter; label: string }[] = [
  { value: "zones", label: "Private zones" },
  { value: "hospital", label: "Hospitals" },
  { value: "police", label: "Police" },
];

// Opens on the whole city, then the camera flies down to where she is.
const WIDE = { latitudeDelta: 0.45, longitudeDelta: 0.45 };
const ZOOM_MS = 2400;

export default function MapTab() {
  const insets = useSafeAreaInsets();
  const map = useRef<MapView>(null);
  const zones = useStore(zonesStore);
  const [me, setMe] = useState<{ latitude: number; longitude: number } | null>(null);
  const [filter, setFilter] = useState<Filter>("hospital");
  const [places, setPlaces] = useState<Place[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sheet = useRef(new Animated.Value(0)).current;

  const zoomTo = useCallback(
    (here: { latitude: number; longitude: number }, fromWide: boolean) => {
      const go = () =>
        map.current?.animateCamera(
          { center: here, zoom: 16, altitude: 1400, pitch: 0, heading: 0 },
          { duration: prefersReducedMotion() ? 0 : ZOOM_MS },
        );
      if (fromWide) {
        map.current?.animateToRegion({ ...here, ...WIDE }, 0);
        setTimeout(go, 350);
      } else go();
    },
    [],
  );

  const onReady = useCallback(async () => {
    const p = await currentPosition();
    const here = p ? { latitude: p.coords.latitude, longitude: p.coords.longitude } : DEFAULT_CENTER;
    setMe(here);
    zoomTo(here, false);
    Animated.timing(sheet, { toValue: 1, duration: 600, delay: ZOOM_MS - 300, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [sheet, zoomTo]);

  useEffect(() => {
    if (!me || filter === "zones") return;
    let alive = true;
    setPlaces(null);
    setError(null);
    api
      .nearby(filter, me.latitude, me.longitude)
      .then((r) => alive && setPlaces(r.places.slice(0, 4)))
      .catch((e) => alive && setError((e as Error).message));
    return () => {
      alive = false;
    };
  }, [me, filter]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <MapView
        ref={map}
        provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
        style={StyleSheet.absoluteFill}
        initialRegion={{ ...DEFAULT_CENTER, ...WIDE }}
        customMapStyle={MAP_STYLE}
        onMapReady={onReady}
        toolbarEnabled={false}
        showsCompass={false}
      >
        {filter === "zones"
          ? zones.map((z) => (
              <Circle key={z.id} center={{ latitude: z.lat, longitude: z.lng }} radius={z.radiusM} strokeColor="rgba(160,86,111,0.7)" fillColor="rgba(201,112,141,0.10)" strokeWidth={1.5} />
            ))
          : (places ?? []).map((p) => (
              <Marker key={`${p.lat},${p.lng}`} coordinate={{ latitude: p.lat, longitude: p.lng }} title={p.name} tracksViewChanges={false}>
                <View style={styles.poi}>
                  <Icon name={filter === "police" ? "shield-outline" : "add"} size={14} color={colors.ink} />
                </View>
              </Marker>
            ))}
        {me ? (
          <Marker coordinate={me} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
            <View style={styles.meHalo}>
              <View style={styles.meDot} />
            </View>
          </Marker>
        ) : null}
      </MapView>

      <View style={[styles.top, { top: insets.top + 8 }]}>
        <Pressy onPress={() => router.push("/walk")} accessibilityLabel="Where are you going?">
          <View style={styles.search}>
            <Icon name="search" size={18} />
            <Text style={[type.bodySoft, { fontSize: 15 }]}>Where are you going?</Text>
          </View>
        </Pressy>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingTop: 10 }}>
          {FILTERS.map((f) => (
            <Chip key={f.value} label={f.label} selected={filter === f.value} onPress={() => setFilter(f.value)} />
          ))}
        </ScrollView>
      </View>

      <Pressable
        onPress={() => me && zoomTo(me, true)}
        accessibilityRole="button"
        accessibilityLabel="Zoom to my location"
        style={({ pressed }) => [styles.locate, pressed && { opacity: 0.7 }]}
      >
        <Icon name="navigate" size={20} />
      </Pressable>

      <Animated.View style={[styles.sheet, { opacity: sheet, transform: [{ translateY: sheet.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }]}>
        {filter === "zones" ? (
          <>
            <Text style={styles.sheetTitle}>Private zones</Text>
            <Text style={[type.small, { marginTop: 4 }]}>
              {zones.length ? `${zones.length} saved. Routine sharing pauses inside them. SOS always works.` : "None yet. Add home or your hostel so routine sharing pauses there."}
            </Text>
            <Pressable onPress={() => router.push("/zones")} accessibilityRole="button" style={{ marginTop: 12 }}>
              <Text style={[type.label, { textDecorationLine: "underline" }]}>Edit private zones</Text>
            </Pressable>
          </>
        ) : (
          <>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
              <Text style={styles.sheetTitle}>Near you</Text>
              <Text style={[type.small, { fontSize: 11, color: colors.inkFaint }]}>Source: Google Maps</Text>
            </View>
            {error ? <Text style={[type.small, { marginTop: 8 }]}>{error}</Text> : null}
            {!places && !error ? <Text style={[type.small, { marginTop: 8 }]}>Looking nearby…</Text> : null}
            {places && places.length === 0 ? <Text style={[type.small, { marginTop: 8 }]}>Nothing found nearby.</Text> : null}
            {(places ?? []).slice(0, 2).map((p, i) => (
              <Pressable key={p.name + i} onPress={() => Linking.openURL(p.mapsUrl)} accessibilityRole="button" style={[styles.place, i === 0 && styles.placeDivider]}>
                <View style={{ flex: 1 }}>
                  <Text style={type.body} numberOfLines={1}>
                    {p.name}
                  </Text>
                  {p.address ? (
                    <Text style={[type.small, { marginTop: 2 }]} numberOfLines={1}>
                      {p.address}
                    </Text>
                  ) : null}
                </View>
                <Text style={type.small}>{(p.distanceM / 1000).toFixed(1)} km</Text>
              </Pressable>
            ))}
          </>
        )}
      </Animated.View>
    </View>
  );
}

const glass = { backgroundColor: "rgba(255,255,255,0.9)", borderWidth: 1, borderColor: colors.bubbleBorder } as const;

const styles = StyleSheet.create({
  top: { position: "absolute", left: 16, right: 16 },
  search: { ...glass, height: 50, borderRadius: 25, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 18, boxShadow: shadows.bubble },
  locate: { ...glass, position: "absolute", right: 16, bottom: 330, width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", boxShadow: shadows.bubble },
  sheet: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 118,
    padding: 18,
    paddingBottom: 10,
    borderRadius: 26,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.bubbleBorder,
    boxShadow: shadows.lifted,
  },
  sheetTitle: { fontFamily: fonts.serif, fontSize: 26, lineHeight: 30, color: colors.ink },
  place: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  placeDivider: { borderBottomWidth: 1, borderBottomColor: colors.hairline },
  poi: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.white, borderWidth: 1, borderColor: "rgba(23,20,26,0.12)", alignItems: "center", justifyContent: "center" },
  meHalo: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(201,112,141,0.18)", alignItems: "center", justifyContent: "center" },
  meDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.ink, borderWidth: 3, borderColor: colors.white },
  space: { height: space.xs },
});
