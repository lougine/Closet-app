import { Feather, Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { Alert, ScrollView, Share, StatusBar, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AuthenticatedImage from "../../components/AuthenticatedImage";
import {
  IMAGE_UPLOAD_ASPECT,
  IMAGE_UPLOAD_QUALITY,
  validateImageFileSize,
} from "../../constants/imageUpload";
import {
  GARMENT_SUBCATEGORY_TREE,
  GARMENT_STYLE_TAG_OPTIONS,
  GARMENT_STYLE_TAG_SET,
  GARMENT_FABRIC_OPTIONS,
  GARMENT_FABRIC_SET,
} from "../../constants/garmentTaxonomy";
import { getAppTheme } from "../../constants/appTheme";
import { buildApiUrl, buildAuthHeaders, buildImageUrl, fetchApiWithFallback } from "../../constants/api";
import { getUploadErrorMessage, uploadMultipartWithRetry } from "../../services/uploadRequest";
import ARService from "../../services/ARService";
import { removeBackgroundFromImageUri } from "../../services/removeBackground";
import { useAppTheme } from "../../context/themeContext";
import { useWardrobe, type ClothingItem } from "../../context/wardrobeContext";
import OutfitPreviewCollage from "../../components/OutfitPreviewCollage";
import { s } from "../../Styles/wardrobe/item-detail.styles";

const DETAIL_TABS = ["Details", "Styles", "Stats"];
const CATEGORY_OPTIONS = [
  "Tops",
  "Bottoms",
  "Dresses",
  "Outerwear",
  "Footwear",
  "Accessories",
  "Bags",
  "Swimwear",
];

const COLOR_OPTIONS = [
  { label: "Black", hex: "#111111" }, { label: "White", hex: "#FFFFFF" },
  { label: "Grey", hex: "#9E9E9E" }, { label: "Brown", hex: "#795548" },
  { label: "Beige", hex: "#D7C4A3" }, { label: "Red", hex: "#E53935" },
  { label: "Pink", hex: "#F48FB1" }, { label: "Purple", hex: "#9C27B0" },
  { label: "Blue", hex: "#1E88E5" }, { label: "Navy", hex: "#1A237E" },
  { label: "Green", hex: "#43A047" }, { label: "Yellow", hex: "#FDD835" },
  { label: "Orange", hex: "#FB8C00" }, { label: "Gold", hex: "#FFD700" },
  { label: "Mint", hex: "#80CBC4" }, { label: "Cream", hex: "#FFF8E1" },
];

const COLOR_HEX_BY_LABEL = COLOR_OPTIONS.reduce<Record<string, string>>((acc, option) => {
  acc[option.label] = option.hex;
  return acc;
}, {});

const resolveColorHex = (value: string) => COLOR_HEX_BY_LABEL[value] || value;

type ItemOutfitSummary = {
  _id: string;
  name?: string;
  date?: string;
  garmentIds?: string[];
  garments?: { _id?: string; imageUrl?: string | null }[];
  previewImage?: string;
  isLookbook?: boolean;
};

const toIdString = (value: unknown): string => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null && "_id" in value) {
    return String((value as { _id?: unknown })._id ?? "");
  }
  return String(value);
};

const normalizeItemOutfit = (raw: any): ItemOutfitSummary => {
  const garments = Array.isArray(raw?.garments) ? raw.garments : [];
  const garmentIds = Array.isArray(raw?.garmentIds)
    ? raw.garmentIds.map((value: unknown) => toIdString(value)).filter(Boolean)
    : garments.map((garment: any) => toIdString(garment)).filter(Boolean);

  return {
    _id: toIdString(raw?._id),
    name: raw?.name,
    date: raw?.date,
    garmentIds,
    garments,
    previewImage: raw?.previewImage,
    isLookbook: Boolean(raw?.isLookbook),
  };
};

const outfitIncludesItem = (outfit: ItemOutfitSummary, itemId: string) => {
  const normalizedItemId = String(itemId);
  const byIds = Array.isArray(outfit.garmentIds)
    ? outfit.garmentIds.some((id) => String(id) === normalizedItemId)
    : false;

  if (byIds) return true;

  return Array.isArray(outfit.garments)
    ? outfit.garments.some((garment) => toIdString(garment?._id) === normalizedItemId)
    : false;
};

const getUploadImageMeta = (uri: string) => {
  const cleaned = uri.split("?")[0]?.toLowerCase() ?? "";
  const ext = cleaned.split(".").pop();

  if (ext === "png") {
    return { extension: "png", mimeType: "image/png" };
  }
  if (ext === "webp") {
    return { extension: "webp", mimeType: "image/webp" };
  }

  return { extension: "jpg", mimeType: "image/jpeg" };
};

export default function ItemDetailScreen() {
  const router = useRouter();
  const { isDarkMode } = useAppTheme();
  const {
    itemJson,
    searchedImageUri,
    searchedImageAt,
  } = useLocalSearchParams<{
    itemJson: string;
    searchedImageUri?: string;
    searchedImageAt?: string;
  }>();
  const { updateItem, refreshItems } = useWardrobe();

  const initialItem: ClothingItem = itemJson
    ? JSON.parse(itemJson)
    : { id: "0", label: "Item", bg: "#fce4ec", category: [], colors: [], tags: [], timesWorn: 0, totalCost: 0 };

  const [item, setItem] = useState<ClothingItem>(initialItem);
  const [activeTab, setActiveTab] = useState("Details");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [editingSize, setEditingSize] = useState(false);
  const [editingBrand, setEditingBrand] = useState(false);
  const [editingPrice, setEditingPrice] = useState(false);
  const [sizeVal, setSizeVal] = useState(item.size ?? "");
  const [brandVal, setBrandVal] = useState(item.brand ?? "");
  const [priceVal, setPriceVal] = useState(
    item.totalCost !== undefined && item.totalCost !== null ? String(item.totalCost) : ""
  );
  const [uploadingImage, setUploadingImage] = useState(false);
  const [removingBackground, setRemovingBackground] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);
  const [savingColor, setSavingColor] = useState(false);
  const [deletingItem, setDeletingItem] = useState(false);
  const [markingWorn, setMarkingWorn] = useState(false);
  const [relatedOutfits, setRelatedOutfits] = useState<ItemOutfitSummary[]>([]);
  const [loadingRelatedOutfits, setLoadingRelatedOutfits] = useState(false);
  const [appliedSearchedImageMarker, setAppliedSearchedImageMarker] = useState<string | null>(null);

  const buildSaveSignature = useCallback((source: ClothingItem) => {
    const styleTags = Array.from(
      new Set(
        (source.tags ?? [])
          .map((tag) => String(tag || "").trim().toLowerCase())
          .filter((tag) => GARMENT_STYLE_TAG_SET.has(tag)),
      ),
    ).sort();

    return JSON.stringify({
      category: source.category?.[0] ?? null,
      subcategory: source.subcategory ?? null,
      size: source.size?.trim() || null,
      brand: source.brand?.trim() || null,
      purchasePrice: typeof source.totalCost === "number" ? source.totalCost : null,
      fabric: source.fabric?.trim() || null,
      styleTags,
    });
  }, []);

  const [savedSignature, setSavedSignature] = useState<string>(() => buildSaveSignature(initialItem));
  const currentSignature = useMemo(() => buildSaveSignature(item), [buildSaveSignature, item]);
  const hasPendingChanges = currentSignature !== savedSignature;

  const fetchRelatedOutfits = async () => {
    try {
      setLoadingRelatedOutfits(true);
      const token = await SecureStore.getItemAsync("userToken");
      if (!token) {
        setRelatedOutfits([]);
        return;
      }

      const response = await fetchApiWithFallback("/api/outfits", {
        headers: buildAuthHeaders(token),
      }, { timeoutMs: 12000, retries: 1 });

      if (!response.ok) {
        setRelatedOutfits([]);
        return;
      }

      const payload = await response.json();
      const normalized = Array.isArray(payload)
        ? payload.map((entry: any) => normalizeItemOutfit(entry))
        : [];

      setRelatedOutfits(normalized.filter((outfit) => outfitIncludesItem(outfit, item.id)));
    } catch {
      setRelatedOutfits([]);
    } finally {
      setLoadingRelatedOutfits(false);
    }
  };

  const fetchTimesWorn = async () => {
    try {
      const token = await SecureStore.getItemAsync("userToken");
      if (!token) return;

      const response = await fetch(
        buildApiUrl(`/api/usage/history?garmentId=${item.id}&page=1&limit=1`),
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) return;

      const payload = await response.json();
      const totalWears = Number(payload?.pagination?.total) || 0;
      const nextItem = { ...item, timesWorn: totalWears };
      setItem(nextItem);
      updateItem(nextItem);
    } catch {
      // Keep UI functional if usage stats cannot be fetched.
    }
  };

  useEffect(() => {
    fetchTimesWorn();
  }, [item.id]);

  useEffect(() => {
    fetchRelatedOutfits();
  }, [item.id]);

  const update = (changes: Partial<ClothingItem>) =>
    setItem((prev) => ({ ...prev, ...changes }));

  const selectedCategory = item.category?.[0] ?? "";
  const selectedSubcategory = item.subcategory ?? "";
  const selectedCategorySubcategories = selectedCategory ? (GARMENT_SUBCATEGORY_TREE[selectedCategory] ?? []) : [];
  const selectedStyleTags = (item.tags ?? []).filter((tag) => GARMENT_STYLE_TAG_SET.has(tag.toLowerCase()));

  const setCategory = (category: string) => {
    update({
      category: [category],
      subcategory: undefined,
    });
    setShowCategoryPicker(false);
  };

  const toggleSubcategory = (subcategory: string) => {
    const nextSubcategory = selectedSubcategory === subcategory ? undefined : subcategory;
    update({ subcategory: nextSubcategory });
  };

  const toggleStyleTag = (tag: string) => {
    const normalizedTag = tag.toLowerCase();
    const currentTags = item.tags ?? [];

    const nextTags = currentTags.some((existing) => existing.toLowerCase() === normalizedTag)
      ? currentTags.filter((existing) => existing.toLowerCase() !== normalizedTag)
      : [...currentTags, normalizedTag];

    update({ tags: nextTags });
  };

  const sanitizePriceInput = (value: string) => {
    const cleaned = value.replace(/[^0-9.]/g, "");
    const [whole = "", ...fractionParts] = cleaned.split(".");
    const fraction = fractionParts.join("");
    return fractionParts.length > 0 ? `${whole}.${fraction}` : whole;
  };

  const persistColor = async (nextColor: string | undefined) => {
    const token = await SecureStore.getItemAsync("userToken");
    if (!token) {
      throw new Error("Session expired. Please log in again.");
    }

    const response = await fetchApiWithFallback(`/api/garments/${item.id}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ color: nextColor ?? null }),
    }, { timeoutMs: 12000, retries: 1 });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: "Unable to update color." }));
      throw new Error(errorData.message || "Unable to update color.");
    }
  };

  const toggleColor = async (colorLabel: string) => {
    const currentColors = item.colors ?? [];
    const nextColors = currentColors.includes(colorLabel) ? [] : [colorLabel];
    const previousColors = currentColors;

    const updatedItem = { ...item, colors: nextColors };
    setItem(updatedItem);
    updateItem(updatedItem);

    try {
      setSavingColor(true);
      await persistColor(nextColors[0]);
    } catch (error: any) {
      const revertedItem = { ...item, colors: previousColors };
      setItem(revertedItem);
      updateItem(revertedItem);
      Alert.alert("Color update failed", getUploadErrorMessage(error, "Unable to update color."));
    } finally {
      setSavingColor(false);
    }
  };

  const persistItemDetails = async () => {
    const token = await SecureStore.getItemAsync("userToken");
    if (!token) {
      throw new Error("Session expired. Please log in again.");
    }

    const response = await fetchApiWithFallback(`/api/garments/${item.id}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: item.label,
        category: item.category?.[0] ?? null,
        size: item.size ?? null,
        brand: item.brand ?? null,
        purchasePrice: typeof item.totalCost === "number" ? item.totalCost : null,
        color: item.colors?.[0] ?? null,
        fabric: item.fabric ?? null,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: "Unable to save item changes." }));
      throw new Error(errorData.message || "Unable to save item changes.");
    }

    const garment = await response.json();
    const updatedItem = {
      ...item,
      label: garment.name ?? item.label,
      category: garment.category ? [garment.category] : (item.category ?? []),
      subcategory: garment.subcategory ?? item.subcategory,
      fabric: garment.fabric ?? item.fabric,
      size: garment.size ?? undefined,
      brand: garment.brand ?? undefined,
      tags: Array.isArray(garment.tags) ? garment.tags : (item.tags ?? []),
      colors: garment.color ? [garment.color] : [],
      totalCost: Number(garment.purchasePrice ?? item.totalCost ?? 0),
    };

    setItem(updatedItem);
    updateItem(updatedItem);
  };

  const persistSubcategory = async () => {
    const token = await SecureStore.getItemAsync("userToken");
    if (!token) {
      throw new Error("Session expired. Please log in again.");
    }

    const response = await fetchApiWithFallback(`/api/garments/${item.id}/subcategory`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ subcategory: item.subcategory ?? null }),
    }, { timeoutMs: 12000, retries: 1 });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: "Unable to update subcategory." }));
      throw new Error(errorData.message || "Unable to update subcategory.");
    }
  };

  const persistTags = async () => {
    const token = await SecureStore.getItemAsync("userToken");
    if (!token) {
      throw new Error("Session expired. Please log in again.");
    }

    const sanitizedTags = Array.from(
      new Set(
        (item.tags ?? [])
          .map((tag) => tag.trim().toLowerCase())
          .filter((tag) => GARMENT_STYLE_TAG_SET.has(tag)),
      ),
    );

    const response = await fetchApiWithFallback(`/api/garments/${item.id}/tags`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ tags: sanitizedTags }),
    }, { timeoutMs: 12000, retries: 1 });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: "Unable to update tags." }));
      throw new Error(errorData.message || "Unable to update tags.");
    }
  };

  const saveItemDetails = async () => {
    if (savingDetails || !hasPendingChanges) return;
    try {
      setSavingDetails(true);
      await persistItemDetails();
      await Promise.all([persistSubcategory(), persistTags()]);
      await refreshItems();
      setSavedSignature(currentSignature);
      router.replace("/(tabs)" as any);
    } catch (error: any) {
      Alert.alert("Save failed", getUploadErrorMessage(error, "Unable to save item changes."));
    } finally {
      setSavingDetails(false);
    }
  };

  const deleteItem = async () => {
    if (deletingItem) return;
    try {
      const token = await SecureStore.getItemAsync("userToken");
      if (!token) {
        Alert.alert("Session expired", "Please log in again.");
        return;
      }

      setDeletingItem(true);
      const response = await fetchApiWithFallback(`/api/garments/${item.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }, { timeoutMs: 12000, retries: 1 });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Unable to delete item." }));
        throw new Error(errorData.message || "Unable to delete item.");
      }

      await refreshItems();
      Alert.alert("Deleted", "Item removed from your wardrobe.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert("Delete failed", getUploadErrorMessage(error, "Unable to delete item."));
    } finally {
      setDeletingItem(false);
    }
  };

  const markWorn = async () => {
    try {
      const token = await SecureStore.getItemAsync("userToken");
      if (!token) {
        Alert.alert("Session expired", "Please log in again.");
        return;
      }

      setMarkingWorn(true);

      const response = await fetchApiWithFallback('/api/usage/log', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ garmentId: item.id }),
      }, { timeoutMs: 12000, retries: 1 });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unable to log wear event' }));
        throw new Error(errorData.message || 'Unable to log wear event');
      }

      const updatedItem = { ...item, timesWorn: (item.timesWorn ?? 0) + 1 };
      setItem(updatedItem);
      updateItem(updatedItem);
      await fetchTimesWorn();
    } catch (error: any) {
      Alert.alert('Could not mark as worn', error.message || 'Please try again.');
    } finally {
      setMarkingWorn(false);
    }
  };

  const replaceItemPhotoWithUri = useCallback(async (localUri: string) => {
    update({ image: localUri });

    try {
      const token = await SecureStore.getItemAsync("userToken");
      if (!token) {
        Alert.alert("Session expired", "Please log in again.");
        return;
      }

      setUploadingImage(true);

      const formData = new FormData();
      const imageMeta = getUploadImageMeta(localUri);
      formData.append("image", {
        uri: localUri,
        name: `item-${Date.now()}.${imageMeta.extension}`,
        type: imageMeta.mimeType,
      } as any);

      const updatedGarment = await uploadMultipartWithRetry<any>({
        endpoint: `/api/garments/${item.id}`,
        method: 'PUT',
        token,
        formData,
        timeoutMs: 25000,
        retries: 1,
        fallbackMessage: 'Unable to update image.',
      });
      const remoteImage = updatedGarment.imageUrl ? buildImageUrl(updatedGarment.imageUrl) : null;
      const updatedItem = { ...item, image: remoteImage };

      setItem(updatedItem);
      updateItem(updatedItem);
    } catch (error: any) {
      Alert.alert("Upload failed", getUploadErrorMessage(error, "Unable to update image."));
    } finally {
      setUploadingImage(false);
    }
  }, [item, updateItem]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: IMAGE_UPLOAD_ASPECT.garment,
      quality: IMAGE_UPLOAD_QUALITY.itemDetail,
    });
    if (result.canceled || !result.assets[0]) return;

    const sizeError = validateImageFileSize(result.assets[0].fileSize, "itemDetail");
    if (sizeError) {
      Alert.alert(sizeError.title, sizeError.body);
      return;
    }

    await replaceItemPhotoWithUri(result.assets[0].uri);
  };

  const openWebSearchForImage = () => {
    router.push({
      pathname: "/wardrobe/search-garment-image" as any,
      params: {
        mode: "existing",
        itemJson: JSON.stringify(item),
      },
    });
  };

  useEffect(() => {
    if (!searchedImageUri) return;

    const marker = searchedImageAt || searchedImageUri;
    if (appliedSearchedImageMarker === marker) return;

    setAppliedSearchedImageMarker(marker);
    void replaceItemPhotoWithUri(searchedImageUri);
  }, [searchedImageUri, searchedImageAt, appliedSearchedImageMarker, replaceItemPhotoWithUri]);

  const redoBackgroundRemoval = async () => {
    if (uploadingImage) return;
    if (!item.image) {
      Alert.alert("No image", "This item does not have an image yet.");
      return;
    }

    try {
      const token = await SecureStore.getItemAsync("userToken");
      if (!token) {
        Alert.alert("Session expired", "Please log in again.");
        return;
      }

      setUploadingImage(true);
      setRemovingBackground(true);

      const processedUri = await removeBackgroundFromImageUri(item.image, {
        sourceHeaders: buildAuthHeaders(token),
        filename: `item-${item.id}-removebg.jpg`,
      });

      const formData = new FormData();
      formData.append("image", {
        uri: processedUri,
        name: `item-${Date.now()}-removebg.png`,
        type: "image/png",
      } as any);

      const updatedGarment = await uploadMultipartWithRetry<any>({
        endpoint: `/api/garments/${item.id}`,
        method: "PUT",
        token,
        formData,
        timeoutMs: 25000,
        retries: 1,
        fallbackMessage: "Unable to update image.",
      });

      const remoteImage = updatedGarment.imageUrl ? buildImageUrl(updatedGarment.imageUrl) : null;
      const updatedItem = { ...item, image: remoteImage };
      setItem(updatedItem);
      updateItem(updatedItem);

      Alert.alert("Done", "Background was removed and item photo was replaced.");
    } catch (error: any) {
      Alert.alert("Background removal failed", getUploadErrorMessage(error, "Unable to redo background removal."));
    } finally {
      setRemovingBackground(false);
      setUploadingImage(false);
    }
  };

  const openImageMenu = () => {
    Alert.alert("Image Options", "Choose an action", [
      { text: "Cancel", style: "cancel" },
      { text: "Redo Background Removal", onPress: redoBackgroundRemoval },
      { text: "Replace Item Photo", onPress: pickImage },
      { text: "Search Web Photo", onPress: openWebSearchForImage },
    ]);
  };

  const cpw = (item.timesWorn ?? 0) > 0
    ? ((item.totalCost ?? 0) / item.timesWorn!).toFixed(2)
    : (item.totalCost ?? 0).toFixed(2);
  const arAvailability = ARService.getAvailability();

  const baseTheme = getAppTheme(isDarkMode, {
    light: {
      screen: "#FFFFFF",
      softCard: "#f0eeea",
      border: "#f0f0f0",
    },
  });
  const theme = { ...baseTheme, panel: baseTheme.card, softPanel: baseTheme.softCard };

  return (
    <SafeAreaView style={[s.root, { backgroundColor: theme.screen }]} edges={["left", "right"]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />

      <ScrollView
        style={[s.scroll, { backgroundColor: theme.screen }]}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.topBar}>
          <TouchableOpacity style={s.topBtn} onPress={() => router.back()}>
            <Ionicons name="close" size={20} color={theme.text} />
          </TouchableOpacity>
          <View style={s.topSpacer} />
          <TouchableOpacity style={s.topBtn} onPress={() => Share.share({ message: `Check out my ${item.label || "item"}!` })}>
            <Ionicons name="share-outline" size={20} color={theme.text} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={[s.imageWrap, { backgroundColor: theme.softPanel }]} activeOpacity={1}>
          {item.image ? (
            <AuthenticatedImage source={{ uri: item.image }} style={s.image} resizeMode="contain" />
          ) : (
            <View style={s.imagePlaceholder}>
              <Ionicons name="image-outline" size={64} color={theme.subText} />
            </View>
          )}
          <View style={s.cpwPill}>
            <Text style={s.cpwText}>cost/wear ${cpw}</Text>
          </View>
          {uploadingImage ? (
            <View style={[s.cpwPill, s.processingPill]}>
              <Text style={s.cpwText}>{removingBackground ? "Removing background..." : "Uploading image..."}</Text>
            </View>
          ) : null}
          <View style={s.imageActions}>
            <TouchableOpacity onPress={() => Alert.alert("Delete Item", "Remove this item from your wardrobe?", [
              { text: "Cancel", style: "cancel" },
              { text: "Delete", style: "destructive", onPress: deleteItem },
            ])}>
              <Ionicons name="trash-outline" size={22} color={theme.subText} />
            </TouchableOpacity>
            <TouchableOpacity onPress={openImageMenu}>
              <Ionicons name="ellipsis-horizontal" size={22} color={theme.subText} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        <View style={[s.tabNav, { borderBottomColor: theme.border }]}>
          {DETAIL_TABS.map((tab) => (
            <TouchableOpacity key={tab} style={s.tabBtn} onPress={() => setActiveTab(tab)}>
              <Text
                style={[
                  s.tabBtnText,
                  { color: theme.subText },
                  activeTab === tab && s.tabBtnTextActive,
                  activeTab === tab && { color: theme.text },
                ]}
              >
                {tab}
              </Text>
              {activeTab === tab && <View style={[s.tabUnderline, { backgroundColor: theme.text }]} />}
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === "Details" && (
          <View>
            <View style={s.row}>
              <Text style={[s.rowLabel, { color: theme.text }]}>Category</Text>
              <TouchableOpacity style={[s.categoryPill, { backgroundColor: theme.inputBg, borderColor: theme.border }]} onPress={() => setShowCategoryPicker((v) => !v)}>
                <Text style={[s.categoryText, { color: theme.text }] }>
                  {selectedCategory
                    ? `${selectedCategory}${selectedSubcategory ? ` > ${selectedSubcategory}` : ""}`
                    : "UNCATEGORIZED"}
                </Text>
              </TouchableOpacity>
            </View>
            {showCategoryPicker && (
              <View style={s.colorPicker}>
                {CATEGORY_OPTIONS.map((category) => {
                  const selected = item.category?.[0] === category;
                  return (
                    <TouchableOpacity
                      key={category}
                      style={[
                        s.addBtn,
                        selected && s.addBtnActive,
                      ]}
                      onPress={() => setCategory(category)}
                    >
                      <Text style={[s.addBtnText, selected && s.addBtnTextActive]}>{category}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
            <View style={s.row}>
              <Text style={[s.rowLabel, { color: theme.text }]}>Subcategory</Text>
              <Text style={[s.categoryText, { color: theme.subText }]}>Pick one</Text>
            </View>
            <View style={s.colorPicker}>
              {selectedCategorySubcategories.map((subcategory) => {
                const selected = selectedSubcategory.toLowerCase() === subcategory.toLowerCase();
                return (
                  <TouchableOpacity
                    key={subcategory}
                    style={[
                      s.addBtn,
                      selected && s.addBtnActive,
                    ]}
                    onPress={() => toggleSubcategory(subcategory)}
                  >
                    <Text style={[s.addBtnText, selected && s.addBtnTextActive]}>{subcategory}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {!selectedCategory ? (
              <View style={s.row}>
                <Text style={[s.categoryText, { color: theme.subText }]}>Select a category first to pick subcategory chips.</Text>
              </View>
            ) : null}
            <View style={[s.divider, { backgroundColor: theme.border }]} />

            <View>
              <View style={s.rowBetween}>
                <Text style={[s.rowLabel, { color: theme.text }]}>Colors</Text>
                <TouchableOpacity onPress={() => setShowColorPicker((v) => !v)}>
                  <Feather name="edit-2" size={15} color={theme.subText} />
                </TouchableOpacity>
              </View>
              <View style={s.swatches}>
                {(item.colors ?? []).map((c, i) => (
                  <View key={i} style={[s.swatch, { backgroundColor: resolveColorHex(c) }, resolveColorHex(c) === "#FFFFFF" && s.swatchBorder]} />
                ))}
              </View>
              {savingColor ? <Text style={[s.colorSavingText, { color: theme.subText }]}>Saving color...</Text> : null}
              {showColorPicker && (
                <View style={s.colorPicker}>
                  {COLOR_OPTIONS.map(({ label, hex }) => (
                    <TouchableOpacity key={label} onPress={() => toggleColor(label)}>
                      <View style={[s.swatch, { backgroundColor: hex }, hex === "#FFFFFF" && s.swatchBorder,
                        (item.colors ?? []).includes(label) && s.swatchSelected]} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
            <View style={[s.divider, { backgroundColor: theme.border }]} />

            <View style={s.row}>
              <Text style={[s.rowLabel, { color: theme.text }]}>Size</Text>
              {editingSize ? (
                <View style={s.inlineRow}>
                  <TextInput autoFocus style={[s.inlineInput, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]} value={sizeVal} onChangeText={setSizeVal}
                    placeholder="XS, S, M…" placeholderTextColor={theme.subText} />
                  <TouchableOpacity style={s.inlineSave} onPress={() => { update({ size: sizeVal }); setEditingSize(false); }}>
                    <Text style={s.inlineSaveText}>Save</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={s.addBtn} onPress={() => setEditingSize(true)}>
                  <Text style={s.addBtnText}>{item.size || "ADD"}</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={[s.divider, { backgroundColor: theme.border }]} />

            <View style={s.row}>
              <Text style={[s.rowLabel, { color: theme.text }]}>Brand</Text>
              {editingBrand ? (
                <View style={s.inlineRow}>
                  <TextInput autoFocus style={[s.inlineInput, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]} value={brandVal} onChangeText={setBrandVal}
                    placeholder="e.g. Zara" placeholderTextColor={theme.subText} />
                  <TouchableOpacity style={s.inlineSave} onPress={() => { update({ brand: brandVal }); setEditingBrand(false); }}>
                    <Text style={s.inlineSaveText}>Save</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={s.addBtn} onPress={() => setEditingBrand(true)}>
                  <Text style={s.addBtnText}>{item.brand || "ADD"}</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={[s.divider, { backgroundColor: theme.border }]} />

            <View style={s.row}>
              <Text style={[s.rowLabel, { color: theme.text }]}>Price</Text>
              {editingPrice ? (
                <View style={s.inlineRow}>
                  <TextInput
                    autoFocus
                    style={[s.inlineInput, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]}
                    value={priceVal}
                    onChangeText={(val) => setPriceVal(sanitizePriceInput(val))}
                    placeholder="0.00"
                    placeholderTextColor={theme.subText}
                    keyboardType="decimal-pad"
                  />
                  <TouchableOpacity
                    style={s.inlineSave}
                    onPress={() => {
                      const cleaned = sanitizePriceInput(priceVal).trim();
                      if (!cleaned) {
                        update({ totalCost: 0 });
                        setPriceVal("");
                        setEditingPrice(false);
                        return;
                      }

                      const parsed = Number(cleaned);
                      if (!Number.isFinite(parsed) || parsed < 0) {
                        Alert.alert("Invalid price", "Please enter a valid non-negative amount.");
                        return;
                      }

                      const rounded = Math.round(parsed * 100) / 100;
                      update({ totalCost: rounded });
                      setPriceVal(String(rounded));
                      setEditingPrice(false);
                    }}
                  >
                    <Text style={s.inlineSaveText}>Save</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={s.addBtn} onPress={() => setEditingPrice(true)}>
                  <Text style={s.addBtnText}>
                    {item.totalCost !== undefined && item.totalCost !== null
                      ? `$${Number(item.totalCost).toFixed(2)}`
                      : "ADD"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={[s.divider, { backgroundColor: theme.border }]} />

            <View>
              <View style={s.rowBetween}>
                <Text style={[s.rowLabel, { color: theme.text }]}>Fabric</Text>
              </View>
              <View style={s.tagsWrap}>
                {GARMENT_FABRIC_OPTIONS.map((fabric) => {
                  const selected = item.fabric?.toLowerCase() === fabric.toLowerCase();
                  return (
                    <TouchableOpacity
                      key={fabric}
                      style={[
                        s.addBtn,
                        selected && s.addBtnActive,
                      ]}
                      onPress={() => update({ fabric: selected ? undefined : fabric })}
                    >
                      <Text style={[s.addBtnText, selected && s.addBtnTextActive]}>{fabric}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
            <View style={[s.divider, { backgroundColor: theme.border }]} />

            <View>
              <View style={s.rowBetween}>
                <Text style={[s.rowLabel, { color: theme.text }]}>Style Tags</Text>
              </View>
              <View style={s.tagsWrap}>
                {GARMENT_STYLE_TAG_OPTIONS.map((tag) => {
                  const selected = selectedStyleTags.some((existing) => existing.toLowerCase() === tag);
                  return (
                    <TouchableOpacity
                      key={tag}
                      style={[
                        s.addBtn,
                        selected && s.addBtnActive,
                      ]}
                      onPress={() => toggleStyleTag(tag)}
                    >
                      <Text style={[s.addBtnText, selected && s.addBtnTextActive]}>{tag}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
            <View style={[s.divider, { backgroundColor: theme.border }]} />

            <View style={s.detailsActions}>
              <TouchableOpacity
                style={[
                  s.pinkBtn,
                  s.pinkBtnDetails,
                  !arAvailability.available && s.disabledBtn,
                ]}
                disabled={!arAvailability.available}
                onPress={() => {
                  const availability = ARService.getAvailability();
                  if (!availability.available) {
                    Alert.alert("AR Try-On Unavailable", availability.reason ?? "This build does not include AR support.");
                    return;
                  }

                  const category = item.category?.[0] ?? 'Tops';
                  const isBottom = category === 'Bottoms';
                  ARService.openWithProduct({
                    arCategory: item.subcategory ?? category,
                    fabricType: item.fabric ?? 'Cotton',
                    primaryColor: resolveColorHex(item.colors?.[0] ?? '#FFFFFF'),
                    slot: isBottom ? 'LowerBody' : 'UpperBody',
                  });
                }}
              >
                <Text style={s.pinkBtnText}>{arAvailability.available ? "Try On" : "Try On (Unavailable)"}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  s.pinkBtn,
                  s.pinkBtnDetails,
                  (!hasPendingChanges || savingDetails || deletingItem) && s.disabledBtn,
                ]}
                onPress={saveItemDetails}
                disabled={!hasPendingChanges || savingDetails || deletingItem}
              >
                <Text style={s.pinkBtnText}>
                  {savingDetails ? "Saving..." : hasPendingChanges ? "Save Item Changes" : "No Changes to Save"}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={[s.divider, { backgroundColor: theme.border }]} />
          </View>
        )}

        {activeTab === "Styles" && (
          loadingRelatedOutfits ? (
            <View style={s.emptyState}>
              <Text style={[s.emptyTitle, { color: theme.text }]}>Loading outfits...</Text>
              <Text style={[s.emptySubtitle, { color: theme.subText }]}>Fetching styles that include this item</Text>
            </View>
          ) : relatedOutfits.length === 0 ? (
            <View style={s.emptyState}>
              <Text style={[s.emptyTitle, { color: theme.text }]}>No outfits yet</Text>
              <Text style={[s.emptySubtitle, { color: theme.subText }]}>Add this piece to an outfit to see it here</Text>
              <TouchableOpacity style={s.pinkBtn} onPress={() => router.push("/wardrobe/outfit" as any)}>
                <Text style={s.pinkBtnText}>+ Create Outfit</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s.stylesList}>
              {relatedOutfits.map((outfit) => {
                const count = Array.isArray(outfit.garmentIds) ? outfit.garmentIds.length : 0;
                const dateLabel = outfit.date ? new Date(outfit.date).toLocaleDateString() : "No date";

                return (
                  <TouchableOpacity
                    key={outfit._id}
                    style={[s.styleCard, { backgroundColor: theme.panel, borderColor: theme.border }]}
                    onPress={() =>
                      router.push({
                        pathname: "/wardrobe/outfit-detail" as any,
                        params: { outfitJson: JSON.stringify(outfit) },
                      })
                    }
                  >
                    <OutfitPreviewCollage outfit={outfit} style={s.stylePreview} />
                    <View style={s.styleMeta}>
                      <Text style={[s.styleName, { color: theme.text }]} numberOfLines={1}>
                        {outfit.name || "Untitled Outfit"}
                      </Text>
                      <Text style={[s.styleSubtext, { color: theme.subText }]}>{count} items</Text>
                      <Text style={[s.styleSubtext, { color: theme.subText }]}>{dateLabel}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )
        )}

        {activeTab === "Stats" && (
          <View style={s.statsSection}>
            <View style={s.statsGrid}>
              <View style={[s.statCard, { backgroundColor: theme.panel, borderColor: theme.border }]}>
                <Text style={[s.statVal, { color: theme.text }]}>${cpw}</Text>
                <Text style={[s.statLbl, { color: theme.subText }]}>Cost / Wear</Text>
              </View>
              <View style={[s.statCard, { backgroundColor: theme.panel, borderColor: theme.border }]}>
                <Text style={[s.statVal, { color: theme.text }]}>{item.timesWorn ?? 0}</Text>
                <Text style={[s.statLbl, { color: theme.subText }]}>Times Worn</Text>
              </View>
              <View style={[s.statCard, { backgroundColor: theme.panel, borderColor: theme.border }]}>
                <Text style={[s.statVal, { color: theme.text }]}>${item.totalCost ?? 0}</Text>
                <Text style={[s.statLbl, { color: theme.subText }]}>Total Cost</Text>
              </View>
              <View style={[s.statCard, { backgroundColor: theme.panel, borderColor: theme.border }]}>
                <Text style={[s.statVal, { color: theme.text }]}>{item.dateAdded ?? "—"}</Text>
                <Text style={[s.statLbl, { color: theme.subText }]}>Date Added</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[s.pinkBtn, s.pinkBtnSpaced, markingWorn && s.disabledOpacity]}
              onPress={markWorn}
              disabled={markingWorn}
            >
              <Text style={s.pinkBtnText}>{markingWorn ? 'Saving...' : '+ Mark as Worn Today'}</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={s.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}
