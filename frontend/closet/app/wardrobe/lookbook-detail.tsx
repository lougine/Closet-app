import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AuthenticatedImage from "../../components/AuthenticatedImage";
import {
  IMAGE_UPLOAD_ASPECT,
  IMAGE_UPLOAD_QUALITY,
  validateImageFileSize,
} from "../../constants/imageUpload";
import { buildApiUrl, buildAuthHeaders, buildImageUrl } from "../../constants/api";
import { useWardrobe } from "../../context/wardrobeContext";
import { UploadRequestError, getUploadErrorMessage, uploadMultipartWithRetry } from "../../services/uploadRequest";

const LOOKBOOK_IDS_KEY = "lookbookIds";

const parseStoredLookbookIds = (rawValue: string | null) => {
  if (!rawValue) return [] as string[];
  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed.map((value) => String(value)) : [];
  } catch {
    return [] as string[];
  }
};

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

type DisplayLookbookItem = {
  id: string;
  label: string;
  category?: string | string[];
  image: string | null;
  bg?: string;
  coverSource?: string | null;
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
  const { items, refreshItems } = useWardrobe();
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [savingCover, setSavingCover] = useState(false);
  const [coverImage, setCoverImage] = useState<string>("");
  const [uploadingCover, setUploadingCover] = useState(false);
  const [editingItems, setEditingItems] = useState(false);
  const [draftGarmentIds, setDraftGarmentIds] = useState<string[]>([]);
  const [savingItems, setSavingItems] = useState(false);

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

  const payloadLookbookItems = useMemo<DisplayLookbookItem[]>(() => {
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
        coverSource: garment.imageUrl || null,
      }));
  }, [lookbook]);

  const lookbookItems = useMemo<DisplayLookbookItem[]>(
    () => items
      .filter((item) => garmentIds.includes(item.id))
      .map((item) => ({
        id: item.id,
        label: item.label,
        category: item.category,
        image: item.image || null,
        bg: item.bg,
        coverSource: item.image || null,
      })),
    [garmentIds, items],
  );

  const displayItems = payloadLookbookItems.length > 0 ? payloadLookbookItems : lookbookItems;
  const displayCount = displayItems.length > 0 ? displayItems.length : garmentIds.length;
  const currentGarmentIds = garmentIds.length > 0 ? garmentIds : displayItems.map((item) => item.id);

  const title = lookbook?.name || "Untitled Lookbook";
  const dateLabel = lookbook?.date
    ? new Date(lookbook.date).toLocaleDateString()
    : "No date";

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

  const saveLookbookItems = async () => {
    if (!lookbook?._id || savingItems) return;
    try {
      setSavingItems(true);
      const token = await SecureStore.getItemAsync("userToken");
      if (!token) {
        Alert.alert("Session expired", "Please log in again.");
        return;
      }

      const response = await fetch(buildApiUrl(`/api/outfits/${lookbook._id}`), {
        method: "PUT",
        headers: {
          ...buildAuthHeaders(token),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          garments: draftGarmentIds,
          isLookbook: true,
        }),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        throw new Error(errorPayload?.message || "Unable to update lookbook items.");
      }

      const updatedLookbook = await response.json();
      await refreshItems();
      setEditingItems(false);
      router.setParams({
        lookbookJson: JSON.stringify(updatedLookbook),
      });
    } catch (error: any) {
      Alert.alert("Update failed", error?.message || "Unable to update lookbook items.");
    } finally {
      setSavingItems(false);
    }
  };

  const removeLookbookItem = async (garmentId: string) => {
    if (!lookbook?._id || savingItems) return;

    const nextGarments = currentGarmentIds.filter((id) => id !== garmentId);
    try {
      setSavingItems(true);
      const token = await SecureStore.getItemAsync("userToken");
      if (!token) {
        Alert.alert("Session expired", "Please log in again.");
        return;
      }

      const response = await fetch(buildApiUrl(`/api/outfits/${lookbook._id}`), {
        method: "PUT",
        headers: {
          ...buildAuthHeaders(token),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          garments: nextGarments,
          isLookbook: true,
        }),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        throw new Error(errorPayload?.message || "Unable to remove item from lookbook.");
      }

      const updatedLookbook = await response.json();
      await refreshItems();
      router.setParams({
        lookbookJson: JSON.stringify(updatedLookbook),
      });
    } catch (error: any) {
      Alert.alert("Remove failed", error?.message || "Unable to remove item from lookbook.");
    } finally {
      setSavingItems(false);
    }
  };

  useEffect(() => {
    setCoverImage(lookbook?.previewImage || "");
  }, [lookbook?.previewImage]);

  const saveCoverImage = async (nextCoverImage: string) => {
    if (!lookbook?._id || savingCover) return;

    try {
      setSavingCover(true);
      const token = await SecureStore.getItemAsync("userToken");
      if (!token) {
        Alert.alert("Session expired", "Please log in again.");
        return;
      }

      const response = await fetch(buildApiUrl(`/api/outfits/${lookbook._id}`), {
        method: "PUT",
        headers: {
          ...buildAuthHeaders(token),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ previewImage: nextCoverImage, isLookbook: true }),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        throw new Error(errorPayload?.message || "Unable to update lookbook cover.");
      }

      setCoverImage(nextCoverImage);
      await refreshItems();
      router.setParams({
        lookbookJson: JSON.stringify({ ...lookbook, previewImage: nextCoverImage }),
      });
    } catch (error: any) {
      Alert.alert("Cover update failed", error?.message || "Unable to update lookbook cover.");
    } finally {
      setSavingCover(false);
    }
  };

  const uploadCoverImage = async () => {
    if (!lookbook?._id || uploadingCover) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: IMAGE_UPLOAD_ASPECT.banner,
        quality: IMAGE_UPLOAD_QUALITY.banner,
      });

      if (result.canceled || !result.assets[0]) return;

      const sizeError = validateImageFileSize(result.assets[0].fileSize, "banner");
      if (sizeError) {
        Alert.alert(sizeError.title, sizeError.body);
        return;
      }

      const token = await SecureStore.getItemAsync("userToken");
      if (!token) {
        Alert.alert("Session expired", "Please log in again.");
        return;
      }

      setUploadingCover(true);

      const createCoverFormData = () => {
        const data = new FormData();
        data.append("coverImage", {
          uri: result.assets[0].uri,
          name: `lookbook-cover-${Date.now()}.jpg`,
          type: "image/jpeg",
        } as any);
        return data;
      };

      const uploadToEndpoint = (endpoint: string) => uploadMultipartWithRetry<any>({
        endpoint,
        method: "PUT",
        token,
        formData: createCoverFormData(),
        timeoutMs: 30000,
        retries: 1,
        fallbackMessage: "Unable to upload lookbook cover.",
      });

      let updatedLookbook;
      try {
        updatedLookbook = await uploadToEndpoint(`/api/outfits/${lookbook._id}/cover`);
      } catch (primaryError: any) {
        if (primaryError instanceof UploadRequestError && primaryError.status === 404) {
          updatedLookbook = await uploadToEndpoint(`/api/outfits/${lookbook._id}`);
        } else {
          throw primaryError;
        }
      }

      const nextCover = String(updatedLookbook?.previewImage || "");
      setCoverImage(nextCover);
      await refreshItems();
      router.setParams({
        lookbookJson: JSON.stringify({ ...lookbook, previewImage: nextCover }),
      });
    } catch (error: any) {
      if (error instanceof UploadRequestError && error.status === 404) {
        Alert.alert(
          "Cover upload failed",
          "Cover upload route was not found. Restart the backend server so the latest API routes are loaded, or ensure the app points to the same backend host.",
        );
      } else {
        Alert.alert("Cover upload failed", getUploadErrorMessage(error, "Unable to upload lookbook cover."));
      }
    } finally {
      setUploadingCover(false);
    }
  };

  const saveName = async () => {
    if (!lookbook?._id || saving) return;
    const trimmed = nameValue.trim();
    if (!trimmed) {
      Alert.alert("Missing name", "Please enter a name for this lookbook.");
      return;
    }

    try {
      setSaving(true);
      const token = await SecureStore.getItemAsync("userToken");
      if (!token) {
        Alert.alert("Session expired", "Please log in again.");
        return;
      }

      const response = await fetch(buildApiUrl(`/api/outfits/${lookbook._id}`), {
        method: "PUT",
        headers: {
          ...buildAuthHeaders(token),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: trimmed, isLookbook: true }),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        throw new Error(errorPayload?.message || "Unable to update lookbook name.");
      }

      await refreshItems();
      setEditingName(false);
      router.setParams({
        lookbookJson: JSON.stringify({ ...lookbook, name: trimmed }),
      });
    } catch (error: any) {
      Alert.alert("Save failed", error?.message || "Unable to update lookbook name.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    if (!lookbook?._id || deleting) return;
    Alert.alert("Delete Lookbook", "This lookbook will be permanently removed.", [
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

            const response = await fetch(buildApiUrl(`/api/outfits/${lookbook._id}`), {
              method: "DELETE",
              headers: buildAuthHeaders(token),
            });

            if (!response.ok) {
              const errorPayload = await response.json().catch(() => ({}));
              throw new Error(errorPayload?.message || "Unable to delete lookbook.");
            }

            const existingIds = parseStoredLookbookIds(
              await SecureStore.getItemAsync(LOOKBOOK_IDS_KEY),
            );
            const nextIds = existingIds.filter((id) => id !== String(lookbook._id));
            await SecureStore.setItemAsync(LOOKBOOK_IDS_KEY, JSON.stringify(nextIds));

            await refreshItems();
            router.back();
          } catch (error: any) {
            Alert.alert("Delete failed", error?.message || "Unable to delete lookbook.");
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
            placeholder="Lookbook name"
            placeholderTextColor="#aaa"
            autoFocus
          />
        ) : (
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerOverline}>Lookbook Details</Text>
            <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
          </View>
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
              onPress={openItemsEditor}
            >
              <Ionicons name="shirt-outline" size={18} color="#1a1a1a" />
            </TouchableOpacity>
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
        <Text style={styles.metaText}>Type: Lookbook</Text>
        <Text style={styles.metaText}>Items: {displayCount}</Text>
      </View>

      <View style={styles.metaCard}>
        <Text style={styles.metaText}>Created: {dateLabel}</Text>
      </View>

      <View style={styles.metaCardColumn}>
        <Text style={styles.metaTitle}>Cover Preview</Text>
        {coverImage ? (
          <AuthenticatedImage
            source={{ uri: buildImageUrl(coverImage) }}
            style={styles.coverPreview}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.coverPreview, styles.coverPlaceholder]}>
            <Ionicons name="images-outline" size={30} color="#999" />
            <Text style={styles.coverPlaceholderText}>No custom cover yet</Text>
          </View>
        )}
        <Text style={styles.coverHint}>Tap a lookbook item below to set it as the cover.</Text>
        <TouchableOpacity
          style={[styles.uploadCoverBtn, uploadingCover && { opacity: 0.6 }]}
          onPress={uploadCoverImage}
          disabled={uploadingCover}
        >
          <Ionicons name="cloud-upload-outline" size={16} color="#E91E63" />
          <Text style={styles.uploadCoverBtnText}>{uploadingCover ? "Uploading..." : "Upload cover"}</Text>
        </TouchableOpacity>
        {coverImage ? (
          <TouchableOpacity
            style={[styles.resetCoverBtn, savingCover && { opacity: 0.6 }]}
            disabled={savingCover}
            onPress={() => saveCoverImage("")}
          >
            <Text style={styles.resetCoverBtnText}>{savingCover ? "Updating..." : "Reset to auto cover"}</Text>
          </TouchableOpacity>
        ) : null}
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
              {item.coverSource ? (
                <TouchableOpacity
                  style={[
                    styles.coverSelectBtn,
                    coverImage === item.coverSource && styles.coverSelectBtnActive,
                    savingCover && { opacity: 0.6 },
                  ]}
                  onPress={() => saveCoverImage(item.coverSource || "")}
                  disabled={savingCover}
                >
                  <Text
                    style={[
                      styles.coverSelectBtnText,
                      coverImage === item.coverSource && styles.coverSelectBtnTextActive,
                    ]}
                  >
                    {coverImage === item.coverSource ? "Cover" : "Set Cover"}
                  </Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={[styles.removeItemBtn, savingItems && { opacity: 0.6 }]}
                onPress={() => removeLookbookItem(item.id)}
                disabled={savingItems}
              >
                <Ionicons name="remove-circle-outline" size={20} color="#E91E63" />
              </TouchableOpacity>
            </View>
          )}
        />
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
            <Text style={styles.modalTitle}>Edit Lookbook Items</Text>
            <TouchableOpacity
              style={[styles.modalHeaderBtn, savingItems && { opacity: 0.6 }]}
              onPress={saveLookbookItems}
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
  headerActions: {
    width: 112,
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
  metaCardColumn: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  metaTitle: {
    color: "#444",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
  },
  coverPreview: {
    width: "100%",
    height: 150,
    borderRadius: 12,
    backgroundColor: "#efefef",
  },
  coverPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  coverPlaceholderText: {
    color: "#888",
    fontSize: 12,
    fontWeight: "600",
  },
  coverHint: {
    marginTop: 8,
    color: "#888",
    fontSize: 12,
  },
  uploadCoverBtn: {
    marginTop: 10,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ffd8e6",
  },
  uploadCoverBtnText: {
    color: "#E91E63",
    fontSize: 12,
    fontWeight: "700",
  },
  resetCoverBtn: {
    alignSelf: "flex-start",
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#fff0f5",
    borderWidth: 1,
    borderColor: "#ffd8e6",
  },
  resetCoverBtnText: {
    color: "#E91E63",
    fontSize: 12,
    fontWeight: "700",
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
  coverSelectBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#ffd8e6",
    backgroundColor: "#fff",
  },
  coverSelectBtnActive: {
    backgroundColor: "#E91E63",
    borderColor: "#E91E63",
  },
  coverSelectBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#E91E63",
  },
  coverSelectBtnTextActive: {
    color: "#fff",
  },
  removeItemBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff0f5",
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