import { StyleSheet, Text, View } from "react-native";

// Placeholder home screen. Replaced in Phase 1 with the design from UI_reference/.
export default function Home() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>SafeWalk</Text>
      <Text>Development build is running.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  title: { fontSize: 28, fontWeight: "700" },
});
