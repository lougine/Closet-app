// styles/styling.styles.ts
import { Dimensions, Platform, StyleSheet } from "react-native";
import { COLORS, RADIUS, SHADOW } from "./shared";

const { width: W, height: H } = Dimensions.get("window");

export const PINK        = COLORS.pink;
export const PANEL_W     = W * 0.72;
export const CANVAS_H    = H * 0.44;
export const HEADER_BLOB = 160;

export const s = StyleSheet.create({
  root:              { flex: 1, backgroundColor: "#fce8f0" },

  // ── Header blob ──────────────────────────────────────────────────────────
  headerBlob:        {
    position: "absolute", top: 0, left: 0, right: 0,
    height: HEADER_BLOB,
    backgroundColor: COLORS.pink,
    borderBottomLeftRadius: 60,
    borderBottomRightRadius: 60,
    zIndex: 0,
  },

  // ── Title ─────────────────────────────────────────────────────────────────
  titleRow:          {
    paddingTop: Platform.OS === "ios" ? 56 : 36,
    alignItems: "center",
    zIndex: 10,
  },
  title:             { fontSize: 28, fontWeight: "800", color: "#1a1a1a", letterSpacing: -0.5 },

  // ── Mode tabs ─────────────────────────────────────────────────────────────
  modeTabs:          {
    flexDirection: "row", alignItems: "center",
    marginHorizontal: 16, marginTop: 14,
    backgroundColor: "#fff",
    borderRadius: RADIUS.full,
    padding: 4,
    zIndex: 10,
    ...SHADOW.subtle,
  },
  modeTab:           { flex: 1, paddingVertical: 8, borderRadius: RADIUS.full, alignItems: "center" },
  modeTabActive:     { backgroundColor: COLORS.pink },
  modeTabTxt:        { fontSize: 13, fontWeight: "600", color: "#888" },
  modeTabTxtActive:  { color: "#fff" },

  // ── Canvas ────────────────────────────────────────────────────────────────
  canvasWrap:        {
    marginHorizontal: 16, marginTop: 16,
    height: CANVAS_H,
    backgroundColor: "#fff",
    borderRadius: 24,
    overflow: "hidden",
    zIndex: 5,
    ...SHADOW.card,
  },
  canvasEmpty:       {
    flex: 1, alignItems: "center", justifyContent: "center", gap: 10,
  },
  canvasEmptyTxt:    { fontSize: 14, color: "#ccc", fontWeight: "500" },

  // ── Canvas action buttons (right column) ─────────────────────────────────
  canvasActions:     {
    position: "absolute", right: 12, top: 12,
    gap: 8, zIndex: 20,
  },
  actionBtn:         {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: "#1a1a2e",
    alignItems: "center", justifyContent: "center",
    ...SHADOW.card,
  },

  // ── Wardrobe pull tab (right edge, Create outfit mode) ───────────────────
  pullTab:           {
    position: "absolute", right: -1, top: "50%",
    width: 28, height: 48,
    backgroundColor: COLORS.pink,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    alignItems: "center", justifyContent: "center",
    zIndex: 30,
    ...SHADOW.card,
  },

  // ── Context card (AI mode) ────────────────────────────────────────────────
  contextCard:       {
    marginHorizontal: 16, marginTop: 14,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    zIndex: 5,
    ...SHADOW.subtle,
  },
  tempRow:           { flexDirection: "row", justifyContent: "flex-end", marginBottom: 6 },
  tempTxt:           { fontSize: 13, color: "#aaa", fontWeight: "600" },
  eventTxt:          { fontSize: 16, fontWeight: "700", color: "#1a1a1a", marginBottom: 14 },
  inputRow:          {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1.5, borderColor: "#f0f0f0",
    borderRadius: RADIUS.full,
    paddingHorizontal: 16, paddingVertical: 10,
    gap: 8,
  },
  input:             { flex: 1, fontSize: 14, color: "#333" },

  // ── Wardrobe side panel ───────────────────────────────────────────────────
  panelOverlay:      { ...StyleSheet.absoluteFillObject, zIndex: 50 },
  panelBg:           { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.35)" },
  panel:             {
    position: "absolute", right: 0, top: 0, bottom: 0,
    width: PANEL_W,
    backgroundColor: "#fff",
    paddingTop: Platform.OS === "ios" ? 56 : 36,
    zIndex: 51,
  },

  // panel header
  panelHeader:       {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 14, paddingBottom: 10,
  },
  panelTitle:        { fontSize: 16, fontWeight: "700", color: "#1a1a1a" },

  // panel tabs
  panelTabsRow:      {
    flexDirection: "row", paddingHorizontal: 10,
    gap: 6, marginBottom: 8,
  },
  panelTab:          {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: "#f2f2f7",
  },
  panelTabActive:    { backgroundColor: COLORS.pink },
  panelTabTxt:       { fontSize: 12, fontWeight: "600", color: "#888" },
  panelTabTxtActive: { color: "#fff" },

  // panel search row
  panelSearchRow:    {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 10, gap: 6, marginBottom: 8,
  },
  panelSearchBar:    {
    flex: 1, flexDirection: "row", alignItems: "center",
    backgroundColor: "#f2f2f7", borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 6, gap: 4,
  },
  panelSearchTxt:    { flex: 1, fontSize: 12, color: "#333" },
  panelIconBtn:      {
    width: 30, height: 30, borderRadius: 7,
    backgroundColor: "#f2f2f7",
    alignItems: "center", justifyContent: "center",
  },

  // panel grid
  panelGrid:         { paddingHorizontal: 8, paddingBottom: 40 },
  panelRow:          { gap: 6, marginBottom: 6 },
  panelItem:         {
    flex: 1, aspectRatio: 0.85,
    backgroundColor: "#f8f8f8",
    borderRadius: 12, overflow: "hidden",
    alignItems: "center", justifyContent: "center",
  },
  panelItemSelected: { borderWidth: 2.5, borderColor: COLORS.pink },
  panelImg:          { width: "100%", height: "100%" },
  panelEye:          { position: "absolute", top: 6, left: 6 },
  panelStar:         { position: "absolute", top: 6, right: 6 },
  panelItemEmoji:    { fontSize: 36 },
});