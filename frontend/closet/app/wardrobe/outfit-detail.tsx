import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, Dimensions, FlatList, Modal, StyleSheet, Text, TouchableOpacity, View, Share } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AuthenticatedImage from "../../components/AuthenticatedImage";
import { buildApiUrl, buildAuthHeaders, buildImageUrl, fetchApiWithFallback } from "../../constants/api";
import { useWardrobe } from "../../context/wardrobeContext";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const LANDSCAPE_CARD_WIDTH = SCREEN_WIDTH - 32;
const LANDSCAPE_CARD_HEIGHT = 180;

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
  const { outfitJson, outfitId } = useLocalSearchParams<{ outfitJson?: string; outfitId?: string }>();
  const { items, refreshItems, decrementOutfitCount } = useWardrobe();
  const [remoteOutfit, setRemoteOutfit] = useState<OutfitSummary | null>(null);
  const [loadingRemoteOutfit, setLoadingRemoteOutfit] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingItems, setEditingItems] = useState(false);
  const [draftGarmentIds, setDraftGarmentIds] = useState<string[]>([]);
  const [savingItems, setSavingItems] = useState(false);

  const outfit: OutfitSummary | null = useMemo(() => {
    if (outfitJson) {
      try {
        return JSON.parse(outfitJson);
      } catch {
        return null;
      }
    }

    return remoteOutfit;
  }, [outfitJson, remoteOutfit]);

  useEffect(() => {
    if (outfitJson || !outfitId || remoteOutfit || loadingRemoteOutfit) return;

    let isActive = true;
    const loadOutfit = async () => {
      setLoadingRemoteOutfit(true);
      try {
        const response = await fetchApiWithFallback(`/api/outfits/${String(outfitId)}`);
        if (!response.ok) return;
        const payload = await response.json();
        if (!isActive) return;
        setRemoteOutfit(payload);
      } catch {
        // ignore silently
      } finally {
        if (isActive) setLoadingRemoteOutfit(false);
      }
    };

    void loadOutfit();
    return () => { isActive = false; };
  }, [outfitJson, outfitId, remoteOutfit, loadingRemoteOutfit]);

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
        bg: "#f1f1f1",
        category: garment.category ? [garment.category] : [],
        image: garment.imageUrl ? buildImageUrl(garment.imageUrl) : null,
      }));
  }, [outfit]);

  const outfitItems = useMemo(
    () => items.filter((item) => garmentIds.includes(item.id)),
    [garmentIds, items],
  );

  const displayItems = payloadOutfitItems.length > 0 ? payloadOutfitItems : outfitItems;
  const displayCount = displayItems.length > 0 ? displayItems.length : garmentIds.length;
  const currentGarmentIds = garmentIds.length > 0 ? garmentIds : displayItems.map((item) => item.id);

  const openItemsEditor = () => {
    const initialIds = garmentIds.length > 0
      ? garmentIds
      : displayItems.map((item) => item.id);
    setDraftGarmentIds(initialIds);
    setEditingItems(true);
  };

  const toggleDraftGarment = (garmentId: string) => {
    setDraftGarmentIds((prev) => (
      prev.includes(garmentId)
        ? prev.filter((id) => id !== garmentId)
        : [...prev, garmentId]
    ));
  };

  const saveOutfitItems = async () => {
    if (!outfit?._id || savingItems) return;
    try {
      setSavingItems(true);
      const token = await SecureStore.getItemAsync("userToken");
      if (!token) {
        Alert.alert("Session expired", "Please log in again.");
        return;
      }

      const response = await fetchApiWithFallback(`/api/outfits/${outfit._id}`, {
        method: "PUT",
        headers: {
          ...buildAuthHeaders(token),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ garments: draftGarmentIds }),
      }, { timeoutMs: 15000, retries: 1 });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        throw new Error(errorPayload?.message || "Unable to update outfit items.");
      }

      const updatedOutfit = await response.json();
      await refreshItems();
      setEditingItems(false);
      router.setParams({
        outfitJson: JSON.stringify(updatedOutfit),
      });
    } catch (error: any) {
      Alert.alert("Update failed", error?.message || "Unable to update outfit items.");
    } finally {
      setSavingItems(false);
    }
  };

  const removeOutfitItem = async (garmentId: string) => {
    if (!outfit?._id || savingItems) return;

    const nextGarments = currentGarmentIds.filter((id) => id !== garmentId);
    try {
      setSavingItems(true);
      const token = await SecureStore.getItemAsync("userToken");
      if (!token) {
        Alert.alert("Session expired", "Please log in again.");
        return;
      }

      const response = await fetchApiWithFallback(`/api/outfits/${outfit._id}`, {
        method: "PUT",
        headers: {
          ...buildAuthHeaders(token),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ garments: nextGarments }),
      }, { timeoutMs: 15000, retries: 1 });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        throw new Error(errorPayload?.message || "Unable to remove item from outfit.");
      }

      const updatedOutfit = await response.json();
      await refreshItems();
      router.setParams({
        outfitJson: JSON.stringify(updatedOutfit),
      });
    } catch (error: any) {
      Alert.alert("Remove failed", error?.message || "Unable to remove item from outfit.");
    } finally {
      setSavingItems(false);
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

            const response = await fetchApiWithFallback(`/api/outfits/${outfit._id}`, {
              method: "DELETE",
              headers: buildAuthHeaders(token),
            }, { timeoutMs: 15000, retries: 1 });

            if (!response.ok) {
              const errorPayload = await response.json().catch(() => ({}));
              throw new Error(errorPayload?.message || "Unable to delete outfit.");
            }

            decrementOutfitCount();
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
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => Share.share({ message: `Check out my ${outfit?.name || "outfit"}!` })}
          >
            <Ionicons name="share-outline" size={18} color="#1a1a1a" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={openItemsEditor}>
            <Ionicons name="shirt-outline" size={18} color="#1a1a1a" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, deleting && { opacity: 0.6 }]}
            onPress={confirmDelete}
            disabled={deleting}
          >
            <Ionicons name="trash-outline" size={18} color="#1a1a1a" />
          </TouchableOpacity>
        </View>
      </View>

      {displayItems.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No items available</Text>
          <Text style={styles.emptySubtitle}>
            This outfit exists, but its items are not loaded in this view yet.
          </Text>
        </View>
      ) : (
        <View style={styles.carouselSection}>
          <View style={styles.carouselHeader}>
            <Text style={styles.carouselTitle}>Swipe through items</Text>
            <Text style={styles.carouselSubtitle}>
              {displayCount} item{displayCount === 1 ? "" : "s"}
            </Text>
          </View>
          <FlatList
            data={displayItems}
            keyExtractor={(item) => `carousel-${item.id}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            snapToInterval={LANDSCAPE_CARD_WIDTH + 12}
            decelerationRate="fast"
            contentContainerStyle={styles.carouselListContent}
            renderItem={({ item, index }) => (
              <View style={[styles.landscapeCard, { width: LANDSCAPE_CARD_WIDTH, height: LANDSCAPE_CARD_HEIGHT }]}>
                {item.image ? (
                  <AuthenticatedImage
                    source={{ uri: item.image }}
                    style={styles.landscapeImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.landscapeImage, { backgroundColor: item.bg || "#f1f1f1" }]} />
                )}
                <View style={styles.landscapeTextWrap}>
                  <Text style={styles.landscapeIndex}>Item {index + 1}</Text>
                  <Text style={styles.landscapeTitle} numberOfLines={1}>
                    {item.label}
                  </Text>
                  <Text style={styles.landscapeSubtitle} numberOfLines={2}>
                    {formatCategory(item.category) || "Uncategorized"}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.landscapeRemoveBtn, savingItems && { opacity: 0.6 }]}
                  onPress={() => removeOutfitItem(item.id)}
                  disabled={savingItems}
                >
                  <Ionicons name="remove-circle-outline" size={20} color="#E91E63" />
                </TouchableOpacity>
              </View>
            )}
          />
        </View>
      )}

      <Modal
        visible={editingItems}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditingItems(false)}
      >
        <SafeAreaView style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalHeaderBtn}
              onPress={() => setEditingItems(false)}
            >
              <Text style={styles.modalHeaderBtnText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Outfit Items</Text>
            <TouchableOpacity
              style={[styles.modalHeaderBtn, savingItems && { opacity: 0.6 }]}
              onPress={saveOutfitItems}
              disabled={savingItems}
            >
              <Text style={styles.modalHeaderBtnText}>{savingItems ? "Saving..." : "Save"}</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.modalListContent}
            renderItem={({ item }) => {
              const selected = draftGarmentIds.includes(item.id);
              return (
                <TouchableOpacity
                  style={[styles.modalItemRow, selected && styles.modalItemRowSelected]}
                  onPress={() => toggleDraftGarment(item.id)}
                  activeOpacity={0.8}
                >
                  {item.image ? (
                    <AuthenticatedImage
                      source={{ uri: item.image }}
                      style={styles.modalItemImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.modalItemImage, { backgroundColor: item.bg || "#f1f1f1" }]} />
                  )}
                  <View style={styles.modalItemTextWrap}>
                    <Text style={styles.modalItemTitle} numberOfLines={1}>{item.label}</Text>
                    <Text style={styles.modalItemSubtitle} numberOfLines={1}>
                      {formatCategory(item.category) || "Uncategorized"}
                    </Text>
                  </View>
                  <Ionicons
                    name={selected ? "checkmark-circle" : "ellipse-outline"}
                    size={22}
                    color={selected ? "#E91E63" : "#bfbfbf"}
                  />
                </TouchableOpacity>
              );
            }}
          />
        </SafeAreaView>
      </Modal>
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
    width: 144,
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
  carouselSection: {
    paddingTop: 6,
  },
  carouselHeader: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  carouselTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  carouselSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: "#777",
    fontWeight: "600",
  },
  carouselListContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  landscapeCard: {
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "stretch",
  },
  landscapeImage: {
    width: "58%",
    height: "100%",
    backgroundColor: "#f1f1f1",
  },
  landscapeTextWrap: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    justifyContent: "space-between",
  },
  landscapeRemoveBtn: {
    position: "absolute",
    right: 12,
    bottom: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  landscapeIndex: {
    fontSize: 11,
    fontWeight: "700",
    color: "#E91E63",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  landscapeTitle: {
    marginTop: 6,
    fontSize: 18,
    fontWeight: "800",
    color: "#1a1a1a",
  },
  landscapeSubtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: "#666",
  },
  listContent: {
    paddingBottom: 20,
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
  modalRoot: {
    flex: 1,
    backgroundColor: "#f6f6f6",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#fff",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  modalHeaderBtn: {
    minWidth: 56,
  },
  modalHeaderBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#E91E63",
  },
  modalListContent: {
    padding: 16,
    gap: 10,
  },
  modalItemRow: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "transparent",
  },
  modalItemRowSelected: {
    borderColor: "#ffd8e6",
    backgroundColor: "#fff7fb",
  },
  modalItemImage: {
    width: 52,
    height: 70,
    borderRadius: 10,
    backgroundColor: "#efefef",
  },
  modalItemTextWrap: {
    flex: 1,
  },
  modalItemTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  modalItemSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: "#888",
  },
});
