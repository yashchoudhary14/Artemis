import type { PortraitSpec } from "@/components/art";

// "Women in powerful roles" — the Rise tab. Facts are limited to well-documented public records;
// portraits are stylised illustrations drawn in code (not likenesses).

export interface Woman {
  id: string;
  name: string;
  role: string;
  headline: string;
  story: string[];
  spec: PortraitSpec;
  ink: string; // text colour on the colour block
}

export const WOMEN: Woman[] = [
  {
    id: "kalpana-chawla",
    name: "Kalpana Chawla",
    role: "Astronaut · aerospace engineer",
    headline: "First woman of Indian origin in space",
    story: [
      "Born in Karnal, Haryana, she studied aeronautical engineering at Punjab Engineering College before moving to the United States.",
      "In 1997 she flew aboard Space Shuttle Columbia on mission STS-87 as a mission specialist.",
      "She returned to space in 2003 on STS-107 and lost her life when Columbia broke apart during re-entry.",
    ],
    ink: "#2B1210",
    spec: { bg: "#F6A99A", pattern: "planet-outline", patternColor: "rgba(255,255,255,0.4)", skin: "#C98B63", hair: "#231714", hairStyle: "short", outfit: "#EF8574", lips: "#9E4B47", accessory: "helmet" },
  },
  {
    id: "kiran-bedi",
    name: "Kiran Bedi",
    role: "Police officer",
    headline: "India's first woman IPS officer (1972)",
    story: [
      "She joined the Indian Police Service in 1972, the first woman to do so.",
      "As Inspector General of Tihar Jail she introduced reforms including education and meditation programmes for prisoners.",
      "She later served as Lieutenant Governor of Puducherry from 2016 to 2021.",
    ],
    ink: "#0F1B3A",
    spec: { bg: "#9FB8E8", pattern: "shield-outline", patternColor: "rgba(255,255,255,0.4)", skin: "#D9A27A", hair: "#2B2120", hairStyle: "short", outfit: "#C9A86A", lips: "#A4524E", accessory: "cap" },
  },
  {
    id: "droupadi-murmu",
    name: "Droupadi Murmu",
    role: "President of India",
    headline: "First tribal woman to become President (2022)",
    story: [
      "Born in Mayurbhanj, Odisha, she began her career as a teacher.",
      "She served as a minister in the Odisha government and as Governor of Jharkhand from 2015 to 2021.",
      "In July 2022 she became the 15th President of India.",
    ],
    ink: "#3A2203",
    spec: { bg: "#F5C451", pattern: "flower-outline", patternColor: "rgba(255,255,255,0.45)", skin: "#8E5B3E", hair: "#3A3433", hairStyle: "bun", outfit: "#F4EBDD", trim: "#C46A2C", lips: "#7A3B33", accessory: "saree", bindi: true },
  },
  {
    id: "indra-nooyi",
    name: "Indra Nooyi",
    role: "Business leader",
    headline: "CEO of PepsiCo, 2006–2018",
    story: [
      "Born in Chennai, she studied at Madras Christian College, IIM Calcutta and Yale.",
      "She joined PepsiCo in 1994 and led the company as CEO for twelve years, from 2006 to 2018.",
    ],
    ink: "#FFF4EC",
    spec: { bg: "#E2553F", pattern: "trending-up-outline", patternColor: "rgba(255,255,255,0.28)", skin: "#B97A56", hair: "#1F1715", hairStyle: "bob", outfit: "#1E2235", lips: "#8E3B3F", accessory: "lapels", earrings: "#E7C15A" },
  },
  {
    id: "mary-kom",
    name: "Mary Kom",
    role: "Boxer",
    headline: "Six-time world amateur boxing champion",
    story: [
      "From Manipur, she won six world amateur boxing titles.",
      "At the London 2012 Olympics she won bronze — the first Indian woman boxer to win an Olympic medal.",
    ],
    ink: "#3B0A1E",
    spec: { bg: "#F28AB3", pattern: "trophy-outline", patternColor: "rgba(255,255,255,0.4)", skin: "#D6A57E", hair: "#1E1514", hairStyle: "bun", outfit: "#D7263D", lips: "#A4484F", accessory: "gloves" },
  },
  {
    id: "tessy-thomas",
    name: "Tessy Thomas",
    role: "Missile scientist, DRDO",
    headline: "Led India's Agni-IV missile project",
    story: [
      "A DRDO scientist from Kerala, she is often called the “Missile Woman of India”.",
      "As project director for Agni-IV she became the first woman to head a missile project in India.",
    ],
    ink: "#0E3A33",
    spec: { bg: "#7FC8B8", pattern: "rocket-outline", patternColor: "rgba(255,255,255,0.4)", skin: "#A86B45", hair: "#221715", hairStyle: "bob", outfit: "#FAFAFA", trim: "#3F7DBF", lips: "#83403A", accessory: "labcoat", bindi: true },
  },
  {
    id: "avani-chaturvedi",
    name: "Avani Chaturvedi",
    role: "Fighter pilot, Indian Air Force",
    headline: "First Indian woman to fly a fighter jet solo (2018)",
    story: [
      "Commissioned in 2016 as one of the Indian Air Force's first three women fighter pilots.",
      "In 2018 she flew a MiG-21 Bison solo.",
    ],
    ink: "#1F2A0E",
    spec: { bg: "#B5C37A", pattern: "airplane-outline", patternColor: "rgba(255,255,255,0.4)", skin: "#D9A27A", hair: "#2A1E1A", hairStyle: "bun", outfit: "#5F6B3A", lips: "#A1544F", accessory: "goggles" },
  },
  {
    id: "arunima-sinha",
    name: "Arunima Sinha",
    role: "Mountaineer",
    headline: "First woman amputee to summit Everest (2013)",
    story: [
      "A former national-level volleyball player, she lost a leg in 2011 after being pushed from a moving train.",
      "Two years later, with a prosthetic leg, she reached the summit of Mount Everest.",
    ],
    ink: "#0C2A40",
    spec: { bg: "#9AD0F0", pattern: "snow-outline", patternColor: "rgba(255,255,255,0.5)", skin: "#C68B59", hair: "#241815", hairStyle: "braid", outfit: "#F08A2E", trim: "#3A55C9", lips: "#94493F", accessory: "beanie" },
  },
  {
    id: "gita-gopinath",
    name: "Gita Gopinath",
    role: "Economist",
    headline: "First woman Chief Economist of the IMF (2019)",
    story: [
      "A Harvard economics professor, she became the IMF's Chief Economist in 2019 — the first woman in that role.",
      "In 2022 she was appointed the IMF's First Deputy Managing Director.",
    ],
    ink: "#2A1B4D",
    spec: { bg: "#C9B6F2", pattern: "stats-chart-outline", patternColor: "rgba(255,255,255,0.45)", skin: "#C98B63", hair: "#1C1412", hairStyle: "long", outfit: "#2E3A59", lips: "#9B4A52", accessory: "lapels", earrings: "#E7C15A" },
  },
  {
    id: "fathima-beevi",
    name: "Justice M. Fathima Beevi",
    role: "Judge",
    headline: "First woman judge of India's Supreme Court (1989)",
    story: [
      "From Kerala, she was appointed to the Supreme Court of India in 1989 — the first woman to serve on it.",
      "She later served as Governor of Tamil Nadu.",
    ],
    ink: "#3A2A14",
    spec: { bg: "#EAD9BF", pattern: "book-outline", patternColor: "rgba(255,255,255,0.55)", skin: "#B07A55", hair: "#9A9391", hairStyle: "bun", outfit: "#1B1A1F", lips: "#8A4A44", accessory: "bands" },
  },
];

export const womanById = (id: string) => WOMEN.find((w) => w.id === id);
