import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, ScrollView, TouchableOpacity, View } from "react-native";
import AuthenticatedImage from "../../../components/AuthenticatedImage";
import { s } from "../../../Styles/styling.styles";

export type RandomizeOption = 2 | 3 | 4;
export type RandomizeCategory = "dress" | "outerwear" | "top" | "bottom" | "footwear";

export const RANDOMIZE_PRESETS: Array<{ option: RandomizeOption; lines: number }> = [
  { option: 2, lines: 2 },
  { option: 3, lines: 3 },
  { option: 4, lines: 4 },
];

const RANDOMIZE_CATEGORY_ORDER: Record<RandomizeOption, RandomizeCategory[]> = {
  2: ["dress", "footwear"],
  3: ["top", "bottom", "footwear"],
  4: ["outerwear", "top", "bottom", "footwear"],
};

type WardrobeItem = {
  id: string | number;
  category?: string[];
};

type CanvasSnapshot = {
  selected: string[];
  dragPositions: Record<string, { x: number; y: number }>;
  itemScales: Record<string, number>;
  itemOrder: string[];
};

type UseRandomizeModeLogicParams = {
  items: WardrobeItem[];
  selected: string[];
  setSelected: React.Dispatch<React.SetStateAction<string[]>>;
  createCanvasSnapshot: () => CanvasSnapshot;
  pushUndoSnapshot: (snapshot: CanvasSnapshot) => void;
  isRandomizeMode: boolean;
  rowCardWidth: number;
  rowCardGap: number;
};

type Props = {
  randomizeRequiredCategories: Array<RandomizeCategory>;
  randomizePools: Record<string, any[]>;
  selectedByRandomizeCategory: Record<string, any>;
  pinnedByCategory: Record<string, string | undefined>;
  setPinnedByCategory: React.Dispatch<React.SetStateAction<Partial<Record<RandomizeCategory, string>>>>;
  replaceSelectedForCategory: (category: RandomizeCategory, itemId: string) => void;
  randomizeRowRefs: React.MutableRefObject<Partial<Record<RandomizeCategory, ScrollView | null>>>;
  randomizeRowCardWidth: number;
  randomizeRowCardGap: number;
  containerWidth: number;
};

type RandomizeControlsProps = {
  presets: Array<{ option: RandomizeOption; lines: number }>;
  randomizeOption: RandomizeOption;
  setRandomizeOption: (value: RandomizeOption) => void;
  loadRandomizedOutfit: (optionOverride?: RandomizeOption) => void;
  disabled: boolean;
};

export const inferRandomizeCategory = (categories: string[] = []): RandomizeCategory | "other" => {
  const normalized = categories.join(" ").toLowerCase();

  if (/(outerwear|jacket|coat|blazer|cardigan|parka|trench|windbreaker|kimono|cape)/i.test(normalized)) {
    return "outerwear";
  }
  if (/(dress|gown|jumpsuit|romper)/i.test(normalized)) {
    return "dress";
  }
  if (/(footwear|shoe|sneaker|boot|sandal|heel|loafer|slipper)/i.test(normalized)) {
    return "footwear";
  }
  if (/(bottom|pant|jean|skirt|short|trouser|legging)/i.test(normalized)) {
    return "bottom";
  }
  if (/(top|shirt|tee|t-shirt|blouse|sweater|hoodie|tank|camisole|polo)/i.test(normalized)) {
    return "top";
  }

  return "other";
};

const pickRandomItemId = (itemIds: string[]) => itemIds[Math.floor(Math.random() * itemIds.length)];

export function useRandomizeModeLogic({
  items,
  selected,
  setSelected,
  createCanvasSnapshot,
  pushUndoSnapshot,
  isRandomizeMode,
  rowCardWidth,
  rowCardGap,
}: UseRandomizeModeLogicParams) {
  const [loadingRandomize, setLoadingRandomize] = useState(false);
  const [randomizeOption, setRandomizeOption] = useState<RandomizeOption>(4);
  const [pinnedByCategory, setPinnedByCategory] = useState<Partial<Record<RandomizeCategory, string>>>({});
  const randomizeRowRefs = useRef<Partial<Record<RandomizeCategory, ScrollView | null>>>({});

  const randomizeRequiredCategories = RANDOMIZE_CATEGORY_ORDER[randomizeOption];

  const randomizePools = useMemo(() => {
    const pools: Record<RandomizeCategory, WardrobeItem[]> = {
      dress: [],
      outerwear: [],
      top: [],
      bottom: [],
      footwear: [],
    };

    items.forEach((item) => {
      const inferred = inferRandomizeCategory(item.category || []);
      if (inferred !== "other") {
        pools[inferred].push(item);
      }
    });

    return pools;
  }, [items]);

  const selectedByRandomizeCategory = useMemo(() => {
    const itemById = new Map(items.map((item) => [String(item.id), item]));
    const selectedByCategory: Partial<Record<RandomizeCategory, WardrobeItem>> = {};

    selected.forEach((id) => {
      const item = itemById.get(id);
      if (!item) return;
      const inferred = inferRandomizeCategory(item.category || []);
      if (inferred === "other") return;
      if (!selectedByCategory[inferred]) {
        selectedByCategory[inferred] = item;
      }
    });

    return selectedByCategory;
  }, [items, selected]);

  const loadRandomizedOutfit = async (optionOverride?: RandomizeOption) => {
    setLoadingRandomize(true);
    try {
      const selectedOption = optionOverride ?? randomizeOption;
      const requiredCategories = RANDOMIZE_CATEGORY_ORDER[selectedOption];

      const missing = requiredCategories.filter((category) => randomizePools[category].length === 0);
      if (missing.length > 0) {
        Alert.alert(
          "Not enough items",
          `Add at least one ${missing.join(", ")} item to use this randomize option.`
        );
        return;
      }

      const invalidPinned = requiredCategories.filter((category) => {
        const pinnedId = pinnedByCategory[category];
        return !!pinnedId && !randomizePools[category].some((item) => String(item.id) === pinnedId);
      });
      if (invalidPinned.length > 0) {
        setPinnedByCategory((prev) => {
          const next = { ...prev };
          invalidPinned.forEach((category) => {
            delete next[category];
          });
          return next;
        });
      }

      const chosenIds: string[] = [];
      const used = new Set<string>();

      requiredCategories.forEach((category) => {
        const pinnedId = pinnedByCategory[category];
        if (pinnedId && randomizePools[category].some((item) => String(item.id) === pinnedId) && !used.has(pinnedId)) {
          used.add(pinnedId);
          chosenIds.push(pinnedId);
          return;
        }

        const pool = randomizePools[category]
          .map((item) => String(item.id))
          .filter((id) => !used.has(id));
        if (pool.length === 0) return;
        const picked = pickRandomItemId(pool);
        used.add(picked);
        chosenIds.push(picked);
      });

      setSelected(chosenIds);
    } catch (error: any) {
      Alert.alert("Randomize failed", error?.message || "Could not generate a random outfit.");
    } finally {
      setLoadingRandomize(false);
    }
  };

  const replaceSelectedForCategory = (category: RandomizeCategory, itemId: string) => {
    pushUndoSnapshot(createCanvasSnapshot());

    setSelected((prev) => {
      const itemById = new Map(items.map((item) => [String(item.id), item]));
      const withoutCategory = prev.filter((id) => {
        const item = itemById.get(id);
        if (!item) return false;
        return inferRandomizeCategory(item.category || []) !== category;
      });
      return [...withoutCategory, itemId];
    });
  };

  const resetRandomizeState = () => {
    setRandomizeOption(4);
    setPinnedByCategory({});
  };

  useEffect(() => {
    if (!isRandomizeMode) return;

    const step = rowCardWidth + rowCardGap;

    randomizeRequiredCategories.forEach((category) => {
      const categoryItems = randomizePools[category];
      if (categoryItems.length === 0) return;

      const selectedItem = selectedByRandomizeCategory[category];
      const selectedIndex = selectedItem
        ? categoryItems.findIndex((item) => String(item.id) === String(selectedItem.id))
        : -1;
      const safeIndex = selectedIndex >= 0 ? selectedIndex : 0;
      const loopBaseIndex = categoryItems.length > 1 ? categoryItems.length : 0;
      const targetX = (safeIndex + loopBaseIndex) * step;

      randomizeRowRefs.current[category]?.scrollTo({ x: targetX, animated: false });
    });
  }, [
    isRandomizeMode,
    selected,
    randomizeOption,
    randomizePools,
    randomizeRequiredCategories,
    selectedByRandomizeCategory,
    rowCardWidth,
    rowCardGap,
  ]);

  return {
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
  };
}

export default function RandomizeCanvas(props: Props) {
  const {
    randomizeRequiredCategories,
    randomizePools,
    selectedByRandomizeCategory,
    pinnedByCategory,
    setPinnedByCategory,
    replaceSelectedForCategory,
    randomizeRowRefs,
    randomizeRowCardWidth,
    randomizeRowCardGap,
    containerWidth,
  } = props;

  return (
    <View style={s.randomizeSlotsBoard}>
      {randomizeRequiredCategories.map((category) => {
        const categoryItems = randomizePools[category] || [];
        const selectedItem = selectedByRandomizeCategory[category];
        const selectedIndex = selectedItem
          ? categoryItems.findIndex((item) => String(item.id) === String(selectedItem.id))
          : -1;
        const currentNormalizedIndex = selectedIndex >= 0 ? selectedIndex : 0;
        const isFootwearRow = category === "footwear";
        const loopedCategoryItems = categoryItems.length > 1
          ? [...categoryItems, ...categoryItems, ...categoryItems]
          : categoryItems;

        const rowStep = randomizeRowCardWidth + randomizeRowCardGap;
        const sidePeekPadding = Math.max(0, (containerWidth - randomizeRowCardWidth) / 2);

        const snapRowToNearest = (rawOffsetX: number, animated: boolean) => {
          if (categoryItems.length === 0) return;

          const snappedIndex = Math.max(
            0,
            Math.min(
              loopedCategoryItems.length - 1,
              Math.round(rawOffsetX / rowStep)
            )
          );

          const normalizedIndex = categoryItems.length > 1
            ? ((snappedIndex % categoryItems.length) + categoryItems.length) % categoryItems.length
            : 0;

          let nextNormalizedIndex = normalizedIndex;
          if (categoryItems.length > 1) {
            const forwardSteps = (normalizedIndex - currentNormalizedIndex + categoryItems.length) % categoryItems.length;
            const backwardSteps = (currentNormalizedIndex - normalizedIndex + categoryItems.length) % categoryItems.length;
            const stepDistance = Math.min(forwardSteps, backwardSteps);

            if (stepDistance > 1) {
              const moveForward = forwardSteps <= backwardSteps;
              nextNormalizedIndex = moveForward
                ? (currentNormalizedIndex + 1) % categoryItems.length
                : (currentNormalizedIndex - 1 + categoryItems.length) % categoryItems.length;
            }

            const centeredIndex = nextNormalizedIndex + categoryItems.length;
            const centeredOffset = centeredIndex * rowStep;
            if (Math.abs(centeredOffset - rawOffsetX) > 1) {
              randomizeRowRefs.current[category]?.scrollTo({ x: centeredOffset, animated });
            }
          } else if (Math.abs(rawOffsetX) > 1) {
            randomizeRowRefs.current[category]?.scrollTo({ x: 0, animated });
          }

          const nextItem = categoryItems[nextNormalizedIndex];
          if (!nextItem) return;

          if (String(selectedItem?.id) !== String(nextItem.id)) {
            replaceSelectedForCategory(category, String(nextItem.id));
          }
        };

        if (categoryItems.length === 0) {
          return (
            <View key={category} style={s.randomizeSlotRow}>
              <View style={[s.randomizeCenterSlot, s.randomizeSlotEmpty, { width: randomizeRowCardWidth, alignSelf: "center" }]}>
                <Ionicons name="shirt-outline" size={20} color="#bbb" />
              </View>
            </View>
          );
        }

        return (
          <View key={category} style={s.randomizeSlotRow}>
            <ScrollView
              horizontal
              ref={(ref) => { randomizeRowRefs.current[category] = ref; }}
              style={{ flex: 1 }}
              contentContainerStyle={{ alignItems: "center", paddingHorizontal: sidePeekPadding }}
              showsHorizontalScrollIndicator={false}
              bounces={false}
              decelerationRate="fast"
              snapToInterval={rowStep}
              snapToAlignment="center"
              disableIntervalMomentum
              scrollEventThrottle={16}
              onScrollEndDrag={(event) => {
                snapRowToNearest(event.nativeEvent.contentOffset.x, true);
              }}
              onMomentumScrollEnd={(event) => {
                snapRowToNearest(event.nativeEvent.contentOffset.x, false);
              }}
            >
              {loopedCategoryItems.map((rowItem, rowIndex) => {
                const rowItemId = String(rowItem.id);
                const isPinned = pinnedByCategory[category] === rowItemId;

                return (
                  <View
                    key={`${category}-${rowItemId}-${rowIndex}`}
                    style={[s.randomizeCenterSlot, { width: randomizeRowCardWidth, marginHorizontal: randomizeRowCardGap / 2 }]}
                  >
                    <TouchableOpacity
                      style={s.randomizePinBtn}
                      onPress={() => {
                        setPinnedByCategory((prev) => {
                          if (prev[category] === rowItemId) {
                            const next = { ...prev };
                            delete next[category];
                            return next;
                          }

                          return {
                            ...prev,
                            [category]: rowItemId,
                          };
                        });
                      }}
                      activeOpacity={0.8}
                    >
                      <MaterialCommunityIcons
                        name={isPinned ? "pin" : "pin-outline"}
                        size={20}
                        color={isPinned ? "#111" : "#666"}
                      />
                    </TouchableOpacity>
                    {rowItem.image
                      ? <AuthenticatedImage
                        source={{ uri: rowItem.image }}
                        style={[
                          s.randomizeCenterItemImage,
                          isFootwearRow && s.randomizeFootwearCenterItemImage,
                        ]}
                        resizeMode="contain"
                      />
                      : <Ionicons name="shirt-outline" size={20} color="#bbb" />
                    }
                  </View>
                );
              })}
            </ScrollView>
          </View>
        );
      })}
    </View>
  );
}

export function RandomizeControls(props: RandomizeControlsProps) {
  const {
    presets,
    randomizeOption,
    setRandomizeOption,
    loadRandomizedOutfit,
    disabled,
  } = props;

  return (
    <View style={s.randomizeControlsRow}>
      {presets.map(({ option, lines }) => (
        <TouchableOpacity
          key={option}
          style={[
            s.randomizeOptionPill,
            randomizeOption === option && s.randomizeOptionPillActive,
          ]}
          onPress={() => {
            setRandomizeOption(option);
            loadRandomizedOutfit(option);
          }}
          disabled={disabled}
        >
          <View style={s.randomizeStackIcon}>
            {Array.from({ length: lines }).map((_, idx) => (
              <View
                key={`${option}-${idx}`}
                style={[
                  s.randomizeStackDash,
                  randomizeOption === option && s.randomizeStackDashActive,
                ]}
              />
            ))}
          </View>
        </TouchableOpacity>
      ))}

      <TouchableOpacity
        style={[
          s.randomizeIconBtn,
          disabled && s.randomizeBtnDisabled,
        ]}
        onPress={() => loadRandomizedOutfit()}
        disabled={disabled}
      >
        <MaterialCommunityIcons name="shuffle-variant" size={18} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}
