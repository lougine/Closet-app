import { StyleSheet, Dimensions } from "react-native";

const { width } = Dimensions.get("window");
const COLUMN_COUNT = 3;
const GAP = 2;
const PADDING = 0;
const ITEM_SIZE = (width - PADDING * 2 - GAP * (COLUMN_COUNT - 1)) / COLUMN_COUNT;

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 2,
    borderBottomWidth: 0,
  },

  closeButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },

  closeIcon: {
    fontSize: 24,
    fontWeight: "600",
    color: "#000",
  },

  title: {
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
  },

  tabsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    marginTop: -10,
    paddingVertical: 4,
    borderBottomWidth: 0,
  },

  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    flexDirection: "column",
  },

  tabButtonActive: {
    backgroundColor: "transparent",
    borderBottomWidth: 2,
    borderBottomColor: "#F0507B",
  },

  tabLabel: {
    fontSize: 14,
    color: "#F0507B",
    fontWeight: "500",
    marginTop: 4,
  },

  tabLabelActive: {
    color: "#F0507B",
    fontWeight: "600",
  },

  content: {
    flex: 1,
  },

  albumBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#2A2A2A",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },

  albumText: {
    fontSize: 14,
    fontWeight: "400",
    color: "#FFF",
  },

  albumTextBold: {
    fontWeight: "700",
  },

  allAlbumsText: {
    fontSize: 12,
    fontWeight: "500",
  },

  photoGridItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    margin: GAP / 2,
    backgroundColor: "#E5E5E5",
    borderRadius: 4,
    overflow: "hidden",
  },

  photoImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },

  cameraPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#FB92BD",
    justifyContent: "center",
    alignItems: "center",
  },

  webSearchButton: {
    width: "100%",
    paddingVertical: 24,
    paddingHorizontal: 20,
    backgroundColor: "#FB92BD",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },

  webSearchLabel: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },

  webWrap: {
    flex: 1,
    paddingTop: 12,
  },

  webSearchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
  },

  webSearchInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },

  webSearchBtn: {
    backgroundColor: "#FB92BD",
    borderRadius: 14,
    minWidth: 86,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
  },

  webSearchBtnDisabled: {
    opacity: 0.55,
  },

  webSearchBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },

  webEmptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 24,
  },

  webEmptyTitle: {
    fontSize: 16,
    fontWeight: "700",
  },

  webEmptySubtitle: {
    marginTop: 6,
    fontSize: 13,
    textAlign: "center",
  },

  webGridContent: {
    paddingHorizontal: 12,
    paddingBottom: 24,
    gap: 8,
  },

  webGridRow: {
    justifyContent: "space-between",
    marginBottom: 8,
  },

  webCard: {
    width: "49%",
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },

  webCardImage: {
    width: "100%",
    height: 160,
    backgroundColor: "#EDEDED",
  },

  webCardFooter: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },

  webCardTitle: {
    fontSize: 13,
    fontWeight: "600",
  },

  webProcessingOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  webProcessingText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },

  placeholderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },

  // Legacy styles (keeping for compatibility if needed)
  tabContent: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 24,
  },

  galleryButtonRow: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
  },

  galleryButton: {
    flex: 1,
    height: 150,
    backgroundColor: "#FB92BD",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 16,
  },

  galleryButtonLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 8,
  },
});



