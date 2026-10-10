import type { TextStyle } from "react-native";

// SafeWalk design system — "Talk sense" (UI_reference/general app UI/design 1).
// Pink-washed backgrounds, Merriweather serif for titles and buttons, Inter for UI text,
// white bubble cards, outlined icon chips, black pill CTAs, a magenta accent label.
// "Women Rise" screens use Playfair Display Black on full-bleed colour blocks.

export const fonts = {
  serif: "Merriweather_400Regular",
  serifMedium: "Merriweather_600SemiBold",
  serifBold: "Merriweather_700Bold",
  serifItalic: "Merriweather_400Regular_Italic",
  sans: "Inter_400Regular",
  sansMedium: "Inter_500Medium",
  sansSemi: "Inter_600SemiBold",
  sansBold: "Inter_700Bold",
  display: "PlayfairDisplay_900Black",
  displayBold: "PlayfairDisplay_700Bold",
};

export const colors = {
  // Surfaces
  bg: "#FBEFF3",
  pinkTop: "#F6CCDA",
  pinkMid: "#FBE6EE",
  paper: "#FDF8FA",
  bubble: "rgba(255,255,255,0.88)",
  bubbleSolid: "#FFFFFF",
  bubbleBorder: "rgba(255,255,255,0.95)",
  hairline: "rgba(40,20,30,0.08)",
  // Ink (on white: ink 17:1, inkSoft 5.9:1, inkFaint 3.1:1 — faint only for large/decorative)
  ink: "#1A171C",
  inkSoft: "#625B66",
  inkFaint: "#9D95A1",
  // Accents
  magenta: "#C92A66",
  magentaWash: "#FCE3EC",
  lilac: "#8E6FD8",
  lilacWash: "#EFE9FB",
  dark: "#17151A",
  // Status
  sos: "#EC4757",
  sosDeep: "#C9283A",
  sosWash: "#FDE2E5",
  safe: "#2A8A58",
  safeWash: "#E1F4E9",
  amber: "#9A5B0A",
  amberWash: "#FCF1DC",
  white: "#FFFFFF",
};

export const gradients = {
  // Pink cloud wash like the reference phones: rosy top fading to near-white.
  screen:
    "radial-gradient(circle at 15% 0%, rgba(244,184,206,0.85) 0%, rgba(244,184,206,0) 45%), radial-gradient(circle at 95% 8%, rgba(214,190,236,0.7) 0%, rgba(214,190,236,0) 42%), radial-gradient(circle at 70% 55%, rgba(250,214,226,0.55) 0%, rgba(250,214,226,0) 50%), linear-gradient(180deg, #F7D3DF 0%, #FBE9EF 38%, #FDF5F8 72%, #FBF4F8 100%)",
  urgent:
    "radial-gradient(circle at 20% 0%, rgba(240,120,140,0.55) 0%, rgba(240,120,140,0) 50%), linear-gradient(180deg, #F6C2CC 0%, #FBE3E8 40%, #FDF5F7 100%)",
  sos: "linear-gradient(150deg, #FF7B7B 0%, #EC4757 55%, #C9283A 100%)",
  sosGlow: "radial-gradient(circle at 50% 50%, rgba(236,71,87,0.35) 0%, rgba(236,71,87,0) 68%)",
  pinkGlow: "radial-gradient(circle at 50% 50%, rgba(201,42,102,0.22) 0%, rgba(201,42,102,0) 68%)",
};

export const shadows = {
  bubble: "0px 6px 18px rgba(120, 60, 90, 0.08), 0px 1px 3px rgba(120, 60, 90, 0.06)",
  lifted: "0px 16px 36px rgba(120, 60, 90, 0.14)",
  dark: "0px 10px 22px rgba(23, 21, 26, 0.28)",
  sos: "0px 14px 34px rgba(236, 71, 87, 0.42)",
};

export const radius = { sm: 12, md: 18, lg: 24, xl: 30, pill: 999 };
export const space = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 20, xl: 24, xxl: 32, xxxl: 44 };
export const motion = { fast: 180, base: 280, slow: 420, stagger: 55 };

export const type = {
  hero: { fontFamily: fonts.serif, fontSize: 27, lineHeight: 36, color: colors.ink, textAlign: "center" } as TextStyle,
  title: { fontFamily: fonts.serif, fontSize: 22, lineHeight: 30, color: colors.ink } as TextStyle,
  header: { fontFamily: fonts.serif, fontSize: 17, lineHeight: 22, color: colors.ink } as TextStyle,
  section: { fontFamily: fonts.serif, fontSize: 19, lineHeight: 26, color: colors.ink } as TextStyle,
  cardTitle: { fontFamily: fonts.serifBold, fontSize: 16, lineHeight: 23, color: colors.ink } as TextStyle,
  body: { fontFamily: fonts.sans, fontSize: 15, lineHeight: 22, color: colors.ink } as TextStyle,
  bodySoft: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 20, color: colors.inkSoft } as TextStyle,
  small: { fontFamily: fonts.sans, fontSize: 12.5, lineHeight: 17, color: colors.inkSoft } as TextStyle,
  label: { fontFamily: fonts.sansMedium, fontSize: 13, lineHeight: 17, color: colors.ink } as TextStyle,
  accent: { fontFamily: fonts.serifBold, fontSize: 13, lineHeight: 17, color: colors.magenta } as TextStyle,
  button: { fontFamily: fonts.serif, fontSize: 16, lineHeight: 21 } as TextStyle,
  tab: { fontFamily: fonts.serif, fontSize: 11, lineHeight: 14 } as TextStyle,
  number: { fontFamily: fonts.serifBold, fontSize: 15, lineHeight: 20, color: colors.ink } as TextStyle,
};
