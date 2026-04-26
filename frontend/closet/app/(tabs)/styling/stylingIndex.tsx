import { Feather, Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { captureRef } from "react-native-view-shot";
import { Alert, Animated, Dimensions, FlatList, Image, Modal, ScrollView, StatusBar, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from "react-native";
import AuthenticatedImage from "../../../components/AuthenticatedImage";
import AiRecommendedCanvas, { useAiRecommendedLogic } from "./AiRecommendedCanvas";
import CreateOutfitCanvas, { useCreateOutfitLogic } from "./CreateOutfitCanvas";
import RandomizeCanvas, { RANDOMIZE_PRESETS, RandomizeControls, useRandomizeModeLogic } from "./RandomizeCanvas";
import { buildApiUrl, buildAuthHeaders } from "../../../constants/api";
import { useWardrobe } from "../../../context/wardrobeContext";
import { useAppTheme } from "../../../context/themeContext";
import { PANEL_W, PINK, s } from "../../../Styles/styling.styles";
import { UploadRequestError, getUploadErrorMessage, uploadMultipartWithRetry } from "../../../services/uploadRequest";

const { width: W } = Dimensions.get("window");
const MODES    = ["Create outfit", "Randomize", "AI recommended"] as const;
type Mode      = typeof MODES[number];
const PANEL_FILTER_TABS = ["All", "Outerwear", "Tops", "Bottoms", "Footwear", "Accessories"];
const RANDOMIZE_ROW_CARD_WIDTH = Math.min(220, Math.max(156, W * 0.52));
const RANDOMIZE_ROW_CARD_GAP = 8;
const INDEX_REFRESH_AFTER_RANDOMIZE_SAVE_KEY = "indexRefreshAfterRandomizeSave";
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
const FILTER_COLORS = ["Black", "White", "Grey", "Brown", "Beige", "Red", "Pink", "Purple", "Blue", "Navy", "Green", "Yellow", "Orange"];
const FILTER_SEASONS = ["Spring", "Summer", "Autumn", "Winter"];
const FILTER_SIZES = ["XXS", "XS", "S", "M", "L", "XL", "XXL"];
const COLOR_HEX: Record<string, string> = {
  Black: "#111",
  White: "#fff",
  Grey: "#9E9E9E",
  Brown: "#795548",
  Beige: "#D7C4A3",
  Red: "#E53935",
  Pink: "#F48FB1",
  Purple: "#9C27B0",
  Blue: "#1E88E5",
  Navy: "#1A237E",
  Green: "#43A047",
  Yellow: "#FDD835",
  Orange: "#FB8C00",
};

interface FilterState {
  category: string;
  subcategories: string[];
  colors: string[];
  seasons: string[];
  sizes: string[];
}

const EMPTY_FILTERS: FilterState = {
  category: "",
  subcategories: [],
  colors: [],
  seasons: [],
  sizes: [],
};

const normalizeCategory = (category?: string) => {
  if (!category) return "";
  return /^shoes$/i.test(category) ? "Footwear" : category;
};

const getObjectIdTimestamp = (value: unknown) => {
  if (typeof value !== "string" || value.length < 8) return 0;
  const seconds = Number.parseInt(value.slice(0, 8), 16);
  return Number.isFinite(seconds) ? seconds * 1000 : 0;
};

const getItemAddedTimestamp = (item: any) => {
  const createdAtMs = item?.createdAt ? new Date(item.createdAt).getTime() : 0;
  if (Number.isFinite(createdAtMs) && createdAtMs > 0) return createdAtMs;

  const dateAddedMs = item?.dateAdded ? new Date(item.dateAdded).getTime() : 0;
  if (Number.isFinite(dateAddedMs) && dateAddedMs > 0) return dateAddedMs;

  return getObjectIdTimestamp(item?.id);
};

const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

function WardrobePanel({
  visible, onClose, onSelect, selected, items, panelTitle,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (id: string) => void;
  selected: string[];
  items: any[];
  panelTitle?: string;
}) {
  const { isDarkMode } = useAppTheme();
  const panelTheme = isDarkMode
    ? {
        panelBg: "#121212",
        panelCard: "#1E1E1E",
        panelText: "#F2F2F2",
        panelSubText: "#A7A7A7",
        panelBorder: "#343434",
      }
    : {
        panelBg: "#FFFFFF",
        panelCard: "#FFFFFF",
        panelText: "#1A1A1A",
        panelSubText: "#777777",
        panelBorder: "#EAEAEA",
      };
  const slideAnim = useRef(new Animated.Value(PANEL_W)).current;
  const [activeTab, setActiveTab] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [quickFilter, setQuickFilter] = useState<"all" | "favorites" | "hidden">("all");
  const [favoriteItemIds, setFavoriteItemIds] = useState<string[]>([]);
  const [hiddenItemIds, setHiddenItemIds] = useState<string[]>([]);
  const [updatingPreferenceIds, setUpdatingPreferenceIds] = useState<string[]>([]);

  useEffect(() => {
    setFavoriteItemIds(
      items.filter((item) => item.isFavorite).map((item) => String(item.id)),
    );
    setHiddenItemIds(
      items.filter((item) => item.isHidden).map((item) => String(item.id)),
    );
  }, [items]);

  const setCategory = (cat: string) =>
    setFilters((prev) => ({
      ...prev,
      category: prev.category === cat ? "" : cat,
      subcategories: [],
    }));

  const toggleMulti = (
    key: keyof Omit<FilterState, "category">,
    value: string,
  ) => {
    setFilters((prev) => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter((entry) => entry !== value)
        : [...prev[key], value],
    }));
  };

  const clearFilters = () => setFilters(EMPTY_FILTERS);

  const activeFilterCount =
    (filters.category ? 1 : 0)
    + filters.subcategories.length
    + filters.colors.length
    + filters.seasons.length
    + filters.sizes.length;

  const persistGarmentPreference = useCallback(
    async (id: string, updates: { isFavorite?: boolean; isHidden?: boolean }) => {
      const token = await SecureStore.getItemAsync("userToken");
      if (!token) {
        throw new Error("Not authenticated");
      }

      const url = buildApiUrl(`/api/garments/${id}/preferences`);
      const headers = {
        ...buildAuthHeaders(token),
        "Content-Type": "application/json",
      };
      const body = JSON.stringify(updates);

      let response = await fetch(url, {
        method: "PATCH",
        headers,
        body,
      });

      // Fallback for environments/proxies that block PATCH.
      if (response.status === 404 || response.status === 405) {
        response = await fetch(url, {
          method: "PUT",
          headers,
          body,
        });
      }

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || "Failed to update garment preference");
      }
    },
    [],
  );

  const toggleFavorite = useCallback(
    async (itemId: string) => {
      if (updatingPreferenceIds.includes(itemId)) return;

      const wasFavorite = favoriteItemIds.includes(itemId);
      const nextFavorite = !wasFavorite;

      setFavoriteItemIds((prev) =>
        nextFavorite ? [...prev, itemId] : prev.filter((id) => id !== itemId),
      );
      setUpdatingPreferenceIds((prev) => [...prev, itemId]);

      try {
        await persistGarmentPreference(itemId, { isFavorite: nextFavorite });
      } catch (error: any) {
        setFavoriteItemIds((prev) =>
          wasFavorite
            ? (prev.includes(itemId) ? prev : [...prev, itemId])
            : prev.filter((id) => id !== itemId),
        );
        Alert.alert("Update failed", error?.message || "Could not update favorite status.");
      } finally {
        setUpdatingPreferenceIds((prev) => prev.filter((id) => id !== itemId));
      }
    },
    [favoriteItemIds, persistGarmentPreference, updatingPreferenceIds],
  );

  const toggleHidden = useCallback(
    async (itemId: string) => {
      if (updatingPreferenceIds.includes(itemId)) return;

      const wasHidden = hiddenItemIds.includes(itemId);
      const nextHidden = !wasHidden;

      setHiddenItemIds((prev) =>
        nextHidden ? [...prev, itemId] : prev.filter((id) => id !== itemId),
      );
      setUpdatingPreferenceIds((prev) => [...prev, itemId]);

      try {
        await persistGarmentPreference(itemId, { isHidden: nextHidden });
      } catch (error: any) {
        setHiddenItemIds((prev) =>
          wasHidden
            ? (prev.includes(itemId) ? prev : [...prev, itemId])
            : prev.filter((id) => id !== itemId),
        );
        Alert.alert("Update failed", error?.message || "Could not update hidden status.");
      } finally {
        setUpdatingPreferenceIds((prev) => prev.filter((id) => id !== itemId));
      }
    },
    [hiddenItemIds, persistGarmentPreference, updatingPreferenceIds],
  );

  const cycleQuickFilter = (target: "favorites" | "hidden") => {
    setQuickFilter((prev) => {
      if (prev === target) return "all";
      return target;
    });
  };

  const filtered = items.filter(item => {
    const normalizedItemCategories = (item.category ?? []).map((category: string) => normalizeCategory(category));

    if (
      activeTab !== "All" &&
      !normalizedItemCategories.includes(activeTab)
    ) return false;
    if (searchQuery && !item.label.toLowerCase().includes(searchQuery.toLowerCase())) return false;

    if (filters.category && !normalizedItemCategories.includes(normalizeCategory(filters.category))) return false;
    if (
      filters.subcategories.length > 0
      && !filters.subcategories.some((subcategory) =>
        (item.tags ?? []).map((tag: string) => tag.toLowerCase()).includes(subcategory.toLowerCase())
      )
    ) return false;
    if (
      filters.colors.length > 0
      && !filters.colors.some((color) => (item.colors ?? []).includes(color))
    ) return false;
    if (
      filters.seasons.length > 0
      && !filters.seasons.some((season) =>
        (item.tags ?? []).map((tag: string) => tag.toLowerCase()).includes(season.toLowerCase())
      )
    ) return false;
    if (filters.sizes.length > 0 && !filters.sizes.includes(item.size ?? "")) return false;

    const itemId = String(item.id);
    if (quickFilter === "favorites" && !favoriteItemIds.includes(itemId)) return false;
    if (quickFilter === "hidden" && !hiddenItemIds.includes(itemId)) return false;

    return true;
  });

  const filteredSorted = [...filtered].sort(
    (a, b) => getItemAddedTimestamp(b) - getItemAddedTimestamp(a),
  );

  const gridData = React.useMemo(() => {
    if (filteredSorted.length % 2 === 0) return filteredSorted;
    return [
      ...filteredSorted,
      {
        id: "__panel_spacer__",
        __isSpacer: true,
      },
    ];
  }, [filteredSorted]);

  React.useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 0 : PANEL_W,
      useNativeDriver: true,
      tension: 80, friction: 12,
    }).start();
  }, [visible]);

  if (!visible) return null;

  const clearAllVisibleFilters = () => {
    setActiveTab("All");
    setSearchQuery("");
    setQuickFilter("all");
    clearFilters();
  };

  return (
    <View style={s.panelOverlay}>
      {/* Dim background */}
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={s.panelBg} />
      </TouchableWithoutFeedback>

      <Animated.View
        style={[
          s.panel,
          { transform: [{ translateX: slideAnim }] },
          { backgroundColor: isDarkMode ? panelTheme.panelBg : "#F6F6F6" },
        ]}
      >
        {/* Header */}
        <View style={s.panelHeader}>
          <Text style={[s.panelTitle, { color: panelTheme.panelText }]}>{panelTitle || "Wardrobe"}</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={20} color={panelTheme.panelSubText} />
          </TouchableOpacity>
        </View>

        {/* Category tabs */}
        <FlatList
          horizontal
          data={PANEL_FILTER_TABS}
          keyExtractor={t => t}
          style={s.panelTabsList}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.panelTabsRow}
          renderItem={({ item: tab }) => (
            <TouchableOpacity
              style={[
                s.panelTab,
                { backgroundColor: isDarkMode ? "#2A2A2A" : "#FFFFFF" },
                activeTab === tab && s.panelTabActive,
              ]}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                numberOfLines={1}
                style={[s.panelTabTxt, { color: panelTheme.panelSubText }, activeTab === tab && s.panelTabTxtActive]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          )}
        />

        {/* Search + filter row */}
        <View style={s.panelSearchRow}>
          <View style={[s.panelSearchBar, { backgroundColor: panelTheme.panelCard, borderColor: panelTheme.panelBorder, borderWidth: 1 }] }>
            <Ionicons name="search" size={12} color={panelTheme.panelSubText} />
            <TextInput
              style={[s.panelSearchTxt, { color: panelTheme.panelText }]}
              placeholder="Search"
              placeholderTextColor={panelTheme.panelSubText}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity
            style={[
              s.panelIconBtn,
              {
                backgroundColor: panelTheme.panelCard,
                borderColor: panelTheme.panelBorder,
                borderWidth: 1,
              },
              quickFilter === "hidden" && s.panelIconBtnActive,
            ]}
            onPress={() => cycleQuickFilter("hidden")}
          >
            <Ionicons
              name={quickFilter === "hidden" ? "eye-off" : "eye-off-outline"}
              size={15}
              color={quickFilter === "hidden" ? "#fff" : panelTheme.panelSubText}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              s.panelIconBtn,
              {
                backgroundColor: panelTheme.panelCard,
                borderColor: panelTheme.panelBorder,
                borderWidth: 1,
              },
              quickFilter === "favorites" && s.panelIconBtnActive,
            ]}
            onPress={() => cycleQuickFilter("favorites")}
          >
            <Ionicons
              name={quickFilter === "favorites" ? "star" : "star-outline"}
              size={15}
              color={quickFilter === "favorites" ? "#fff" : panelTheme.panelSubText}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              s.panelIconBtn,
              {
                backgroundColor: panelTheme.panelCard,
                borderColor: panelTheme.panelBorder,
                borderWidth: 1,
              },
              activeFilterCount > 0 && s.panelIconBtnActive,
            ]}
            onPress={() => setShowFilter(true)}
          >
            <Feather
              name="sliders"
              size={15}
              color={activeFilterCount > 0 ? "#fff" : panelTheme.panelSubText}
            />
            {activeFilterCount > 0 && (
              <View style={s.panelBadge}>
                <Text style={s.panelBadgeTxt}>{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Grid */}
        <FlatList
          data={gridData}
          numColumns={2}
          keyExtractor={i => String(i.id)}
          contentContainerStyle={s.panelGrid}
          columnWrapperStyle={s.panelRow}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            if ((item as any).__isSpacer) {
              return <View style={[s.panelItem, s.panelItemSpacer]} />;
            }

            const itemData = item as any;
            const itemId = String(itemData.id);
            const isSelected = selected.includes(itemId);
            const isHidden = hiddenItemIds.includes(itemId);
            const isFavorite = favoriteItemIds.includes(itemId);

            return (
              <TouchableOpacity
                style={[
                  s.panelItem,
                  { backgroundColor: isDarkMode ? "#252525" : "#FFFFFF" },
                  isSelected && s.panelItemSelected,
                ]}
                onPress={() => onSelect(itemId)}
                activeOpacity={0.8}
              >
                {itemData.image
                  ? <AuthenticatedImage source={{ uri: itemData.image }} style={s.panelImg} resizeMode="contain" />
                  : <View style={[s.panelEmpty, { backgroundColor: isDarkMode ? "#2D2D2D" : "#F5F5F5" }]} />
                }
                {isHidden && <View style={s.panelItemHiddenOverlay} />}

                <TouchableOpacity
                  style={s.panelEye}
                  onPress={(e) => {
                    e.stopPropagation();
                    toggleHidden(itemId);
                  }}
                >
                  <Ionicons name={isHidden ? "eye-off" : "eye"} size={13} color={isHidden ? "#333" : "#aaa"} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={s.panelStar}
                  onPress={(e) => {
                    e.stopPropagation();
                    toggleFavorite(itemId);
                  }}
                >
                  <Ionicons name={isFavorite ? "star" : "star-outline"} size={13} color={isFavorite ? "#333" : "#aaa"} />
                </TouchableOpacity>

                {isSelected && (
                  <View style={s.panelItemOverlay}>
                    <Ionicons name="checkmark-circle" size={28} color={PINK} />
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />

        <Modal
          transparent
          visible={showFilter}
          animationType="slide"
          onRequestClose={() => setShowFilter(false)}
        >
          <View style={s.panelFilterOverlay}>
            <TouchableOpacity
              style={s.panelFilterDismiss}
              activeOpacity={1}
              onPress={() => setShowFilter(false)}
            />
            <View style={[s.panelFilterSheet, { backgroundColor: panelTheme.panelBg }] }>
              <View style={s.panelFilterHeader}>
                <TouchableOpacity onPress={clearFilters}>
                  <Text style={s.panelFilterClearTxt}>Clear all</Text>
                </TouchableOpacity>
                <Text style={[s.panelFilterTitle, { color: panelTheme.panelText }]}>Filter</Text>
                <TouchableOpacity onPress={() => setShowFilter(false)}>
                  <Ionicons name="close" size={20} color={panelTheme.panelText} />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={s.panelFilterScrollContent}
              >
                <Text style={[s.panelFilterSection, { color: panelTheme.panelSubText }]}>CATEGORY</Text>
                <View style={s.panelChipRow}>
                  {Object.keys(CATEGORY_TREE).map((category) => (
                    <TouchableOpacity
                      key={category}
                      style={[
                        s.panelChip,
                        { backgroundColor: isDarkMode ? "#2A2A2A" : "#FAFAFA", borderColor: panelTheme.panelBorder },
                        filters.category === category && s.panelChipActive,
                      ]}
                      onPress={() => setCategory(category)}
                    >
                      <Text style={[s.panelChipTxt, { color: panelTheme.panelSubText }, filters.category === category && s.panelChipTxtActive]}>{category}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {filters.category !== "" && (
                  <>
                    <Text style={[s.panelFilterSection, { color: panelTheme.panelSubText }]}>{filters.category.toUpperCase()} TYPE</Text>
                    <View style={s.panelChipRow}>
                      {CATEGORY_TREE[filters.category].map((subcategory) => (
                        <TouchableOpacity
                          key={subcategory}
                          style={[
                            s.panelChip,
                            { backgroundColor: isDarkMode ? "#2A2A2A" : "#FAFAFA", borderColor: panelTheme.panelBorder },
                            filters.subcategories.includes(subcategory) && s.panelChipActive,
                          ]}
                          onPress={() => toggleMulti("subcategories", subcategory)}
                        >
                          <Text style={[s.panelChipTxt, { color: panelTheme.panelSubText }, filters.subcategories.includes(subcategory) && s.panelChipTxtActive]}>{subcategory}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}

                <Text style={[s.panelFilterSection, { color: panelTheme.panelSubText }]}>COLOR</Text>
                <View style={s.panelColorRow}>
                  {FILTER_COLORS.map((colorName) => {
                    const hex = COLOR_HEX[colorName];
                    const selected = filters.colors.includes(colorName);
                    const isLight = ["White", "Cream", "Yellow", "Gold", "Beige"].includes(colorName);

                    return (
                      <TouchableOpacity
                        key={colorName}
                        style={s.panelColorOpt}
                        onPress={() => toggleMulti("colors", colorName)}
                      >
                        <View
                          style={[
                            s.panelSwatch,
                            { backgroundColor: hex },
                            isLight && s.panelSwatchBorder,
                            selected && s.panelSwatchSelected,
                          ]}
                        >
                          {selected && (
                            <Ionicons
                              name="checkmark"
                              size={13}
                              color={isLight ? "#333" : "#fff"}
                            />
                          )}
                        </View>
                        <Text style={[s.panelSwatchLabel, { color: panelTheme.panelSubText }]}>{colorName}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={[s.panelFilterSection, { color: panelTheme.panelSubText }]}>SEASON</Text>
                <View style={s.panelChipRow}>
                  {FILTER_SEASONS.map((season) => (
                    <TouchableOpacity
                      key={season}
                      style={[
                        s.panelChip,
                        { backgroundColor: isDarkMode ? "#2A2A2A" : "#FAFAFA", borderColor: panelTheme.panelBorder },
                        filters.seasons.includes(season) && s.panelChipActive,
                      ]}
                      onPress={() => toggleMulti("seasons", season)}
                    >
                      <Text style={[s.panelChipTxt, { color: panelTheme.panelSubText }, filters.seasons.includes(season) && s.panelChipTxtActive]}>{season}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[s.panelFilterSection, { color: panelTheme.panelSubText }]}>SIZE</Text>
                <View style={s.panelChipRow}>
                  {FILTER_SIZES.map((sizeLabel) => (
                    <TouchableOpacity
                      key={sizeLabel}
                      style={[
                        s.panelChip,
                        { backgroundColor: isDarkMode ? "#2A2A2A" : "#FAFAFA", borderColor: panelTheme.panelBorder },
                        filters.sizes.includes(sizeLabel) && s.panelChipActive,
                      ]}
                      onPress={() => toggleMulti("sizes", sizeLabel)}
                    >
                      <Text style={[s.panelChipTxt, { color: panelTheme.panelSubText }, filters.sizes.includes(sizeLabel) && s.panelChipTxtActive]}>{sizeLabel}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <TouchableOpacity
                style={s.panelApplyBtn}
                onPress={() => setShowFilter(false)}
              >
                <Text style={s.panelApplyBtnTxt}>
                  {filtered.length === items.length
                    ? `Show All Items · ${items.length}`
                    : `Show Results · ${filtered.length}`}
                </Text>
              </TouchableOpacity>

              {(activeTab !== "All" || quickFilter !== "all" || searchQuery.length > 0 || activeFilterCount > 0) && (
                <TouchableOpacity
                  style={s.panelClearFiltersBtn}
                  onPress={() => {
                    clearAllVisibleFilters();
                    setShowFilter(false);
                  }}
                >
                  <Text style={s.panelClearFiltersBtnTxt}>Reset all filters</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Modal>
      </Animated.View>
    </View>
  );
}

export default function StylingScreen() {
  const params = useLocalSearchParams<{
    mode?: string;
    date?: string;
    outfitJson?: string;
  }>();
  const router = useRouter();
  const { isDarkMode } = useAppTheme();
  const theme = isDarkMode
    ? {
        screen: "#121212",
        card: "#1E1E1E",
        text: "#F2F2F2",
        subText: "#A7A7A7",
        border: "#353535",
      }
    : {
        screen: "#F6F6F6",
        card: "#FFFFFF",
        text: "#1A1A1A",
        subText: "#888888",
        border: "#ECECEC",
      };

  const resolveInitialMode = (): Mode => {
    const normalizedMode = String(params.mode || "").trim().toLowerCase();
    if (normalizedMode === "randomize" || normalizedMode === "discover") return "Randomize";
    if (normalizedMode === "ai-recommended" || normalizedMode === "ai recommended" || normalizedMode === "ai") {
      return "AI recommended";
    }
    if (normalizedMode === "create") return "Create outfit";
    return "Create outfit";
  };

  const [mode, setMode]           = useState<Mode>(resolveInitialMode);
  const [panelOpen, setPanelOpen] = useState(false);
  const [selected, setSelected]   = useState<string[]>([]);
  const [lastSavedOutfitId, setLastSavedOutfitId] = useState<string>("");
  const [mainOutfitSaved, setMainOutfitSaved] = useState(false);
  const eventText = "Lara's wedding";
  const [inputText, setInputText] = useState("");
  const [temperatureC] = useState(23);
  const [savingOutfit, setSavingOutfit] = useState(false);
  const [capturingCreatePreview, setCapturingCreatePreview] = useState(false);
  const { items, incrementOutfitCount } = useWardrobe();
  const createOutfitCanvasRef = useRef<View>(null);

  useEffect(() => {
    const normalizedMode = String(params.mode || "").trim().toLowerCase();
    if (!normalizedMode) return;

    if (normalizedMode === "randomize" || normalizedMode === "discover") {
      setMode("Randomize");
      return;
    }

    if (normalizedMode === "ai-recommended" || normalizedMode === "ai recommended" || normalizedMode === "ai") {
      setMode("AI recommended");
      return;
    }

    if (normalizedMode === "create") {
      setMode("Create outfit");
    }
  }, [params.mode]);

  const getToken = async () => {
    const token = await SecureStore.getItemAsync("userToken");
    if (!token) {
      Alert.alert("Session expired", "Please log in again.");
      return null;
    }
    return token;
  };

  const captureCreateOutfitPreview = useCallback(async () => {
    const canvasNode = createOutfitCanvasRef.current;
    if (!canvasNode) {
      throw new Error("Outfit canvas is not ready yet.");
    }

    return captureRef(canvasNode as any, {
      format: "png",
      quality: 1,
      result: "tmpfile",
    });
  }, []);

  const uploadOutfitPreview = useCallback(async (outfitId: string, previewUri: string) => {
    const token = await getToken();
    if (!token) {
      throw new Error("Please log in again.");
    }

    const formData = new FormData();
    formData.append("coverImage", {
      uri: previewUri,
      name: `outfit-preview-${Date.now()}.png`,
      type: "image/png",
    } as any);

    return uploadMultipartWithRetry<any>({
      endpoint: `/api/outfits/${outfitId}/cover`,
      method: "PUT",
      token,
      formData,
      timeoutMs: 30000,
      retries: 1,
      fallbackMessage: "Unable to upload outfit preview.",
    });
  }, [getToken]);

  const selectedItems = items.filter((i: any) => (
    selected.includes(String(i.id)) || selected.includes(String(i._id))
  ));

  const createOutfit = useCreateOutfitLogic({
    mode,
    selected,
    setSelected,
    selectedItems,
  });

  const {
    loadingRandomize,
    randomizeOption,
    setRandomizeOption,
    pinnedByCategory,
    setPinnedByCategory,
    randomizeRowRefs,
    randomizeRequiredCategories,
    randomizePools,
    selectedByRandomizeCategory,
    loadRandomizedOutfit,
    replaceSelectedForCategory,
    resetRandomizeState,
  } = useRandomizeModeLogic({
    items,
    selected,
    setSelected,
    createCanvasSnapshot: createOutfit.createCanvasSnapshot,
    pushUndoSnapshot: createOutfit.pushUndoSnapshot,
    isRandomizeMode: mode === "Randomize",
    rowCardWidth: RANDOMIZE_ROW_CARD_WIDTH,
    rowCardGap: RANDOMIZE_ROW_CARD_GAP,
  });

  const {
    loadingAi,
    aiShowcaseOpen,
    setAiShowcaseOpen,
    recommendations,
    activeRecommendation,
    selectedGridColumns,
    aiShowcaseDisplayItems,
    loadAiRecommendations,
    sendStyleMessage,
    chatMessages,
    resetAiState,
  } = useAiRecommendedLogic({
    items,
    selectedItems,
    inputText,
    eventText,
    setSelected,
    setInputText,
  });

  const handleModeChange = (nextMode: Mode) => {
    if (nextMode === mode) return;

    // Always start each mode with a fresh state.
    setPanelOpen(false);
    setSelected([]);
    setInputText("");
    createOutfit.resetCreateState();
    resetRandomizeState();
    resetAiState();
    setMode(nextMode);
  };

  const persistCurrentOutfit = async () => {
    if (savingOutfit) return;

    if (selected.length === 0) {
      Alert.alert("No outfit selected", "Generate or select an outfit first.");
      return;
    }

    const token = await getToken();
    if (!token) return;

    setSavingOutfit(true);
    try {
      const selectedRecommendation = recommendations[activeRecommendation];

      const response = await withTimeout(
        fetch(buildApiUrl("/api/outfits"), {
          method: "POST",
          headers: {
            ...buildAuthHeaders(token),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: selectedRecommendation?.name || `${mode} Outfit`,
            garments: selected,
            styledLayout: mode === "Create outfit"
              ? {
                  dragPositions: createOutfit.dragPositions,
                  itemScales: createOutfit.itemScales,
                  itemOrder: createOutfit.itemOrder,
                  canvasSize: createOutfit.canvasSize,
                }
              : undefined,
          }),
        }),
        15000,
        "Save request timed out. Please check your connection and try again.",
      );

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        throw new Error(errorPayload?.message || "Could not save outfit");
      }

      const savedOutfit = await response.json().catch(() => null);
      if (!savedOutfit?._id) {
        throw new Error("Outfit was saved but no valid ID was returned.");
      }

      if (mode === "Create outfit") {
        try {
          setCapturingCreatePreview(true);
          createOutfit.setSelectedCanvasItemId(null);
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
          const previewUri = await captureCreateOutfitPreview();
          await uploadOutfitPreview(savedOutfit._id, previewUri);
        } catch (previewError: any) {
          if (previewError instanceof UploadRequestError) {
            console.warn(getUploadErrorMessage(previewError, "Unable to upload outfit preview."));
          } else {
            console.warn(previewError?.message || "Unable to upload outfit preview.");
          }
        } finally {
          setCapturingCreatePreview(false);
        }
      }

      incrementOutfitCount();
      await SecureStore.setItemAsync(INDEX_REFRESH_AFTER_RANDOMIZE_SAVE_KEY, "1");

      setMainOutfitSaved(true);
      router.replace({
        pathname: "/(tabs)" as any,
        params: { tab: "outfits" },
      });
    } catch (error: any) {
      Alert.alert("Save failed", error?.message || "Could not save this outfit.");
    } finally {
      setSavingOutfit(false);
    }
  };

  const saveOutfitToCalendar = async () => {
    if (savingOutfit) return;

    if (selected.length === 0) {
      Alert.alert("No outfit selected", "Generate or select an outfit first.");
      return;
    }

    const token = await getToken();
    if (!token) return;

    setSavingOutfit(true);
    try {
      const selectedRecommendation = recommendations[activeRecommendation];
      const outfitName = selectedRecommendation?.name || `${mode} Outfit`;
      let previewImageUri: string | undefined;

      const response = await withTimeout(
        fetch(buildApiUrl("/api/outfits"), {
          method: "POST",
          headers: {
            ...buildAuthHeaders(token),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: outfitName,
            garments: selected,
            styledLayout: mode === "Create outfit"
              ? {
                  dragPositions: createOutfit.dragPositions,
                  itemScales: createOutfit.itemScales,
                  itemOrder: createOutfit.itemOrder,
                  canvasSize: createOutfit.canvasSize,
                }
              : undefined,
          }),
        }),
        15000,
        "Save request timed out. Please check your connection and try again.",
      );

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        throw new Error(errorPayload?.message || "Could not save outfit");
      }

      const savedOutfit = await response.json().catch(() => null);
      if (!savedOutfit?._id) {
        throw new Error("Outfit was saved but no valid ID was returned.");
      }

      if (mode === "Create outfit") {
        try {
          setCapturingCreatePreview(true);
          createOutfit.setSelectedCanvasItemId(null);
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
          const previewUri = await captureCreateOutfitPreview();
          previewImageUri = previewUri;
          await uploadOutfitPreview(savedOutfit._id, previewUri);
        } catch (previewError: any) {
          if (previewError instanceof UploadRequestError) {
            console.warn(getUploadErrorMessage(previewError, "Unable to upload outfit preview."));
          } else {
            console.warn(previewError?.message || "Unable to upload outfit preview.");
          }
        } finally {
          setCapturingCreatePreview(false);
        }
      }

      incrementOutfitCount();
      await SecureStore.setItemAsync(INDEX_REFRESH_AFTER_RANDOMIZE_SAVE_KEY, "1");

      setLastSavedOutfitId(JSON.stringify(selected));
      setMainOutfitSaved(true);
      router.push({
        pathname: "/(tabs)/calendar/month",
        params: {
          outfitId: String(savedOutfit._id),
          outfitName,
          ...(previewImageUri ? { previewImageUri } : {}),
        },
      });
    } catch (error: any) {
      Alert.alert("Save failed", error?.message || "Could not save this outfit.");
    } finally {
      setSavingOutfit(false);
    }
  };

  useEffect(() => {
    if (mode === "Randomize") {
      loadRandomizedOutfit();
      return;
    }

    if (mode === "AI recommended") {
      loadAiRecommendations();
    }
  }, [mode]);

  useEffect(() => {
    setLastSavedOutfitId("");
    setMainOutfitSaved(false);
  }, [selected]);

  // Load outfit from day view when editing an existing outfit
  useEffect(() => {
    if (params.outfitJson) {
      try {
        const outfit = JSON.parse(params.outfitJson);
        const garmentIds = outfit.garmentIds || outfit.garments || [];
        setSelected(garmentIds.map(String));
      } catch (error) {
        console.error('Failed to parse outfit:', error);
      }
    }
  }, [params.outfitJson]);

  const handleSelectedItemPress = (item: (typeof selectedItems)[number]) => {
    if (mode === "Create outfit") {
      createOutfit.toggleItem(String(item.id));
      return;
    }

    router.push({
      pathname: "/wardrobe/item-detail" as any,
      params: { itemJson: JSON.stringify(item) },
    });
  };

  const shouldScrollActionArea = mode === "Create outfit" || mode === "Randomize";

  return (
    <View style={[s.root, { backgroundColor: theme.screen }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} translucent backgroundColor="transparent" />
      <>

      {/* Header image */}
      <Image
        source={require('../../../assets/images/calendar.png')}
        style={s.headerImg}
        resizeMode="stretch"
      />

      {/* Title */}
      <View style={s.titleRow}>
        <Text style={[s.title, { color: theme.text }]}>Styling</Text>
      </View>

      {/* Mode tabs */}
      <View style={[s.modeTabs, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }] }>
        {MODES.map(m => {
          return (
          <TouchableOpacity
            key={m}
            style={[s.modeTab, mode === m && s.modeTabActive]}
            onPress={() => handleModeChange(m)}
          >
            <Text
              style={[
                s.modeTabTxt,
                { color: theme.subText },
                mode === m && s.modeTabTxtActive,
              ]}
              numberOfLines={1}
            >
              {m}
            </Text>
          </TouchableOpacity>
        )})}
      </View>

      {/* Canvas */}
      <View
        style={[
          s.canvasWrap,
          { backgroundColor: theme.card },
          mode === "Create outfit" && s.createCanvasWrap,
          mode === "Randomize" && s.randomizeCanvasWrap,
          mode === "Randomize" && s.randomizeCanvasFlat,
        ]}
        onLayout={(event) => {
          const { width, height } = event.nativeEvent.layout;
          createOutfit.setCanvasSize((prev: { width: number; height: number }) => (
            prev.width === width && prev.height === height ? prev : { width, height }
          ));
        }}
      >
        {mode === "AI recommended" ? (
          <AiRecommendedCanvas
            selectedItems={selectedItems}
            selectedGridColumns={selectedGridColumns}
            handleSelectedItemPress={handleSelectedItemPress}
            loadingAi={loadingAi}
            loadingRandomize={loadingRandomize}
            savingOutfit={savingOutfit}
            setAiShowcaseOpen={setAiShowcaseOpen}
            loadAiRecommendations={loadAiRecommendations}
            aiShowcaseOpen={aiShowcaseOpen}
            aiShowcaseDisplayItems={aiShowcaseDisplayItems}
            inputText={inputText}
            setInputText={setInputText}
            eventText={eventText}
            temperatureC={temperatureC}
            recommendations={recommendations}
            activeRecommendation={activeRecommendation}
            chatMessages={chatMessages}
            sendStyleMessage={sendStyleMessage}
          />
        ) : mode === "Randomize" ? (
          <RandomizeCanvas
            randomizeRequiredCategories={randomizeRequiredCategories}
            randomizePools={randomizePools}
            selectedByRandomizeCategory={selectedByRandomizeCategory as any}
            pinnedByCategory={pinnedByCategory as any}
            setPinnedByCategory={setPinnedByCategory}
            replaceSelectedForCategory={replaceSelectedForCategory}
            randomizeRowRefs={randomizeRowRefs as any}
            randomizeRowCardWidth={RANDOMIZE_ROW_CARD_WIDTH}
            randomizeRowCardGap={RANDOMIZE_ROW_CARD_GAP}
            containerWidth={W}
          />
        ) : selectedItems.length === 0 ? (
          <View style={s.canvasEmpty}>
            <Ionicons name="shirt-outline" size={48} color={isDarkMode ? "#6A6A6A" : "#e0e0e0"} />
            <Text style={[s.canvasEmptyTxt, { color: theme.subText }]}>Tap › to pick items</Text>
          </View>
        ) : (
          <CreateOutfitCanvas
            canvasCaptureRef={createOutfitCanvasRef}
            hideCanvasControls={capturingCreatePreview}
            orderedSelectedItems={createOutfit.orderedSelectedItems}
            dragPositions={createOutfit.dragPositions}
            activeDragId={createOutfit.activeDragId}
            selectedCanvasItemId={createOutfit.selectedCanvasItemId}
            setSelectedCanvasItemId={createOutfit.setSelectedCanvasItemId}
            setActiveDragId={createOutfit.setActiveDragId}
            setDragPositions={createOutfit.setDragPositions}
            setSelected={createOutfit.setSelected}
            setItemScales={createOutfit.setItemScales}
            setItemOrder={createOutfit.setItemOrder}
            undoStack={createOutfit.undoStack}
            redoStack={createOutfit.redoStack}
            handleUndo={createOutfit.handleUndo}
            handleRedo={createOutfit.handleRedo}
            createCanvasSnapshot={createOutfit.createCanvasSnapshot}
            pushUndoSnapshot={createOutfit.pushUndoSnapshot}
            bringItemToFront={createOutfit.bringItemToFront}
            clampDragPosition={createOutfit.clampDragPosition}
            getItemScale={createOutfit.getItemScale}
            dragSnapshotRef={createOutfit.dragSnapshotRef}
            tapSlop={createOutfit.tapSlop}
            dragMargin={createOutfit.dragMargin}
            dragCardW={createOutfit.dragCardW}
            dragCardH={createOutfit.dragCardH}
            onCanvasTouchStart={createOutfit.onCanvasTouchStart}
            onCanvasTouchMove={createOutfit.onCanvasTouchMove}
            onCanvasTouchEnd={createOutfit.onCanvasTouchEnd}
          />
        )}

        {/* Pull tab — Create outfit mode */}
        {mode === "Create outfit" && (
          <TouchableOpacity style={s.pullTab} onPress={() => setPanelOpen(true)}>
            <Ionicons name="chevron-forward" size={16} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {shouldScrollActionArea ? (
        <ScrollView
          style={{ maxHeight: 156 }}
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {mode === "Randomize" && (
            <RandomizeControls
              presets={RANDOMIZE_PRESETS}
              randomizeOption={randomizeOption}
              setRandomizeOption={setRandomizeOption}
              loadRandomizedOutfit={loadRandomizedOutfit}
              disabled={loadingRandomize || loadingAi || savingOutfit}
            />
          )}

          <View style={{ flexDirection: "row", gap: 8, marginHorizontal: 16, marginTop: 12 }}>
            <TouchableOpacity
              style={[
                s.saveOutfitBtn,
                { flex: 1, marginHorizontal: 0, marginTop: 0 },
                (selected.length === 0 || savingOutfit || loadingAi || loadingRandomize || mainOutfitSaved) && s.saveOutfitBtnDisabled,
              ]}
              onPress={persistCurrentOutfit}
              disabled={selected.length === 0 || savingOutfit || loadingAi || loadingRandomize || mainOutfitSaved}
            >
              <Text style={s.saveOutfitBtnTxt}>
                {savingOutfit ? "Saving outfit..." : mainOutfitSaved ? "Saved" : "Save outfit"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                s.saveOutfitBtn,
                { flex: 1, marginHorizontal: 0, marginTop: 0 },
                (selected.length === 0 || loadingAi || loadingRandomize || savingOutfit || lastSavedOutfitId === JSON.stringify(selected)) && s.saveOutfitBtnDisabled,
              ]}
              onPress={saveOutfitToCalendar}
              disabled={selected.length === 0 || loadingAi || loadingRandomize || savingOutfit || lastSavedOutfitId === JSON.stringify(selected)}
            >
              <Text style={s.saveOutfitBtnTxt}>
                {savingOutfit
                  ? "Saving outfit..."
                  : lastSavedOutfitId === JSON.stringify(selected)
                    ? "Saved"
                    : "Save to Calendar"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <View>
          <View style={{ flexDirection: "row", gap: 8, marginHorizontal: 16, marginTop: 12 }}>
            <TouchableOpacity
              style={[
                s.saveOutfitBtn,
                { flex: 1, marginHorizontal: 0, marginTop: 0 },
                (selected.length === 0 || savingOutfit || loadingAi || loadingRandomize || mainOutfitSaved) && s.saveOutfitBtnDisabled,
              ]}
              onPress={persistCurrentOutfit}
              disabled={selected.length === 0 || savingOutfit || loadingAi || loadingRandomize || mainOutfitSaved}
            >
              <Text style={s.saveOutfitBtnTxt}>
                {savingOutfit ? "Saving outfit..." : mainOutfitSaved ? "Saved" : "Save outfit"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                s.saveOutfitBtn,
                { flex: 1, marginHorizontal: 0, marginTop: 0 },
                (selected.length === 0 || loadingAi || loadingRandomize || savingOutfit || lastSavedOutfitId === JSON.stringify(selected)) && s.saveOutfitBtnDisabled,
              ]}
              onPress={saveOutfitToCalendar}
              disabled={selected.length === 0 || loadingAi || loadingRandomize || savingOutfit || lastSavedOutfitId === JSON.stringify(selected)}
            >
              <Text style={s.saveOutfitBtnTxt}>
                {savingOutfit
                  ? "Saving outfit..."
                  : lastSavedOutfitId === JSON.stringify(selected)
                    ? "Saved"
                    : "Save to Calendar"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      </>

      {/* Wardrobe side panel (Create outfit only) */}
      {mode === "Create outfit" && (
        <WardrobePanel
          visible={panelOpen}
          onClose={() => setPanelOpen(false)}
          onSelect={createOutfit.toggleItem}
          selected={selected}
          items={items}
          panelTitle="Wardrobe"
        />
      )}
    </View>
  );
}
