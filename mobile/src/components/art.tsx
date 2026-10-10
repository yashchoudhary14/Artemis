import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { colors } from "@/theme";
import { Icon, type IconName } from "./ui";

// Illustrations drawn with plain views (no image assets, nothing copied):
// a pink mountain landscape, collage tiles for feature cards, and flat portraits.

const hidden = { accessibilityElementsHidden: true, importantForAccessibility: "no-hide-descendants" as const };

/** Dusky pink mountains with mist — the profile banner from the reference. */
export function Landscape({ height = 170, children }: { height?: number; children?: ReactNode }) {
  const peak = (left: number, size: number, top: number, color: string, gradient?: string) => (
    <View
      style={{
        position: "absolute",
        left,
        top,
        width: size,
        height: size,
        backgroundColor: color,
        experimental_backgroundImage: gradient,
        transform: [{ rotate: "45deg" }],
        borderTopLeftRadius: size * 0.08,
      }}
    />
  );
  return (
    <View style={{ height, overflow: "hidden", backgroundColor: "#F2C9D7", experimental_backgroundImage: "linear-gradient(180deg, #E9C7E4 0%, #F4CAD8 45%, #FBE3EA 100%)" }} {...hidden}>
      <View style={{ position: "absolute", left: "58%", top: height * 0.14, width: 34, height: 34, borderRadius: 17, backgroundColor: "#FFF4F2", boxShadow: "0px 0px 26px rgba(255,236,236,0.95)" }} />
      {peak(-40, 150, height * 0.42, "#C9B4DD", "linear-gradient(135deg, #D8C6EA 0%, #B9A3D3 100%)")}
      {peak(70, 190, height * 0.36, "#BDA6D6", "linear-gradient(135deg, #E3D5F1 0%, #A98CC9 100%)")}
      {peak(210, 160, height * 0.44, "#C7AEDA", "linear-gradient(135deg, #DCCBEE 0%, #B097CF 100%)")}
      {peak(300, 200, height * 0.38, "#B79ED3", "linear-gradient(135deg, #E0D0F0 0%, #A387C6 100%)")}
      <View style={[StyleSheet.absoluteFill, { experimental_backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0) 45%, rgba(248,214,226,0.75) 75%, rgba(251,233,239,1) 100%)" }]} />
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: height * 0.24, experimental_backgroundImage: "linear-gradient(180deg, rgba(240,205,175,0) 0%, rgba(238,210,186,0.55) 60%, rgba(251,233,239,1) 100%)" }} />
      {children}
    </View>
  );
}

/** Collage tile for feature cards: soft colour field, a big glyph and floating shapes. */
export function Collage({ icon, tones, accent = colors.magenta }: { icon: IconName; tones: [string, string]; accent?: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: tones[0], experimental_backgroundImage: `linear-gradient(140deg, ${tones[0]} 0%, ${tones[1]} 100%)` }} {...hidden}>
      <View style={{ position: "absolute", width: 90, height: 90, borderRadius: 45, right: -18, top: -22, backgroundColor: "rgba(255,255,255,0.35)" }} />
      <View style={{ position: "absolute", width: 46, height: 46, borderRadius: 10, left: 12, bottom: 12, backgroundColor: "rgba(255,255,255,0.45)", transform: [{ rotate: "-12deg" }] }} />
      <View style={{ position: "absolute", width: 14, height: 14, borderRadius: 7, left: 62, top: 18, backgroundColor: accent, opacity: 0.55 }} />
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <View style={{ width: 62, height: 62, borderRadius: 31, backgroundColor: "rgba(255,255,255,0.88)", alignItems: "center", justifyContent: "center", boxShadow: "0px 8px 18px rgba(80,30,60,0.15)" }}>
          <Icon name={icon} size={30} color={accent} />
        </View>
      </View>
    </View>
  );
}

// ---------- portraits ----------

export interface PortraitSpec {
  bg: string;
  pattern?: IconName;
  patternColor?: string;
  skin: string;
  hair: string;
  hairStyle: "long" | "bob" | "bun" | "short" | "braid";
  outfit: string;
  trim?: string;
  lips: string;
  accessory?: "helmet" | "cap" | "goggles" | "beanie" | "bands" | "lapels" | "saree" | "gloves" | "labcoat";
  bindi?: boolean;
  earrings?: string;
}

/** Flat, poster-style illustrated portrait on a colour block (inspired by the "Women Rise" art style). */
export function Portrait({ spec, width, height }: { spec: PortraitSpec; width: number; height: number }) {
  const W = width;
  const H = height;
  const cx = W / 2;
  const fw = W * 0.34;
  const fh = W * 0.42;
  const ft = H * 0.2;
  const fl = cx - fw / 2;
  const shoulderTop = ft + fh + W * 0.05;
  const abs = (s: object) => ({ position: "absolute" as const, ...s });

  const pattern = spec.pattern
    ? Array.from({ length: 5 }, (_, r) =>
        Array.from({ length: 5 }, (_, c) => (
          <View key={`${r}-${c}`} style={abs({ left: c * W * 0.24 + (r % 2 ? W * 0.12 : 0) - W * 0.05, top: r * H * 0.22 - H * 0.04 })}>
            <Icon name={spec.pattern!} size={W * 0.1} color={spec.patternColor ?? "rgba(255,255,255,0.35)"} />
          </View>
        )),
      )
    : null;

  const hairBack = () => {
    const c = spec.hair;
    switch (spec.hairStyle) {
      case "long":
        return <View style={abs({ left: cx - (fw + W * 0.14) / 2, top: ft - W * 0.05, width: fw + W * 0.14, height: fh + W * 0.44, backgroundColor: c, borderTopLeftRadius: (fw + W * 0.14) / 2, borderTopRightRadius: (fw + W * 0.14) / 2, borderBottomLeftRadius: W * 0.05, borderBottomRightRadius: W * 0.05 })} />;
      case "braid":
        return (
          <>
            <View style={abs({ left: cx - (fw + W * 0.08) / 2, top: ft - W * 0.05, width: fw + W * 0.08, height: fh * 0.9, backgroundColor: c, borderRadius: W * 0.2 })} />
            {[0, 1, 2, 3, 4].map((i) => (
              <View key={i} style={abs({ left: cx + fw * 0.42, top: ft + fh * 0.62 + i * W * 0.065, width: W * 0.075, height: W * 0.08, borderRadius: W * 0.04, backgroundColor: c })} />
            ))}
          </>
        );
      case "bob":
        return <View style={abs({ left: cx - (fw + W * 0.12) / 2, top: ft - W * 0.05, width: fw + W * 0.12, height: fh * 0.92, backgroundColor: c, borderTopLeftRadius: W * 0.22, borderTopRightRadius: W * 0.22, borderBottomLeftRadius: W * 0.08, borderBottomRightRadius: W * 0.08 })} />;
      case "bun":
        return (
          <>
            <View style={abs({ left: cx - W * 0.085, top: ft - W * 0.15, width: W * 0.17, height: W * 0.17, borderRadius: W * 0.085, backgroundColor: c })} />
            <View style={abs({ left: cx - (fw + W * 0.05) / 2, top: ft - W * 0.04, width: fw + W * 0.05, height: fh * 0.6, backgroundColor: c, borderRadius: W * 0.2 })} />
          </>
        );
      default:
        return <View style={abs({ left: cx - (fw + W * 0.05) / 2, top: ft - W * 0.045, width: fw + W * 0.05, height: fh * 0.55, backgroundColor: c, borderRadius: W * 0.2 })} />;
    }
  };

  return (
    <View style={{ width: W, height: H, overflow: "hidden", backgroundColor: spec.bg }} {...hidden}>
      {pattern}
      {hairBack()}
      {/* neck */}
      <View style={abs({ left: cx - W * 0.07, top: ft + fh - W * 0.05, width: W * 0.14, height: W * 0.17, backgroundColor: spec.skin })} />
      <View style={abs({ left: cx - W * 0.07, top: ft + fh - W * 0.05, width: W * 0.14, height: W * 0.06, backgroundColor: "rgba(0,0,0,0.12)" })} />
      {/* shoulders */}
      <View
        style={abs({
          left: W * 0.06,
          top: shoulderTop,
          width: W * 0.88,
          height: H - shoulderTop + 30,
          backgroundColor: spec.outfit,
          borderTopLeftRadius: W * 0.32,
          borderTopRightRadius: W * 0.32,
        })}
      />
      {spec.accessory === "labcoat" || spec.accessory === "lapels" ? (
        <>
          <View style={abs({ left: cx - W * 0.09, top: shoulderTop - W * 0.07, width: W * 0.18, height: W * 0.18, backgroundColor: spec.accessory === "labcoat" ? spec.trim ?? "#5B8BD0" : "#FFFFFF", transform: [{ rotate: "45deg" }] })} />
          <View style={abs({ left: cx - W * 0.21, top: shoulderTop + W * 0.02, width: W * 0.03, height: H, backgroundColor: "rgba(0,0,0,0.1)", transform: [{ rotate: "-14deg" }] })} />
          <View style={abs({ left: cx + W * 0.18, top: shoulderTop + W * 0.02, width: W * 0.03, height: H, backgroundColor: "rgba(0,0,0,0.1)", transform: [{ rotate: "14deg" }] })} />
        </>
      ) : null}
      {spec.accessory === "saree" ? (
        <View style={abs({ left: cx - W * 0.05, top: shoulderTop - W * 0.1, width: W * 0.2, height: H, backgroundColor: spec.trim ?? "#C47A2C", borderLeftWidth: W * 0.02, borderRightWidth: W * 0.02, borderColor: "#E9B949", transform: [{ rotate: "-32deg" }] })} />
      ) : null}
      {spec.accessory === "bands" ? (
        <>
          <View style={abs({ left: cx - W * 0.045, top: shoulderTop, width: W * 0.035, height: W * 0.1, backgroundColor: "#FFFFFF", borderBottomLeftRadius: 3, borderBottomRightRadius: 3 })} />
          <View style={abs({ left: cx + W * 0.01, top: shoulderTop, width: W * 0.035, height: W * 0.1, backgroundColor: "#FFFFFF", borderBottomLeftRadius: 3, borderBottomRightRadius: 3 })} />
        </>
      ) : null}
      {spec.accessory === "helmet" ? <View style={abs({ left: cx - W * 0.2, top: shoulderTop - W * 0.03, width: W * 0.4, height: W * 0.08, borderRadius: W * 0.04, backgroundColor: "#ECEAEA", borderWidth: 2, borderColor: "#BDB8B8" })} /> : null}
      {/* face */}
      <View style={abs({ left: fl, top: ft, width: fw, height: fh, backgroundColor: spec.skin, borderTopLeftRadius: fw * 0.5, borderTopRightRadius: fw * 0.5, borderBottomLeftRadius: fw * 0.48, borderBottomRightRadius: fw * 0.48 })} />
      {/* blush */}
      <View style={abs({ left: cx - fw * 0.36, top: ft + fh * 0.58, width: W * 0.07, height: W * 0.045, borderRadius: W * 0.03, backgroundColor: "rgba(255,110,130,0.28)" })} />
      <View style={abs({ left: cx + fw * 0.36 - W * 0.07, top: ft + fh * 0.58, width: W * 0.07, height: W * 0.045, borderRadius: W * 0.03, backgroundColor: "rgba(255,110,130,0.28)" })} />
      {/* brows + eyes */}
      {[-1, 1].map((d) => (
        <View key={d}>
          <View style={abs({ left: cx + d * fw * 0.2 - W * 0.035, top: ft + fh * 0.36, width: W * 0.07, height: W * 0.013, borderRadius: 3, backgroundColor: "#2A1D1A" })} />
          <View style={abs({ left: cx + d * fw * 0.2 - W * 0.02, top: ft + fh * 0.44, width: W * 0.04, height: W * 0.026, borderRadius: W * 0.02, backgroundColor: "#24170F" })} />
          <View style={abs({ left: cx + d * fw * 0.2 - W * 0.002, top: ft + fh * 0.445, width: W * 0.01, height: W * 0.01, borderRadius: W * 0.005, backgroundColor: "#FFFFFF" })} />
        </View>
      ))}
      {/* nose + lips */}
      <View style={abs({ left: cx - W * 0.006, top: ft + fh * 0.55, width: W * 0.012, height: W * 0.05, borderRadius: 3, backgroundColor: "rgba(0,0,0,0.13)" })} />
      <View style={abs({ left: cx - W * 0.045, top: ft + fh * 0.74, width: W * 0.09, height: W * 0.032, borderRadius: W * 0.02, backgroundColor: spec.lips })} />
      {spec.bindi ? <View style={abs({ left: cx - W * 0.009, top: ft + fh * 0.27, width: W * 0.018, height: W * 0.018, borderRadius: W * 0.01, backgroundColor: "#C8102E" })} /> : null}
      {spec.earrings ? (
        <>
          <View style={abs({ left: fl - W * 0.02, top: ft + fh * 0.62, width: W * 0.04, height: W * 0.04, borderRadius: W * 0.02, backgroundColor: spec.earrings })} />
          <View style={abs({ left: fl + fw - W * 0.02, top: ft + fh * 0.62, width: W * 0.04, height: W * 0.04, borderRadius: W * 0.02, backgroundColor: spec.earrings })} />
        </>
      ) : null}
      {/* hair front (fringe) */}
      <View
        style={abs({
          left: cx - (fw + W * 0.04) / 2,
          top: ft - W * 0.035,
          width: fw + W * 0.04,
          height: W * 0.16,
          backgroundColor: spec.hair,
          borderTopLeftRadius: fw * 0.55,
          borderTopRightRadius: fw * 0.55,
          borderBottomLeftRadius: W * 0.02,
          borderBottomRightRadius: W * 0.13,
        })}
      />
      {/* headwear */}
      {spec.accessory === "cap" ? (
        <>
          <View style={abs({ left: cx - (fw + W * 0.08) / 2, top: ft - W * 0.11, width: fw + W * 0.08, height: W * 0.12, backgroundColor: "#1F2A44", borderTopLeftRadius: W * 0.06, borderTopRightRadius: W * 0.06 })} />
          <View style={abs({ left: cx - (fw + W * 0.16) / 2, top: ft, width: fw + W * 0.16, height: W * 0.03, backgroundColor: "#121A2E", borderRadius: W * 0.015 })} />
          <View style={abs({ left: cx - W * 0.022, top: ft - W * 0.075, width: W * 0.044, height: W * 0.044, borderRadius: W * 0.022, backgroundColor: "#E7B84A" })} />
        </>
      ) : null}
      {spec.accessory === "beanie" ? (
        <>
          <View style={abs({ left: cx - (fw + W * 0.07) / 2, top: ft - W * 0.1, width: fw + W * 0.07, height: W * 0.17, backgroundColor: spec.trim ?? "#3A7BD5", borderTopLeftRadius: W * 0.18, borderTopRightRadius: W * 0.18, borderBottomLeftRadius: W * 0.03, borderBottomRightRadius: W * 0.03 })} />
          <View style={abs({ left: cx - W * 0.04, top: ft - W * 0.15, width: W * 0.08, height: W * 0.08, borderRadius: W * 0.04, backgroundColor: "#FFFFFF" })} />
        </>
      ) : null}
      {spec.accessory === "goggles" ? (
        <>
          <View style={abs({ left: fl - W * 0.02, top: ft + W * 0.02, width: fw + W * 0.04, height: W * 0.03, backgroundColor: "#5A4632" })} />
          {[-1, 1].map((d) => (
            <View key={d} style={abs({ left: cx + d * W * 0.065 - W * 0.05, top: ft - W * 0.005, width: W * 0.1, height: W * 0.08, borderRadius: W * 0.04, borderWidth: W * 0.016, borderColor: "#5A4632", backgroundColor: "rgba(170,215,255,0.85)" })} />
          ))}
        </>
      ) : null}
      {spec.accessory === "helmet" ? (
        <View style={abs({ left: cx - W * 0.37, top: ft + fh / 2 - W * 0.37, width: W * 0.74, height: W * 0.74, borderRadius: W * 0.37, borderWidth: W * 0.04, borderColor: "#F1F0F0", backgroundColor: "rgba(255,255,255,0.12)", experimental_backgroundImage: "linear-gradient(160deg, rgba(255,214,170,0.55) 0%, rgba(255,255,255,0.05) 45%)" })} />
      ) : null}
      {spec.accessory === "gloves" ? (
        <>
          {[0.02, 0.7].map((x, i) => (
            <View key={i} style={abs({ left: W * x, top: H - W * 0.3, width: W * 0.28, height: W * 0.3, borderRadius: W * 0.13, backgroundColor: "#D7263D", borderWidth: 3, borderColor: "#A3172B" })} />
          ))}
        </>
      ) : null}
    </View>
  );
}
