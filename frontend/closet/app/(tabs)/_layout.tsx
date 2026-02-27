import { IconSymbol } from '@/components/ui/icon-symbol';
import * as ImagePicker from 'expo-image-picker';
import { Tabs, useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Alert, Animated, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
 import { Ionicons } from '@expo/vector-icons';

function ActionButton({ label, onPress, icon, iconColor }: any) {
  return (
    <TouchableOpacity style={styles.actionButton} onPress={onPress}>
      {icon && <IconSymbol name={icon} size={20} color={iconColor || "#B8576A"} style={{ marginRight: 10, right: 5 }} />}
      <Text style={styles.actionText}>{label}</Text>
    </TouchableOpacity>
  );
}

function ExpandableFAB() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const animation = useRef(new Animated.Value(0)).current;

  const toggleMenu = () => {
    Animated.spring(animation, {
    toValue: open ? 0 : 1,
    useNativeDriver: true,
  }).start();
  setOpen(!open);
};
const createAnimation = (distance: number) => ({
  transform: [
    {
      translateY: animation.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -distance],
      }),
    },
  ],
  opacity: animation,
});

  const navigateAndClose = (route: string) => {
    toggleMenu();
    setTimeout(() => {
      return router.push(route as any);
    }, 200);
  };
  const handleAddItems = async () => {
  toggleMenu();

  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission denied', 'Camera permission is required to add items.');
    return;
  }

  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    quality: 0.7,
  });

  if (!result.canceled) {
    console.log('Captured image:', result.assets[0].uri);
    router.push({ pathname: '/features/add-items', params: { image: result.assets[0].uri } });
  }
};

  return (
    <View style={styles.floatingContainer}>
      
      {open && (
  <>
  <Animated.View style={[styles.actionWrapper, createAnimation(250)]}>
    <ActionButton label="Add items" icon="plus" onPress={handleAddItems} />
</Animated.View>

  <Animated.View style={[styles.actionWrapper, createAnimation(190)]}>
    <ActionButton label="Create outfit" icon="hanger" onPress={() => navigateAndClose("/outfit")} />
  </Animated.View> 

  <Animated.View style={[styles.actionWrapper, createAnimation(130)]}>
   <ActionButton label="Create lookbook" icon="book" onPress={() => navigateAndClose("/lookbook")} />
  </Animated.View>

  <Animated.View style={[styles.actionWrapper, createAnimation(70)]}>
   <ActionButton label="Premium Features" icon="sparkles" onPress={() => navigateAndClose("/premium")} />
  </Animated.View>
  </>
)}
      {/* Main FAB */}
      <TouchableOpacity
        style={[
          styles.floatingButton,
          { backgroundColor: open ? "#000000" : "#FF4F81" },
        ]}
        onPress={toggleMenu}
        activeOpacity={0.9}
      >
      <Image source={ open
      ? require("../../assets/images/hanger.png")
      : require("../../assets/images/hanger.png")
       }
       style={styles.fabIcon}
       
      />
      </TouchableOpacity>
    </View>
  );
}

export default function TabLayout() {
  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarStyle: {
            position: "absolute",
            bottom: 20,
            left: 20,
            right: 20,
            backgroundColor: "#1E1E1E",
            borderRadius: 25,
            height: 58,
            borderColor: 'transparent',
          },
        }}
      >
        <Tabs.Screen
        name="Community"
        options={{
          tabBarIcon: ({ focused }) => (
        <Image source={require("../../assets/images/Community.png")}
        style={{
          width: 40,
          height: 40,
          tintColor: focused ? "#F0507B" : "#ffffff",
          position: "relative", 
          top:12,
        }}
        resizeMode="contain"
      />
    ),
  }}
/>
        <Tabs.Screen
        name="calendar"
        options={{
          tabBarIcon: ({ focused }) => (
        <Image source={require("../../assets/images/calender.png")}
        style={{
          width: 30,
          height: 30,
          tintColor: focused ? "#F0507B" : "#ffffff",
          position: "relative", 
          top:12,
          right: 20,
        }}
        resizeMode="contain"
      />
    ),
  }}
/>
        <Tabs.Screen
        name="styling"
        options={{
          tabBarIcon: ({ focused }) => (
        <Image source={require("../../assets/images/styling.png")}
        style={{
          width: 50,
          height: 50,
          tintColor: focused ? "#F0507B" : "#ffffff",
          position: "relative", 
          top:12,
          left: 20,
        }}
        resizeMode="contain"
      />
    ),
  }}
/>
       <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
        <Image source={require("../../assets/images/waredrobe.png")}
        style={{
          width: 40,
          height: 40,
          tintColor: focused ? "#F0507B" : "#ffffff",
          position: "relative", 
          top:12,
        }}
        resizeMode="contain"
      />
    ),
  }}
 /* />
<Tabs.Screen
  name="analytics"
  options={{
    tabBarIcon: ({ focused }) => (
      // TODO: replace this Ionicons icon with your custom image asset
      // like the other tabs e.g:
      // <Image source={require("../../assets/images/analytics.png")} ... />
      <Ionicons
        name="bar-chart-outline"
        size={24}
        color={focused ? "#F0507B" : "#ffffff"}
        style={{ position: 'relative', top: 12 }}
      />
    ),
  }} */
/>
      </Tabs>
      <ExpandableFAB />
    </>
  );
}

const styles = StyleSheet.create({
  floatingContainer: {
    position: "absolute",
    bottom: 45,
    alignSelf: "center",
    alignItems: "center",
  },
  actionWrapper: {
    position: "absolute",
    zIndex: 100,
  },
  actionButton: {
    backgroundColor: "#FEC4DD",
    paddingHorizontal: 25,
    width: 200,
    height: 40,
    paddingVertical: 12,
    borderRadius: 55,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
    alignSelf: "center",
  },
  actionText: {
    color: "#000",
    fontWeight: "500",
    alignSelf: "center",
    bottom: 20,
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
  resizeMode: "contain",
  bottom: 5,
},
});
