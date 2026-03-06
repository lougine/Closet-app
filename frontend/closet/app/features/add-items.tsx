// app/features/add-items.tsx
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useWardrobe } from "../../context/wardrobeContext";

const PINK = "#FF4F81";

const CATEGORIES = [
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
  { label: "Black", hex: "#111111" },
  { label: "White", hex: "#FFFFFF" },
  { label: "Grey", hex: "#9E9E9E" },
  { label: "Brown", hex: "#795548" },
  { label: "Beige", hex: "#D7C4A3" },
  { label: "Red", hex: "#E53935" },
  { label: "Pink", hex: "#F48FB1" },
  { label: "Purple", hex: "#9C27B0" },
  { label: "Blue", hex: "#1E88E5" },
  { label: "Navy", hex: "#1A237E" },
  { label: "Green", hex: "#43A047" },
  { label: "Yellow", hex: "#FDD835" },
  { label: "Orange", hex: "#FB8C00" },
  { label: "Gold", hex: "#FFD700" },
  { label: "Mint", hex: "#80CBC4" },
  { label: "Cream", hex: "#FFF8E1" },
];

// bg colours per category
const CATEGORY_BG: Record<string, string> = {
  Tops: "#fce4ec",
  Bottoms: "#f3e5f5",
  Dresses: "#fce4ec",
  Outerwear: "#f5f5f5",
  Footwear: "#fff8e1",
  Accessories: "#e8f5e9",
  Bags: "#faf6f0",
  Swimwear: "#e3f2fd",
};

interface ItemForm {
  name: string;
  category: string;
  colors: string[];
  brand: string;
  size: string;
  tags: string[];
  cost: string;
  datePurchased: string;
}

export default function AddItemsScreen() {
  const router = useRouter();
  const { addItem } = useWardrobe();
  const { image } = useLocalSearchParams<{ image: string }>();

  const [form, setForm] = useState<ItemForm>({
    name: "",
    category: "",
    colors: [],
    brand: "",
    size: "",
    tags: [],
    cost: "",
    datePurchased: "",
  });
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);

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
    update(
      "tags",
      form.tags.filter((t) => t !== tag),
    );

  const handleSave = () => {
    if (!form.name.trim()) {
      Alert.alert("Missing name", "Please give this item a name.");
      return;
    }
    if (!form.category) {
      Alert.alert("Missing category", "Please select a category.");
      return;
    }
    setSaving(true);

    // ✅ Actually add to wardrobe context
    addItem({
      id: Date.now(),
      image: (image as string) ?? null,
      label: form.name.trim(),
      bg: CATEGORY_BG[form.category] ?? "#fce4ec",
      category: [form.category],
      colors: form.colors,
      brand: form.brand,
      size: form.size,
      tags: form.tags,
      totalCost: parseFloat(form.cost) || 0,
      timesWorn: 0,
      dateAdded:
        form.datePurchased ||
        new Date().toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        }),
    });

    setSaving(false);
    router.back();
  };

  return (
    <SafeAreaView style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Add Item</Text>
        <TouchableOpacity
          style={[s.saveBtn, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={s.saveBtnText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Photo */}
          <View style={s.photoCard}>
            {image ? (
              <Image
                source={{ uri: image as string }}
                style={s.photo}
                resizeMode="contain"
              />
            ) : (
              <View style={s.photoPlaceholder}>
                <Ionicons name="image-outline" size={48} color="#ccc" />
                <Text style={s.photoPlaceholderText}>No photo</Text>
              </View>
            )}
          </View>

          {/* Name */}
          <Section title="Item Name" required>
            <TextInput
              style={s.textInput}
              value={form.name}
              onChangeText={(v) => update("name", v)}
              placeholder="e.g. Black Leather Jacket"
              placeholderTextColor="#bbb"
              returnKeyType="done"
            />
          </Section>

          {/* Category */}
          <Section title="Category" required>
            <View style={s.chipRow}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[s.chip, form.category === cat && s.chipActive]}
                  onPress={() => update("category", cat)}
                >
                  <Text
                    style={[
                      s.chipText,
                      form.category === cat && s.chipTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Section>

          {/* Colors */}
          <Section title="Colors">
            <View style={s.colorGrid}>
              {COLOR_OPTIONS.map(({ label, hex }) => {
                const selected = form.colors.includes(label);
                const isLight = [
                  "#FFFFFF",
                  "#FFF8E1",
                  "#FDD835",
                  "#FFD700",
                ].includes(hex);
                return (
                  <TouchableOpacity
                    key={label}
                    style={s.colorOpt}
                    onPress={() => toggleColor(label)}
                  >
                    <View
                      style={[
                        s.colorSwatch,
                        { backgroundColor: hex },
                        (hex === "#FFFFFF" || hex === "#FFF8E1") &&
                          s.swatchBorder,
                        selected && s.swatchSelected,
                      ]}
                    >
                      {selected && (
                        <Ionicons
                          name="checkmark"
                          size={14}
                          color={isLight ? "#333" : "#fff"}
                        />
                      )}
                    </View>
                    <Text style={s.colorLabel}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Section>

          {/* Brand */}
          <Section title="Brand">
            <TextInput
              style={s.textInput}
              value={form.brand}
              onChangeText={(v) => update("brand", v)}
              placeholder="e.g. Zara, H&M, Vintage"
              placeholderTextColor="#bbb"
              returnKeyType="done"
            />
          </Section>

          {/* Size */}
          <Section title="Size">
            <TextInput
              style={s.textInput}
              value={form.size}
              onChangeText={(v) => update("size", v)}
              placeholder="e.g. XS, S, M, 36, 8"
              placeholderTextColor="#bbb"
              returnKeyType="done"
            />
          </Section>

          {/* Cost */}
          <Section title="Cost">
            <View style={s.inputRow}>
              <Text style={s.currencySymbol}>$</Text>
              <TextInput
                style={[
                  s.textInput,
                  {
                    flex: 1,
                    borderLeftWidth: 0,
                    borderTopLeftRadius: 0,
                    borderBottomLeftRadius: 0,
                  },
                ]}
                value={form.cost}
                onChangeText={(v) => update("cost", v.replace(/[^0-9.]/g, ""))}
                placeholder="0.00"
                placeholderTextColor="#bbb"
                keyboardType="decimal-pad"
              />
            </View>
          </Section>

          {/* Date */}
          <Section title="Date Purchased">
            <TextInput
              style={s.textInput}
              value={form.datePurchased}
              onChangeText={(v) => update("datePurchased", v)}
              placeholder="e.g. Jan 2024"
              placeholderTextColor="#bbb"
              returnKeyType="done"
            />
          </Section>

          {/* Tags */}
          <Section title="Tags">
            <View style={s.tagInputRow}>
              <TextInput
                style={[s.textInput, { flex: 1 }]}
                value={tagInput}
                onChangeText={setTagInput}
                onSubmitEditing={addTag}
                placeholder="e.g. y2k, casual, summer"
                placeholderTextColor="#bbb"
                returnKeyType="done"
              />
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

function Section({
  title,
  required = false,
  children,
}: {
  title: string;
  required?: boolean;
  children: React.ReactNode;
}) {
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

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fafafa" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 17, fontWeight: "600", color: "#1a1a1a" },
  saveBtn: {
    backgroundColor: PINK,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  saveBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  photoCard: {
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#f0eeea",
    height: 260,
    marginBottom: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  photo: { width: "100%", height: "100%" },
  photoPlaceholder: { alignItems: "center", justifyContent: "center", gap: 8 },
  photoPlaceholderText: { fontSize: 13, color: "#bbb" },
  section: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#888",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  requiredDot: { fontSize: 15, color: PINK, fontWeight: "700", marginTop: -2 },
  textInput: {
    borderWidth: 1,
    borderColor: "#ebebeb",
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 11,
    fontSize: 15,
    color: "#1a1a1a",
    backgroundColor: "#fafafa",
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#e8e8e8",
    backgroundColor: "#fafafa",
  },
  chipActive: { backgroundColor: PINK, borderColor: PINK },
  chipText: { fontSize: 13, color: "#555", fontWeight: "500" },
  chipTextActive: { color: "#fff", fontWeight: "600" },
  colorGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  colorOpt: { alignItems: "center", gap: 4, width: 46 },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  swatchBorder: { borderWidth: 1, borderColor: "#ddd" },
  swatchSelected: { borderWidth: 3, borderColor: PINK },
  colorLabel: { fontSize: 9, color: "#888", textAlign: "center" },
  inputRow: { flexDirection: "row", alignItems: "center" },
  currencySymbol: {
    fontSize: 15,
    color: "#555",
    fontWeight: "600",
    backgroundColor: "#f2f2f7",
    borderWidth: 1,
    borderColor: "#ebebeb",
    borderRightWidth: 0,
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  tagInputRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  tagAddBtn: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: PINK,
    alignItems: "center",
    justifyContent: "center",
  },
  tagsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  tagPill: {
    backgroundColor: PINK,
    borderRadius: 20,
    paddingVertical: 5,
    paddingLeft: 12,
    paddingRight: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  tagText: { color: "#fff", fontSize: 13, fontWeight: "500" },
  tagX: { color: "#fff", fontSize: 17, lineHeight: 19 },
});
