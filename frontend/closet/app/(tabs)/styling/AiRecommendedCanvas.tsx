import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { ScrollView, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from "react-native";
import * as SecureStore from "expo-secure-store";
import { buildAuthHeaders, buildImageUrl, fetchApiWithFallback } from "../../../constants/api";
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

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
};

type WardrobeItem = {
  id: string | number;
  _id?: string;
  image?: string | null;
  imageUrl?: string | null;
  bg?: string;
  category?: string[];
};

const resolveImageUri = (value?: string | null) => {
  if (!value) return null;
  return buildImageUrl(value);
};

type UseAiRecommendedLogicParams = {
  items: any[];
  selectedItems: any[];
  inputText: string;
  eventText: string;
  setSelected: React.Dispatch<React.SetStateAction<string[]>>;
  setInputText: React.Dispatch<React.SetStateAction<string>>;
};

const buildInitialChatMessages = (eventText: string): ChatMessage[] => [
  {
    id: "assistant-welcome",
    role: "assistant",
    content: eventText 
      ? `Ask me what to wear for ${eventText}, or describe the vibe you want.`
      : `Ask me what to wear for an event, or describe the vibe you want.`,
  },
];

export function useAiRecommendedLogic({
  items,
  selectedItems,
  inputText,
  eventText,
  setSelected,
  setInputText,
}: UseAiRecommendedLogicParams) {
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiShowcaseOpen, setAiShowcaseOpen] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [activeRecommendation, setActiveRecommendation] = useState(0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => buildInitialChatMessages(eventText));

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
      const token = await SecureStore.getItemAsync('userToken');
      const res = await fetchApiWithFallback('/api/outfits/recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...buildAuthHeaders(token),
        },
        body: JSON.stringify({
          count: 3,
          event: eventText || inputText,
          temperatureC: 25,
        }),
      });

      if (!res.ok) throw new Error('Failed to load AI recommendations');

      const { recommendations: backendRecs } = await res.json();

      let nextRecommendations = backendRecs;
      if (!nextRecommendations || nextRecommendations.length === 0) {
        nextRecommendations = buildLocalRecommendations(3);
      }

      setRecommendations(nextRecommendations);
      setActiveRecommendation(0);
      applyRecommendationAt(0, nextRecommendations);
    } catch (e) {
      console.warn("AI Recommendations Error, falling back to local:", e);
      const fallback = buildLocalRecommendations(3);
      setRecommendations(fallback);
      setActiveRecommendation(0);
      applyRecommendationAt(0, fallback);
    } finally {
      setLoadingAi(false);
    }
  };

  const buildAssistantReplyFromRecommendations = (nextRecommendations: Recommendation[], message: string) => {
    const topRecommendation = nextRecommendations[0];
    const topGarments = topRecommendation?.garments || [];
    const garmentNames = topGarments
      .map((garment) => garment.name || garment.category)
      .filter(Boolean)
      .slice(0, 3)
      .join(', ');

    if (topRecommendation && garmentNames) {
      return `${topRecommendation.reason || 'Here is a stronger option for your look.'} I would start with ${garmentNames}.`;
    }

    return `I looked at ${message.toLowerCase().includes('office') ? 'your outfit for work' : 'your wardrobe'} and refreshed the strongest matching looks.`;
  };

  const sendStyleMessage = async () => {
    const message = inputText.trim() || eventText.trim();
    if (!message || loadingAi) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message,
    };

    const nextMessages = [...chatMessages, userMessage];
    setChatMessages(nextMessages);
    setLoadingAi(true);
    setInputText('');

    try {
      const token = await SecureStore.getItemAsync('userToken');
      const chatResponse = await fetchApiWithFallback('/api/outfits/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...buildAuthHeaders(token),
        },
        body: JSON.stringify({
          message,
          event: eventText,
          temperatureC: 25,
          count: 3,
          messages: nextMessages.slice(-8).map((entry) => ({
            role: entry.role,
            content: entry.content,
          })),
        }),
      });

      let payload: any = null;
      if (chatResponse.ok) {
        payload = await chatResponse.json();
      } else {
        const fallbackResponse = await fetchApiWithFallback('/api/outfits/recommendations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...buildAuthHeaders(token),
          },
          body: JSON.stringify({
            count: 3,
            event: eventText || message,
            temperatureC: 25,
          }),
        });

        if (!fallbackResponse.ok) {
          throw new Error('Failed to reach styling endpoints');
        }

        const fallbackPayload = await fallbackResponse.json();
        payload = {
          reply: buildAssistantReplyFromRecommendations(fallbackPayload?.recommendations || [], message),
          recommendations: fallbackPayload?.recommendations || [],
        };
      }

      const replyText = String(payload?.reply || '').trim() || 'I can help refine that look.';

      setChatMessages((current) => ([
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: replyText,
        },
      ]));

      if (Array.isArray(payload?.recommendations) && payload.recommendations.length > 0) {
        setRecommendations(payload.recommendations);
        setActiveRecommendation(0);
        applyRecommendationAt(0, payload.recommendations);
        
        // If the AI specifically returned matched garments from the chat, auto-open the visualizer
        if (payload.recommendations[0]?.name === 'Chatbot Suggestion') {
          setAiShowcaseOpen(true);
        }
      }
    } catch (error) {
      console.warn('Style chat Error, falling back to recommendations:', error);
      const fallback = buildLocalRecommendations(3);
      setRecommendations(fallback);
      setActiveRecommendation(0);
      applyRecommendationAt(0, fallback);
      setChatMessages((current) => ([
        ...current,
        {
          id: `assistant-fallback-${Date.now()}`,
          role: 'assistant',
          content: 'I could not reach the styling service, so I refreshed the outfit suggestions locally.',
        },
      ]));
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

        if (matchedItem) {
          const normalizedMatchedImage = resolveImageUri(
            matchedItem.image || matchedItem.imageUrl || garment?.imageUrl || null,
          );

          return {
            ...matchedItem,
            image: normalizedMatchedImage,
          };
        }

        const imageFromGarment = resolveImageUri(garment?.imageUrl || null);
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
    setChatMessages(buildInitialChatMessages(eventText));
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
    sendStyleMessage,
    chatMessages,
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
  chatMessages: ChatMessage[];
  sendStyleMessage: () => void;
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
    chatMessages,
    sendStyleMessage,
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
        <Text style={[s.eventTxt, { color: theme.text }]}>Style chat</Text>
        <View style={s.chatThread}>
          {chatMessages.map((message) => (
            <View
              key={message.id}
              style={[
                s.chatBubble,
                message.role === 'user' ? s.chatBubbleUser : s.chatBubbleAssistant,
                { backgroundColor: message.role === 'user' ? '#1E88E5' : (isDarkMode ? '#2A2A2A' : '#F7F7F7') },
              ]}
            >
              <Text style={[s.chatBubbleText, { color: message.role === 'user' ? '#fff' : theme.text }]}>
                {message.content}
              </Text>
            </View>
          ))}
        </View>
        <View style={[s.inputRow, { borderColor: theme.border, backgroundColor: theme.inputBg, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, marginTop: 10 }] }>
          <TextInput
            style={[s.input, { color: theme.text, flex: 1, padding: 0 }]}
            placeholder="Ask for outfit advice or a vibe..."
            placeholderTextColor={theme.subText}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={sendStyleMessage}
            returnKeyType="send"
          />
          <TouchableOpacity onPress={sendStyleMessage} disabled={loadingAi} style={{ marginLeft: 10 }}>
            {loadingAi ? (
              <MaterialCommunityIcons name="loading" size={20} color={theme.subText} />
            ) : (
              <Ionicons name="send" size={20} color={"#1E88E5"} />
            )}
          </TouchableOpacity>
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
                  <View key={`main-${String(item.id || item._id)}`} style={[s.aiShowcaseMainItem, { backgroundColor: item.bg || "#f7f7f7" }]}>
                    {(item.image || item.imageUrl)
                      ? <AuthenticatedImage source={{ uri: item.image || item.imageUrl }} style={s.aiShowcaseImage} resizeMode="contain" />
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
