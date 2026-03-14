import { Feather, Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, Dimensions, Image, ScrollView, Share, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { ClothingItem } from "../../context/wardrobeContext";
import { s } from "../../Styles/wardrobe/item-detail.styles";

const { width: W } = Dimensions.get("window");
const PINK = "#e83d84";

const DETAIL_TABS = ["Details", "Styles", "Stats"];

const ALL_COLORS = [
  "#c8c0b0","#999","#111","#7ecec4","#fff","#c4b8e0",
  PINK,"#f4a0b0","#ffd700","#ff6b6b","#6bcbff","#a0e8a0",
];

export default function ItemDetailScreen() {
  const router = useRouter();
  const { itemJson } = useLocalSearchParams<{ itemJson: string }>();

  const initialItem: ClothingItem = itemJson
    ? JSON.parse(itemJson)
    : { id: 0, label: "Item", bg: "#fce4ec", category: [], colors: [], tags: [], timesWorn: 0, totalCost: 0 };

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
    update({ colors: colors.includes(c) ? colors.filter((x) => x !== c) : [...colors, c] });
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
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
    if (!result.canceled && result.assets[0]) update({ image: result.assets[0].uri });
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
          <Image source={{ uri: item.image }} style={s.image} resizeMode="contain" />
        ) : (
          <View style={s.imagePlaceholder}>
            <Ionicons name="image-outline" size={64} color="#ccc" />
          </View>
        )}
        <View style={s.cpwPill}>
          <Text style={s.cpwText}>cost/wear ${cpw}</Text>
        </View>
        <View style={s.imageActions}>
          <TouchableOpacity onPress={() => Alert.alert("Delete Item", "Remove this item from your wardrobe?", [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: () => router.back() },
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
                  <View key={i} style={[s.swatch, { backgroundColor: c }, c === "#fff" && s.swatchBorder]} />
                ))}
              </View>
              {showColorPicker && (
                <View style={s.colorPicker}>
                  {ALL_COLORS.map((c) => (
                    <TouchableOpacity key={c} onPress={() => toggleColor(c)}>
                      <View style={[s.swatch, { backgroundColor: c }, c === "#fff" && s.swatchBorder,
                        (item.colors ?? []).includes(c) && s.swatchSelected]} />
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
            <TouchableOpacity style={[s.pinkBtn, { marginTop: 16 }]} onPress={markWorn}>
              <Text style={s.pinkBtnText}>+ Mark as Worn Today</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}