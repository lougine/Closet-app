import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { Dimensions, SafeAreaView } from "react-native";
import type { ClothingItem } from "../../context/wardrobeContext";
import { s } from "../../Styles/wardrobe/item-detail.styles";

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

  const initialItem: ClothingItem = itemJson
    ? JSON.parse(itemJson)
    : {
        id: 0,
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
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
    if (!result.canceled && result.assets[0])
      update({ image: result.assets[0].uri });
  };

  const cpw =
    (item.timesWorn ?? 0) > 0
      ? ((item.totalCost ?? 0) / item.timesWorn!).toFixed(2)
      : (item.totalCost ?? 0).toFixed(2);

  return <SafeAreaView style={s.root}></SafeAreaView>;
}
