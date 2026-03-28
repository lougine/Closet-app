import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import * as SecureStore from "expo-secure-store";
import { Alert, FlatList, SafeAreaView, StatusBar, Text, TouchableOpacity, View } from "react-native";
import AuthenticatedImage from "../../components/AuthenticatedImage";
import { buildApiUrl, buildAuthHeaders } from "../../constants/api";
import { useAppTheme } from "../../context/themeContext";
import { useWardrobe } from "../../context/wardrobeContext";
import { PINK, s } from "../../Styles/wardrobe/outfit.styles";

export default function OutfitScreen() {
  const router = useRouter();
  const { isDarkMode } = useAppTheme();
  const { items, refreshItems } = useWardrobe();
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const theme = isDarkMode
    ? {
        screen: "#121212",
        panel: "#1E1E1E",
        softPanel: "#242424",
        text: "#F2F2F2",
        subText: "#A8A8A8",
        border: "#343434",
      }
    : {
        screen: "#fafafa",
        panel: "#FFFFFF",
        softPanel: "#fff8fb",
        text: "#1a1a1a",
        subText: "#888888",
        border: "#f0f0f0",
      };

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );

  const selectedItems = items.filter((i) => selected.includes(i.id));

  const handleSave = async () => {
    if (selected.length < 2 || saving) return;

    const token = await SecureStore.getItemAsync("userToken");
    if (!token) {
      Alert.alert("Session expired", "Please log in again.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(buildApiUrl("/api/outfits"), {
        method: "POST",
        headers: {
          ...buildAuthHeaders(token),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: `Outfit ${new Date().toLocaleDateString()}`,
          garments: selected,
          date: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        throw new Error(errorPayload?.message || "Could not save outfit");
      }

      await refreshItems();

      Alert.alert("Saved", "Outfit created successfully.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert("Save failed", error?.message || "Could not save outfit.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[s.root, { backgroundColor: theme.screen }] }>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />

      <View style={[s.header, { backgroundColor: theme.panel, borderBottomColor: theme.border }] }>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={theme.text} />
        </TouchableOpacity>

        <Text style={[s.headerTitle, { color: theme.text }]}>Create Outfit</Text>

        <TouchableOpacity
          style={[s.saveBtn, (selected.length < 2 || saving) && s.saveBtnDisabled]}
          disabled={selected.length < 2 || saving}
          onPress={handleSave}
        >
          <Text style={s.saveBtnText}>{saving ? "Saving..." : "Save"}</Text>
        </TouchableOpacity>
      </View>

      {selectedItems.length > 0 && (
        <View style={[s.previewStrip, { backgroundColor: theme.panel, borderBottomColor: theme.border }] }>
          <Text style={[s.previewLabel, { color: theme.subText }] }>
            Your outfit ({selected.length} pieces)
          </Text>

          <FlatList
            horizontal
            data={selectedItems}
            keyExtractor={(i) => String(i.id)}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.previewListContent}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={s.previewItem}
                onPress={() => toggle(item.id)}
              >
                {item.image ? (
                  <AuthenticatedImage
                    source={{ uri: item.image }}
                    style={s.previewImg}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={[
                      s.previewImg,
                      s.previewImgPlaceholder,
                      { backgroundColor: item.bg },
                    ]}
                  />
                )}

                <View style={s.previewRemove}>
                  <Ionicons name="close" size={10} color="#fff" />
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      <View style={[s.instruction, { backgroundColor: theme.softPanel }] }>
        <Text style={[s.instructionText, { color: theme.subText }]}>
          {selected.length === 0
            ? "Tap items to add them to your outfit"
            : selected.length === 1
            ? "Select at least one more item"
            : `${selected.length} items selected — tap Save when done`}
        </Text>
      </View>

      {items.length === 0 ? (
        <View style={s.emptyState}>
          <Text style={[s.emptyTitle, { color: theme.text }]}>No items in your wardrobe</Text>

          <Text style={[s.emptySubtitle, { color: theme.subText }]}>
            Add some items first to create outfits
          </Text>

          <TouchableOpacity style={s.addBtn} onPress={() => router.back()}>
            <Text style={s.addBtnText}>Go to Wardrobe</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={items}
          numColumns={3}
          keyExtractor={(i) => String(i.id)}
          contentContainerStyle={s.grid}
          columnWrapperStyle={s.gridRow}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const isSelected = selected.includes(item.id);

            return (
              <TouchableOpacity
                style={[
                  s.gridItem,
                  { backgroundColor: item.bg },
                  isSelected && s.gridItemSelected,
                ]}
                onPress={() => toggle(item.id)}
                activeOpacity={0.75}
              >
                {item.image ? (
                  <AuthenticatedImage
                    source={{ uri: item.image }}
                    style={s.gridImg}
                    resizeMode="cover"
                  />
                ) : null}

                {isSelected && (
                  <View style={s.checkOverlay}>
                    <Ionicons name="checkmark-circle" size={28} color={PINK} />
                  </View>
                )}

                <Text style={[s.gridLabel, { color: isDarkMode ? "#B8B8B8" : "#999" }]} numberOfLines={1}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}