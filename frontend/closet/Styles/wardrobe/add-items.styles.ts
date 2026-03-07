import { StyleSheet } from "react-native";

const PINK = "#FF4F81";

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
    borderBottomColor: "#f0f0f0" 
},
  backBtn: { 
    width: 36, 
    height: 36, 
    borderRadius: 18, 
    alignItems: "center", 
    justifyContent: "center" 
},
  headerTitle: { 
    fontSize: 17, 
    fontWeight: "600", 
    color: "#1a1a1a" 
},
  saveBtn: { 
    backgroundColor: PINK, 
    borderRadius: 20, 
    paddingHorizontal: 20, 
    paddingVertical: 8 
},
  saveBtnText: { 
    color: "#fff", 
    fontWeight: "600", 
    fontSize: 14 
},
  scroll: { 
    flex: 1 
},
  scrollContent: { 
    padding: 16 
},
  photoCard: { 
    borderRadius: 20, 
    overflow: "hidden", 
    backgroundColor: "#f0eeea", 
    height: 260, 
    marginBottom: 16, 
    alignItems: "center", 
    justifyContent: "center" 
},
  photo: { 
    width: "100%", 
    height: "100%" 
},
  photoPlaceholder: { 
    alignItems: "center", 
    justifyContent: "center", 
    gap: 8 
},
  photoPlaceholderText: { 
    fontSize: 13, 
    color: "#bbb" 
},
  section: { 
    backgroundColor: "#fff", 
    borderRadius: 16, 
    padding: 16, 
    marginBottom: 12, 
    shadowColor: "#000", 
    shadowOpacity: 0.04, 
    shadowRadius: 8, 
    shadowOffset: {
         width: 0, 
         height: 2 
        }, 
    elevation: 1 },
  sectionTitleRow: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 4, 
    marginBottom: 12 
},
  sectionTitle: { 
    fontSize: 13, 
    fontWeight: "600", 
    color: "#888", 
    letterSpacing: 0.5, 
    textTransform: "uppercase" 
},
  requiredDot: { 
    fontSize: 15, 
    color: PINK, 
    fontWeight: "700", 
    marginTop: -2 
},
  textInput: { 
    borderWidth: 1, 
    borderColor: "#ebebeb", 
    borderRadius: 10, 
    paddingHorizontal: 13, 
    paddingVertical: 11, 
    fontSize: 15, 
    color: "#1a1a1a", 
    backgroundColor: "#fafafa" 
},
  chipRow: { 
    flexDirection: "row", 
    flexWrap: "wrap", 
    gap: 8 
},
  chip: { 
    paddingHorizontal: 14, 
    paddingVertical: 7, 
    borderRadius: 20, 
    borderWidth: 1.5, 
    borderColor: "#e8e8e8", 
    backgroundColor: "#fafafa" 
},
  chipActive: { 
    backgroundColor: PINK, 
    borderColor: PINK 
},
  chipText: { 
    fontSize: 13, 
    color: "#555", 
    fontWeight: "500" 
},
  chipTextActive: { 
    color: "#fff", 
    fontWeight: "600" 
},
  colorGrid: { 
    flexDirection: "row", 
    flexWrap: "wrap", 
    gap: 12, 
},
  colorOpt: { 
    alignItems: "center", 
    gap: 4, 
    width: 46 
},
  colorSwatch: { 
    width: 36, 
    height: 36, 
    borderRadius: 18, 
    alignItems: "center", 
    justifyContent: "center" 
},
  swatchBorder: { 
    borderWidth: 1, 
    borderColor: "#ddd" 
},
  swatchSelected: { 
    borderWidth: 3, 
    borderColor: PINK 
},
  colorLabel: { 
    fontSize: 9, 
    color: "#888", 
    textAlign: "center" 
},
  inputRow: { 
    flexDirection: "row", 
    alignItems: "center" 
},
  currencySymbol: { 
    fontSize: 15, 
    color: "#555", 
    fontWeight: "600", 
    backgroundColor: "#f2f2f7", 
    borderWidth: 1, 
    borderColor: "#ebebeb", 
    borderRightWidth: 0, 
    borderTopLeftRadius: 10, 
    borderBottomLeftRadius: 10, 
    paddingHorizontal: 12, 
    paddingVertical: 11 
},
  tagInputRow: { 
    flexDirection: "row", 
    gap: 8, 
    alignItems: "center" 
},
  tagAddBtn: { 
    width: 42, 
    height: 42, 
    borderRadius: 10, 
    backgroundColor: PINK, 
    alignItems: "center", 
    justifyContent: "center" 
},
  tagsWrap: { 
    flexDirection: "row", 
    flexWrap: "wrap", 
    gap: 8, 
    marginTop: 12 
},
  tagPill: { 
    backgroundColor: PINK, 
    borderRadius: 20, 
    paddingVertical: 5, 
    paddingLeft: 12, 
    paddingRight: 8, 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 5 
},
  tagText: { 
    color: "#fff", 
    fontSize: 13, 
    fontWeight: "500" 
},
  tagX: { 
    color: "#fff", 
    fontSize: 17, 
    lineHeight: 19 
},
});