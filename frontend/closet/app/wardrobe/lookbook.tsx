import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Dimensions, FlatList, Image, SafeAreaView, StatusBar, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useWardrobe } from "../../context/wardrobeContext";
import { s, s2 } from "../../Styles/wardrobe/lookbook.styles";

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