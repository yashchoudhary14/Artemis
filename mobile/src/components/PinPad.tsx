import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts, shadows, space, type } from "@/theme";
import { FadeIn, Icon } from "./ui";

// Same keypad for the real PIN and the duress PIN: nothing on screen tells them apart.
export function PinPad({
  title,
  hint,
  length = 4,
  onComplete,
  error,
  onCancel,
}: {
  title: string;
  hint?: string;
  length?: number;
  onComplete: (pin: string) => void;
  error?: string | null;
  onCancel?: () => void;
}) {
  const [pin, setPin] = useState("");

  const press = (d: string) => {
    const next = (pin + d).slice(0, length);
    setPin(next);
    if (next.length === length) {
      setTimeout(() => {
        setPin("");
        onComplete(next);
      }, 140);
    }
  };

  return (
    <FadeIn style={styles.wrap}>
      <Text style={type.hero}>{title}</Text>
      {hint ? <Text style={[type.accent, { marginTop: 6 }]}>{hint}</Text> : null}
      <View style={styles.dots}>
        {Array.from({ length }, (_, i) => (
          <View key={i} style={[styles.dot, i < pin.length && styles.dotOn]} />
        ))}
      </View>
      <Text style={[type.small, { color: colors.sosDeep, textAlign: "center", minHeight: 18, fontFamily: fonts.sansMedium }]}>{error ?? ""}</Text>
      <View style={styles.grid}>
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "cancel", "0", "del"].map((k) =>
          k === "cancel" ? (
            <Pressable key={k} onPress={onCancel} style={styles.key} accessibilityRole="button" accessibilityLabel="Cancel">
              <Text style={[type.button, { fontSize: 14, color: colors.inkSoft }]}>{onCancel ? "Cancel" : ""}</Text>
            </Pressable>
          ) : (
            <Pressable
              key={k}
              accessibilityRole="button"
              accessibilityLabel={k === "del" ? "Delete" : k}
              onPress={() => (k === "del" ? setPin(pin.slice(0, -1)) : press(k))}
              style={({ pressed }) => [styles.key, k !== "del" && styles.keyBtn, pressed && k !== "del" && { backgroundColor: colors.magentaWash }]}
            >
              {k === "del" ? <Icon name="backspace-outline" size={24} color={colors.inkSoft} /> : <Text style={styles.keyText}>{k}</Text>}
            </Pressable>
          ),
        )}
      </View>
    </FadeIn>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: space.lg, alignItems: "center" },
  dots: { flexDirection: "row", justifyContent: "center", gap: 18, marginTop: space.xl, marginBottom: space.sm },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1.5, borderColor: colors.ink, backgroundColor: "transparent" },
  dotOn: { backgroundColor: colors.ink },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", marginTop: space.md, width: 300 },
  key: { width: 76, height: 76, margin: 10, alignItems: "center", justifyContent: "center", borderRadius: 38 },
  keyBtn: { backgroundColor: "rgba(255,255,255,0.88)", borderWidth: 1, borderColor: colors.bubbleBorder, boxShadow: shadows.bubble },
  keyText: { fontFamily: fonts.serif, fontSize: 26, color: colors.ink },
});
