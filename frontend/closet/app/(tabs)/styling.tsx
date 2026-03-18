import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { Alert, Animated, Dimensions, FlatList, Image, StatusBar, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from "react-native";
import AuthenticatedImage from "../../components/AuthenticatedImage";
import { buildApiUrl, buildAuthHeaders } from "../../constants/api";
import { useCalendar } from "../../context/calendar-context";
import { useWardrobe } from "../../context/wardrobeContext";
import { PANEL_W, PINK, s } from "../../Styles/styling.styles";

const { width: W } = Dimensions.get("window");
const MODES    = ["Create outfit", "Randomize", "AI recommended"] as const;
type Mode      = typeof MODES[number];
const TABS     = ["All", "Footwear", "Tops", "Bottoms"];

type RecommendedGarment = {
  _id: string;
  name?: string;
  category?: string;
  color?: string;
  season?: string;
  imageUrl?: string;
};

type Recommendation = {
  name: string;
  score: number;
  reason: string;
  garments: RecommendedGarment[];
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

  const filtered = items.filter(item => {
    if (activeTab !== "All" && !item.category?.includes(activeTab)) return false;
    if (searchQuery && !item.label.toLowerCase().includes(searchQuery.toLowerCase())) return false;
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
          data={TABS}
          keyExtractor={t => t}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.panelTabsRow}
          renderItem={({ item: tab }) => (
            <TouchableOpacity
              style={[s.panelTab, activeTab === tab && s.panelTabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[s.panelTabTxt, activeTab === tab && s.panelTabTxtActive]}>{tab}</Text>
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
          <TouchableOpacity style={s.panelIconBtn}>
            <Feather name="sliders" size={13} color="#555" />
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
            const isSelected = selected.includes(String(item.id));
            return (
              <TouchableOpacity
                style={[s.panelItem, { backgroundColor: item.bg }, isSelected && s.panelItemSelected]}
                onPress={() => onSelect(String(item.id))}
                activeOpacity={0.8}
              >
                {item.image
                  ? <AuthenticatedImage source={{ uri: item.image }} style={s.panelImg} resizeMode="cover" />
                  : <Text style={s.panelItemEmoji}>👗</Text>
                }
                {isSelected && (
                  <View style={{
                    ...StyleSheet_absoluteFill,
                    backgroundColor: "rgba(255,78,129,0.18)",
                    alignItems: "center", justifyContent: "center",
                  }}>
                    <Ionicons name="checkmark-circle" size={28} color={PINK} />
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      </Animated.View>
    </View>
  );
}

export default function StylingScreen() {
  const params = useLocalSearchParams<{ mode?: string; date?: string }>();

  // Map incoming route param → tab mode
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
  const [loadingRandomize, setLoadingRandomize] = useState(false);
  const [loadingAi, setLoadingAi] = useState(false);
  const [savingOutfit, setSavingOutfit] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [activeRecommendation, setActiveRecommendation] = useState(0);
  const { items } = useWardrobe();
  const { refetch: refetchCalendar } = useCalendar();

  const toggleItem = (id: string) =>
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const getToken = async () => {
    const token = await SecureStore.getItemAsync("userToken");
    if (!token) {
      Alert.alert("Session expired", "Please log in again.");
      return null;
    }
    return token;
  };

  const applyRecommendationAt = (index: number, next: Recommendation[]) => {
    if (!next[index]) {
      setSelected([]);
      return;
    }
    setSelected(next[index].garments.map((garment) => garment._id));
  };

  const loadRandomizedOutfit = async () => {
    const token = await getToken();
    if (!token) return;

    setLoadingRandomize(true);
    try {
      const response = await fetch(buildApiUrl("/api/outfits/randomize?count=4"), {
        headers: buildAuthHeaders(token),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        throw new Error(errorPayload?.message || "Could not randomize outfit");
      }

      const data = await response.json();
      const ids = Array.isArray(data?.items) ? data.items.map((garment: RecommendedGarment) => garment._id) : [];
      setSelected(ids);
    } catch (error: any) {
      Alert.alert("Randomize failed", error?.message || "Could not generate a random outfit.");
    } finally {
      setLoadingRandomize(false);
    }
  };

  const loadAiRecommendations = async () => {
    const token = await getToken();
    if (!token) return;

    setLoadingAi(true);
    try {
      const eventInput = inputText.trim() || eventText;
      const response = await fetch(buildApiUrl("/api/outfits/recommendations"), {
        method: "POST",
        headers: {
          ...buildAuthHeaders(token),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event: eventInput,
          temperatureC,
          count: 3,
        }),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        throw new Error(errorPayload?.message || "Could not get AI recommendations");
      }

      const data = await response.json();
      const nextRecommendations: Recommendation[] = Array.isArray(data?.recommendations)
        ? data.recommendations
        : [];

      setRecommendations(nextRecommendations);
      setActiveRecommendation(0);
      applyRecommendationAt(0, nextRecommendations);
    } catch (error: any) {
      Alert.alert("AI recommendation failed", error?.message || "Could not generate recommendations.");
    } finally {
      setLoadingAi(false);
    }
  };

  const cycleRecommendation = () => {
    if (recommendations.length === 0) return;
    const nextIndex = (activeRecommendation + 1) % recommendations.length;
    setActiveRecommendation(nextIndex);
    applyRecommendationAt(nextIndex, recommendations);
  };

  const persistCurrentOutfit = async () => {
    if (selected.length === 0) {
      Alert.alert("No outfit selected", "Generate or select an outfit first.");
      return;
    }

    const token = await getToken();
    if (!token) return;

    setSavingOutfit(true);
    try {
      const selectedRecommendation = recommendations[activeRecommendation];
      const dateValue = params.date ? new Date(params.date) : new Date();
      const safeDate = Number.isNaN(dateValue.getTime()) ? new Date() : dateValue;

      const response = await fetch(buildApiUrl("/api/outfits"), {
        method: "POST",
        headers: {
          ...buildAuthHeaders(token),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: selectedRecommendation?.name || `${mode} Outfit`,
          garments: selected,
          date: safeDate.toISOString(),
        }),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        throw new Error(errorPayload?.message || "Could not save outfit");
      }

      await refetchCalendar();

      Alert.alert("Saved", "Outfit has been added to your calendar.");
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

  const selectedItems = items.filter(i => selected.includes(String(i.id)));

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {/* Header image */}
      <Image
        source={require('../../assets/images/calendar.png')}
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
            onPress={() => {
              setMode(m);
            }}
          >
            <Text style={[s.modeTabTxt, mode === m && s.modeTabTxtActive]} numberOfLines={1}>
              {m}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Canvas */}
      <View style={s.canvasWrap}>
        {selectedItems.length === 0 ? (
          <View style={s.canvasEmpty}>
            <Ionicons name="shirt-outline" size={48} color="#e0e0e0" />
            <Text style={s.canvasEmptyTxt}>
              {mode === "Create outfit" ? "Tap › to pick items" : "Tap Randomize to generate"}
            </Text>
          </View>
        ) : (
          <FlatList
            data={selectedItems}
            numColumns={selectedItems.length > 2 ? 2 : selectedItems.length}
            key={selectedItems.length > 2 ? "2col" : "1col"}
            keyExtractor={i => String(i.id)}
            contentContainerStyle={{ padding: 8, gap: 6 }}
            columnWrapperStyle={selectedItems.length > 1 ? { gap: 6 } : undefined}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={{
                  flex: 1, aspectRatio: 0.9,
                  backgroundColor: item.bg,
                  borderRadius: 12, overflow: "hidden",
                  alignItems: "center", justifyContent: "center",
                }}
                onPress={() => toggleItem(String(item.id))}
              >
                {item.image
                  ? <AuthenticatedImage source={{ uri: item.image }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                  : <Text style={{ fontSize: 40 }}>👗</Text>
                }
              </TouchableOpacity>
            )}
          />
        )}

        {/* Right action buttons (visible in AI mode) */}
        {mode === "AI recommended" && (
          <View style={s.canvasActions}>
            <TouchableOpacity style={s.actionBtn} onPress={persistCurrentOutfit} disabled={savingOutfit}>
              <Ionicons name="checkmark" size={18} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={s.actionBtn} onPress={cycleRecommendation} disabled={recommendations.length === 0 || loadingAi}>
              <MaterialCommunityIcons name="fit-to-screen-outline" size={18} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={s.actionBtn} onPress={loadAiRecommendations} disabled={loadingAi}>
              <MaterialCommunityIcons name="layers-outline" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        {/* Pull tab — Create outfit mode */}
        {mode === "Create outfit" && (
          <TouchableOpacity style={s.pullTab} onPress={() => setPanelOpen(true)}>
            <Ionicons name="chevron-forward" size={16} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* Context card — AI mode only */}
      {mode === "AI recommended" && (
        <View style={s.contextCard}>
          <View style={s.tempRow}>
            <Text style={s.tempTxt}>{temperatureC}°C</Text>
          </View>
          <Text style={s.eventTxt}>Event: {inputText.trim() || eventText}</Text>
          <View style={s.inputRow}>
            <TextInput
              style={s.input}
              placeholder="Type here or speak"
              placeholderTextColor="#bbb"
              value={inputText}
              onChangeText={setInputText}
            />
            <Ionicons name="mic-outline" size={20} color="#bbb" />
          </View>
          {recommendations[activeRecommendation]?.reason ? (
            <Text style={{ marginTop: 10, color: "#666", fontSize: 12 }}>
              {recommendations[activeRecommendation].reason}
            </Text>
          ) : null}
          {(loadingAi || loadingRandomize || savingOutfit) ? (
            <Text style={{ marginTop: 8, color: "#999", fontSize: 12 }}>
              {savingOutfit ? "Saving outfit..." : loadingAi ? "Generating recommendations..." : "Randomizing..."}
            </Text>
          ) : null}
        </View>
      )}

      {/* Wardrobe side panel */}
      <WardrobePanel
        visible={panelOpen}
        onClose={() => setPanelOpen(false)}
        onSelect={toggleItem}
        selected={selected}
      />
    </View>
  );
}

const StyleSheet_absoluteFill = {
  position: "absolute" as const,
  top: 0, left: 0, right: 0, bottom: 0,
};