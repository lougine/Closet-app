// app/outfit.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useWardrobe } from "../../context/wardrobeContext";

const { width: W } = Dimensions.get("window");
const PINK = "#FF4F81";
const ITEM_SIZE = (W - 48) / 3;

export default function OutfitScreen() {
  const router = useRouter();
  const { items } = useWardrobe();
  const [selected, setSelected] = useState<number[]>([]);

  const toggle = (id: number) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );

  const selectedItems = items.filter((i) => selected.includes(i.id));

  return (
    <SafeAreaView style={s.root}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Create Outfit</Text>
        <TouchableOpacity
          style={[s.saveBtn, selected.length < 2 && { opacity: 0.4 }]}
          disabled={selected.length < 2}
          onPress={() => {
            // TODO: save outfit
            router.back();
          }}
        >
          <Text style={s.saveBtnText}>Save</Text>
        </TouchableOpacity>
      </View>

      {/* Outfit preview strip */}
      {selectedItems.length > 0 && (
        <View style={s.previewStrip}>
          <Text style={s.previewLabel}>
            Your outfit ({selected.length} pieces)
          </Text>
          <FlatList
            horizontal
            data={selectedItems}
            keyExtractor={(i) => String(i.id)}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              gap: 8,
              paddingHorizontal: 16,
              paddingVertical: 8,
            }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={s.previewItem}
                onPress={() => toggle(item.id)}
              >
                {item.image ? (
                  <Image
                    source={{ uri: item.image }}
                    style={s.previewImg}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={[
                      s.previewImg,
                      {
                        backgroundColor: item.bg,
                        alignItems: "center",
                        justifyContent: "center",
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 22 }}>👗</Text>
                  </View>
                )}
                <View style={s.previewRemove}>
                  <Ionicons name="close" size={10} color="#fff" />
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* Instruction */}
      <View style={s.instruction}>
        <Text style={s.instructionText}>
          {selected.length === 0
            ? "Tap items to add them to your outfit"
            : selected.length === 1
              ? "Select at least one more item"
              : `${selected.length} items selected — tap Save when done`}
        </Text>
      </View>

      {/* Item grid */}
      {items.length === 0 ? (
        <View style={s.emptyState}>
          <Text style={s.emptyEmoji}>🪝</Text>
          <Text style={s.emptyTitle}>No items in your wardrobe</Text>
          <Text style={s.emptySubtitle}>
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
                  <Image
                    source={{ uri: item.image }}
                    style={s.gridImg}
                    resizeMode="cover"
                  />
                ) : (
                  <Text style={s.gridEmoji}>👗</Text>
                )}
                {isSelected && (
                  <View style={s.checkOverlay}>
                    <Ionicons name="checkmark-circle" size={28} color={PINK} />
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
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fafafa" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#1a1a1a" },
  saveBtn: {
    backgroundColor: PINK,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  saveBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },

  previewStrip: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  previewLabel: {
    fontSize: 12,
    color: "#888",
    paddingHorizontal: 16,
    paddingTop: 10,
    fontWeight: "500",
  },
  previewItem: { position: "relative" },
  previewImg: { width: 64, height: 64, borderRadius: 12, overflow: "hidden" },
  previewRemove: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: PINK,
    alignItems: "center",
    justifyContent: "center",
  },

  instruction: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#fff8fb",
  },
  instructionText: { fontSize: 13, color: "#888", textAlign: "center" },

  grid: { padding: 12, paddingBottom: 120, gap: 4 },
  gridRow: { gap: 4, marginBottom: 4 },
  gridItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    borderRadius: 12,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  gridItemSelected: { borderWidth: 3, borderColor: PINK },
  gridImg: { width: "100%", height: "100%" },
  gridEmoji: { fontSize: 36 },
  gridLabel: {
    position: "absolute",
    bottom: 4,
    fontSize: 9,
    color: "#999",
    paddingHorizontal: 4,
    textAlign: "center",
  },
  checkOverlay: {
    ...(StyleSheet.absoluteFillObject as any),
    backgroundColor: "rgba(255,255,255,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },

  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 40,
  },
  emptyEmoji: { fontSize: 52 },
  emptyTitle: { fontSize: 17, fontWeight: "600", color: "#1a1a1a" },
  emptySubtitle: { fontSize: 13, color: "#aaa", textAlign: "center" },
  addBtn: {
    marginTop: 8,
    backgroundColor: PINK,
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  addBtnText: { color: "#fff", fontWeight: "600" },
});
