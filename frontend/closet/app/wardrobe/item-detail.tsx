import { Feather, Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { Alert, ScrollView, Share, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AuthenticatedImage from "../../components/AuthenticatedImage";
import {
  IMAGE_UPLOAD_ASPECT,
  IMAGE_UPLOAD_QUALITY,
  validateImageFileSize,
} from "../../constants/imageUpload";
import { buildApiUrl, buildImageUrl } from "../../constants/api";
import { getUploadErrorMessage, uploadMultipartWithRetry } from "../../services/uploadRequest";
import { useWardrobe, type ClothingItem } from "../../context/wardrobeContext";
import { s } from "../../Styles/wardrobe/item-detail.styles";

const DETAIL_TABS = ["Details", "Styles", "Stats"];

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

export default function ItemDetailScreen() {
  const router = useRouter();
  const { itemJson } = useLocalSearchParams<{ itemJson: string }>();
  const { updateItem, refreshItems } = useWardrobe();

  const initialItem: ClothingItem = itemJson
    ? JSON.parse(itemJson)
    : { id: "0", label: "Item", bg: "#fce4ec", category: [], colors: [], tags: [], timesWorn: 0, totalCost: 0 };

  const [item, setItem] = useState<ClothingItem>(initialItem);
  const [activeTab, setActiveTab] = useState("Details");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showTagInput, setShowTagInput] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(item.label ?? "");
  const [editingSize, setEditingSize] = useState(false);
  const [editingBrand, setEditingBrand] = useState(false);
  const [sizeVal, setSizeVal] = useState(item.size ?? "");
  const [brandVal, setBrandVal] = useState(item.brand ?? "");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);
  const [savingColor, setSavingColor] = useState(false);
  const [deletingItem, setDeletingItem] = useState(false);
  const [markingWorn, setMarkingWorn] = useState(false);

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

  const update = (changes: Partial<ClothingItem>) =>
    setItem((prev) => ({ ...prev, ...changes }));

  const persistColor = async (nextColor: string | undefined) => {
    const token = await SecureStore.getItemAsync("userToken");
    if (!token) {
      throw new Error("Session expired. Please log in again.");
    }

    const response = await fetch(buildApiUrl(`/api/garments/${item.id}`), {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ color: nextColor ?? null }),
    });

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

  const removeTag = (tag: string) =>
    update({ tags: (item.tags ?? []).filter((t) => t !== tag) });

  const addTag = () => {
    if (!newTag.trim()) return;
    update({ tags: [...(item.tags ?? []), newTag.trim()] });
    setNewTag("");
    setShowTagInput(false);
  };

  const persistItemDetails = async () => {
    const token = await SecureStore.getItemAsync("userToken");
    if (!token) {
      throw new Error("Session expired. Please log in again.");
    }

    const response = await fetch(buildApiUrl(`/api/garments/${item.id}`), {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: item.label,
        size: item.size ?? null,
        brand: item.brand ?? null,
        tags: item.tags ?? [],
        color: item.colors?.[0] ?? null,
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
      size: garment.size ?? undefined,
      brand: garment.brand ?? undefined,
      tags: Array.isArray(garment.tags) ? garment.tags : (item.tags ?? []),
      colors: garment.color ? [garment.color] : [],
    };

    setItem(updatedItem);
    updateItem(updatedItem);
  };

  const saveItemDetails = async () => {
    if (savingDetails) return;
    try {
      setSavingDetails(true);
      await persistItemDetails();
      await refreshItems();
      Alert.alert("Saved", "Item changes were updated.");
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
      const response = await fetch(buildApiUrl(`/api/garments/${item.id}`), {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

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

      const response = await fetch(buildApiUrl('/api/usage/log'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ garmentId: item.id }),
      });

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

    const localUri = result.assets[0].uri;
    update({ image: localUri });

    try {
      const token = await SecureStore.getItemAsync("userToken");
      if (!token) {
        Alert.alert("Session expired", "Please log in again.");
        return;
      }

      setUploadingImage(true);

      const formData = new FormData();
      formData.append("image", {
        uri: localUri,
        name: `item-${Date.now()}.jpg`,
        type: "image/jpeg",
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
  };

  const cpw = (item.timesWorn ?? 0) > 0
    ? ((item.totalCost ?? 0) / item.timesWorn!).toFixed(2)
    : (item.totalCost ?? 0).toFixed(2);

  return (
    <SafeAreaView style={s.root}>
      <View style={s.topBar}>
        <TouchableOpacity style={s.topBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={20} color="#222" />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <TouchableOpacity style={s.topBtn} onPress={() => Share.share({ message: `Check out my ${item.label}!` })}>
          <Ionicons name="share-outline" size={20} color="#222" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={s.imageWrap} onPress={pickImage} activeOpacity={0.9}>
        {item.image ? (
          <AuthenticatedImage source={{ uri: item.image }} style={s.image} resizeMode="contain" />
        ) : (
          <View style={s.imagePlaceholder}>
            <Ionicons name="image-outline" size={64} color="#ccc" />
          </View>
        )}
        <View style={s.cpwPill}>
          <Text style={s.cpwText}>cost/wear ${cpw}</Text>
        </View>
        {uploadingImage ? (
          <View style={s.cpwPill}>
            <Text style={s.cpwText}>Uploading image...</Text>
          </View>
        ) : null}
        <View style={s.imageActions}>
          <TouchableOpacity onPress={() => Alert.alert("Delete Item", "Remove this item from your wardrobe?", [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: deleteItem },
          ])}>
            <Ionicons name="trash-outline" size={22} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity onPress={pickImage}>
            <Ionicons name="arrow-down-circle-outline" size={22} color="#666" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      <View style={s.tabNav}>
        {DETAIL_TABS.map((tab) => (
          <TouchableOpacity key={tab} style={s.tabBtn} onPress={() => setActiveTab(tab)}>
            <Text style={[s.tabBtnText, activeTab === tab && s.tabBtnTextActive]}>{tab}</Text>
            {activeTab === tab && <View style={s.tabUnderline} />}
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={s.content} showsVerticalScrollIndicator={false}>
        {activeTab === "Details" && (
          <View>
            <View style={s.row}>
              <Text style={s.rowLabel}>Name</Text>
              {editingName ? (
                <View style={s.inlineRow}>
                  <TextInput
                    autoFocus
                    style={s.inlineInput}
                    value={nameVal}
                    onChangeText={setNameVal}
                    placeholder="Item name"
                    placeholderTextColor="#bbb"
                  />
                  <TouchableOpacity
                    style={s.inlineSave}
                    onPress={() => {
                      const trimmed = nameVal.trim();
                      update({ label: trimmed || item.label });
                      setNameVal(trimmed || item.label);
                      setEditingName(false);
                    }}
                  >
                    <Text style={s.inlineSaveText}>Save</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={s.addBtn} onPress={() => setEditingName(true)}>
                  <Text style={s.addBtnText}>{item.label || "ADD"}</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={s.divider} />

            <View style={s.row}>
              <Text style={s.rowLabel}>Category</Text>
              <View style={s.categoryPill}>
                <Text style={s.categoryText}>
                  {(item.category?.length ? item.category : ["UNCATEGORIZED"]).join(" > ")}
                </Text>
              </View>
            </View>
            <View style={s.divider} />

            <View>
              <View style={s.rowBetween}>
                <Text style={s.rowLabel}>Colors</Text>
                <TouchableOpacity onPress={() => setShowColorPicker((v) => !v)}>
                  <Feather name="edit-2" size={15} color="#aaa" />
                </TouchableOpacity>
              </View>
              <View style={s.swatches}>
                {(item.colors ?? []).map((c, i) => (
                  <View key={i} style={[s.swatch, { backgroundColor: resolveColorHex(c) }, resolveColorHex(c) === "#FFFFFF" && s.swatchBorder]} />
                ))}
              </View>
              {savingColor ? <Text style={{ color: "#777", fontSize: 12 }}>Saving color...</Text> : null}
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
            <View style={s.divider} />

            <View style={s.row}>
              <Text style={s.rowLabel}>Size</Text>
              {editingSize ? (
                <View style={s.inlineRow}>
                  <TextInput autoFocus style={s.inlineInput} value={sizeVal} onChangeText={setSizeVal}
                    placeholder="XS, S, M…" placeholderTextColor="#bbb" />
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
            <View style={s.divider} />

            <View style={s.row}>
              <Text style={s.rowLabel}>Brand</Text>
              {editingBrand ? (
                <View style={s.inlineRow}>
                  <TextInput autoFocus style={s.inlineInput} value={brandVal} onChangeText={setBrandVal}
                    placeholder="e.g. Zara" placeholderTextColor="#bbb" />
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
            <View style={s.divider} />

            <View>
              <View style={s.rowBetween}>
                <Text style={s.rowLabel}>Tags</Text>
                <TouchableOpacity onPress={() => setShowTagInput((v) => !v)}>
                  <Feather name="edit-2" size={15} color="#aaa" />
                </TouchableOpacity>
              </View>
              <View style={s.tagsWrap}>
                {(item.tags ?? []).map((tag) => (
                  <View key={tag} style={s.tagPill}>
                    <Text style={s.tagText}>{tag}</Text>
                    <TouchableOpacity onPress={() => removeTag(tag)}>
                      <Text style={s.tagX}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                {showTagInput && (
                  <View style={s.inlineRow}>
                    <TextInput autoFocus style={[s.inlineInput, { width: 100 }]} value={newTag}
                      onChangeText={setNewTag} onSubmitEditing={addTag}
                      placeholder="new tag" placeholderTextColor="#bbb" />
                    <TouchableOpacity style={s.inlineSave} onPress={addTag}>
                      <Text style={s.inlineSaveText}>+</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
            <View style={s.divider} />

            <TouchableOpacity
              style={[s.pinkBtn, { marginHorizontal: 20, opacity: (savingDetails || deletingItem) ? 0.7 : 1 }]}
              onPress={saveItemDetails}
              disabled={savingDetails || deletingItem}
            >
              <Text style={s.pinkBtnText}>{savingDetails ? "Saving..." : "Save Item Changes"}</Text>
            </TouchableOpacity>
            <View style={s.divider} />
          </View>
        )}

        {activeTab === "Styles" && (
          <View style={s.emptyState}>
            <Text style={s.emptyTitle}>No outfits yet</Text>
            <Text style={s.emptySubtitle}>Add this piece to an outfit to see it here</Text>
            <TouchableOpacity style={s.pinkBtn}>
              <Text style={s.pinkBtnText}>+ Create Outfit</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === "Stats" && (
          <View style={{ padding: 20 }}>
            <View style={s.statsGrid}>
              <View style={s.statCard}>
                <Text style={s.statVal}>${cpw}</Text>
                <Text style={s.statLbl}>Cost / Wear</Text>
              </View>
              <View style={s.statCard}>
                <Text style={s.statVal}>{item.timesWorn ?? 0}</Text>
                <Text style={s.statLbl}>Times Worn</Text>
              </View>
              <View style={s.statCard}>
                <Text style={s.statVal}>${item.totalCost ?? 0}</Text>
                <Text style={s.statLbl}>Total Cost</Text>
              </View>
              <View style={s.statCard}>
                <Text style={s.statVal}>{item.dateAdded ?? "—"}</Text>
                <Text style={s.statLbl}>Date Added</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[s.pinkBtn, { marginTop: 16, opacity: markingWorn ? 0.7 : 1 }]}
              onPress={markWorn}
              disabled={markingWorn}
            >
              <Text style={s.pinkBtnText}>{markingWorn ? 'Saving...' : '+ Mark as Worn Today'}</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}