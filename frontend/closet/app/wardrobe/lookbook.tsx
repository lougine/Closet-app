import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import * as SecureStore from "expo-secure-store";
import { Alert, Dimensions, FlatList, SafeAreaView, StatusBar, Text, TextInput, TouchableOpacity, View } from "react-native";
import AuthenticatedImage from "../../components/AuthenticatedImage";
import { buildApiUrl, buildAuthHeaders } from "../../constants/api";
import { useWardrobe } from "../../context/wardrobeContext";
import { s, s2 } from "../../Styles/wardrobe/lookbook.styles";

const { width: W } = Dimensions.get("window");
const PINK = "#FF4F81";
const ITEM_SIZE = (W - 48) / 3;
const LOOKBOOK_IDS_KEY = "lookbookIds";

const parseStoredLookbookIds = (rawValue: string | null) => {
  if (!rawValue) return [] as string[];
  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed.map((value) => String(value)) : [];
  } catch {
    return [] as string[];
  }
};

export default function LookbookScreen() {
  const router = useRouter();
  const { items, refreshItems } = useWardrobe();

  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [step, setStep] = useState<"name" | "pick">("name");
  const [saving, setSaving] = useState(false);

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );

  const handleSave = async () => {
    if (selected.length === 0 || saving) return;

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
          name: name.trim(),
          garments: selected,
          date: new Date().toISOString(),
          isLookbook: true,
        }),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        throw new Error(errorPayload?.message || "Could not save lookbook");
      }

      const createdPayload = await response.json().catch(() => ({}));
      const createdId = createdPayload?._id ? String(createdPayload._id) : "";
      if (createdId) {
        const existingIds = parseStoredLookbookIds(
          await SecureStore.getItemAsync(LOOKBOOK_IDS_KEY),
        );
        if (!existingIds.includes(createdId)) {
          await SecureStore.setItemAsync(
            LOOKBOOK_IDS_KEY,
            JSON.stringify([...existingIds, createdId]),
          );
        }
      }

      await refreshItems();

      Alert.alert("Saved", "Lookbook created successfully.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert("Save failed", error?.message || "Could not save lookbook.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={s.root}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => (step === "pick" ? setStep("name") : router.back())}
        >
          <Ionicons name="chevron-back" size={22} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Create Lookbook</Text>

        {step === "pick" ? (
          <TouchableOpacity
            style={[s.saveBtn, (selected.length === 0 || saving) && { opacity: 0.4 }]}
            disabled={selected.length === 0 || saving}
            onPress={handleSave}
          >
            <Text style={s.saveBtnText}>{saving ? "Saving..." : "Save"}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[s.saveBtn, !name.trim() && { opacity: 0.4 }]}
            disabled={!name.trim()}
            onPress={() => setStep("pick")}
          >
            <Text style={s.saveBtnText}>Next</Text>
          </TouchableOpacity>
        )}
      </View>

      {step === "name" && (
        <View style={s.nameStep}>
          <Text style={s.stepTitle}>Name your lookbook</Text>
          <Text style={s.stepSubtitle}>
            Give it a theme like "Summer Fits" or "Work Looks"
          </Text>

          <TextInput
            style={s.nameInput}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Summer Fits"
            placeholderTextColor="#bbb"
            autoFocus
            returnKeyType="done"
            onSubmitEditing={() => name.trim() && setStep("pick")}
          />

          <Text style={s.suggestLabel}>Suggestions</Text>

          <View style={s.suggestRow}>
            {[ "Summer Fits", "Work Looks", "Date Night", "Casual Vibes", "Going Out", "Cosy Season",].map((sugg) => (
              <TouchableOpacity
                key={sugg}
                style={s2.chip}
                onPress={() => setName(sugg)}
              >
                <Text style={s2.chipText}>{sugg}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {step === "pick" && (
        <>
          <View style={s.pickHeader}>
            <Text style={s.pickTitle}>"{name}"</Text>
            <Text style={s.pickSubtitle}>
              {selected.length === 0
                ? "Tap items to add to this lookbook"
                : `${selected.length} item${selected.length > 1 ? "s" : ""} selected`}
            </Text>
          </View>

          {items.length === 0 ? (
            <View style={s.emptyState}>
              <Text style={s.emptyEmoji}>🪝</Text>
              <Text style={s.emptyTitle}>No items yet</Text>
              <Text style={s.emptySubtitle}>
                Add items to your wardrobe first
              </Text>
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
                    ) : (
                      <Text style={s.gridEmoji}>👗</Text>
                    )}

                    {isSelected && (
                      <View style={s.checkOverlay}>
                        <Ionicons
                          name="checkmark-circle"
                          size={28}
                          color={PINK}
                        />
                      </View>
                    )}

                    <Text style={s.gridLabel} numberOfLines={1}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </>
      )}
    </SafeAreaView>
  );
}