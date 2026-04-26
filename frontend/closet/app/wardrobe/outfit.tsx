import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { Alert, FlatList, StatusBar, Text, TouchableOpacity, View } from "react-native";
import { captureRef } from "react-native-view-shot";
import { SafeAreaView } from "react-native-safe-area-context";
import AuthenticatedImage from "../../components/AuthenticatedImage";
import { buildAuthHeaders, fetchApiWithFallback } from "../../constants/api";
import { getAppTheme } from "../../constants/appTheme";
import { useAppTheme } from "../../context/themeContext";
import { uploadMultipartWithRetry } from "../../services/uploadRequest";
import { useWardrobe } from "../../context/wardrobeContext";
import { PINK, s } from "../../Styles/wardrobe/outfit.styles";

export default function OutfitScreen() {
  const router = useRouter();
  const { isDarkMode } = useAppTheme();
  const { items, refreshItems } = useWardrobe();
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const previewCaptureRef = useRef<View>(null);

  const baseTheme = getAppTheme(isDarkMode, {
    light: {
      screen: "#fafafa",
      softCard: "#fff8fb",
      border: "#f0f0f0",
    },
  });
  const theme = { ...baseTheme, panel: baseTheme.card, softPanel: baseTheme.softCard };

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );

  const selectedItems = items.filter((i) => selected.includes(i.id));
  const previewItems = useMemo(() => (
    selectedItems.filter((item) => Boolean(item.image)).slice(0, 8)
  ), [selectedItems]);
  const previewColumns = previewItems.length > 4 ? 3 : 2;

  const uploadOutfitPreview = async (outfitId: string, previewUri: string, token: string) => {
    const formData = new FormData();
    formData.append("coverImage", {
      uri: previewUri,
      name: `outfit-preview-${Date.now()}.png`,
      type: "image/png",
    } as any);

    await uploadMultipartWithRetry<any>({
      endpoint: `/api/outfits/${outfitId}/cover`,
      method: "PUT",
      token,
      formData,
      timeoutMs: 30000,
      retries: 1,
      fallbackMessage: "Could not upload outfit preview.",
    });
  };

  const handleSave = async () => {
    if (selected.length < 2 || saving) return;

    const token = await SecureStore.getItemAsync("userToken");
    if (!token) {
      Alert.alert("Session expired", "Please log in again.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetchApiWithFallback("/api/outfits", {
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
      }, { timeoutMs: 20000, retries: 1 });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        throw new Error(errorPayload?.message || "Could not save outfit");
      }

      const createdOutfit = await response.json().catch(() => null);

      if (createdOutfit?._id && previewCaptureRef.current && previewItems.length > 0) {
        try {
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

          const previewUri = await captureRef(previewCaptureRef.current as any, {
            format: "png",
            quality: 1,
            result: "tmpfile",
          });

          await uploadOutfitPreview(createdOutfit._id, previewUri, token);
        } catch (previewError) {
          console.warn("Outfit saved, but preview image upload failed.", previewError);
        }
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

      <View style={s.hiddenCaptureWrap} pointerEvents="none">
        <View ref={previewCaptureRef} collapsable={false} style={s.captureCanvas}>
          <View style={s.captureTitlePill}>
            <Text style={s.captureTitleText}>Saved Outfit</Text>
          </View>
          <View style={s.captureGrid}>
            {previewItems.map((item, index) => (
              <View
                key={`${item.id}-${index}`}
                style={[
                  s.captureTile,
                  previewColumns === 3 ? s.captureTileThreeCol : s.captureTileTwoCol,
                ]}
              >
                <AuthenticatedImage
                  source={{ uri: item.image }}
                  style={s.captureTileImage}
                  resizeMode="contain"
                />
              </View>
            ))}
          </View>
        </View>
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