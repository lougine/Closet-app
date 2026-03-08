import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator, Alert, Image, KeyboardAvoidingView,
  Platform, ScrollView, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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
  name: string; category: string; colors: string[]; brand: string;
  size: string; tags: string[]; cost: string; datePurchased: string;
}

export default function AddItemsScreen() {
  const router = useRouter();
  const { addItem } = useWardrobe();
  const { image: imageParam, source } = useLocalSearchParams<{ image: string; source: string }>();

  const [image, setImage] = useState<string | null>(imageParam ?? null);
  const [form, setForm] = useState<ItemForm>({
    name: "", category: "", colors: [], brand: "",
    size: "", tags: [], cost: "", datePurchased: "",
  });
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!source) return;
    const timer = setTimeout(async () => {
      if (source === "camera") {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") { Alert.alert("Permission denied", "Camera permission is required."); return; }
        const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
        if (!result.canceled) setImage(result.assets[0].uri);
      } else if (source === "gallery") {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") { Alert.alert("Permission denied", "Gallery permission is required."); return; }
        const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
        if (!result.canceled) setImage(result.assets[0].uri);
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

  const handleSave = () => {
    if (!form.name.trim()) { Alert.alert("Missing name", "Please give this item a name."); return; }
    if (!form.category) { Alert.alert("Missing category", "Please select a category."); return; }
    setSaving(true);
    addItem({
      id: Date.now(),
      image: image ?? null,
      label: form.name.trim(),
      bg: CATEGORY_BG[form.category] ?? "#fce4ec",
      category: [form.category],
      colors: form.colors,
      brand: form.brand,
      size: form.size,
      tags: form.tags,
      totalCost: parseFloat(form.cost) || 0,
      timesWorn: 0,
      dateAdded: form.datePurchased || new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" }),
    });
    setSaving(false);
    router.back();
  };

  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Add Item</Text>
        <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.saveBtnText}>Save</Text>}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          <View style={s.photoCard}>
            {image ? (
              <Image source={{ uri: image }} style={s.photo} resizeMode="contain" />
            ) : (
              <View style={s.photoPlaceholder}>
                <Ionicons name="image-outline" size={48} color="#ccc" />
                <Text style={s.photoPlaceholderText}>No photo</Text>
              </View>
            )}
          </View>

          <Section title="Item Name" required>
            <TextInput style={s.textInput} value={form.name} onChangeText={(v) => update("name", v)}
              placeholder="e.g. Black Leather Jacket" placeholderTextColor="#bbb" returnKeyType="done" />
          </Section>

          <Section title="Category" required>
            <View style={s.chipRow}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity key={cat} style={[s.chip, form.category === cat && s.chipActive]}
                  onPress={() => update("category", cat)}>
                  <Text style={[s.chipText, form.category === cat && s.chipTextActive]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Section>

          <Section title="Colors">
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
                    <Text style={s.colorLabel}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Section>

          <Section title="Brand">
            <TextInput style={s.textInput} value={form.brand} onChangeText={(v) => update("brand", v)}
              placeholder="e.g. Zara, H&M, Vintage" placeholderTextColor="#bbb" returnKeyType="done" />
          </Section>

          <Section title="Size">
            <TextInput style={s.textInput} value={form.size} onChangeText={(v) => update("size", v)}
              placeholder="e.g. XS, S, M, 36, 8" placeholderTextColor="#bbb" returnKeyType="done" />
          </Section>

          <Section title="Cost">
            <View style={s.inputRow}>
              <Text style={s.currencySymbol}>$</Text>
              <TextInput style={[s.textInput, { flex: 1, borderLeftWidth: 0, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }]}
                value={form.cost} onChangeText={(v) => update("cost", v.replace(/[^0-9.]/g, ""))}
                placeholder="0.00" placeholderTextColor="#bbb" keyboardType="decimal-pad" />
            </View>
          </Section>

          <Section title="Date Purchased">
            <TextInput style={s.textInput} value={form.datePurchased} onChangeText={(v) => update("datePurchased", v)}
              placeholder="e.g. Jan 2024" placeholderTextColor="#bbb" returnKeyType="done" />
          </Section>

          <Section title="Tags">
            <View style={s.tagInputRow}>
              <TextInput style={[s.textInput, { flex: 1 }]} value={tagInput} onChangeText={setTagInput}
                onSubmitEditing={addTag} placeholder="e.g. y2k, casual, summer"
                placeholderTextColor="#bbb" returnKeyType="done" />
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

          <View style={{ height: 60 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Section({ title, required = false, children }: { title: string; required?: boolean; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <View style={s.sectionTitleRow}>
        <Text style={s.sectionTitle}>{title}</Text>
        {required && <Text style={s.requiredDot}>*</Text>}
      </View>
      {children}
    </View>
  );
}