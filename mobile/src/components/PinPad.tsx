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
      <View style={styles.lock}>
        <Icon name="lock-closed" size={22} color={colors.violet} />
      </View>
      <Text style={[type.title, { textAlign: "center", marginTop: space.md }]}>{title}</Text>
      {hint ? <Text style={[type.body, { textAlign: "center", marginTop: 4, color: colors.inkSoft }]}>{hint}</Text> : null}
      <View style={styles.dots}>
        {Array.from({ length }, (_, i) => (
          <View key={i} style={[styles.dot, i < pin.length && styles.dotOn]} />
        ))}
      </View>
      <Text style={[type.small, { color: colors.sosDeep, textAlign: "center", minHeight: 20, fontFamily: fonts.sansSemi }]}>{error ?? ""}</Text>
      <View style={styles.grid}>
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "cancel", "0", "del"].map((k) =>
          k === "cancel" ? (
            <Pressable key={k} onPress={onCancel} style={styles.key} accessibilityRole="button" accessibilityLabel="Cancel">
              <Text style={[type.smallBold, { color: colors.inkSoft }]}>{onCancel ? "Cancel" : ""}</Text>
            </Pressable>
          ) : (
            <Pressable
              key={k}
              accessibilityRole="button"
              accessibilityLabel={k === "del" ? "Delete" : k}
              onPress={() => (k === "del" ? setPin(pin.slice(0, -1)) : press(k))}
              style={({ pressed }) => [styles.key, k !== "del" && styles.keyBtn, pressed && k !== "del" && styles.keyPressed]}
            >
              {k === "del" ? <Icon name="backspace-outline" size={26} color={colors.inkSoft} /> : <Text style={styles.keyText}>{k}</Text>}
            </Pressable>
          ),
        )}
      </View>
    </FadeIn>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: space.lg, alignItems: "center" },
  lock: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.white, alignItems: "center", justifyContent: "center", boxShadow: shadows.soft },
  dots: { flexDirection: "row", justifyContent: "center", gap: 18, marginTop: space.xl, marginBottom: space.sm },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: colors.violetSoft, backgroundColor: "rgba(255,255,255,0.6)" },
  dotOn: { backgroundColor: colors.violet, borderColor: colors.violet, boxShadow: "0px 4px 10px rgba(116,66,216,0.4)" },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", marginTop: space.md, width: 300 },
  key: { width: 76, height: 76, margin: 10, alignItems: "center", justifyContent: "center", borderRadius: 38 },
  keyBtn: { backgroundColor: "rgba(255,255,255,0.85)", borderWidth: 1, borderColor: colors.glassBorder, boxShadow: shadows.soft },
  keyPressed: { backgroundColor: colors.violetWash },
  keyText: { fontFamily: fonts.sansSemi, fontSize: 28, color: colors.ink },
});
