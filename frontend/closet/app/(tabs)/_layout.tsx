import { IconSymbol } from "@/components/ui/icon-symbol";
import { Tabs, useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import { Animated, DeviceEventEmitter, Image, Pressable, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { styles } from "../../Styles/tabs_layout.styles";
import { CalendarProvider } from "../../context/calendar-context";
import { useAppTheme } from "../../context/themeContext";

function ActionButton({ label, onPress, icon, iconColor, variant = "pink" }: any) {
  return (
    <TouchableOpacity
      style={[
        styles.actionButton,
        variant === "black" && { backgroundColor: "#111111", borderWidth: 1, borderColor: "#2A2A2A" },
      ]}
      onPress={onPress}
    >
      {icon && (
        <IconSymbol name={icon} size={20} color={iconColor || "#B8576A"} style={styles.actionIcon} />
      )}
      <Text style={[styles.actionText, variant === "black" && { color: "#F1F1F1" }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function ExpandableFAB() {
  const router = useRouter();
  const { isDarkMode } = useAppTheme();
  const [open, setOpen] = useState(false);
  const animation = useRef(new Animated.Value(0)).current;

  const toggleMenu = () => {
    Animated.spring(animation, { toValue: open ? 0 : 1, useNativeDriver: true }).start();
    setOpen(!open);
  };

  const createAnimation = (distance: number) => ({
    transform: [{ translateY: animation.interpolate({ inputRange: [0, 1], outputRange: [0, -distance] }) }],
    opacity: animation,
  });

  const navigateAndClose = (route: string) => {
    toggleMenu();
    setTimeout(() => router.push(route as any), 200);
  };

  const handleAddItems = () => {
    navigateAndClose("/wardrobe/upload-items");
  };

  return (
    <>
      {open && (
        <Pressable
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundColor: isDarkMode ? "rgba(0,0,0,0.72)" : "rgba(0,0,0,0.6)",
            zIndex: 90,
          }}
          onPress={toggleMenu}
        />
      )}
      <View style={styles.floatingContainer}>
        {open && (
          <>
            <Animated.View style={[styles.actionWrapper, createAnimation(250)]}>
              <ActionButton label="Upload items" icon="plus" onPress={handleAddItems} />
            </Animated.View>
            <Animated.View style={[styles.actionWrapper, createAnimation(190)]}>
              <ActionButton
                label="Create outfit"
                icon="hanger"
                onPress={() => {
                  toggleMenu();
                  setTimeout(() => {
                    router.push({ pathname: "/(tabs)/styling" as any, params: { mode: "create" } });
                  }, 200);
                }}
              />
            </Animated.View>
            <Animated.View style={[styles.actionWrapper, createAnimation(130)]}>
              <ActionButton label="Create lookbook" icon="book" onPress={() => navigateAndClose("/wardrobe/lookbook")} />
            </Animated.View>
            <Animated.View style={[styles.actionWrapper, createAnimation(70)]}>
              <ActionButton label="Premium Features" icon="sparkles" onPress={() => navigateAndClose("/premium")} />
            </Animated.View>
          </>
        )}
        <TouchableOpacity
          style={[styles.floatingButton, { backgroundColor: open ? "#000" : "#FF4F81" }]}
          onPress={toggleMenu}
          activeOpacity={0.9}
        >
          <Image source={require("../../assets/images/hanger.png")} style={styles.fabIcon} />
        </TouchableOpacity>
      </View>
    </>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { isDarkMode } = useAppTheme();
  const tabBarHeight = 58 + insets.bottom;

  return (
    <CalendarProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: isDarkMode ? "#121212" : "#FFFFFF" }} edges={["left", "right"]}>
        <View style={{ flex: 1, backgroundColor: isDarkMode ? "#121212" : "#FFFFFF" }}>
          <Tabs
            screenOptions={{
              headerShown: false,
              tabBarShowLabel: false,
              sceneStyle: {
                backgroundColor: isDarkMode ? "#121212" : "#FFFFFF",
              },
              tabBarStyle: {
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                backgroundColor: isDarkMode ? "#0F0F0F" : "#1E1E1E",
                borderRadius: 0,
                height: tabBarHeight,
                paddingBottom: insets.bottom,
                borderColor: "transparent",
              },
            }}
          >
            <Tabs.Screen
              name="Community"
              options={{
                tabBarIcon: ({ focused }) => (
                  <Image source={require("../../assets/images/Community.png")}
                    style={[styles.communityIcon, focused && styles.focusedTabIcon]}
                    resizeMode="contain" />
                ),
              }}
              listeners={({ navigation, route }) => ({
                tabPress: () => {
                  const state = navigation.getState();
                  const activeRouteName = state.routes[state.index]?.name;
                  if (activeRouteName === route.name) {
                    DeviceEventEmitter.emit("community-tab-press");
                  }
                },
              })}
            />
            <Tabs.Screen
              name="calendar"
              options={{
                tabBarIcon: ({ focused }) => (
                  <Image source={require("../../assets/images/calender.png")}
                    style={[styles.calendarIcon, focused && styles.focusedTabIcon]}
                    resizeMode="contain" />
                ),
              }}
            />
            <Tabs.Screen
              name="styling"
              options={{
                tabBarIcon: ({ focused }) => (
                  <Image source={require("../../assets/images/styling.png")}
                    style={[styles.stylingIcon, focused && styles.focusedTabIcon]}
                    resizeMode="contain" />
                ),
              }}
            />
            <Tabs.Screen
              name="index"
              options={{
                tabBarIcon: ({ focused }) => (
                  <Image source={require("../../assets/images/waredrobe.png")}
                    style={[styles.wardrobeIcon, focused && styles.focusedTabIcon]}
                    resizeMode="contain" />
                ),
              }}
            />
          </Tabs>
          <ExpandableFAB />
        </View>
      </SafeAreaView>
    </CalendarProvider>
  );
}
