import { Dimensions, StyleSheet } from "react-native";

const { width: W } = Dimensions.get("window");

export const PINK = "#FF4F81";
export const ITEM_SIZE = (W - 48) / 3;

export const s = StyleSheet.create({
  root: { 
    flex: 1, 
    backgroundColor: "#fafafa" 
},
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  saveBtn: {
    backgroundColor: PINK,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  saveBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  previewStrip: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  previewLabel: {
    fontSize: 12,
    color: "#888",
    paddingHorizontal: 16,
    paddingTop: 10,
    fontWeight: "500",
  },
  previewItem: {
    position: "relative",
  },
  previewImg: {
    width: 64,
    height: 64,
    borderRadius: 12,
    overflow: "hidden",
  },
  previewRemove: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: PINK,
    alignItems: "center",
    justifyContent: "center",
  },
  instruction: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#fff8fb",
  },
  instructionText: {
    fontSize: 13,
    color: "#888",
    textAlign: "center",
  },
  grid: {
    padding: 12,
    paddingBottom: 120,
    gap: 4,
  },
  gridRow: {
    gap: 4,
    marginBottom: 4,
  },
  gridItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    borderRadius: 12,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  gridItemSelected: {
    borderWidth: 3,
    borderColor: PINK,
  },
  gridImg: {
    width: "100%",
    height: "100%",
  },
  gridLabel: {
    position: "absolute",
    bottom: 4,
    fontSize: 9,
    color: "#999",
    paddingHorizontal: 4,
    textAlign: "center",
  },
  checkOverlay: {
    ...(StyleSheet.absoluteFillObject as any),
    backgroundColor: "rgba(255,255,255,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#aaa",
    textAlign: "center",
  },
  addBtn: {
    marginTop: 8,
    backgroundColor: PINK,
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  addBtnText: {
    color: "#fff",
    fontWeight: "600",
  },
});