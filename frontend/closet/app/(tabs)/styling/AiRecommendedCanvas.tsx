import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { ScrollView, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from "react-native";
import AuthenticatedImage from "../../../components/AuthenticatedImage";
import { s } from "../../../Styles/styling.styles";
import { useAppTheme } from "../../../context/themeContext";
import { inferRandomizeCategory, type RandomizeCategory } from "./RandomizeCanvas";

export type RecommendationGarment = {
  _id: string;
  name?: string;
  category?: string | string[];
  color?: string;
  season?: string;
  imageUrl?: string;
};

export type Recommendation = {
  name: string;
  score: number;
  reason: string;
  garments: RecommendationGarment[];
};

type WardrobeItem = {
  id: string | number;
  _id?: string;
  image?: string | null;
  bg?: string;
  category?: string[];
};

type UseAiRecommendedLogicParams = {
  items: any[];
  selectedItems: any[];
  inputText: string;
  eventText: string;
  setSelected: React.Dispatch<React.SetStateAction<string[]>>;
};

export function useAiRecommendedLogic({
  items,
  selectedItems,
  inputText,
  eventText,
  setSelected,
}: UseAiRecommendedLogicParams) {
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiShowcaseOpen, setAiShowcaseOpen] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [activeRecommendation, setActiveRecommendation] = useState(0);

  const applyRecommendationAt = (index: number, next: Recommendation[]) => {
    if (!next[index]) {
      setSelected([]);
      return;
    }
    setSelected(next[index].garments.map((garment) => garment._id));
  };

  const pickRandom = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

  const buildLocalRecommendations = (count: number): Recommendation[] => {
    const eventInput = inputText.trim() || eventText;
    const categoryPools: Record<RandomizeCategory, any[]> = {
      dress: [],
      outerwear: [],
      top: [],
      bottom: [],
      footwear: [],
    };

    items.forEach((item: any) => {
      const inferred = inferRandomizeCategory(item?.category || []);
      if (inferred !== "other") {
        categoryPools[inferred].push(item);
      }
    });

    const targetCategories: RandomizeCategory[] = ["outerwear", "top", "bottom", "footwear"];
    const allKnownItems = [
      ...categoryPools.outerwear,
      ...categoryPools.top,
      ...categoryPools.bottom,
      ...categoryPools.footwear,
      ...categoryPools.dress,
    ];

    if (allKnownItems.length === 0) return [];

    return Array.from({ length: count }).map((_, idx) => {
      const used = new Set<string>();

      const garments: RecommendationGarment[] = targetCategories.map((cat) => {
        const primaryPool = categoryPools[cat].filter((item) => !used.has(String(item?._id || item?.id)));
        const fallbackPool = allKnownItems.filter((item) => !used.has(String(item?._id || item?.id)));
        const item = primaryPool.length > 0
          ? pickRandom(primaryPool)
          : fallbackPool.length > 0
            ? pickRandom(fallbackPool)
            : pickRandom(allKnownItems);

        used.add(String(item?._id || item?.id));

        return {
          _id: String(item?._id || item?.id),
          category: item?.category,
          imageUrl: item?.image || undefined,
        };
      });

      return {
        name: `Recommendation ${idx + 1}`,
        score: Number((0.92 - idx * 0.08).toFixed(2)),
        reason: `UI mock for ${eventInput} using a 4-category mix.`,
        garments,
      };
    });
  };

  const loadAiRecommendations = async () => {
    setLoadingAi(true);
    try {
      const nextRecommendations = buildLocalRecommendations(3);

      setRecommendations(nextRecommendations);
      setActiveRecommendation(0);
      applyRecommendationAt(0, nextRecommendations);
    } finally {
      setLoadingAi(false);
    }
  };

  const aiShowcaseDisplayItems = useMemo(() => {
    const activeRecommendationGarments = recommendations[activeRecommendation]?.garments || [];

    const aiShowcaseItems = activeRecommendationGarments
      .map((garment: any) => {
        const matchedItem = items.find((item: any) => (
          String(item.id) === String(garment?._id) ||
          String(item._id) === String(garment?._id)
        ));

        if (matchedItem) return matchedItem;

        const imageFromGarment = garment?.imageUrl;
        if (!imageFromGarment) return null;

        return {
          id: `rec-${garment?._id || Math.random()}`,
          _id: garment?._id,
          image: imageFromGarment,
          bg: "#f7f7f7",
          category: Array.isArray(garment?.category) ? garment.category : [garment?.category].filter(Boolean),
        } as WardrobeItem;
      })
      .filter(Boolean) as WardrobeItem[];

    const aiShowcaseBuckets: Record<RandomizeCategory, WardrobeItem[]> = {
      dress: [],
      outerwear: [],
      top: [],
      bottom: [],
      footwear: [],
    };

    aiShowcaseItems.forEach((item) => {
      const inferred = inferRandomizeCategory(item.category || []);
      if (inferred === "other") return;
      aiShowcaseBuckets[inferred].push(item);
    });

    const aiShowcaseOrder: RandomizeCategory[] = ["outerwear", "top", "bottom", "footwear"];

    const aiShowcaseMainItems = aiShowcaseOrder
      .map((category) => aiShowcaseBuckets[category][0])
      .filter(Boolean) as WardrobeItem[];

    return aiShowcaseMainItems.length > 0
      ? aiShowcaseMainItems
      : aiShowcaseItems.length > 0
        ? aiShowcaseItems
        : selectedItems;
  }, [activeRecommendation, recommendations, items, selectedItems]);

  const selectedGridColumns = useMemo(() => Math.min(2, selectedItems.length), [selectedItems.length]);

  const resetAiState = () => {
    setRecommendations([]);
    setActiveRecommendation(0);
    setAiShowcaseOpen(false);
  };

  return {
    loadingAi,
    aiShowcaseOpen,
    setAiShowcaseOpen,
    recommendations,
    activeRecommendation,
    setActiveRecommendation,
    selectedGridColumns,
    aiShowcaseDisplayItems,
    loadAiRecommendations,
    resetAiState,
  };
}

type Props = {
  selectedItems: any[];
  selectedGridColumns: number;
  handleSelectedItemPress: (item: any) => void;
  loadingAi: boolean;
  loadingRandomize: boolean;
  savingOutfit: boolean;
  setAiShowcaseOpen: React.Dispatch<React.SetStateAction<boolean>>;
  loadAiRecommendations: () => void;
  aiShowcaseOpen: boolean;
  aiShowcaseDisplayItems: any[];
  inputText: string;
  setInputText: React.Dispatch<React.SetStateAction<string>>;
  eventText: string;
  temperatureC: number;
  recommendations: Array<{ reason?: string }>;
  activeRecommendation: number;
};

export default function AiRecommendedCanvas(props: Props) {
  const { isDarkMode } = useAppTheme();
  const theme = isDarkMode
    ? {
        card: "#202020",
        text: "#F2F2F2",
        subText: "#A7A7A7",
        border: "#343434",
        inputBg: "#262626",
      }
    : {
        card: "#FFFFFF",
        text: "#1A1A1A",
        subText: "#999999",
        border: "#F0F0F0",
        inputBg: "transparent",
      };

  const {
    selectedItems,
    selectedGridColumns,
    handleSelectedItemPress,
    loadingAi,
    loadingRandomize,
    savingOutfit,
    setAiShowcaseOpen,
    loadAiRecommendations,
    aiShowcaseOpen,
    aiShowcaseDisplayItems,
    inputText,
    setInputText,
    eventText,
    temperatureC,
    recommendations,
    activeRecommendation,
  } = props;

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={s.selectedGridContent}>
        {selectedItems.length <= 1 ? (
          selectedItems.map((item) => (
            <TouchableOpacity
              key={String(item.id)}
              style={[s.selectedItemCard, { backgroundColor: item.bg }]}
              onPress={() => handleSelectedItemPress(item)}
            >
              {item.image
                ? <AuthenticatedImage source={{ uri: item.image }} style={s.selectedItemImage} resizeMode="contain" />
                : <Text style={s.selectedItemEmoji}>👗</Text>
              }
            </TouchableOpacity>
          ))
        ) : (
          Array.from({ length: Math.ceil(selectedItems.length / selectedGridColumns) }).map((_, rowIndex) => {
            const rowItems = selectedItems.slice(
              rowIndex * selectedGridColumns,
              rowIndex * selectedGridColumns + selectedGridColumns,
            );

            return (
              <View key={`ai-row-${rowIndex}`} style={s.selectedGridRow}>
                {rowItems.map((item) => (
                  <TouchableOpacity
                    key={String(item.id)}
                    style={[s.selectedItemCard, { backgroundColor: item.bg }]}
                    onPress={() => handleSelectedItemPress(item)}
                  >
                    {item.image
                      ? <AuthenticatedImage source={{ uri: item.image }} style={s.selectedItemImage} resizeMode="contain" />
                      : <Text style={s.selectedItemEmoji}>👗</Text>
                    }
                  </TouchableOpacity>
                ))}
              </View>
            );
          })
        )}
      </View>

      <View style={s.canvasActions}>
        <TouchableOpacity
          style={s.actionBtn}
          onPress={() => setAiShowcaseOpen(true)}
          disabled={loadingAi}
        >
          <MaterialCommunityIcons name="fit-to-screen-outline" size={18} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={s.actionBtn} onPress={loadAiRecommendations} disabled={loadingAi}>
          <MaterialCommunityIcons name="refresh" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={[s.contextCard, { backgroundColor: theme.card }] }>
        <View style={s.tempRow}>
          <Text style={[s.tempTxt, { color: theme.subText }]}>{temperatureC}°C</Text>
        </View>
        <Text style={[s.eventTxt, { color: theme.text }]}>Event: {inputText.trim() || eventText}</Text>
        <View style={[s.inputRow, { borderColor: theme.border, backgroundColor: theme.inputBg }] }>
          <TextInput
            style={[s.input, { color: theme.text }]}
            placeholder="Type here or speak"
            placeholderTextColor={theme.subText}
            value={inputText}
            onChangeText={setInputText}
          />
          <Ionicons name="mic-outline" size={20} color={theme.subText} />
        </View>
        {recommendations[activeRecommendation]?.reason ? (
          <Text style={[s.recommendationReason, { color: theme.subText }]}>
            {recommendations[activeRecommendation].reason}
          </Text>
        ) : null}
        {(loadingAi || loadingRandomize || savingOutfit) ? (
          <Text style={[s.recommendationLoading, { color: theme.subText }]}>
            {savingOutfit ? "Saving outfit..." : loadingAi ? "Generating recommendations..." : "Randomizing..."}
          </Text>
        ) : null}
      </View>

      {aiShowcaseOpen && (
        <View style={s.aiShowcaseOverlay}>
          <TouchableWithoutFeedback onPress={() => setAiShowcaseOpen(false)}>
            <View style={s.aiShowcaseBackdrop} />
          </TouchableWithoutFeedback>

          <View style={s.aiShowcaseCard}>
            <View style={s.aiShowcaseHeader}>
              <Text style={s.aiShowcaseTitle}>AI Outfit Preview</Text>
              <TouchableOpacity onPress={() => setAiShowcaseOpen(false)}>
                <Ionicons name="close" size={20} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={s.aiShowcaseBody}>
              <View style={s.aiShowcaseMainColumn}>
                {aiShowcaseDisplayItems.length > 0 ? aiShowcaseDisplayItems.map((item) => (
                  <View key={`main-${item.id}`} style={[s.aiShowcaseMainItem, { backgroundColor: item.bg || "#f7f7f7" }]}>
                    {item.image
                      ? <AuthenticatedImage source={{ uri: item.image }} style={s.aiShowcaseImage} resizeMode="contain" />
                      : <Ionicons name="shirt-outline" size={24} color="#bbb" />
                    }
                  </View>
                )) : (
                  <View style={[s.aiShowcaseMainItem, { backgroundColor: "#fafafa" }]}>
                    <Text style={s.canvasEmptyTxt}>No outfit preview available yet</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}
