import { Tabs } from "expo-router/js-tabs";
import { Pressable, StyleSheet, Text, View, type ColorValue } from "react-native";
import { panicStore } from "@/lib/panic";
import { useStore } from "@/lib/store";
import { colors, gradients } from "@/theme";

// Home / Walk / SOS (centre, coral) / Help / Rise — as in the Artemis mock.
function Glyph({ char, color }: { char: string; color: ColorValue }) {
  return <Text style={{ fontSize: 22, color, lineHeight: 26 }}>{char}</Text>;
}

function SosButton({ onPress }: { onPress?: (...args: any[]) => void }) {
  const panic = useStore(panicStore).active;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="SOS" onPress={onPress} style={styles.sosWrap}>
      <View style={[styles.sos, panic && styles.sosActive]}>
        <Text style={styles.sosText}>SOS</Text>
      </View>
    </Pressable>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.lilacDeep,
        tabBarInactiveTintColor: colors.faint,
        tabBarStyle: styles.bar,
        tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: ({ color }) => <Glyph char="⌂" color={color} /> }} />
      <Tabs.Screen name="walk" options={{ title: "Walk", tabBarIcon: ({ color }) => <Glyph char="⇢" color={color} /> }} />
      <Tabs.Screen
        name="sos"
        options={{
          title: "",
          tabBarLabel: () => null,
          tabBarIcon: () => null,
          tabBarButton: (props) => <SosButton onPress={props.onPress ?? undefined} />,
        }}
      />
      <Tabs.Screen name="help" options={{ title: "Help", tabBarIcon: ({ color }) => <Glyph char="✚" color={color} /> }} />
      <Tabs.Screen name="rise" options={{ title: "Rise", tabBarIcon: ({ color }) => <Glyph char="☾" color={color} /> }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 74,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderTopColor: colors.line,
  },
  sosWrap: { flex: 1, alignItems: "center", justifyContent: "flex-start" },
  sos: {
    width: 66,
    height: 66,
    borderRadius: 33,
    marginTop: -22,
    backgroundColor: colors.coral,
    experimental_backgroundImage: gradients.sos,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: colors.white,
    elevation: 6,
    shadowColor: colors.coral,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  sosActive: { borderColor: colors.coralSoft },
  sosText: { color: colors.white, fontWeight: "800", fontSize: 17, letterSpacing: 0.5 },
});
