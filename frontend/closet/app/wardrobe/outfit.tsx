import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { FlatList, Image, SafeAreaView, StatusBar, Text, TouchableOpacity, View } from "react-native";
import { useWardrobe } from "../../context/wardrobeContext";
import { PINK, s } from "../../Styles/wardrobe/outfit.styles";

export default function OutfitScreen() {
  const router = useRouter();
  const { items } = useWardrobe();
  const [selected, setSelected] = useState<number[]>([]);

  const toggle = (id: number) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );

  const selectedItems = items.filter((i) => selected.includes(i.id));

  return (
    <SafeAreaView style={s.root}>
      <StatusBar barStyle="dark-content" />

      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#1a1a1a" />
        </TouchableOpacity>

        <Text style={s.headerTitle}>Create Outfit</Text>

        <TouchableOpacity
          style={[s.saveBtn, selected.length < 2 && { opacity: 0.4 }]}
          disabled={selected.length < 2}
          onPress={() => {
            router.back();
          }}
        >
          <Text style={s.saveBtnText}>Save</Text>
        </TouchableOpacity>
      </View>

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

      <View style={s.instruction}>
        <Text style={s.instructionText}>
          {selected.length === 0
            ? "Tap items to add them to your outfit"
            : selected.length === 1
            ? "Select at least one more item"
            : `${selected.length} items selected — tap Save when done`}
        </Text>
      </View>

      {items.length === 0 ? (
        <View style={s.emptyState}>
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
                ) : null}

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