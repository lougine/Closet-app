import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 35,
    alignItems: "center",
    zIndex: 20,
  },
  topImage: {
    position: "absolute",
    marginBottom: -1,
  },
  logoContainer: {
    position: "absolute",
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 160,
    zIndex: 10,
  },
  logo: {
    width: 220,
    height: 220,
  },
  contentSection: {
    paddingHorizontal: 35,
    alignItems: "center",
    paddingBottom: 15,
  },
  title: {
    color: "#FFF",
    fontSize: 40,
    textAlign: "center",
  },
  subtitle: {
    color: "#D9D9D9",
    fontSize: 15,
    textAlign: "center",
    marginTop: 5,
  },

  description: {
    color: "#D9D9D9",
    textAlign: "center",
    fontSize: 15,
  },
  lineRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  pinkLine: {
    width: 75,
    height: 2,
    backgroundColor: "#FB92BD",
    marginRight: 8,
    borderRadius: 1,
  },
  createButton: {
    backgroundColor: "#FB92BD",
    paddingVertical: 16,
    borderRadius: 35,
    width: 312,
    height: 50,
    alignItems: "center",
    marginTop: 45,
  },
  createButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    letterSpacing: 1,
  },
  loginLink: {
    marginTop: 25,
  },
  loginText: {
    color: "#F0507B",
    fontSize: 16,
  },
});