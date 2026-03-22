import { StyleSheet } from "react-native";

export const s = StyleSheet.create({
  tileEmpty: {
    width: "100%",
    height: "100%",
    backgroundColor: "#ececec",
  },
  tileImage: {
    width: "100%",
    height: "100%",
  },
  emptyFallback: {
    backgroundColor: "#f2f2f2",
  },
  singleFallback: {
    backgroundColor: "#ececec",
  },
  splitRow: {
    flexDirection: "row",
    overflow: "hidden",
    backgroundColor: "#f2f2f2",
  },
  splitHalf: {
    width: "50%",
    height: "100%",
    padding: 1,
  },
  splitRight: {
    width: "50%",
    height: "100%",
  },
  splitQuarter: {
    height: "50%",
    padding: 1,
  },
  quadWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    overflow: "hidden",
    backgroundColor: "#f2f2f2",
  },
  quadTile: {
    width: "50%",
    height: "50%",
    padding: 1,
  },
});
