import { IconSymbol } from "@/components/ui/icon-symbol";
import { Tabs, useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import { Animated, Image, Modal, Pressable, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { styles } from "../../Styles/tabs_layout.styles";
import { CalendarProvider } from "../../context/calendar-context";

function ActionButton({ label, onPress, icon, iconColor }: any) {
  return (
    <TouchableOpacity style={styles.actionButton} onPress={onPress}>
      {icon && (
        <IconSymbol name={icon} size={20} color={iconColor || "#B8576A"} style={styles.actionIcon} />
      )}
      <Text style={styles.actionText}>{label}</Text>
    </TouchableOpacity>
  );
}

function ExpandableFAB() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [showAddSheet, setShowAddSheet] = useState(false);
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
    toggleMenu();
    setTimeout(() => setShowAddSheet(true), 250);
  };

  const launchCamera = async () => {
    setShowAddSheet(false);
    setTimeout(() => router.push({ pathname: "/wardrobe/add-items" as any, params: { source: "camera" } }), 300);
  };

  const launchGallery = async () => {
    setShowAddSheet(false);
    setTimeout(() => router.push({ pathname: "/wardrobe/add-items" as any, params: { source: "gallery" } }), 300);
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
            backgroundColor: "rgba(0,0,0,0.6)",
            zIndex: 90,
          }}
          onPress={toggleMenu}
        />
      )}
      <View style={styles.floatingContainer}>
        {open && (
          <>
            <Animated.View style={[styles.actionWrapper, createAnimation(250)]}>
              <ActionButton label="Add items" icon="plus" onPress={handleAddItems} />
            </Animated.View>
            <Animated.View style={[styles.actionWrapper, createAnimation(190)]}>
              <ActionButton label="Create outfit" icon="hanger" onPress={() => navigateAndClose("/wardrobe/outfit")} />
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

      <Modal transparent visible={showAddSheet} animationType="slide" onRequestClose={() => setShowAddSheet(false)}>
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={styles.sheetDismiss} activeOpacity={1} onPress={() => setShowAddSheet(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Add Item</Text>
            <TouchableOpacity style={styles.sheetBtn} onPress={launchCamera}>
              <View>
                <Text style={styles.sheetBtnLabel}>Take a Photo</Text>
                <Text style={styles.sheetBtnSub}>Use your camera</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sheetBtn} onPress={launchGallery}>
              <View>
                <Text style={styles.sheetBtnLabel}>Choose from Gallery</Text>
                <Text style={styles.sheetBtnSub}>Pick an existing photo</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddSheet(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = 58 + insets.bottom;

  return (
    <CalendarProvider>
      <SafeAreaView style={{ flex: 1 }} edges={["left", "right"]}>
        <>
          <Tabs
            screenOptions={{
              headerShown: false,
              tabBarShowLabel: false,
              tabBarStyle: {
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                backgroundColor: "#1E1E1E",
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
        </>
      </SafeAreaView>
    </CalendarProvider>
  );
}