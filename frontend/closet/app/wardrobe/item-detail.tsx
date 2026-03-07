import { Feather, Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  Platform,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import type { ClothingItem } from "../index";

const { width: W } = Dimensions.get("window");
const PINK = "#e83d84";

const DETAIL_TABS = ["Details", "Styles", "Stats"];

const ALL_COLORS = [
  "#c8c0b0",
  "#999",
  "#111",
  "#7ecec4",
  "#fff",
  "#c4b8e0",
  PINK,
  "#f4a0b0",
  "#ffd700",
  "#ff6b6b",
  "#6bcbff",
  "#a0e8a0",
];

export default function ItemDetailScreen() {
  const router = useRouter();
  const { itemJson } = useLocalSearchParams<{ itemJson: string }>();

  // Parse the item passed from the grid
  const initialItem: ClothingItem = itemJson
    ? JSON.parse(itemJson)
    : {
        id: 0,
        emoji: "👗",
        label: "Item",
        bg: "#fce4ec",
        category: [],
        colors: [],
        tags: [],
        timesWorn: 0,
        totalCost: 0,
      };

  const [item, setItem] = useState<ClothingItem>(initialItem);
  const [activeTab, setActiveTab] = useState("Details");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showTagInput, setShowTagInput] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [editingSize, setEditingSize] = useState(false);
  const [editingBrand, setEditingBrand] = useState(false);
  const [sizeVal, setSizeVal] = useState(item.size ?? "");
  const [brandVal, setBrandVal] = useState(item.brand ?? "");

  const update = (changes: Partial<ClothingItem>) =>
    setItem((prev) => ({ ...prev, ...changes }));

  const toggleColor = (c: string) => {
    const colors = item.colors ?? [];
    update({
      colors: colors.includes(c)
        ? colors.filter((x) => x !== c)
        : [...colors, c],
    });
  };

  const removeTag = (tag: string) =>
    update({ tags: (item.tags ?? []).filter((t) => t !== tag) });

  const addTag = () => {
    if (!newTag.trim()) return;
    update({ tags: [...(item.tags ?? []), newTag.trim()] });
    setNewTag("");
    setShowTagInput(false);
  };

  const markWorn = () => update({ timesWorn: (item.timesWorn ?? 0) + 1 });

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0])
      update({ image: result.assets[0].uri });
  };

  const cpw =
    (item.timesWorn ?? 0) > 0
      ? ((item.totalCost ?? 0) / item.timesWorn!).toFixed(2)
      : (item.totalCost ?? 0).toFixed(2);

  return (
    <SafeAreaView style={s.root}>
      {/* ── Top bar ── */}
      <View style={s.topBar}>
        <TouchableOpacity style={s.topBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={20} color="#222" />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          style={s.topBtn}
          onPress={() =>
            Share.share({ message: `Check out my ${item.label}!` })
          }
        >
          <Ionicons name="share-outline" size={20} color="#222" />
        </TouchableOpacity>
      </View>

      {/* ── Image ── */}
      <TouchableOpacity
        style={s.imageWrap}
        onPress={pickImage}
        activeOpacity={0.9}
      >
        {item.image ? (
          <Image
            source={{ uri: item.image }}
            style={s.image}
            resizeMode="contain"
          />
        ) : (
          <View style={s.imagePlaceholder}>
            <Text style={s.itemEmoji}>{item.emoji}</Text>
          </View>
        )}
        {/* Cost/wear pill */}
        <View style={s.cpwPill}>
          <Text style={s.cpwText}>cost/wear</Text>
        </View>
        {/* Bottom actions */}
        <View style={s.imageActions}>
          <TouchableOpacity
            onPress={() =>
              Alert.alert(
                "Delete Item",
                "Remove this item from your wardrobe?",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => router.back(),
                  },
                ],
              )
            }
          >
            <Ionicons name="trash-outline" size={22} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity onPress={pickImage}>
            <Ionicons name="arrow-down-circle-outline" size={22} color="#666" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      {/* ── Tab nav ── */}
      <View style={s.tabNav}>
        {DETAIL_TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={s.tabBtn}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[s.tabBtnText, activeTab === tab && s.tabBtnTextActive]}
            >
              {tab}
            </Text>
            {activeTab === tab && <View style={s.tabUnderline} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Content ── */}
      <ScrollView style={s.content} showsVerticalScrollIndicator={false}>
        {/* ───── DETAILS ───── */}
        {activeTab === "Details" && (
          <View>
            {/* Category */}
            <View style={s.row}>
              <Text style={s.rowLabel}>Category</Text>
              <View style={s.categoryPill}>
                <Text style={s.categoryText}>
                  {(item.category?.length
                    ? item.category
                    : ["UNCATEGORIZED"]
                  ).join(" > ")}
                </Text>
              </View>
            </View>
            <View style={s.divider} />

            {/* Colors */}
            <View>
              <View style={s.rowBetween}>
                <Text style={s.rowLabel}>Colors</Text>
                <TouchableOpacity onPress={() => setShowColorPicker((v) => !v)}>
                  <Feather name="edit-2" size={15} color="#aaa" />
                </TouchableOpacity>
              </View>
              <View style={s.swatches}>
                {(item.colors ?? []).map((c, i) => (
                  <View
                    key={i}
                    style={[
                      s.swatch,
                      { backgroundColor: c },
                      c === "#fff" && s.swatchBorder,
                    ]}
                  />
                ))}
              </View>
              {showColorPicker && (
                <View style={s.colorPicker}>
                  {ALL_COLORS.map((c) => (
                    <TouchableOpacity key={c} onPress={() => toggleColor(c)}>
                      <View
                        style={[
                          s.swatch,
                          { backgroundColor: c },
                          c === "#fff" && s.swatchBorder,
                          (item.colors ?? []).includes(c) && s.swatchSelected,
                        ]}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
            <View style={s.divider} />

            {/* Size */}
            <View style={s.row}>
              <Text style={s.rowLabel}>Size</Text>
              {editingSize ? (
                <View style={s.inlineRow}>
                  <TextInput
                    autoFocus
                    style={s.inlineInput}
                    value={sizeVal}
                    onChangeText={setSizeVal}
                    placeholder="XS, S, M, 36…"
                    placeholderTextColor="#bbb"
                  />
                  <TouchableOpacity
                    style={s.inlineSave}
                    onPress={() => {
                      update({ size: sizeVal });
                      setEditingSize(false);
                    }}
                  >
                    <Text style={s.inlineSaveText}>Save</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={s.addBtn}
                  onPress={() => setEditingSize(true)}
                >
                  <Text style={s.addBtnText}>{item.size || "ADD"}</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={s.divider} />

            {/* Brand */}
            <View style={s.row}>
              <Text style={s.rowLabel}>Brand</Text>
              {editingBrand ? (
                <View style={s.inlineRow}>
                  <TextInput
                    autoFocus
                    style={s.inlineInput}
                    value={brandVal}
                    onChangeText={setBrandVal}
                    placeholder="e.g. Zara, H&M"
                    placeholderTextColor="#bbb"
                  />
                  <TouchableOpacity
                    style={s.inlineSave}
                    onPress={() => {
                      update({ brand: brandVal });
                      setEditingBrand(false);
                    }}
                  >
                    <Text style={s.inlineSaveText}>Save</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={s.addBtn}
                  onPress={() => setEditingBrand(true)}
                >
                  <Text style={s.addBtnText}>{item.brand || "ADD"}</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={s.divider} />

            {/* Tags */}
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
                    <TextInput
                      autoFocus
                      style={[s.inlineInput, { width: 100 }]}
                      value={newTag}
                      onChangeText={setNewTag}
                      onSubmitEditing={addTag}
                      placeholder="new tag"
                      placeholderTextColor="#bbb"
                    />
                    <TouchableOpacity style={s.inlineSave} onPress={addTag}>
                      <Text style={s.inlineSaveText}>+</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
            <View style={s.divider} />
          </View>
        )}

        {/* ───── STYLES ───── */}
        {activeTab === "Styles" && (
          <View style={s.emptyState}>
            <Text style={s.emptyEmoji}>🪡</Text>
            <Text style={s.emptyTitle}>No outfits yet</Text>
            <Text style={s.emptySubtitle}>
              Add this piece to an outfit to see it here
            </Text>
            <TouchableOpacity style={s.pinkBtn}>
              <Text style={s.pinkBtnText}>+ Create Outfit</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ───── STATS ───── */}
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
              style={[s.pinkBtn, { marginTop: 16 }]}
              onPress={markWorn}
            >
              <Text style={s.pinkBtnText}>+ Mark as Worn Today</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff" },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "android" ? 16 : 8,
    paddingBottom: 4,
  },
  topBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  imageWrap: {
    marginHorizontal: 18,
    borderRadius: 20,
    overflow: "hidden",
    height: 320,
    backgroundColor: "#f0eeea",
    alignItems: "center",
    justifyContent: "center",
  },
  image: { width: "100%", height: "100%" },
  imagePlaceholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  itemEmoji: { fontSize: 90 },
  cpwPill: {
    position: "absolute",
    bottom: 48,
    backgroundColor: PINK,
    borderRadius: 30,
    paddingVertical: 12,
    paddingHorizontal: 48,
  },
  cpwText: { color: "#fff", fontSize: 15, fontWeight: "500" },
  imageActions: {
    position: "absolute",
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },

  tabNav: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    marginTop: 14,
  },
  tabBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    position: "relative",
  },
  tabBtnText: { fontSize: 15, fontWeight: "500", color: "#aaa" },
  tabBtnTextActive: { color: "#111", fontWeight: "700" },
  tabUnderline: {
    position: "absolute",
    bottom: 0,
    left: "20%",
    right: "20%",
    height: 2,
    backgroundColor: "#111",
    borderRadius: 2,
  },

  content: { flex: 1 },

  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 8,
  },
  rowLabel: { fontSize: 15, fontWeight: "500", color: "#1a1a1a" },
  divider: { height: 1, backgroundColor: "#f0f0f0", marginHorizontal: 20 },

  categoryPill: {
    backgroundColor: "#f5f5f5",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#333",
    letterSpacing: 0.5,
  },

  swatches: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  swatch: { width: 34, height: 34, borderRadius: 17 },
  swatchBorder: { borderWidth: 1, borderColor: "#ddd" },
  swatchSelected: { borderWidth: 3, borderColor: PINK },
  colorPicker: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },

  addBtn: {
    borderWidth: 1,
    borderColor: PINK,
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 16,
  },
  addBtnText: {
    color: PINK,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
  },

  inlineRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  inlineInput: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    color: "#1a1a1a",
    width: 120,
  },
  inlineSave: {
    backgroundColor: PINK,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  inlineSaveText: { color: "#fff", fontSize: 13, fontWeight: "600" },

  tagsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 12,
    alignItems: "center",
  },
  tagPill: {
    backgroundColor: PINK,
    borderRadius: 20,
    paddingVertical: 6,
    paddingLeft: 14,
    paddingRight: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  tagText: { color: "#fff", fontSize: 13 },
  tagX: { color: "#fff", fontSize: 18, lineHeight: 20 },

  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  statCard: {
    width: (W - 64) / 2,
    backgroundColor: "#fafafa",
    borderWidth: 1,
    borderColor: "#f0f0f0",
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
  },
  statVal: { fontSize: 22, fontWeight: "700", color: "#1a1a1a" },
  statLbl: { fontSize: 12, color: "#aaa", marginTop: 4, fontWeight: "500" },

  emptyState: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 40,
    gap: 10,
  },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 17, fontWeight: "600", color: "#1a1a1a" },
  emptySubtitle: {
    fontSize: 13,
    color: "#aaa",
    textAlign: "center",
    marginBottom: 8,
  },

  pinkBtn: {
    backgroundColor: PINK,
    borderRadius: 30,
    paddingVertical: 13,
    paddingHorizontal: 32,
    alignItems: "center",
  },
  pinkBtnText: { color: "#fff", fontSize: 15, fontWeight: "500" },
});
