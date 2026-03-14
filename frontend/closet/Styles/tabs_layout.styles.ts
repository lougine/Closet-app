import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  floatingContainer: {
    position: "absolute",
    bottom: 45,
    alignSelf: "center",
    alignItems: "center",
  },
  actionWrapper: { 
    position: "absolute", 
    zIndex: 100 
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEC4DD",
    paddingHorizontal: 25,
    width: 200,
    height: 40,
    borderRadius: 55,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
  },
  actionText: { 
    color: "#000", 
    fontWeight: "500" 
  },
  floatingButton: {
    width: 60,
    height: 60,
    borderRadius: 32.5,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
  },
  fabIcon: { 
    width: 37, 
    height: 37, 
    resizeMode: 
    "contain", bottom: 5 
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 12,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#e0e0e0",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 20,
    textAlign: "center",
  },
  sheetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: "#fafafa",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  sheetBtnIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#fff0f5",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetBtnLabel: { 
    fontSize: 15, 
    fontWeight: "600", 
    color: "#1a1a1a" 
  },
  sheetBtnSub: { 
    fontSize: 12, 
    color: "#aaa", 
    marginTop: 2 
  },
  cancelBtn: { 
    marginTop: 4, 
    padding: 14, 
    alignItems: "center" 
  },
  cancelText: { 
    fontSize: 15, 
    color: "#FF4F81", 
    fontWeight: "600" 
  },
});
