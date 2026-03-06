import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Image, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import styles from "../Styles/communityStyles";

const CommunityScreen: React.FC = () => {
  const closetItems = [
    require("../../assets/images/favicon.png"),
    require("../../assets/images/favicon.png"),
    require("../../assets/images/favicon.png"),
  ];

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Ionicons name="search-outline" size={22} />

        <TextInput
          placeholder="What will today's fit be?"
          style={styles.searchInput}
        />

        <View style={styles.headerIcons}>
          <Ionicons name="notifications-outline" size={22} />
          <Ionicons name="person-circle-outline" size={24} />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* CLOSET STYLE CARD */}
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
        >
          {closetItems.map((item, index) => (
            <View key={index} style={styles.carouselContainer}>
              <Image
                source={item}
                style={styles.carouselImage}
                resizeMode="cover"
              />

              {/* overlay text */}
              <View style={styles.overlay}>
                <Text style={styles.overlayTitle}>Style This Item You Own</Text>
                <Text style={styles.overlaySub}>
                  Get outfit inspiration from your closet
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* FILTER CHIPS */}
        <View style={styles.chipRow}>
          <TouchableOpacity style={[styles.chip, styles.activeChip]}>
            <Text style={styles.activeChipText}>For You</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.chip}>
            <Text style={styles.chipText}>Friends</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.chip}>
            <Text style={styles.chipText}>Polls</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.chip}>
            <Text style={styles.chipText}>Recent</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.feedSpace} />
      </ScrollView>
      </View>
  );
};

export default CommunityScreen;
