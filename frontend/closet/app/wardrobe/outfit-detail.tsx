import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AuthenticatedImage from "../../components/AuthenticatedImage";
import { buildApiUrl, buildAuthHeaders, buildImageUrl } from "../../constants/api";
import { useWardrobe } from "../../context/wardrobeContext";

type OutfitSummary = {
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

export default function OutfitDetailScreen() {
  const router = useRouter();
  const { outfitJson } = useLocalSearchParams<{ outfitJson: string }>();
  const { items, refreshItems } = useWardrobe();
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const outfit: OutfitSummary | null = useMemo(() => {
    if (!outfitJson) return null;
    try {
      return JSON.parse(outfitJson);
    } catch {
      return null;
    }
  }, [outfitJson]);

  const garmentIds = useMemo(
    () => (Array.isArray(outfit?.garmentIds) ? outfit.garmentIds : []),
    [outfit],
  );

  const payloadOutfitItems = useMemo(() => {
    if (!Array.isArray(outfit?.garments)) {
      return [];
    }

    return outfit.garments
      .filter((garment) => garment && garment._id)
      .map((garment) => ({
        id: garment._id,
        label: garment.name || "Unnamed item",
        category: garment.category,
        image: garment.imageUrl ? buildImageUrl(garment.imageUrl) : null,
      }));
  }, [outfit]);

  const outfitItems = useMemo(
    () => items.filter((item) => garmentIds.includes(item.id)),
    [garmentIds, items],
  );

  const displayItems = payloadOutfitItems.length > 0 ? payloadOutfitItems : outfitItems;
  const displayCount = displayItems.length > 0 ? displayItems.length : garmentIds.length;

  const title = outfit?.name || "Outfit";
  const dateLabel = outfit?.date
    ? new Date(outfit.date).toLocaleDateString()
    : "No date";

  const saveName = async () => {
    if (!outfit?._id || saving) return;
    const trimmed = nameValue.trim();
    if (!trimmed) {
      Alert.alert("Missing name", "Please enter a name for this outfit.");
      return;
    }

    try {
      setSaving(true);
      const token = await SecureStore.getItemAsync("userToken");
      if (!token) {
        Alert.alert("Session expired", "Please log in again.");
        return;
      }

      const response = await fetch(buildApiUrl(`/api/outfits/${outfit._id}`), {
        method: "PUT",
        headers: {
          ...buildAuthHeaders(token),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: trimmed }),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        throw new Error(errorPayload?.message || "Unable to update outfit name.");
      }

      await refreshItems();
      setEditingName(false);
      router.setParams({
        outfitJson: JSON.stringify({ ...outfit, name: trimmed }),
      });
    } catch (error: any) {
      Alert.alert("Save failed", error?.message || "Unable to update outfit name.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    if (!outfit?._id || deleting) return;
    Alert.alert("Delete Outfit", "This outfit will be permanently removed.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            setDeleting(true);
            const token = await SecureStore.getItemAsync("userToken");
            if (!token) {
              Alert.alert("Session expired", "Please log in again.");
              return;
            }

            const response = await fetch(buildApiUrl(`/api/outfits/${outfit._id}`), {
              method: "DELETE",
              headers: buildAuthHeaders(token),
            });

            if (!response.ok) {
              const errorPayload = await response.json().catch(() => ({}));
              throw new Error(errorPayload?.message || "Unable to delete outfit.");
            }

            await refreshItems();
            router.back();
          } catch (error: any) {
            Alert.alert("Delete failed", error?.message || "Unable to delete outfit.");
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#1a1a1a" />
        </TouchableOpacity>
        {editingName ? (
          <TextInput
            style={styles.nameInput}
            value={nameValue}
            onChangeText={setNameValue}
            placeholder="Outfit name"
            placeholderTextColor="#aaa"
            autoFocus
          />
        ) : (
          <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
        )}
        {editingName ? (
          <TouchableOpacity
            style={[styles.actionBtn, saving && { opacity: 0.6 }]}
            onPress={saveName}
            disabled={saving}
          >
            <Ionicons name="checkmark" size={18} color="#1a1a1a" />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => {
                setNameValue(title);
                setEditingName(true);
              }}
            >
              <Ionicons name="create-outline" size={18} color="#1a1a1a" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, deleting && { opacity: 0.6 }]}
              onPress={confirmDelete}
              disabled={deleting}
            >
              <Ionicons name="trash-outline" size={18} color="#1a1a1a" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.metaCard}>
        <Text style={styles.metaText}>Date: {dateLabel}</Text>
        <Text style={styles.metaText}>Items: {displayCount}</Text>
      </View>

      {displayItems.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No items available</Text>
          <Text style={styles.emptySubtitle}>
            This outfit exists, but its items are not loaded in this view yet.
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
    flex: 1,
    marginHorizontal: 10,
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
    textAlign: "center",
  },
  headerActions: {
    width: 72,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  nameInput: {
    flex: 1,
    marginHorizontal: 10,
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 36,
    fontSize: 15,
    fontWeight: "600",
    color: "#1a1a1a",
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
