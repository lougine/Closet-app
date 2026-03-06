import { Dimensions, StyleSheet } from "react-native";
import { BODY_BG, PINK } from "./shared";

const { width: W } = Dimensions.get("window");
const HEADER_H = 210;
const WAVE_H = 44;
const PIC_SIZE = 88;
const ITEM_SIZE = (W - 4) / 3;

export const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BODY_BG },

  headerShell: { 
    width: W, 
    height: HEADER_H, 
    overflow: "visible" 
  },
  headerImg: { 
    position: "absolute", 
    top: 0, left: 0, 
    right: 0, 
    height: HEADER_H, 
    overflow: "hidden" 
  },
  headerDefault: { 
    backgroundColor: "#d6257a" 
  },
  waveWrap: { 
    position: "absolute", 
    bottom: 0, 
    left: 0, 
    right: 0, 
    height: WAVE_H 
  },
  settingsBtn: { 
    position: "absolute", 
    right: 16, 
    width: 32, 
    height: 32, 
    marginTop: 60, 
    borderRadius: 16, 
    backgroundColor: "rgba(0,0,0,0.3)", 
    alignItems: "center", 
    justifyContent: "center", 
    zIndex: 20 
  },
  profileWrap: { 
    position: "absolute", 
    bottom: -(PIC_SIZE / 2), 
    alignSelf: "center", 
    zIndex: 20 
  },
  profilePic: { 
    width: PIC_SIZE, 
    height: PIC_SIZE, 
    borderRadius: PIC_SIZE / 2, 
    borderWidth: 3, 
    borderColor: "#fff" 
  },
  profilePlaceholder: { 
    backgroundColor: "#b06080", 
    alignItems: "center", 
    justifyContent: "center" 
  },
  bgImage: { 
    width: "100%", 
    height: "100%" 
  },
  body: { 
    flex: 1, 
    backgroundColor: BODY_BG 
  },
  usernameRow: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "center", 
    paddingTop: PIC_SIZE / 2 + 10, 
    paddingBottom: 8, 
    paddingHorizontal: 16 
  },
  username: { 
    fontSize: 15, 
    fontWeight: "600", 
    color: "#1a1a1a" 
  },
  analyticsLink: { 
    position: "absolute", 
    right: 16, 
    fontSize: 12, 
    color: "#888" 
  },
  statsCard: { 
    marginHorizontal: 18, 
    marginBottom: 12, 
    backgroundColor: "#fff", 
    borderRadius: 35, 
    paddingVertical: 14, 
    paddingHorizontal: 10, 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "space-around", 
    shadowColor: "#000", 
    shadowOpacity: 0.06, 
    shadowRadius: 12, 
    shadowOffset: { 
      width: 0, 
      height: 2 
    }, 
    elevation: 3, 
    borderWidth: 1, 
    borderColor: "#f0f0f0" 
  },
  statItem: { 
    flex: 1, 
    alignItems: "center" 
  },
  statNum: { 
    fontSize: 18, 
    fontWeight: "700", 
    color: "#1a1a1a" 
  },
  statNumPink: { 
    fontSize: 18, 
    fontWeight: "700", 
    color: PINK 
  },
  statLabel: { 
    fontSize: 11, 
    color: "#aaa", 
    marginTop: 2,
    fontWeight: "500" 
  },
  statDivider: { 
    width: 1, 
    height: 32, 
    backgroundColor: "#efefef" 
  },
  tabsScroll: { 
    backgroundColor: "#fff", 
    maxHeight: 48, 
    borderBottomWidth: 1, 
    borderBottomColor: "#f0f0f0" 
  },
  tab: { 
    marginRight: 2,
    paddingHorizontal: 16, 
    paddingVertical: 6, 
    borderRadius: 20 
  },
  tabActive: { 
    backgroundColor: PINK 
  },
  tabText: { 
    fontSize: 13, color: "#555" 
  },
  tabTextActive: { 
    color: "#fff", 
    fontWeight: "600" 
  },
  searchRow: { 
    flexDirection: "row", 
    alignItems: "center", 
    paddingHorizontal: 14, 
    paddingVertical: 8, 
    backgroundColor: "#fff", 
    borderBottomWidth: 1, 
    borderBottomColor: "#f0f0f0", 
    gap: 8 
  },
  searchBar: { 
    flex: 1, 
    flexDirection: "row", 
    alignItems: "center", 
    backgroundColor: "#f2f2f7", 
    borderRadius: 10, 
    paddingHorizontal: 10, 
    paddingVertical: 7, 
    gap: 6 
  },
  searchInput: { 
    flex: 1, 
    fontSize: 13, 
    color: "#333" 
  },
  grid: { 
    flex: 1, 
    backgroundColor: "#f0f0f0" 
  },
  gridItem: { 
    width: ITEM_SIZE, 
    height: ITEM_SIZE, 
    alignItems: "center", 
    justifyContent: "center", 
    overflow: "hidden" 
  },
  gridImg: { 
    width: "100%", 
    height: "100%" 
  },
  gridEmoji: { 
    fontSize: 42 
  },
  gridLabel: { 
    position: "absolute", 
    bottom: 4, 
    fontSize: 9, 
    color: "#999", 
    paddingHorizontal: 4 
  },
  overlay: { 
    flex: 1, 
    backgroundColor: "rgba(0,0,0,0.5)", 
    justifyContent: "flex-end" 
  },
  sheet: { 
    backgroundColor: "#fff", 
    borderTopLeftRadius: 20, 
    borderTopRightRadius: 20, 
    padding: 20, 
    paddingBottom: 40 
  },
  sheetTitle: { 
    fontSize: 16, 
    fontWeight: "600", 
    color: "#333", 
    marginBottom: 16, 
    textAlign: "center" 
  },
  sheetBtn: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 12, 
    backgroundColor: "#f2f2f7", 
    borderRadius: 12, 
    padding: 14, 
    marginBottom: 8 
  },
  sheetBtnText: { 
    fontSize: 15, 
    color: "#333" 
  },
  cancelBtn: { 
    marginTop: 4, 
    padding: 14, 
    alignItems: "center" 
  },
  cancelText: { 
    fontSize: 15, 
    color: PINK, 
    fontWeight: "600" 
  },
});