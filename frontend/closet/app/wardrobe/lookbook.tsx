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
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useWardrobe } from "../../context/wardrobeContext";

const { width: W } = Dimensions.get("window");
const PINK = "#FF4F81";
const ITEM_SIZE = (W - 48) / 3;

export default function LookbookScreen() {
  const router = useRouter();
  const { items } = useWardrobe();

  const [name, setName] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [step, setStep] = useState<"name" | "pick">("name");

  const toggle = (id: number) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );

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
            style={[s.saveBtn, selected.length === 0 && { opacity: 0.4 }]}
            disabled={selected.length === 0}
            onPress={() => {
              // TODO: save lookbook
              router.back();
            }}
          >
            <Text style={s.saveBtnText}>Save</Text>
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

      {/* Step 1 — name */}
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

          {/* Suggestion chips */}
          <Text style={s.suggestLabel}>Suggestions</Text>
          <View style={s.suggestRow}>
            {[
              "Summer Fits",
              "Work Looks",
              "Date Night",
              "Casual Vibes",
              "Going Out",
              "Cosy Season",
            ].map((s) => (
              <TouchableOpacity
                key={s}
                style={s2.chip}
                onPress={() => setName(s)}
              >
                <Text style={s2.chipText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Step 2 — pick items */}
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

// chip styles need separate object to avoid name collision with inner `s` in map
const s2 = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#e8e8e8",
    backgroundColor: "#fafafa",
    marginRight: 8,
    marginBottom: 8,
  },
  chipText: { fontSize: 13, color: "#555", fontWeight: "500" },
});

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

  nameStep: { flex: 1, padding: 24 },
  stepTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  stepSubtitle: { fontSize: 14, color: "#888", marginBottom: 28 },
  nameInput: {
    borderWidth: 1.5,
    borderColor: "#ebebeb",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 17,
    color: "#1a1a1a",
    backgroundColor: "#fff",
    marginBottom: 28,
  },
  suggestLabel: {
    fontSize: 12,
    color: "#aaa",
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: 12,
    textTransform: "uppercase",
  },
  suggestRow: { flexDirection: "row", flexWrap: "wrap" },

  pickHeader: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  pickTitle: { fontSize: 17, fontWeight: "700", color: "#1a1a1a" },
  pickSubtitle: { fontSize: 13, color: "#888", marginTop: 2 },

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
});
