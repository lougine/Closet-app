// Styles/index.styles.ts
import { Dimensions, Platform, StyleSheet } from "react-native";
import { COLORS, RADIUS, SHADOW } from "./shared";

const { width: W } = Dimensions.get("window");
const PINK      = COLORS.pink;
const ITEM_SIZE = (W - 4) / 3;
const HEADER_H  = 210;
const WAVE_H    = 44;
const PIC_SIZE  = 88;
const BODY_BG   = COLORS.bodyBg;

export const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BODY_BG },

  // Header
  headerShell:        { width: W, height: HEADER_H + PIC_SIZE / 2, overflow: "visible" },
  headerImg:          { position: "absolute", top: 0, left: 0, right: 0, height: HEADER_H, overflow: "hidden" },
  bgImage:            { ...StyleSheet.absoluteFillObject as any },
  headerDefault:      { ...StyleSheet.absoluteFillObject as any, backgroundColor: "#d6257a" },
  waveWrap:           { position: "absolute", bottom: 0, left: 0, right: 0, height: WAVE_H },
  settingsBtn:        { position: "absolute", top: Platform.OS === "ios" ? 52 : 36, right: 16, width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(0,0,0,0.3)", alignItems: "center", justifyContent: "center", zIndex: 20 },
  profileWrap:        { position: "absolute", bottom: -(PIC_SIZE / 2), alignSelf: "center", zIndex: 20 },
  profilePic:         { width: PIC_SIZE, height: PIC_SIZE, borderRadius: PIC_SIZE / 2, borderWidth: 3, borderColor: "#fff" },
  profilePlaceholder: { backgroundColor: "#b06080", alignItems: "center", justifyContent: "center" },

  // Body
  body:          { flex: 1, backgroundColor: BODY_BG },
  usernameRow:   { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingTop: 12, paddingBottom: 8, paddingHorizontal: 16 },
  username:      { fontSize: 15, fontWeight: "600", color: "#1a1a1a" },
  analyticsLink: { position: "absolute", right: 16, fontSize: 12, color: "#888" },

  // Stats card
  statsCard:   { marginHorizontal: 18, marginBottom: 10, backgroundColor: "#fff", borderRadius: 35, paddingVertical: 14, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-around", ...SHADOW.card, borderWidth: 1, borderColor: COLORS.divider },
  statItem:    { flex: 1, alignItems: "center" },
  statNum:     { fontSize: 18, fontWeight: "700", color: "#1a1a1a" },
  statNumPink: { fontSize: 18, fontWeight: "700", color: PINK },
  statLabel:   { fontSize: 11, color: "#aaa", marginTop: 2, fontWeight: "500" },
  statDivider: { width: 1, height: 32, backgroundColor: COLORS.divider },

  // Controls card
  controlsCard:   { backgroundColor: "#fff" },
  tabsScroll:     {},
  tab:            { paddingHorizontal: 16, paddingVertical: 6, borderRadius: RADIUS.full },
  tabActive:      { backgroundColor: PINK },
  tabText:        { fontSize: 13, color: "#555" },
  tabTextActive:  { color: "#fff", fontWeight: "600" },
  controlDivider: { height: 1, backgroundColor: COLORS.divider, marginHorizontal: 14 },
  searchRow:      { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 8, gap: 8 },
  searchBar:      { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: COLORS.greyLight, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, gap: 6 },
  searchInput:    { flex: 1, fontSize: 13, color: "#333" },
  iconBtn:        { width: 34, height: 34, borderRadius: 8, backgroundColor: COLORS.greyLight, alignItems: "center", justifyContent: "center" },
  iconBtnActive:  { backgroundColor: PINK },
  badge:          { position: "absolute", top: -4, right: -4, width: 16, height: 16, borderRadius: 8, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: PINK },
  badgeTxt:       { fontSize: 9, color: PINK, fontWeight: "700" },

  // Active filter pills
  activePill:    { backgroundColor: "#fff0f5", borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: "#ffd6e7" },
  activePillTxt: { fontSize: 12, color: PINK, fontWeight: "500" },
  clearPill:     { backgroundColor: COLORS.greyLight, borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 5 },
  clearPillTxt:  { fontSize: 12, color: "#888", fontWeight: "500" },

  // Grid
  grid:      { flex: 1, backgroundColor: BODY_BG },
  gridItem:  { width: ITEM_SIZE, height: ITEM_SIZE, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  gridImg:   { width: "100%", height: "100%" },
  gridEmoji: { fontSize: 42 },
  gridLabel: { position: "absolute", bottom: 4, fontSize: 9, color: "#999", paddingHorizontal: 4 },

  // Empty states
  emptyState:    { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40, gap: 10, paddingBottom: 120 },
  emptyEmoji:    { fontSize: 52 },
  emptyTitle:    { fontSize: 17, fontWeight: "600", color: "#1a1a1a" },
  emptySubtitle: { fontSize: 13, color: "#aaa", textAlign: "center" },
  clearBtn:      { marginTop: 8, backgroundColor: PINK, borderRadius: RADIUS.full, paddingHorizontal: 24, paddingVertical: 10 },
  clearBtnTxt:   { color: "#fff", fontWeight: "600", fontSize: 14 },

  // Filter modal
  filterOverlay:  { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  filterSheet:    { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "85%", paddingHorizontal: 20, paddingTop: 16 },
  filterHeader:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  filterTitle:    { fontSize: 17, fontWeight: "700", color: "#1a1a1a" },
  filterClearTxt: { fontSize: 14, color: PINK, fontWeight: "500" },
  filterSection:  { fontSize: 11, fontWeight: "700", color: "#aaa", letterSpacing: 0.8, marginBottom: 12, marginTop: 20 },
  applyBtn:       { backgroundColor: PINK, borderRadius: 30, padding: 16, alignItems: "center", margin: 16, marginTop: 8 },
  applyBtnTxt:    { color: "#fff", fontSize: 15, fontWeight: "700" },

  // Image picker sheet
  overlay:    { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet:      { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  sheetTitle: { fontSize: 16, fontWeight: "600", color: "#333", marginBottom: 16, textAlign: "center" },
  sheetBtn:   { backgroundColor: COLORS.greyLight, borderRadius: 12, padding: 14, marginBottom: 8 },
});

// Filter chip styles (separate export to avoid naming conflicts inside .map callbacks)
export const fc = StyleSheet.create({
  row:           { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  chip:          { paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.greyBorder, backgroundColor: "#fafafa" },
  chipOn:        { backgroundColor: PINK, borderColor: PINK },
  chipTxt:       { fontSize: 13, color: "#555", fontWeight: "500" },
  chipTxtOn:     { color: "#fff", fontWeight: "600" },
  colorRow:      { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 4 },
  colorOpt:      { alignItems: "center", gap: 4, width: 44 },
  swatch:        { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  swatchBorder:  { borderWidth: 1, borderColor: "#ddd" },
  swatchSelected:{ borderWidth: 3, borderColor: PINK },
  swatchLabel:   { fontSize: 9, color: "#888", textAlign: "center" },
});