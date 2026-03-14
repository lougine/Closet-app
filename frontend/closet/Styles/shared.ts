// styles/shared.ts
// ─── Global design tokens shared across the whole app ────────────────────────

export const PINK    = "#FF4F81";
export const BODY_BG = "#f2f2f2";

export const COLORS = {
  pink:        "#FF4F81",
  pinkLight:   "#fff0f5",
  pinkBorder:  "#ffd6e7",
  bodyBg:      "#f2f2f2",
  white:       "#ffffff",
  black:       "#1a1a1a",
  grey:        "#888888",
  greyLight:   "#f2f2f7",
  greyBorder:  "#ebebeb",
  divider:     "#f0f0f0",
  headerPink:  "#d6257a",
  profileBg:   "#b06080",
};

export const RADIUS = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  pill: 30,
  full: 999,
};

export const SHADOW = {
  card: {
    shadowColor:   "#000",
    shadowOpacity: 0.06 as number,
    shadowRadius:  12,
    shadowOffset:  { width: 0, height: 2 },
    elevation:     3,
  },
  subtle: {
    shadowColor:   "#000",
    shadowOpacity: 0.04 as number,
    shadowRadius:  8,
    shadowOffset:  { width: 0, height: 2 },
    elevation:     1,
  },
};

// ─── Color swatches ───────────────────────────────────────────────────────────
export const COLOR_HEX: Record<string, string> = {
  Black:  "#111111",
  White:  "#FFFFFF",
  Grey:   "#9E9E9E",
  Brown:  "#795548",
  Beige:  "#D7C4A3",
  Red:    "#E53935",
  Pink:   "#F48FB1",
  Purple: "#9C27B0",
  Blue:   "#1E88E5",
  Navy:   "#1A237E",
  Green:  "#43A047",
  Yellow: "#FDD835",
  Orange: "#FB8C00",
  Gold:   "#FFD700",
  Mint:   "#80CBC4",
  Cream:  "#FFF8E1",
};

export const LIGHT_COLORS = ["White", "Cream", "Yellow", "Gold", "Beige"];

export const SEASON_EMOJI: Record<string, string> = {
  Spring: "🌸",
  Summer: "☀️",
  Autumn: "🍂",
  Winter: "❄️",
};