import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system/legacy";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, Alert, Image, KeyboardAvoidingView,
  Platform, ScrollView, StatusBar, Text, TextInput, TouchableOpacity, View, Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as SecureStore from "expo-secure-store";
import {
  IMAGE_UPLOAD_ASPECT,
  IMAGE_UPLOAD_QUALITY,
  validateImageFileSize,
} from "../../constants/imageUpload";
import { getAppTheme } from "../../constants/appTheme";
import { buildApiUrl, buildImageUrl } from "../../constants/api";
import { getUploadErrorMessage, UploadRequestError, uploadMultipartWithRetry } from "../../services/uploadRequest";
import { removeBackgroundFromImageUri } from "../../services/removeBackground";
import { useAppTheme } from "../../context/themeContext";
import { useWardrobe } from "../../context/wardrobeContext";
import { s } from "../../Styles/wardrobe/add-items.styles";

const CATEGORIES = [
  "Tops", "Bottoms", "Dresses", "Outerwear",
  "Footwear", "Accessories", "Bags", "Swimwear",
];

const CATEGORY_TREE: Record<string, string[]> = {
  Tops: ["T-Shirt", "Blouse", "Crop Top", "Tank Top", "Shirt", "Hoodie", "Sweater", "Cardigan"],
  Bottoms: ["Jeans", "Skirt", "Shorts", "Trousers", "Leggings", "Cargo Pants", "Sweatpants"],
  Dresses: ["Mini Dress", "Bodycon"],
  Outerwear: ["Jacket", "Blazer", "Coat", "Trench Coat", "Puffer", "Leather Jacket", "Denim Jacket", "Vest"],
  Footwear: ["Sneakers", "Heels", "Boots", "Sandals", "Platforms"],
  Accessories: ["Bag", "Belt", "Hat", "Sunglasses", "Jewellery", "Scarf", "Watch"],
  Bags: ["Handbag", "Tote", "Clutch", "Backpack", "Mini Bag", "Shoulder Bag"],
  Swimwear: ["One-Piece", "Coverup", "Swim Shorts"],
};

const ALL_SUBCATEGORY_TAGS = new Set(
  Object.values(CATEGORY_TREE).flat().map((subcategory) => subcategory.toLowerCase()),
);

const COLOR_OPTIONS = [
  { label: "Black", hex: "#111111" }, { label: "White", hex: "#FFFFFF" },
  { label: "Grey", hex: "#9E9E9E" },  { label: "Brown", hex: "#795548" },
  { label: "Beige", hex: "#D7C4A3" }, { label: "Red", hex: "#E53935" },
  { label: "Pink", hex: "#F48FB1" },  { label: "Purple", hex: "#9C27B0" },
  { label: "Blue", hex: "#1E88E5" },  { label: "Navy", hex: "#1A237E" },
  { label: "Green", hex: "#43A047" }, { label: "Yellow", hex: "#FDD835" },
  { label: "Orange", hex: "#FB8C00" },{ label: "Gold", hex: "#FFD700" },
  { label: "Mint", hex: "#80CBC4" },  { label: "Cream", hex: "#FFF8E1" },
];

const CATEGORY_BG: Record<string, string> = {
  Tops: "#fce4ec", Bottoms: "#f3e5f5", Dresses: "#fce4ec",
  Outerwear: "#f5f5f5", Footwear: "#fff8e1", Accessories: "#e8f5e9",
  Bags: "#faf6f0", Swimwear: "#e3f2fd",
};

interface ItemForm {
  category: string; colors: string[]; brand: string;
  size: string; tags: string[]; cost: string; datePurchased: string;
}

interface QueuedImage {
  id: string;
  uri: string;
  fileSize?: number | null;
}

const createInitialForm = (): ItemForm => ({
  category: "",
  colors: [],
  brand: "",
  size: "",
  tags: [],
  cost: "",
  datePurchased: "",
});

const TILE_WIDTH = Dimensions.get("window").width - 32;

const getAutoItemName = (category: string) => {
  const base = category?.trim() || "Item";
  const stamp = new Date().toISOString().slice(0, 10);
  return `${base} ${stamp}`;
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

const optimizeImageForUpload = async (
  uri: string,
  options?: { width?: number; compress?: number },
) => {
  const width = options?.width ?? 1280;
  const compress = options?.compress ?? 0.68;
  const cleanedUri = uri.split("?")[0]?.toLowerCase() ?? "";
  const extension = cleanedUri.split(".").pop();
  const preserveTransparency = extension === "png" || extension === "webp";

  const optimized = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width } }],
    {
      compress,
      format: preserveTransparency
        ? ImageManipulator.SaveFormat.PNG
        : ImageManipulator.SaveFormat.JPEG,
    },
  );

  const info = await FileSystem.getInfoAsync(optimized.uri);
  return {
    uri: optimized.uri,
    fileSize: info.exists ? (info as any).size ?? null : null,
  };
};

const isTimeoutOrNetworkError = (error: unknown) => {
  if (error instanceof UploadRequestError) {
    return error.code === "timeout" || error.code === "network";
  }
  return false;
};

export default function AddItemsScreen() {
  const router = useRouter();
  const { isDarkMode } = useAppTheme();
  const { addItem } = useWardrobe();
  const { image: imageParam, images: imagesParam, source, launchKey } = useLocalSearchParams<{ image?: string; images?: string; source?: string | string[]; launchKey?: string }>();
  const previewScrollRef = useRef<ScrollView | null>(null);

  const baseTheme = getAppTheme(isDarkMode, {
    light: {
      screen: "#fafafa",
      softCard: "#f0eeea",
      border: "#ebebeb",
      inputBg: "#fafafa",
    },
  });
  const theme = { ...baseTheme, panel: baseTheme.card, softPanel: baseTheme.softCard };

  const decodeImagesParam = (raw?: string) => {
    if (!raw) return [] as string[];
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((value) => typeof value === "string" && value.length > 0);
    } catch {
      return [];
    }
  };

  const createQueuedImage = (uri: string, fileSize?: number | null, seed = "item"): QueuedImage => ({
    id: `${seed}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    uri,
    fileSize: fileSize ?? null,
  });

  const paramUris = decodeImagesParam(imagesParam);
  if (imageParam && !paramUris.includes(imageParam)) {
    paramUris.unshift(imageParam);
  }

  const initialQueue: QueuedImage[] = paramUris.map((uri, index) => createQueuedImage(uri, null, `initial-${index}`));
  const initialImage = imageParam ?? paramUris[0] ?? null;

  const [image, setImage] = useState<string | null>(initialImage);
  const [imageFileSize, setImageFileSize] = useState<number | null>(null);
  const [imageQueue, setImageQueue] = useState<QueuedImage[]>(initialQueue);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [itemDrafts, setItemDrafts] = useState<Record<string, ItemForm>>(() => {
    const drafts: Record<string, ItemForm> = {};
    initialQueue.forEach((asset) => {
      drafts[asset.id] = createInitialForm();
    });
    return drafts;
  });
  const [form, setForm] = useState<ItemForm>(() => {
    const firstItem = initialQueue[0];
    if (!firstItem) return createInitialForm();
    return createInitialForm();
  });
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [processingBackground, setProcessingBackground] = useState(false);
  const [lastLaunchKeyHandled, setLastLaunchKeyHandled] = useState<string | null>(null);
  const [hasAutoProcessedInitialQueue, setHasAutoProcessedInitialQueue] = useState(false);

  const applyPickedAsset = (asset: QueuedImage) => {
    setImage(asset.uri);
    setImageFileSize(asset.fileSize ?? null);
  };

  const getDraftForItem = (asset?: QueuedImage | null) => {
    if (!asset) return createInitialForm();
    return itemDrafts[asset.id] ?? createInitialForm();
  };

  const processPickedAssetBackground = async (asset: QueuedImage): Promise<QueuedImage> => {
    try {
      const processedUri = await removeBackgroundFromImageUri(asset.uri);
      const processedInfo = await FileSystem.getInfoAsync(processedUri);
      return {
        id: asset.id,
        uri: processedUri,
        fileSize: processedInfo.exists ? (processedInfo as any).size ?? asset.fileSize ?? null : asset.fileSize ?? null,
      };
    } catch (error) {
      console.warn("Background auto-removal failed for picked image:", error);
      return asset;
    }
  };

  const applyPickedAssets = async (assets: QueuedImage[]) => {
    if (!assets.length) return;

    try {
      setProcessingBackground(true);
      setUploadStatus("Removing background...");

      const processedAssets: QueuedImage[] = [];
      for (const asset of assets) {
        const processedAsset = await processPickedAssetBackground(asset);
        processedAssets.push(processedAsset);
      }

      const nextDrafts = { ...itemDrafts };
      processedAssets.forEach((asset) => {
        if (!nextDrafts[asset.id]) {
          nextDrafts[asset.id] = createInitialForm();
        }
      });

      setImageQueue(processedAssets);
      setItemDrafts(nextDrafts);
      setCurrentImageIndex(0);
      applyPickedAsset(processedAssets[0]);
      setForm(nextDrafts[processedAssets[0].id] ?? createInitialForm());
    } finally {
      setUploadStatus(null);
      setProcessingBackground(false);
    }
  };

  useEffect(() => {
    if (hasAutoProcessedInitialQueue) return;
    if (!initialQueue.length) return;

    setHasAutoProcessedInitialQueue(true);
    applyPickedAssets(initialQueue);
  }, [hasAutoProcessedInitialQueue, initialQueue]);

  const requestPickerPermission = async (pickerSource: "camera" | "gallery") => {
    if (pickerSource === "camera") {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission denied", "Camera permission is required.");
        return false;
      }
      return true;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission denied", "Gallery permission is required.");
      return false;
    }
    return true;
  };

  const launchPicker = async (
    pickerSource: "camera" | "gallery",
    allowEditing: boolean,
    allowMultipleSelection = false,
  ) => {
    const hasPermission = await requestPickerPermission(pickerSource);
    if (!hasPermission) return [] as QueuedImage[];

    const pickerOptions: ImagePicker.ImagePickerOptions = {
      allowsEditing: allowEditing,
      quality: IMAGE_UPLOAD_QUALITY.garment,
      ...(allowEditing ? { aspect: IMAGE_UPLOAD_ASPECT.garment } : {}),
      ...(pickerSource === "gallery" && !allowEditing
        ? {
            allowsMultipleSelection: allowMultipleSelection,
            selectionLimit: allowMultipleSelection ? 0 : 1,
          }
        : {}),
    };

    const result = pickerSource === "camera"
      ? await ImagePicker.launchCameraAsync(pickerOptions)
      : await ImagePicker.launchImageLibraryAsync(pickerOptions);

    if (result.canceled || !result.assets[0]) return [];
    return result.assets.map((asset, index) => createQueuedImage(asset.uri, asset.fileSize ?? null, `${pickerSource}-${index}`));
  };

  useEffect(() => {
    const sourceValue = Array.isArray(source) ? source[0] : source;
    if (!sourceValue || sourceValue === "search" || imageParam || imagesParam) return;

    if (launchKey && lastLaunchKeyHandled === launchKey) return;

    const timer = setTimeout(async () => {
      if (sourceValue !== "camera" && sourceValue !== "gallery") return;

      const pickedAssets = await launchPicker(sourceValue, false, sourceValue === "gallery");
      if (!pickedAssets.length) return;

      await applyPickedAssets(pickedAssets);
    }, 80);

    if (launchKey) {
      setLastLaunchKeyHandled(launchKey);
    }

    return () => clearTimeout(timer);
  }, [source, imageParam, imagesParam, launchKey, lastLaunchKeyHandled]);

  const updateCurrentItemForm = (updater: (prev: ItemForm) => ItemForm) => {
    const currentAsset = imageQueue[currentImageIndex];
    setForm((prev) => {
      const nextForm = updater(prev);
      if (currentAsset) {
        setItemDrafts((prevDrafts) => ({
          ...prevDrafts,
          [currentAsset.id]: nextForm,
        }));
      }
      return nextForm;
    });
  };

  const update = (key: keyof ItemForm, val: any) =>
    updateCurrentItemForm((prev) => ({ ...prev, [key]: val }));

  const toggleColor = (label: string) =>
    updateCurrentItemForm((prev) => ({
      ...prev,
      colors: prev.colors.includes(label)
        ? prev.colors.filter((c) => c !== label)
        : [...prev.colors, label],
    }));

  const setCategoryWithSubcategoryReset = (category: string) =>
    updateCurrentItemForm((prev) => ({
      ...prev,
      category,
      tags: prev.tags.filter((tag) => !ALL_SUBCATEGORY_TAGS.has(tag.toLowerCase())),
    }));

  const toggleSubcategoryTag = (subcategory: string) =>
    updateCurrentItemForm((prev) => {
      const normalizedSelected = (prev.tags ?? [])
        .find((tag) => ALL_SUBCATEGORY_TAGS.has(tag.toLowerCase()))
        ?.toLowerCase();
      const cleanedTags = (prev.tags ?? []).filter(
        (tag) => !ALL_SUBCATEGORY_TAGS.has(tag.toLowerCase()),
      );

      return {
        ...prev,
        tags: normalizedSelected === subcategory.toLowerCase()
          ? cleanedTags
          : [...cleanedTags, subcategory],
      };
    });

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (!t || form.tags.includes(t)) return;
    update("tags", [...form.tags, t]);
    setTagInput("");
  };

  const removeTag = (tag: string) =>
    update("tags", form.tags.filter((t) => t !== tag));

  const handleRemoveBackground = async () => {
    if (!image || processingBackground || saving) return;

    try {
      setProcessingBackground(true);
      setUploadStatus("Removing background...");

      const processedUri = await removeBackgroundFromImageUri(image);
      setImage(processedUri);

      const processedInfo = await FileSystem.getInfoAsync(processedUri);
      setImageFileSize(processedInfo.exists ? (processedInfo as any).size ?? null : null);
    } catch (error) {
      Alert.alert("Background removal failed", getUploadErrorMessage(error, "Unable to remove background."));
    } finally {
      setUploadStatus(null);
      setProcessingBackground(false);
    }
  };

  const handleCameraRoll = async () => {
    if (processingBackground || saving) return;
    const pickedAssets = await launchPicker("gallery", false, true);
    if (!pickedAssets.length) return;
    await applyPickedAssets(pickedAssets);
  };

  const parsePurchasePrice = (itemForm: ItemForm) => {
    const trimmed = itemForm.cost.trim();
    if (!trimmed) return null;

    const parsed = Number.parseFloat(trimmed);
    if (!Number.isFinite(parsed) || parsed < 0) return null;

    return parsed;
  };

  const saveGarment = async (target: {
    uri?: string | null;
    fileSize?: number | null;
    form: ItemForm;
  }) => {
    const token = await SecureStore.getItemAsync('userToken');
    if (!token) {
      Alert.alert("Authentication Error", "Please log in again.");
      router.replace('/(auth)/login');
      return null;
    }

    const purchasePrice = parsePurchasePrice(target.form);
    const autoName = getAutoItemName(target.form.category);

    if (target.uri) {
      setUploadStatus("Optimizing image...");
      const optimizedImage = await optimizeImageForUpload(target.uri);
      const uploadWithUri = async (uri: string, timeoutMs: number, retries: number) => {
        const formData = new FormData();
        const imageMeta = getUploadImageMeta(uri);

        formData.append('image', {
          uri,
          name: `image-${Date.now()}.${imageMeta.extension}`,
          type: imageMeta.mimeType,
        } as any);

        formData.append('name', autoName);
        formData.append('category', target.form.category);
        if (target.form.colors.length > 0) {
          formData.append('color', target.form.colors[0]);
        }
        if (purchasePrice !== null) {
          formData.append('purchasePrice', String(purchasePrice));
        }

        return uploadMultipartWithRetry<any>({
          endpoint: '/api/garments',
          method: 'POST',
          token,
          formData,
          timeoutMs,
          retries,
          fallbackMessage: 'Unable to upload image.',
        });
      };

      let payload;
      try {
        setUploadStatus("Uploading image...");
        payload = await uploadWithUri(optimizedImage.uri, 120000, 3);
      } catch (primaryUploadError) {
        if (!isTimeoutOrNetworkError(primaryUploadError)) {
          throw primaryUploadError;
        }

        setUploadStatus("Slow network detected. Retrying...");
        const fallbackOptimizedImage = await optimizeImageForUpload(target.uri, { width: 768, compress: 0.42 });
        payload = await uploadWithUri(fallbackOptimizedImage.uri, 180000, 4);
      }

      return payload;
    }

    setUploadStatus("Saving...");
    const garmentData = {
      name: autoName,
      category: target.form.category,
      color: target.form.colors.length > 0 ? target.form.colors[0] : undefined,
      purchasePrice: purchasePrice ?? undefined,
    };

    const res = await fetch(buildApiUrl('/api/garments'), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(garmentData),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to save item' }));
      throw new Error(errorData.message || 'Unable to save item');
    }

    return res.json();
  };

  const saveCurrentItem = async () => {
    const currentAsset = imageQueue[currentImageIndex];
    const activeForm = currentAsset ? (itemDrafts[currentAsset.id] ?? form) : form;
    const activeImage = currentAsset?.uri ?? image;
    const activeImageFileSize = currentAsset?.fileSize ?? imageFileSize;

    if (!activeForm.category?.trim()) {
      Alert.alert("Missing category", "Please select a category.");
      return;
    }

    if (activeImage) {
      const sizeError = validateImageFileSize(activeImageFileSize, "garment");
      if (sizeError) {
        Alert.alert(sizeError.title, sizeError.body);
        return;
      }
    }

    try {
      setSaving(true);

      const savedGarment = await saveGarment({
        uri: activeImage,
        fileSize: activeImageFileSize,
        form: activeForm,
      });

      if (!savedGarment) return;

      const purchasePrice = parsePurchasePrice(activeForm);
      const autoName = getAutoItemName(activeForm.category);

      addItem({
        id: savedGarment._id,
        image: savedGarment.imageUrl ? buildImageUrl(savedGarment.imageUrl) : null,
        label: savedGarment.name || autoName,
        bg: CATEGORY_BG[activeForm.category] ?? "#fce4ec",
        category: [activeForm.category],
        colors: activeForm.colors,
        brand: activeForm.brand,
        size: activeForm.size,
        tags: activeForm.tags,
        totalCost: Number(savedGarment.purchasePrice ?? purchasePrice ?? 0),
        timesWorn: 0,
        dateAdded: activeForm.datePurchased || new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      });

      if (currentAsset && imageQueue.length > 0) {
        const remainingQueue = imageQueue.filter((_, index) => index !== currentImageIndex);

        if (remainingQueue.length > 0) {
          const nextIndex = Math.min(currentImageIndex, remainingQueue.length - 1);
          const nextAsset = remainingQueue[nextIndex];
          const nextDrafts = { ...itemDrafts };
          delete nextDrafts[currentAsset.id];

          setImageQueue(remainingQueue);
          setItemDrafts(nextDrafts);
          setCurrentImageIndex(nextIndex);
          applyPickedAsset(nextAsset);
          setForm(nextDrafts[nextAsset.id] ?? createInitialForm());
          setTagInput("");
          setUploadStatus(null);

          requestAnimationFrame(() => {
            previewScrollRef.current?.scrollTo({ x: TILE_WIDTH * nextIndex, animated: false });
          });
          return;
        }
      }

      router.replace('/(tabs)');
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert("Save Failed", getUploadErrorMessage(error, "Unable to save item. Please try again."));
    } finally {
      setUploadStatus(null);
      setSaving(false);
    }
  };

  const saveAllItems = async () => {
    const draftsSnapshot = { ...itemDrafts };
    const activeAsset = imageQueue[currentImageIndex];
    if (activeAsset) {
      draftsSnapshot[activeAsset.id] = form;
    }

    const targets = imageQueue.length > 0
      ? imageQueue.map((asset) => ({
          asset,
          form: draftsSnapshot[asset.id] ?? createInitialForm(),
        }))
      : [{
          asset: null as QueuedImage | null,
          form,
        }];

    const missingCategoryIndex = targets.findIndex(({ form: targetForm }) => !targetForm.category?.trim());
    if (missingCategoryIndex !== -1) {
      const missingAsset = targets[missingCategoryIndex].asset;
      if (missingAsset) {
        setCurrentImageIndex(missingCategoryIndex);
        applyPickedAsset(missingAsset);
        setForm(draftsSnapshot[missingAsset.id] ?? createInitialForm());
        setTagInput("");
        requestAnimationFrame(() => {
          previewScrollRef.current?.scrollTo({ x: TILE_WIDTH * missingCategoryIndex, animated: true });
        });
      }
      Alert.alert("Missing category", "Please select a category for every item before saving all.");
      return;
    }

    const invalidSize = targets.find(({ asset }) => {
      if (!asset?.uri) return false;
      return Boolean(validateImageFileSize(asset.fileSize ?? null, "garment"));
    });
    if (invalidSize?.asset) {
      const sizeError = validateImageFileSize(invalidSize.asset.fileSize ?? null, "garment");
      if (sizeError) {
        Alert.alert(sizeError.title, sizeError.body);
      }
      return;
    }

    try {
      setSaving(true);

      const token = await SecureStore.getItemAsync('userToken');
      if (!token) {
        Alert.alert("Authentication Error", "Please log in again.");
        router.replace('/(auth)/login');
        return;
      }

      for (let index = 0; index < targets.length; index += 1) {
        const target = targets[index];
        setUploadStatus(target.asset ? `Saving ${index + 1}/${targets.length}...` : `Saving ${index + 1}/${targets.length}...`);
        const savedGarment = await saveGarment({
          uri: target.asset?.uri ?? null,
          fileSize: target.asset?.fileSize ?? null,
          form: target.form,
        });

        const purchasePrice = parsePurchasePrice(target.form);
        const autoName = getAutoItemName(target.form.category);

        addItem({
          id: savedGarment._id,
          image: savedGarment.imageUrl ? buildImageUrl(savedGarment.imageUrl) : null,
          label: savedGarment.name || autoName,
          bg: CATEGORY_BG[target.form.category] ?? "#fce4ec",
          category: [target.form.category],
          colors: target.form.colors,
          brand: target.form.brand,
          size: target.form.size,
          tags: target.form.tags,
          totalCost: Number(savedGarment.purchasePrice ?? purchasePrice ?? 0),
          timesWorn: 0,
          dateAdded: target.form.datePurchased || new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" }),
        });
      }

      router.replace('/(tabs)');
    } catch (error) {
      console.error('Save all error:', error);
      Alert.alert("Save Failed", getUploadErrorMessage(error, "Unable to save items. Please try again."));
    } finally {
      setUploadStatus(null);
      setSaving(false);
    }
  };

  const selectedSubcategory = form.category
    ? (
      CATEGORY_TREE[form.category] ?? []
    ).find((subcategory) => (form.tags ?? []).some((tag) => tag.toLowerCase() === subcategory.toLowerCase()))
    : undefined;

  return (
    <SafeAreaView style={[s.root, { backgroundColor: theme.screen }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />

      <View style={[s.header, { backgroundColor: theme.panel, borderBottomColor: theme.border }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: theme.text }]}>Upload items</Text>
        <TouchableOpacity style={[s.saveBtn, saving && s.saveBtnDisabled]} onPress={saveCurrentItem} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={s.saveBtnText}>
              {imageQueue.length > 1 ? `Save ${currentImageIndex + 1}/${imageQueue.length}` : "Save"}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {uploadStatus ? <Text style={[s.uploadStatusText, { color: theme.subText }]}>{uploadStatus}</Text> : null}

      <KeyboardAvoidingView style={s.flexOne} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          <View style={s.mediaRow}>
            <View
              style={[s.photoCard, { backgroundColor: theme.softPanel }]}
            >
              {imageQueue.length > 1 ? (
                <ScrollView
                  ref={previewScrollRef}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={s.multiPreviewContent}
                  onMomentumScrollEnd={(event) => {
                    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / TILE_WIDTH);
                    if (nextIndex < 0 || nextIndex >= imageQueue.length) return;
                    const nextAsset = imageQueue[nextIndex];
                    setCurrentImageIndex(nextIndex);
                    applyPickedAsset(nextAsset);
                    setForm(getDraftForItem(nextAsset));
                  }}
                >
                  {imageQueue.map((asset, index) => (
                    <View
                      key={asset.id}
                      style={{ width: TILE_WIDTH, height: "100%" }}
                    >
                      <Image source={{ uri: asset.uri }} style={s.photo} resizeMode="contain" />
                    </View>
                  ))}
                </ScrollView>
              ) : image ? (
                <Image source={{ uri: image }} style={s.photo} resizeMode="contain" />
              ) : (
                <View style={s.photoPlaceholder}>
                  <Ionicons name="images-outline" size={48} color={theme.subText} />
                  <Text style={[s.photoPlaceholderText, { color: theme.subText }]}>Camera roll</Text>
                </View>
              )}
            </View>
          </View>
          {imageQueue.length > 1 ? (
            <Text style={[s.multiPreviewCounter, { color: theme.subText }]}>{currentImageIndex + 1}/{imageQueue.length}</Text>
          ) : null}

          {image ? (
            <View style={s.photoActionsRow}>
              <TouchableOpacity
                style={[s.photoActionBtn, s.removeBgBtn, (processingBackground || saving) && s.removeBgBtnDisabled]}
                onPress={handleRemoveBackground}
                disabled={processingBackground || saving}
              >
                <Ionicons name="cut-outline" size={16} color="#fff" />
                <Text style={s.removeBgBtnText}>
                  {processingBackground ? "Removing Background..." : "Remove Background"}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <Section title="Category" required isDarkMode={isDarkMode}>
            <View style={s.chipRow}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity key={cat} style={[s.chip, { backgroundColor: isDarkMode ? "#2A2A2A" : "#fafafa", borderColor: theme.border }, form.category === cat && s.chipActive]}
                  onPress={() => setCategoryWithSubcategoryReset(cat)}>
                  <Text style={[s.chipText, { color: isDarkMode ? "#C8C8C8" : "#555" }, form.category === cat && s.chipTextActive]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {form.category ? (
              <>
                <Text style={[s.sectionTitle, { marginTop: 14, marginBottom: 10 }]}>
                  {form.category} Type
                </Text>
              <View style={s.chipRow}>
                {(CATEGORY_TREE[form.category] ?? []).map((subcategory) => (
                  <TouchableOpacity
                    key={subcategory}
                    style={[
                      s.chip,
                      { backgroundColor: isDarkMode ? "#2A2A2A" : "#fafafa", borderColor: theme.border },
                      selectedSubcategory === subcategory && s.chipActive,
                    ]}
                    onPress={() => toggleSubcategoryTag(subcategory)}
                  >
                    <Text
                      style={[
                        s.chipText,
                        { color: isDarkMode ? "#C8C8C8" : "#555" },
                        selectedSubcategory === subcategory && s.chipTextActive,
                      ]}
                    >
                      {subcategory}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              </>
            ) : null}
          </Section>

          <Section title="Colors" isDarkMode={isDarkMode}>
            <View style={s.colorGrid}>
              {COLOR_OPTIONS.map(({ label, hex }) => {
                const selected = form.colors.includes(label);
                const isLight = ["#FFFFFF","#FFF8E1","#FDD835","#FFD700"].includes(hex);
                return (
                  <TouchableOpacity key={label} style={s.colorOpt} onPress={() => toggleColor(label)}>
                    <View style={[s.colorSwatch, { backgroundColor: hex },
                      (hex === "#FFFFFF" || hex === "#FFF8E1") && s.swatchBorder,
                      selected && s.swatchSelected]}>
                      {selected && <Ionicons name="checkmark" size={14} color={isLight ? "#333" : "#fff"} />}
                    </View>
                    <Text style={[s.colorLabel, { color: theme.subText }]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Section>

          <Section title="Brand" isDarkMode={isDarkMode}>
            <TextInput style={[s.textInput, { borderColor: theme.border, backgroundColor: theme.inputBg, color: theme.text }]} value={form.brand} onChangeText={(v) => update("brand", v)}
              placeholder="e.g. Zara, H&M, Vintage" placeholderTextColor={theme.subText} returnKeyType="done" />
          </Section>

          <Section title="Size" isDarkMode={isDarkMode}>
            <TextInput style={[s.textInput, { borderColor: theme.border, backgroundColor: theme.inputBg, color: theme.text }]} value={form.size} onChangeText={(v) => update("size", v)}
              placeholder="e.g. XS, S, M, 36, 8" placeholderTextColor={theme.subText} returnKeyType="done" />
          </Section>

          <Section title="Cost" isDarkMode={isDarkMode}>
            <View style={s.inputRow}>
              <Text style={[s.currencySymbol, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.subText }]}>$</Text>
              <TextInput style={[s.textInput, s.inputRowText, { borderColor: theme.border, backgroundColor: theme.inputBg, color: theme.text }]}
                value={form.cost} onChangeText={(v) => update("cost", v.replace(/[^0-9.]/g, ""))}
                placeholder="0.00" placeholderTextColor={theme.subText} keyboardType="decimal-pad" />
            </View>
          </Section>

          <Section title="Date Purchased" isDarkMode={isDarkMode}>
            <TextInput style={[s.textInput, { borderColor: theme.border, backgroundColor: theme.inputBg, color: theme.text }]} value={form.datePurchased} onChangeText={(v) => update("datePurchased", v)}
              placeholder="e.g. Jan 2024" placeholderTextColor={theme.subText} returnKeyType="done" />
          </Section>

          <Section title="Tags" isDarkMode={isDarkMode}>
            <View style={s.tagInputRow}>
              <TextInput style={[s.textInput, s.flexInput, { borderColor: theme.border, backgroundColor: theme.inputBg, color: theme.text }]} value={tagInput} onChangeText={setTagInput}
                onSubmitEditing={addTag} placeholder="e.g. y2k, casual, summer"
                placeholderTextColor={theme.subText} returnKeyType="done" />
              <TouchableOpacity style={s.tagAddBtn} onPress={addTag}>
                <Ionicons name="add" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
            {form.tags.length > 0 && (
              <View style={s.tagsWrap}>
                {form.tags.map((tag) => (
                  <View key={tag} style={s.tagPill}>
                    <Text style={s.tagText}>{tag}</Text>
                    <TouchableOpacity onPress={() => removeTag(tag)}>
                      <Text style={s.tagX}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </Section>

          <View style={s.bottomSpacer} />
        </ScrollView>
      </KeyboardAvoidingView>

      {imageQueue.length > 1 ? (
        <View style={[s.saveAllFloatingWrap, { bottom: 20 }]}>
          <TouchableOpacity
            style={[s.saveAllFloatingBtn, saving && s.saveAllFloatingBtnDisabled]}
            onPress={saveAllItems}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={s.saveAllFloatingBtnText}>Save all</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function Section({ title, required = false, children, isDarkMode = false }: { title: string; required?: boolean; children: React.ReactNode; isDarkMode?: boolean }) {
  const sectionTheme = isDarkMode
    ? { card: "#1E1E1E", text: "#A8A8A8" }
    : { card: "#FFFFFF", text: "#888888" };

  return (
    <View style={[s.section, { backgroundColor: sectionTheme.card }] }>
      <View style={s.sectionTitleRow}>
        <Text style={[s.sectionTitle, { color: sectionTheme.text }]}>{title}</Text>
        {required && <Text style={s.requiredDot}>*</Text>}
      </View>
      {children}
    </View>
  );
}
