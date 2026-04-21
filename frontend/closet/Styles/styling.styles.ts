import { Dimensions, Platform, StyleSheet } from "react-native";
import { COLORS, RADIUS, SHADOW } from "./shared";

const { width: W, height: H } = Dimensions.get("window");

export const PINK        = COLORS.pink;
export const PANEL_W     = W * 0.72;
export const CANVAS_H    = H * 0.64;
export const CREATE_CANVAS_H = H * 0.64;

export const s = StyleSheet.create({
  root:{ 
    flex: 1, 
    backgroundColor: "#F6F6F6" 
  },
  headerImg:{
    position: "absolute", 
    top: 0, 
    left: 0, 
    right: 0,
    width: W, 
    height: 160,
    zIndex: 0,
  },
  titleRow:{
    paddingTop: Platform.OS === "ios" ? 56 : 36,
    alignItems: "center",
    zIndex: 10,
  },
  title:{ 
    fontSize: 28, 
    fontWeight: "500", 
    color: "#1a1a1a", 
    letterSpacing: -0.5 
  },
  modeTabs:{
    flexDirection: "row", 
    alignItems: "center",
    marginHorizontal: 16, 
    marginTop: 14,
    backgroundColor: "#fff",
    borderRadius: RADIUS.full,
    padding: 4,
    zIndex: 10,
    ...SHADOW.subtle,
  },
  modeTab:{ 
    flex: 1, 
    paddingVertical: 8, 
    borderRadius: RADIUS.full, 
    alignItems: "center" 
  },
  modeTabActive:{ 
    backgroundColor: COLORS.pink 
  },
  modeTabTxt:{ 
    fontSize: 13, 
    fontWeight: "600", 
    color: "#888" 
  },
  modeTabTxtActive:{ 
    color: "#fff" 
  },
  canvasWrap:{
    marginHorizontal: 16, marginTop: 16,
    height: CANVAS_H,
    backgroundColor: "#fff",
    borderRadius: 24,
    overflow: "hidden",
    zIndex: 5,
    ...SHADOW.card,
  },
  createCanvasWrap: {
    height: CREATE_CANVAS_H,
  },
  randomizeCanvasWrap: {
    height: CREATE_CANVAS_H - 55,
  },
  randomizeCanvasFlat: {
    marginHorizontal: 0,
    borderRadius: 0,
    backgroundColor: "transparent",
    overflow: "hidden",
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  dragLayer: {
    flex: 1,
  },
  dragBlankTapArea: {
    ...StyleSheet.absoluteFillObject,
  },
  draggableItemCard: {
    position: "absolute",
    width: 118,
    height: 148,
    borderRadius: 14,
    overflow: "visible",
    alignItems: "center",
    justifyContent: "center",
    ...SHADOW.card,
  },
  draggableItemMediaWrap: {
    width: "100%",
    height: "100%",
    borderRadius: 14,
    overflow: "hidden",
  },
  draggableItemActive: {
    zIndex: 25,
  },
  draggableItemSelected: {
    borderWidth: 2,
    borderColor: COLORS.pink,
  },
  canvasDeleteBtn: {
    position: "absolute",
    top: -18,
    right: -18,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 30,
    borderWidth: 1,
    borderColor: "#fff",
    ...SHADOW.card,
  },
  canvasHistoryRow: {
    position: "absolute",
    right: 12,
    bottom: 12,
    flexDirection: "row",
    gap: 8,
    zIndex: 40,
  },
  canvasHistoryBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
    ...SHADOW.card,
  },
  canvasHistoryBtnDisabled: {
    opacity: 0.35,
  },
  saveOutfitBtn: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: COLORS.pink,
    borderRadius: RADIUS.full,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    zIndex: 6,
    ...SHADOW.subtle,
  },
  saveOutfitBtnDisabled: {
    opacity: 0.5,
  },
  saveOutfitBtnTxt: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  randomizeBtn: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: "#1a1a2e",
    borderRadius: RADIUS.full,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    paddingVertical: 11,
    zIndex: 6,
    ...SHADOW.subtle,
  },
  randomizeControlsRow: {
    marginHorizontal: 16,
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    zIndex: 6,
  },
  randomizeOptionPill: {
    minWidth: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#f0f0f0",
    ...SHADOW.subtle,
  },
  randomizeOptionPillActive: {
    backgroundColor: COLORS.pink,
    borderColor: COLORS.pink,
  },
  randomizeStackIcon: {
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  randomizeStackDash: {
    width: 14,
    height: 2,
    borderRadius: 1,
    backgroundColor: "#555",
  },
  randomizeStackDashActive: {
    backgroundColor: "#fff",
  },
  randomizeOptionPillText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#555",
  },
  randomizeOptionPillTextActive: {
    color: "#fff",
  },
  randomizeIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1a1a2e",
    alignItems: "center",
    justifyContent: "center",
    ...SHADOW.subtle,
  },
  randomizeBtnDisabled: {
    opacity: 0.5,
  },
  randomizeBtnTxt: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  canvasEmpty:{
    flex: 1, 
    alignItems: "center", 
    justifyContent: "center", 
    gap: 10,
  },
  canvasEmptyTxt:{ 
    fontSize: 14, 
    color: "#ccc", 
    fontWeight: "500" 
  },
  randomizeSlotsBoard: {
    flex: 1,
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
    gap: 0,
  },
  randomizeSlotRow: {
    flex: 1,
    minHeight: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  randomizeSingleViewport: {
    width: "100%",
    maxWidth: 220,
    flex: 1,
    overflow: "hidden",
    alignSelf: "center",
  },
  randomizeRowScroller: {
    flex: 1,
  },
  randomizeRowScrollerContent: {
    alignItems: "center",
  },
  randomizeSlotTrack: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  randomizeSideSlot: {
    flex: 1,
    height: "90%",
    borderRadius: 12,
    backgroundColor: "transparent",
    borderWidth: 0,
    borderColor: "transparent",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  randomizeSideSlotLeft: {
    marginLeft: -40,
  },
  randomizeSideSlotRight: {
    marginRight: -40,
  },
  randomizeCenterSlot: {
    flex: 1,
    height: "90%",
    borderRadius: 12,
    backgroundColor: "transparent",
    borderWidth: 0,
    borderColor: "transparent",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  randomizePinBtn: {
    position: "absolute",
    top: 8,
    right: 25,
    padding: 0,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 3,
  },
  randomizeCenterItemImage: {
    width: "96%",
    height: "96%",
    alignSelf: "center",
  },
  randomizeSideItemImage: {
    width: "96%",
    height: "96%",
    alignSelf: "center",
  },
  randomizeFootwearSideItemImage: {
    width: "74%",
    height: "74%",
  },
  randomizeFootwearCenterItemImage: {
    width: "88%",
    height: "88%",
  },
  randomizeSideItemImageLeft: {
    transform: [{ translateX: -34 }],
  },
  randomizeSideItemImageRight: {
    transform: [{ translateX: 34 }],
  },
  randomizeSlotEmpty: {
    borderStyle: "dashed",
    borderColor: "#ddd",
    backgroundColor: "#fafafa",
  },
  canvasActions:{
    position: "absolute", 
    right: 12, 
    top: 12,
    gap: 8, 
    zIndex: 20,
  },
  actionBtn:{
    width: 40, 
    height: 40, 
    borderRadius: 12,
    backgroundColor: "#1a1a2e",
    alignItems: "center", 
    justifyContent: "center",
    ...SHADOW.card,
  },
  pullTab:{
    position: "absolute", 
    right: -1, 
    top: "50%",
    width: 28, 
    height: 48,
    backgroundColor: COLORS.pink,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    alignItems: "center", 
    justifyContent: "center",
    zIndex: 30,
    ...SHADOW.card,
  },
  contextCard:{
    marginHorizontal: 16, 
    marginTop: 14,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    zIndex: 5,
    ...SHADOW.subtle,
  },
  tempRow:{ 
    flexDirection: "row", 
    justifyContent: "flex-end", 
    marginBottom: 6 
  },
  tempTxt:{ 
    fontSize: 13, 
    color: "#aaa", 
    fontWeight: "600" 
  },
  eventTxt:{ 
    fontSize: 16, 
    fontWeight: "700", 
    color: "#1a1a1a", 
    marginBottom: 14 
  },
  inputRow:{
    flexDirection: "row", 
    alignItems: "center",
    borderWidth: 1.5, 
    borderColor: "#f0f0f0",
    borderRadius: RADIUS.full,
    paddingHorizontal: 16, 
    paddingVertical: 10,
    gap: 8,
  },
  input:{ 
    flex: 1, 
    fontSize: 14, 
    color: "#333" 
  },
  panelOverlay:{ 
    ...StyleSheet.absoluteFillObject, 
    zIndex: 50 
  },
  panelBg:{ 
    ...StyleSheet.absoluteFillObject, 
    backgroundColor: "rgba(0,0,0,0.35)" 
  },
  panel:{
    position: "absolute", 
    right: 0, 
    top: 0, 
    bottom: 0,
    width: PANEL_W,
    backgroundColor: "#fff",
    paddingTop: Platform.OS === "ios" ? 56 : 36,
    zIndex: 51,
  },
  panelHeader:{
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "space-between",
    paddingHorizontal: 14, 
    paddingBottom: 10,
  },
  panelTitle:{ 
    fontSize: 16, 
    fontWeight: "700", 
    color: "#1a1a1a" 
  },
  panelTabsRow:{
    flexDirection: "row", 
    paddingHorizontal: 10,
    gap: 6, 
    marginBottom: 6,
    alignItems: "center",
  },
  panelTabsList: {
    height: 34,
    maxHeight: 34,
    minHeight: 34,
  },
  panelTab:{
    paddingHorizontal: 14, 
    height: 28,
    borderRadius: RADIUS.full,
    backgroundColor: "#f2f2f7",
    alignItems: "center",
    justifyContent: "center",
  },
  panelTabActive:{ 
    backgroundColor: COLORS.pink 
  },
  panelTabTxt:{ 
    fontSize: 12, 
    fontWeight: "600", 
    color: "#888",
    lineHeight: 14,
  },
  panelTabTxtActive:{ 
    color: "#fff" 
  },
  panelSearchRow:{
    flexDirection: "row", 
    alignItems: "center",
    height: 30,
    paddingHorizontal: 10, 
    gap: 6, 
    marginBottom: 6,
  },
  panelSearchBar:{
    flex: 1, 
    flexDirection: "row", 
    alignItems: "center",
    height: 28,
    backgroundColor: "#f2f2f7", 
    borderRadius: 8,
    paddingHorizontal: 8, 
    paddingVertical: 0,
    gap: 4,
  },
  panelSearchTxt:{ 
    flex: 1, 
    fontSize: 12,
    lineHeight: 14,
    paddingVertical: 0,
    color: "#333" 
  },
  panelIconBtn:{
    width: 30,
    height: 30,
    borderRadius: 6,
    backgroundColor: "#fff",
    alignItems: "center", 
    justifyContent: "center",
    ...SHADOW.subtle,
  },
  panelIconBtnActive: {
    backgroundColor: COLORS.pink,
  },
  panelBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: COLORS.pink,
  },
  panelBadgeTxt: {
    fontSize: 9,
    color: COLORS.pink,
    fontWeight: "700",
  },
  panelFilterOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
    zIndex: 120,
  },
  panelFilterDismiss: {
    flex: 1,
  },
  panelFilterSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  panelFilterHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  panelFilterTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  panelFilterClearTxt: {
    fontSize: 14,
    color: COLORS.pink,
    fontWeight: "500",
  },
  panelFilterSection: {
    fontSize: 11,
    fontWeight: "700",
    color: "#aaa",
    letterSpacing: 0.8,
    marginBottom: 12,
    marginTop: 20,
  },
  panelFilterScrollContent: {
    paddingBottom: 24,
  },
  panelChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 4,
  },
  panelChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    borderColor: COLORS.greyBorder,
    backgroundColor: "#fafafa",
  },
  panelChipActive: {
    backgroundColor: COLORS.pink,
    borderColor: COLORS.pink,
  },
  panelChipTxt: {
    fontSize: 13,
    color: "#555",
    fontWeight: "500",
  },
  panelChipTxtActive: {
    color: "#fff",
    fontWeight: "600",
  },
  panelColorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 4,
  },
  panelColorOpt: {
    alignItems: "center",
    gap: 4,
    width: 44,
  },
  panelSwatch: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  panelSwatchBorder: {
    borderWidth: 1,
    borderColor: "#ddd",
  },
  panelSwatchSelected: {
    borderWidth: 3,
    borderColor: COLORS.pink,
  },
  panelSwatchLabel: {
    fontSize: 9,
    color: "#888",
    textAlign: "center",
  },
  panelApplyBtn: {
    backgroundColor: COLORS.pink,
    borderRadius: 30,
    padding: 14,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 8,
  },
  panelApplyBtnTxt: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  panelClearFiltersBtn: {
    alignItems: "center",
    paddingVertical: 8,
    marginBottom: 12,
  },
  panelClearFiltersBtnTxt: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
  },
  panelGrid:{ 
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 100,
  },
  panelRow:{ 
    justifyContent: "center",
    gap: 8,
  },
  panelItem:{
    width: (W - 36) / 3,
    aspectRatio: 0.75,
    marginBottom: 8,
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    padding: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  panelItemSpacer: {
    opacity: 0,
  },
  panelItemSelected:{ 
    borderWidth: 2.5, 
    borderColor: COLORS.pink 
  },
  panelItemOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,78,129,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  panelItemHiddenOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 12,
  },
  panelImg:{ 
    width: "100%",
    height: "88%",
    borderRadius: 8,
  },
  panelEmpty: {
    width: "100%",
    height: "88%",
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
  },
  panelEye:{ 
    position: "absolute",
    top: 6,
    left: 6,
    padding: 2,
    zIndex: 10,
  },
  panelStar:{ 
    position: "absolute",
    top: 6,
    right: 6,
    padding: 2,
    zIndex: 10,
  },
  panelItemEmoji:{ 
    fontSize: 36 },
  selectedGridContent: {
    padding: 8,
    gap: 6,
  },
  selectedGridRow: {
    gap: 6,
  },
  selectedItemCard: {
    flex: 1,
    aspectRatio: 0.9,
    borderRadius: 12,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  selectedItemImage: {
    width: "100%",
    height: "100%",
  },
  selectedItemEmoji: {
    fontSize: 40,
  },
  recommendationReason: {
    marginTop: 10,
    color: "#666",
    fontSize: 12,
  },
  recommendationLoading: {
    marginTop: 8,
    color: "#999",
    fontSize: 12,
  },
  aiShowcaseOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 80,
    justifyContent: "center",
    alignItems: "center",
  },
  aiShowcaseBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  aiShowcaseCard: {
    width: "92%",
    height: "82%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 12,
    ...SHADOW.card,
  },
  aiShowcaseHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  aiShowcaseTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  aiShowcaseBody: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  aiShowcaseMainColumn: {
    width: "72%",
    maxWidth: 280,
    gap: 8,
  },
  aiShowcaseMainItem: {
    flex: 1,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#ececec",
  },
  aiShowcaseSideColumn: {
    width: 86,
    gap: 8,
  },
  aiShowcaseSideItem: {
    height: 86,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#ececec",
  },
  aiShowcaseSideEmpty: {
    backgroundColor: "#fafafa",
  },
  aiShowcaseImage: {
    width: "94%",
    height: "94%",
    alignSelf: "center",
  },
});