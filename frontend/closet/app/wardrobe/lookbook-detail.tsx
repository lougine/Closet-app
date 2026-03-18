import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo } from "react";
import {
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import AuthenticatedImage from "../../components/AuthenticatedImage";
import { buildImageUrl } from "../../constants/api";
import { useWardrobe } from "../../context/wardrobeContext";

type LookbookSummary = {
  _id: string;
  name?: string;
  date?: string;
  previewImage?: string;
  garmentIds?: string[];
  garments?: {
    _id: string;
    name?: string;
    category?: string;
    imageUrl?: string;
  }[];
};

const formatCategory = (category: unknown) => {
  if (Array.isArray(category)) {
    return category.join(" • ");
  }

  if (typeof category === "string") {
    return category;
  }

  return "";
};

export default function LookbookDetailScreen() {
  const router = useRouter();
  const { lookbookJson } = useLocalSearchParams<{ lookbookJson: string }>();
  const { items } = useWardrobe();

  const lookbook: LookbookSummary | null = useMemo(() => {
    if (!lookbookJson) return null;
    try {
      return JSON.parse(lookbookJson);
    } catch {
      return null;
    }
  }, [lookbookJson]);

  const garmentIds = useMemo(
    () => (Array.isArray(lookbook?.garmentIds) ? lookbook.garmentIds : []),
    [lookbook],
  );

  const payloadLookbookItems = useMemo(() => {
    if (!Array.isArray(lookbook?.garments)) {
      return [];
    }

    return lookbook.garments
      .filter((garment) => garment && garment._id)
      .map((garment) => ({
        id: garment._id,
        label: garment.name || "Unnamed item",
        category: garment.category,
        image: garment.imageUrl ? buildImageUrl(garment.imageUrl) : null,
      }));
  }, [lookbook]);

  const lookbookItems = useMemo(
    () => items.filter((item) => garmentIds.includes(item.id)),
    [garmentIds, items],
  );

  const displayItems = payloadLookbookItems.length > 0 ? payloadLookbookItems : lookbookItems;
  const displayCount = displayItems.length > 0 ? displayItems.length : garmentIds.length;

  const title = lookbook?.name || "Untitled Lookbook";
  const dateLabel = lookbook?.date
    ? new Date(lookbook.date).toLocaleDateString()
    : "No date";

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#1a1a1a" />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerOverline}>Lookbook Details</Text>
          <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.metaCard}>
        <Text style={styles.metaText}>Type: Lookbook</Text>
        <Text style={styles.metaText}>Items: {displayCount}</Text>
      </View>

      <View style={styles.metaCard}>
        <Text style={styles.metaText}>Created: {dateLabel}</Text>
      </View>

      {displayItems.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No items available</Text>
          <Text style={styles.emptySubtitle}>
            This lookbook exists, but its items are not loaded in this view yet.
          </Text>
        </View>
      ) : (
        <FlatList
          data={displayItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.itemRow}>
              {item.image ? (
                <AuthenticatedImage
                  source={{ uri: item.image }}
                  style={styles.itemImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.itemImage, { backgroundColor: item.bg || "#f1f1f1" }]} />
              )}
              <View style={styles.itemTextWrap}>
                <Text style={styles.itemTitle} numberOfLines={1}>{item.label}</Text>
                <Text style={styles.itemSubtitle} numberOfLines={1}>
                  {formatCategory(item.category) || "Uncategorized"}
                </Text>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f6f6f6" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    marginTop: 2,
    fontSize: 16,
    fontWeight: "700",
    color: "#1a1a1a",
    textAlign: "center",
  },
  headerTitleWrap: {
    flex: 1,
    marginHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  headerOverline: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: "#E91E63",
  },
  metaCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metaText: {
    color: "#666",
    fontSize: 13,
    fontWeight: "600",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 10,
  },
  itemRow: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  itemImage: {
    width: 58,
    height: 78,
    borderRadius: 10,
    backgroundColor: "#efefef",
  },
  itemTextWrap: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  itemSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: "#888",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#888",
    textAlign: "center",
  },
});