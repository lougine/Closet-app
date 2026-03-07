import { Dimensions, StyleSheet } from "react-native";

const { width: W } = Dimensions.get("window");
const PINK = "#FF4F81";
const ITEM_SIZE = (W - 48) / 3;

export const s2 = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#e8e8e8",
    backgroundColor: "#fafafa",
    marginRight: 8,
    marginBottom: 8,
  },
  chipText: { 
    fontSize: 13, 
    color: "#555", 
    fontWeight: "500" 
},
});

export const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fafafa" },

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
    color: "#1a1a1a" 
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
    fontSize: 14 
},
  nameStep: { 
    flex: 1, 
    padding: 24 
},
  stepTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  stepSubtitle: { 
    fontSize: 14, 
    color: "#888", 
    marginBottom: 28 
},
  nameInput: {
    borderWidth: 1.5,
    borderColor: "#ebebeb",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 17,
    color: "#1a1a1a",
    backgroundColor: "#fff",
    marginBottom: 28,
  },
  suggestLabel: {
    fontSize: 12,
    color: "#aaa",
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: 12,
    textTransform: "uppercase",
  },
  suggestRow: { 
    flexDirection: "row", 
    flexWrap: "wrap" 
},
  pickHeader: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  pickTitle: { 
    fontSize: 17, 
    fontWeight: "700", 
    color: "#1a1a1a" 
},
  pickSubtitle: { 
    fontSize: 13, 
    color: "#888", 
    marginTop: 2 
},
  grid: { 
    padding: 12, 
    paddingBottom: 120, 
    gap: 4 
},
  gridRow: { 
    gap: 4, 
    marginBottom: 4 
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
    borderColor: PINK 
},
  gridImg: { 
    width: "100%", 
    height: "100%" 
},
  gridEmoji: { 
    fontSize: 36 
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
  emptyEmoji: { 
    fontSize: 52 
},
  emptyTitle: { 
    fontSize: 17, 
    fontWeight: "600", 
    color: "#1a1a1a" 
},
  emptySubtitle: { 
    fontSize: 13, 
    color: "#aaa", 
    textAlign: "center" 
},
});