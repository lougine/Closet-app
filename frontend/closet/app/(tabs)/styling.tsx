import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from "react-native";
import { useWardrobe } from "../../context/wardrobeContext";
import { PANEL_W, PINK, s } from "../../Styles/styling.styles";

const { width: W } = Dimensions.get("window");
const MODES    = ["Create outfit", "Randomize", "AI recommended"] as const;
type Mode      = typeof MODES[number];
const TABS     = ["All", "Footwear", "Tops", "Bottoms"];

function WardrobePanel({
  visible, onClose, onSelect, selected,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (id: number) => void;
  selected: number[];
}) {
  const { items } = useWardrobe();
  const slideAnim = useRef(new Animated.Value(PANEL_W)).current;
  const [activeTab, setActiveTab]     = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  React.useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 0 : PANEL_W,
      useNativeDriver: true,
      tension: 80, friction: 12,
    }).start();
  }, [visible]);

  const filtered = items.filter(item => {
    if (activeTab !== "All" && !item.category?.includes(activeTab)) return false;
    if (searchQuery && !item.label.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

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

        {/* Search + icon row */}
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
            <Text style={{ fontSize: 13 }}>⭐</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.panelIconBtn}>
            <Ionicons name="eye-off-outline" size={13} color="#555" />
          </TouchableOpacity>
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
            const isSelected = selected.includes(item.id);
            return (
              <TouchableOpacity
                style={[s.panelItem, { backgroundColor: item.bg }, isSelected && s.panelItemSelected]}
                onPress={() => onSelect(item.id)}
                activeOpacity={0.8}
              >
                {item.image
                  ? <Image source={{ uri: item.image }} style={s.panelImg} resizeMode="cover" />
                  : <Text style={s.panelItemEmoji}>👗</Text>
                }
                <View style={s.panelEye}>
                  <Ionicons name="eye-outline" size={11} color="rgba(255,255,255,0.7)" />
                </View>
                <View style={s.panelStar}>
                  <Ionicons name="star-outline" size={11} color="rgba(255,255,255,0.7)" />
                </View>
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
  const [selected, setSelected]   = useState<number[]>([]);
  const [eventText, setEventText] = useState("Lara's wedding");
  const [inputText, setInputText] = useState("");
  const { items } = useWardrobe();

  const toggleItem = (id: number) =>
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleRandomize = () => {
    if (items.length === 0) return;
    const count   = Math.min(items.length, Math.floor(Math.random() * 3) + 3);
    const shuffled = [...items].sort(() => Math.random() - 0.5);
    setSelected(shuffled.slice(0, count).map(i => i.id));
  };

  // Auto-randomize if navigated with randomize/discover mode
  useEffect(() => {
    if (params.mode === "randomize" || params.mode === "discover") {
      handleRandomize();
    }
  }, []);

  const selectedItems = items.filter(i => selected.includes(i.id));

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {/* Pink header blob */}
      <View style={s.headerBlob} />

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
              if (m === "Randomize") handleRandomize();
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
                onPress={() => toggleItem(item.id)}
              >
                {item.image
                  ? <Image source={{ uri: item.image }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                  : <Text style={{ fontSize: 40 }}>👗</Text>
                }
              </TouchableOpacity>
            )}
          />
        )}

        {/* Right action buttons (visible in AI mode) */}
        {mode === "AI recommended" && (
          <View style={s.canvasActions}>
            <TouchableOpacity style={s.actionBtn}>
              <Ionicons name="checkmark" size={18} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={s.actionBtn}>
              <MaterialCommunityIcons name="fit-to-screen-outline" size={18} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={s.actionBtn}>
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
            <Text style={s.tempTxt}>23°C</Text>
          </View>
          <Text style={s.eventTxt}>Event: {eventText}</Text>
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