import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator, Alert, Image, KeyboardAvoidingView,
  Platform, ScrollView, StatusBar, Text, TextInput, TouchableOpacity, View,
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
import { getUploadErrorMessage, uploadMultipartWithRetry } from "../../services/uploadRequest";
import { removeBackgroundFromImageUri } from "../../services/removeBackground";
import { useAppTheme } from "../../context/themeContext";
import { useWardrobe } from "../../context/wardrobeContext";
import { s } from "../../Styles/wardrobe/add-items.styles";

const CATEGORIES = [
  "Tops", "Bottoms", "Dresses", "Outerwear",
  "Footwear", "Accessories", "Bags", "Swimwear",
];

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

const getAutoItemName = (category: string) => {
  const base = category?.trim() || "Item";
  const stamp = new Date().toISOString().slice(0, 10);
  return `${base} ${stamp}`;
};

export default function AddItemsScreen() {
  const router = useRouter();
  const { isDarkMode } = useAppTheme();
  const { addItem } = useWardrobe();
  const { image: imageParam, source } = useLocalSearchParams<{ image: string; source: string }>();

  const baseTheme = getAppTheme(isDarkMode, {
    light: {
      screen: "#fafafa",
      softCard: "#f0eeea",
      border: "#ebebeb",
      inputBg: "#fafafa",
    },
  });
  const theme = { ...baseTheme, panel: baseTheme.card, softPanel: baseTheme.softCard };

  const [image, setImage] = useState<string | null>(imageParam ?? null);
  const [imageFileSize, setImageFileSize] = useState<number | null>(null);
  const [form, setForm] = useState<ItemForm>({
    category: "", colors: [], brand: "",
    size: "", tags: [], cost: "", datePurchased: "",
  });
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [processingBackground, setProcessingBackground] = useState(false);

  useEffect(() => {
    if (!source) return;
    const timer = setTimeout(async () => {
      if (source === "camera") {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") { Alert.alert("Permission denied", "Camera permission is required."); return; }
        const result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: IMAGE_UPLOAD_ASPECT.garment,
          quality: IMAGE_UPLOAD_QUALITY.garment,
        });
        if (!result.canceled) {
          setImage(result.assets[0].uri);
          setImageFileSize(result.assets[0].fileSize ?? null);
        }
      } else if (source === "gallery") {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") { Alert.alert("Permission denied", "Gallery permission is required."); return; }
        const result = await ImagePicker.launchImageLibraryAsync({
          allowsEditing: true,
          aspect: IMAGE_UPLOAD_ASPECT.garment,
          quality: IMAGE_UPLOAD_QUALITY.garment,
        });
        if (!result.canceled) {
          setImage(result.assets[0].uri);
          setImageFileSize(result.assets[0].fileSize ?? null);
        }
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [source]);

  const update = (key: keyof ItemForm, val: any) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const toggleColor = (label: string) =>
    setForm((prev) => ({
      ...prev,
      colors: prev.colors.includes(label)
        ? prev.colors.filter((c) => c !== label)
        : [...prev.colors, label],
    }));

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

  const parsePurchasePrice = () => {
    const trimmed = form.cost.trim();
    if (!trimmed) return null;

    const parsed = Number.parseFloat(trimmed);
    if (!Number.isFinite(parsed) || parsed < 0) return null;

    return parsed;
  };

  const handleSave = async () => {
    if (!form.category) { Alert.alert("Missing category", "Please select a category."); return; }

    const sizeError = validateImageFileSize(imageFileSize, "garment");
    if (image && sizeError) {
      Alert.alert(sizeError.title, sizeError.body);
      return;
    }

    try {
      setSaving(true);

      // Get auth token
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) {
        Alert.alert("Authentication Error", "Please log in again.");
        router.replace('/(auth)/login');
        return;
      }

      let res;
      const purchasePrice = parsePurchasePrice();
      const autoName = getAutoItemName(form.category);

      if (image) {
        setUploadStatus("Uploading image...");
        // If there's an image, send as FormData
        const formData = new FormData();

        // For React Native/Expo, append the image URI directly
        formData.append('image', {
          uri: image,
          name: `image-${Date.now()}.jpg`,
          type: 'image/jpeg',
        } as any);

        // Add form data
        formData.append('name', autoName);
        formData.append('category', form.category);
        if (form.colors.length > 0) {
          formData.append('color', form.colors[0]);
        }
        if (purchasePrice !== null) {
          formData.append('purchasePrice', String(purchasePrice));
        }

        const payload = await uploadMultipartWithRetry<any>({
          endpoint: '/api/garments',
          method: 'POST',
          token,
          formData,
          timeoutMs: 25000,
          retries: 1,
          fallbackMessage: 'Unable to upload image.',
        });

        res = {
          ok: true,
          json: async () => payload,
        } as any;
      } else {
        setUploadStatus(null);
        // No image, send as JSON
        const garmentData = {
          name: autoName,
          category: form.category,
          color: form.colors.length > 0 ? form.colors[0] : undefined,
          purchasePrice: purchasePrice ?? undefined,
        };

        res = await fetch(buildApiUrl('/api/garments'), {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(garmentData),
        });
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Failed to save item' }));
        Alert.alert("Save Failed", errorData.message || 'Unable to save item');
        return;
      }

      const savedGarment = await res.json();

      // Update local state with the saved garment
      addItem({
        id: savedGarment._id, // MongoDB _id is a string
        image: savedGarment.imageUrl ? buildImageUrl(savedGarment.imageUrl) : null,
        label: savedGarment.name || autoName,
        bg: CATEGORY_BG[form.category] ?? "#fce4ec",
        category: [form.category],
        colors: form.colors,
        brand: form.brand,
        size: form.size,
        tags: form.tags,
        totalCost: Number(savedGarment.purchasePrice ?? purchasePrice ?? 0),
        timesWorn: 0,
        dateAdded: form.datePurchased || new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      });

      Alert.alert("Success", "Item saved successfully!");
      router.back();

    } catch (error) {
      console.error('Save error:', error);
      Alert.alert("Save Failed", getUploadErrorMessage(error, "Unable to save item. Please try again."));
    } finally {
      setUploadStatus(null);
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[s.root, { backgroundColor: theme.screen }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />

      <View style={[s.header, { backgroundColor: theme.panel, borderBottomColor: theme.border }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: theme.text }]}>Add Item</Text>
        <TouchableOpacity style={[s.saveBtn, saving && s.saveBtnDisabled]} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.saveBtnText}>Save</Text>}
        </TouchableOpacity>
      </View>

      {uploadStatus ? <Text style={[s.uploadStatusText, { color: theme.subText }]}>{uploadStatus}</Text> : null}

      <KeyboardAvoidingView style={s.flexOne} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          <View style={[s.photoCard, { backgroundColor: theme.softPanel }]}>
            {image ? (
              <Image source={{ uri: image }} style={s.photo} resizeMode="contain" />
            ) : (
              <View style={s.photoPlaceholder}>
                <Ionicons name="image-outline" size={48} color={theme.subText} />
                <Text style={[s.photoPlaceholderText, { color: theme.subText }]}>No photo</Text>
              </View>
            )}
          </View>

          {image ? (
            <TouchableOpacity
              style={[s.removeBgBtn, (processingBackground || saving) && s.removeBgBtnDisabled]}
              onPress={handleRemoveBackground}
              disabled={processingBackground || saving}
            >
              <Ionicons name="cut-outline" size={16} color="#fff" />
              <Text style={s.removeBgBtnText}>
                {processingBackground ? "Removing Background..." : "Remove Background"}
              </Text>
            </TouchableOpacity>
          ) : null}

          <Section title="Category" required isDarkMode={isDarkMode}>
            <View style={s.chipRow}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity key={cat} style={[s.chip, { backgroundColor: isDarkMode ? "#2A2A2A" : "#fafafa", borderColor: theme.border }, form.category === cat && s.chipActive]}
                  onPress={() => update("category", cat)}>
                  <Text style={[s.chipText, { color: isDarkMode ? "#C8C8C8" : "#555" }, form.category === cat && s.chipTextActive]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>
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