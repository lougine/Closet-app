import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, SafeAreaView } from "react-native";
import { useWardrobe } from "../../context/wardrobeContext";
import { s } from "../../Styles/wardrobe/add-items.styles";

const PINK = "#FF4F81";

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
  { label: "Orange", hex: "#FB8C00" }
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
      {/* SAME JSX — NOTHING CHANGED */}
    </SafeAreaView>
  );
}