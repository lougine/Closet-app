import { Feather, Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { Alert, Animated, Dimensions, FlatList, Image, Modal, ScrollView, StatusBar, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from "react-native";
import AuthenticatedImage from "../../../components/AuthenticatedImage";
import AiRecommendedCanvas, { useAiRecommendedLogic } from "./AiRecommendedCanvas";
import CreateOutfitCanvas, { useCreateOutfitLogic } from "./CreateOutfitCanvas";
import RandomizeCanvas, { RANDOMIZE_PRESETS, RandomizeControls, useRandomizeModeLogic } from "./RandomizeCanvas";
import { buildApiUrl, buildAuthHeaders } from "../../../constants/api";
import { useWardrobe } from "../../../context/wardrobeContext";
import { PANEL_W, PINK, s } from "../../../Styles/styling.styles";

const { width: W } = Dimensions.get("window");
const MODES    = ["Create outfit", "Randomize", "AI recommended"] as const;
type Mode      = typeof MODES[number];
const PANEL_FILTER_TABS = ["All", "Outerwear", "Tops", "Bottoms", "Footwear", "Accessories"];
const RANDOMIZE_ROW_CARD_WIDTH = Math.min(220, Math.max(156, W * 0.52));
const RANDOMIZE_ROW_CARD_GAP = 8;
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
  visible, onClose, onSelect, selected,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (id: string) => void;
  selected: string[];
}) {
  const { items } = useWardrobe();
  const slideAnim = useRef(new Animated.Value(PANEL_W)).current;
  const [activeTab, setActiveTab] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [quickFilter, setQuickFilter] = useState<"all" | "favorites" | "hidden">("all");
  const [favoriteItemIds, setFavoriteItemIds] = useState<string[]>([]);
  const [hiddenItemIds, setHiddenItemIds] = useState<string[]>([]);

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

  const toggleFavorite = (itemId: string) => {
    setFavoriteItemIds((prev) => (prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]));
  };

  const toggleHidden = (itemId: string) => {
    setHiddenItemIds((prev) => (prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]));
  };

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

      <Animated.View style={[s.panel, { transform: [{ translateX: slideAnim }] }]}>
        {/* Header */}
        <View style={s.panelHeader}>
          <Text style={s.panelTitle}>Wardrobe</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={20} color="#555" />
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
              style={[s.panelTab, activeTab === tab && s.panelTabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                numberOfLines={1}
                style={[s.panelTabTxt, activeTab === tab && s.panelTabTxtActive]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          )}
        />

        {/* Search + filter row */}
        <View style={s.panelSearchRow}>
          <View style={s.panelSearchBar}>
            <Ionicons name="search" size={12} color="#aaa" />
            <TextInput
              style={s.panelSearchTxt}
              placeholder="Search"
              placeholderTextColor="#aaa"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity
            style={[s.panelIconBtn, quickFilter === "hidden" && s.panelIconBtnActive]}
            onPress={() => cycleQuickFilter("hidden")}
          >
            <Ionicons
              name={quickFilter === "hidden" ? "eye-off" : "eye-off-outline"}
              size={15}
              color={quickFilter === "hidden" ? "#fff" : "#333"}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.panelIconBtn, quickFilter === "favorites" && s.panelIconBtnActive]}
            onPress={() => cycleQuickFilter("favorites")}
          >
            <Ionicons
              name={quickFilter === "favorites" ? "star" : "star-outline"}
              size={15}
              color={quickFilter === "favorites" ? "#fff" : "#333"}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              s.panelIconBtn,
              activeFilterCount > 0 && s.panelIconBtnActive,
            ]}
            onPress={() => setShowFilter(true)}
          >
            <Feather
              name="sliders"
              size={15}
              color={activeFilterCount > 0 ? "#fff" : "#333"}
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
          data={filtered}
          numColumns={2}
          keyExtractor={i => String(i.id)}
          contentContainerStyle={s.panelGrid}
          columnWrapperStyle={s.panelRow}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const itemId = String(item.id);
            const isSelected = selected.includes(itemId);
            const isHidden = hiddenItemIds.includes(itemId);
            const isFavorite = favoriteItemIds.includes(itemId);

            return (
              <TouchableOpacity
                style={[s.panelItem, isSelected && s.panelItemSelected]}
                onPress={() => onSelect(itemId)}
                activeOpacity={0.8}
              >
                {item.image
                  ? <AuthenticatedImage source={{ uri: item.image }} style={s.panelImg} resizeMode="contain" />
                  : <View style={s.panelEmpty} />
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
            <View style={s.panelFilterSheet}>
              <View style={s.panelFilterHeader}>
                <TouchableOpacity onPress={clearFilters}>
                  <Text style={s.panelFilterClearTxt}>Clear all</Text>
                </TouchableOpacity>
                <Text style={s.panelFilterTitle}>Filter</Text>
                <TouchableOpacity onPress={() => setShowFilter(false)}>
                  <Ionicons name="close" size={20} color="#1a1a1a" />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={s.panelFilterScrollContent}
              >
                <Text style={s.panelFilterSection}>CATEGORY</Text>
                <View style={s.panelChipRow}>
                  {Object.keys(CATEGORY_TREE).map((category) => (
                    <TouchableOpacity
                      key={category}
                      style={[s.panelChip, filters.category === category && s.panelChipActive]}
                      onPress={() => setCategory(category)}
                    >
                      <Text style={[s.panelChipTxt, filters.category === category && s.panelChipTxtActive]}>{category}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {filters.category !== "" && (
                  <>
                    <Text style={s.panelFilterSection}>{filters.category.toUpperCase()} TYPE</Text>
                    <View style={s.panelChipRow}>
                      {CATEGORY_TREE[filters.category].map((subcategory) => (
                        <TouchableOpacity
                          key={subcategory}
                          style={[s.panelChip, filters.subcategories.includes(subcategory) && s.panelChipActive]}
                          onPress={() => toggleMulti("subcategories", subcategory)}
                        >
                          <Text style={[s.panelChipTxt, filters.subcategories.includes(subcategory) && s.panelChipTxtActive]}>{subcategory}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}

                <Text style={s.panelFilterSection}>COLOR</Text>
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
                        <Text style={s.panelSwatchLabel}>{colorName}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={s.panelFilterSection}>SEASON</Text>
                <View style={s.panelChipRow}>
                  {FILTER_SEASONS.map((season) => (
                    <TouchableOpacity
                      key={season}
                      style={[s.panelChip, filters.seasons.includes(season) && s.panelChipActive]}
                      onPress={() => toggleMulti("seasons", season)}
                    >
                      <Text style={[s.panelChipTxt, filters.seasons.includes(season) && s.panelChipTxtActive]}>{season}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={s.panelFilterSection}>SIZE</Text>
                <View style={s.panelChipRow}>
                  {FILTER_SIZES.map((sizeLabel) => (
                    <TouchableOpacity
                      key={sizeLabel}
                      style={[s.panelChip, filters.sizes.includes(sizeLabel) && s.panelChipActive]}
                      onPress={() => toggleMulti("sizes", sizeLabel)}
                    >
                      <Text style={[s.panelChipTxt, filters.sizes.includes(sizeLabel) && s.panelChipTxtActive]}>{sizeLabel}</Text>
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
  const params = useLocalSearchParams<{ mode?: string; date?: string }>();
  const router = useRouter();

  const resolveInitialMode = (): Mode => {
    if (params.mode === "randomize" || params.mode === "discover") return "Randomize";
    if (params.mode === "create") return "Create outfit";
    return "Create outfit";
  };

  const [mode, setMode]           = useState<Mode>(resolveInitialMode);
  const [panelOpen, setPanelOpen] = useState(false);
  const [selected, setSelected]   = useState<string[]>([]);
  const eventText = "Lara's wedding";
  const [inputText, setInputText] = useState("");
  const [temperatureC] = useState(23);
  const [savingOutfit, setSavingOutfit] = useState(false);
  const { items } = useWardrobe();

  const getToken = async () => {
    const token = await SecureStore.getItemAsync("userToken");
    if (!token) {
      Alert.alert("Session expired", "Please log in again.");
      return null;
    }
    return token;
  };

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
    resetAiState,
  } = useAiRecommendedLogic({
    items,
    selectedItems,
    inputText,
    eventText,
    setSelected,
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
          }),
        }),
        15000,
        "Save request timed out. Please check your connection and try again.",
      );

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        throw new Error(errorPayload?.message || "Could not save outfit");
      }

      Alert.alert("Saved", "Outfit has been saved.");
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

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {/* Header image */}
      <Image
        source={require('../../../assets/images/calendar.png')}
        style={s.headerImg}
        resizeMode="stretch"
      />

      {/* Title */}
      <View style={s.titleRow}>
        <Text style={s.title}>Styling</Text>
      </View>

      {/* Mode tabs */}
      <View style={s.modeTabs}>
        {MODES.map(m => (
          <TouchableOpacity
            key={m}
            style={[s.modeTab, mode === m && s.modeTabActive]}
            onPress={() => handleModeChange(m)}
          >
            <Text style={[s.modeTabTxt, mode === m && s.modeTabTxtActive]} numberOfLines={1}>
              {m}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Canvas */}
      <View
        style={[
          s.canvasWrap,
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
            <Ionicons name="shirt-outline" size={48} color="#e0e0e0" />
            <Text style={s.canvasEmptyTxt}>Tap › to pick items</Text>
          </View>
        ) : (
          <CreateOutfitCanvas
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

      {mode === "Randomize" && (
        <RandomizeControls
          presets={RANDOMIZE_PRESETS}
          randomizeOption={randomizeOption}
          setRandomizeOption={setRandomizeOption}
          loadRandomizedOutfit={loadRandomizedOutfit}
          disabled={loadingRandomize || loadingAi || savingOutfit}
        />
      )}

      <TouchableOpacity
        style={[
          s.saveOutfitBtn,
          (selected.length === 0 || savingOutfit || loadingAi || loadingRandomize) && s.saveOutfitBtnDisabled,
        ]}
        onPress={persistCurrentOutfit}
        disabled={selected.length === 0 || savingOutfit || loadingAi || loadingRandomize}
      >
        <Text style={s.saveOutfitBtnTxt}>
          {savingOutfit ? "Saving outfit..." : "Save outfit"}
        </Text>
      </TouchableOpacity>

      {/* Wardrobe side panel (Create outfit only) */}
      {mode === "Create outfit" && (
        <WardrobePanel
          visible={panelOpen}
          onClose={() => setPanelOpen(false)}
          onSelect={createOutfit.toggleItem}
          selected={selected}
        />
      )}
    </View>
  );
}