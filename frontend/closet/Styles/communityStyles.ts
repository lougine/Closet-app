import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f2f2f2",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: "white",
    borderRadius: 20,
    margin: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
  },
  headerIcons: {
    flexDirection: "row",
    gap: 12,
  },
  carouselContainer: {
    width: "100%",
    height: 230,
    marginTop: 5,
  },
  carouselImage: {
    width: "100%",
    height: "100%",
  },
  dots: {
    flexDirection: "row",
    position: "absolute",
    bottom: 12,
    alignSelf: "center",
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 5,
    backgroundColor: "#ccc",
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: "white",
  },
  chipRow: {
    flexDirection: "row",
    marginTop: 15,
    paddingHorizontal: 10,
  },
  chip: {
    backgroundColor: "#e5e5e5",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginRight: 10,
  },
  activeChip: {
    backgroundColor: "#ff4d73",
  },
  chipText: {
    fontSize: 13,
  },
  activeChipText: {
    color: "white",
    fontSize: 13,
  },
  feedSpace: {
    height: 400,
  },
  floatingButton: {
    position: "absolute",
    bottom: 35,
    alignSelf: "center",
    backgroundColor: "#ff4d73",
    width: 65,
    height: 65,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
  },
  bottomNav: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: 70,
    backgroundColor: "black",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  overlay: {
    position: "absolute",
    bottom: 20,
    left: 20,
  },
  overlayTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  overlaySub: {
    color: "white",
    fontSize: 13,
    marginTop: 4,
  },
});
export default styles;