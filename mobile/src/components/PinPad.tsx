import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, space, type } from "@/theme";

// Same keypad for the real PIN and the duress PIN: nothing on screen tells them apart.
export function PinPad({ title, hint, length = 4, onComplete, error }: { title: string; hint?: string; length?: number; onComplete: (pin: string) => void; error?: string | null }) {
  const [pin, setPin] = useState("");

  const press = (d: string) => {
    const next = (pin + d).slice(0, length);
    setPin(next);
    if (next.length === length) {
      setTimeout(() => {
        setPin("");
        onComplete(next);
      }, 120);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={[type.title, { textAlign: "center" }]}>{title}</Text>
      {hint ? <Text style={[type.small, { textAlign: "center", marginTop: 6 }]}>{hint}</Text> : null}
      <View style={styles.dots}>
        {Array.from({ length }, (_, i) => (
          <View key={i} style={[styles.dot, i < pin.length && styles.dotOn]} />
        ))}
      </View>
      <Text style={[type.small, { color: colors.coral, textAlign: "center", minHeight: 18 }]}>{error ?? ""}</Text>
      <View style={styles.grid}>
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map((k, i) =>
          k === "" ? (
            <View key={i} style={styles.key} />
          ) : (
            <Pressable
              key={i}
              accessibilityLabel={k === "⌫" ? "Delete" : k}
              onPress={() => (k === "⌫" ? setPin(pin.slice(0, -1)) : press(k))}
              style={({ pressed }) => [styles.key, styles.keyBtn, pressed && { backgroundColor: colors.lilacSoft }]}
            >
              <Text style={styles.keyText}>{k}</Text>
            </Pressable>
          ),
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: space.lg },
  dots: { flexDirection: "row", justifyContent: "center", gap: 16, marginTop: space.xl, marginBottom: space.sm },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: colors.lilac },
  dotOn: { backgroundColor: colors.lilac },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", marginTop: space.md, alignSelf: "center", width: 288 },
  key: { width: 80, height: 68, margin: 8 },
  keyBtn: { borderRadius: 34, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center" },
  keyText: { fontSize: 26, color: colors.ink, fontWeight: "500" },
});
