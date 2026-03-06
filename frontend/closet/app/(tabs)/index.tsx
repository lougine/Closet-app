import { Feather, Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Dimensions, FlatList, Image, Modal, ScrollView, StatusBar, Text, TextInput, TouchableOpacity, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useWardrobe } from "../../context/wardrobeContext";
import { s } from "../Styles/index.styles";

const { width: W } = Dimensions.get("window");

const FILTER_TABS = ["All", "Footwear", "Tops", "Bottoms", "Accessories"];

const Wave = () => (
  <Svg
    width={W}
    height={44}
    viewBox={`0 0 ${W} 44`}
    preserveAspectRatio="none"
    style={{ position: "absolute", width: "100%", height: "100%" }}
  >
    <Path
      d={`M0,44 L0,22 Q${W * 0.25},50.6 ${W * 0.5},16.72 Q${W * 0.75},-8.8 ${W},22.88 L${W},44 Z`}
      fill="#f2f2f2"
    />
  </Svg>
);

export default function WardrobeScreen() {
  const router = useRouter();
  const { items, counts } = useWardrobe();

  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [imageMenuFor, setImageMenuFor] = useState<"profile" | "bg" | null>(
    null
  );

  const pickImage = async (source: "library" | "camera") => {
    const result =
      source === "library"
        ? await ImagePicker.launchImageLibraryAsync({ quality: 0.8 })
        : await ImagePicker.launchCameraAsync({ quality: 0.8 });

    if (!result.canceled && result.assets[0]) {
      if (imageMenuFor === "profile") setProfilePic(result.assets[0].uri);
      else setBgImage(result.assets[0].uri);
    }

    setImageMenuFor(null);
  };

  const filtered = items.filter((item) => {
    const matchSearch = item.label
      .toLowerCase()
      .includes(searchQuery.toLowerCase());

    const matchTab =
      activeTab === "All"
        ? true
        : activeTab === "Tops"
        ? item.category?.includes("Tops")
        : activeTab === "Bottoms"
        ? item.category?.includes("Bottoms")
        : activeTab === "Footwear"
        ? item.category?.includes("Footwear")
        : true;

    return matchSearch && matchTab;
  });

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <View style={s.headerShell}>
        <TouchableOpacity
          style={s.headerImg}
          onPress={() => setImageMenuFor("bg")}
          activeOpacity={0.9}
        >
          {bgImage ? (
            <Image source={{ uri: bgImage }} style={s.bgImage} />
          ) : (
            <View style={s.headerDefault} />
          )}

          <View style={s.waveWrap}>
            <Wave />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.settingsBtn}
          onPress={() => router.push("/features/settings")}
        >
          <Feather name="settings" size={15} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={s.profileWrap}
          onPress={() => setImageMenuFor("profile")}
        >
          {profilePic ? (
            <Image source={{ uri: profilePic }} style={s.profilePic} />
          ) : (
            <View style={[s.profilePic, s.profilePlaceholder]}>
              <Ionicons name="person" size={36} color="#fff" />
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={s.body}>
        <View style={s.usernameRow}>
          <Text style={s.username}>@wizliz</Text>
          <TouchableOpacity onPress={() => router.push("/features/analytics")}>
            <Text style={s.analyticsLink}>Style Analytics ›</Text>
          </TouchableOpacity>
        </View>

        <View style={s.statsCard}>
          <View style={s.statItem}>
            <Text style={s.statNumPink}>{counts.items}</Text>
            <Text style={s.statLabel}>Items</Text>
          </View>

          <View style={s.statDivider} />

          <View style={s.statItem}>
            <Text style={s.statNum}>{counts.outfits}</Text>
            <Text style={s.statLabel}>Outfits</Text>
          </View>

          <View style={s.statDivider} />

          <View style={s.statItem}>
            <Text style={s.statNum}>{counts.lookbooks}</Text>
            <Text style={s.statLabel}>Lookbooks</Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabsScroll}>
          {FILTER_TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[s.tab, activeTab === tab && s.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={s.searchRow}>
          <View style={s.searchBar}>
            <Ionicons name="search" size={14} color="#aaa" />
            <TextInput
              placeholder="Search"
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={s.searchInput}
            />
          </View>
        </View>

        <FlatList
          data={filtered}
          numColumns={3}
          keyExtractor={(item) => String(item.id)}
          style={s.grid}
          renderItem={({ item }) => (
            <TouchableOpacity style={[s.gridItem, { backgroundColor: item.bg }]}>
              {item.image ? (
                <Image source={{ uri: item.image }} style={s.gridImg} />
              ) : (
                <Text style={s.gridEmoji}>👗</Text>
              )}
              <Text style={s.gridLabel}>{item.label}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <Modal transparent visible={!!imageMenuFor} animationType="slide">
        <TouchableOpacity style={s.overlay} onPress={() => setImageMenuFor(null)}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>Change Image</Text>

            <TouchableOpacity style={s.sheetBtn} onPress={() => pickImage("library")}>
              <Text>Choose from Library</Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.sheetBtn} onPress={() => pickImage("camera")}>
              <Text>Take Photo</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}