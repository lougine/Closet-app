import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AuthenticatedImage from "@/components/AuthenticatedImage";
import { useAppTheme } from "@/context/themeContext";
import {
  createStyledOutfitForUser,
  fetchPublicUserGarments,
  type PublicUserGarment,
} from "@/services/userProfileService";
import CreateOutfitCanvas, { useCreateOutfitLogic } from "../(tabs)/styling/CreateOutfitCanvas";

type CanvasItem = {
  id: string;
  image: string | null;
  label: string;
  bg: string;
  category: string[];
  colors: string[];
  tags: string[];
  createdAt?: string;
};

const normalizeCategory = (category?: string) => {
  if (!category) return "Uncategorized";
  if (/^shoes$/i.test(category)) return "Footwear";
  return category;
};

const mapGarmentToCanvasItem = (garment: PublicUserGarment): CanvasItem => ({
  id: garment._id,
  image: garment.imageUrl || null,
  label: garment.name,
  bg: "#fce4ec",
  category: [normalizeCategory(garment.category)],
  colors: garment.color ? [garment.color] : [],
  tags: garment.season ? [garment.season] : [],
  createdAt: garment.createdAt,
});

export default function CreateOutfitForUserScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    username?: string;
    sourceUserId?: string;
    userId?: string;
    sourceUserName?: string;
  }>();
  const { isDarkMode } = useAppTheme();

  const targetUserId = String(params.sourceUserId || params.userId || "").trim();
  const usernameParam = String(params.username || "").trim();
  const providedName = String(params.sourceUserName || "").trim();

  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState("");
  const [poolOpen, setPoolOpen] = useState(false);
  const [poolItems, setPoolItems] = useState<CanvasItem[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [outfitName, setOutfitName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const displayName = providedName || usernameParam || "User";

  const selectedItems = useMemo(
    () => poolItems.filter((item) => selected.includes(String(item.id))),
    [poolItems, selected],
  );

  const createOutfit = useCreateOutfitLogic({
    mode: "Create outfit",
    selected,
    setSelected,
    selectedItems,
  });

  useEffect(() => {
    if (!targetUserId) {
      setLoading(false);
      setLoadingError("Missing target user. Please open this flow from a user profile.");
      return;
    }

    let cancelled = false;

    const loadGarments = async () => {
      setLoading(true);
      setLoadingError("");

      try {
        const gathered: CanvasItem[] = [];
        let page = 1;
        let totalPages = 1;

        while (page <= totalPages) {
          const payload = await fetchPublicUserGarments(targetUserId, { page, limit: 60 });
          const pageItems = (payload.items || []).map(mapGarmentToCanvasItem);
          gathered.push(...pageItems);
          totalPages = Number(payload.pagination?.totalPages || 1);
          page += 1;
        }

        if (!cancelled) {
          setPoolItems(gathered);
          setOutfitName(`Outfit for ${displayName}`);
        }
      } catch (error: any) {
        if (!cancelled) {
          setLoadingError(error?.message || "Could not load garments for this user.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadGarments();

    return () => {
      cancelled = true;
    };
  }, [displayName, targetUserId]);

  const clearDraft = () => {
    setSelected([]);
    setDescription("");
    setOutfitName(`Outfit for ${displayName}`);
    createOutfit.resetCreateState();
  };

  const submitOutfit = async () => {
    if (!targetUserId) return;

    if (!outfitName.trim()) {
      Alert.alert("Create Outfit", "Outfit name is required.");
      return;
    }

    if (selected.length < 2) {
      Alert.alert("Create Outfit", "Select at least 2 garments.");
      return;
    }

    try {
      setSubmitting(true);
      await createStyledOutfitForUser(targetUserId, {
        name: outfitName.trim(),
        garments: selected,
        styleNote: description.trim(),
        shareWithProfileOwner: true,
      });
      setSubmitted(true);
    } catch (error: any) {
      Alert.alert("Create Outfit", error?.message || "Could not send outfit.");
    } finally {
      setSubmitting(false);
    }
  };

  const palette = isDarkMode
    ? {
        screen: "#121212",
        card: "#1E1E1E",
        border: "#343434",
        text: "#F2F2F2",
        subText: "#A8A8A8",
        muted: "#282828",
      }
    : {
        screen: "#F7F7F7",
        card: "#FFFFFF",
        border: "#E8E8E8",
        text: "#1E1E1E",
        subText: "#707070",
        muted: "#F1F1F1",
      };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: palette.screen }]}>
        <ActivityIndicator size="large" color="#F0507B" />
      </View>
    );
  }

  if (loadingError) {
    return (
      <View style={[styles.centered, { backgroundColor: palette.screen, padding: 20 }]}> 
        <Text style={{ color: palette.subText, textAlign: "center" }}>{loadingError}</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtnInline}>
          <Text style={{ color: "#F0507B", fontWeight: "700" }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (submitted) {
    return (
      <View style={[styles.centered, { backgroundColor: palette.screen, padding: 20 }]}> 
        <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
        <View style={[styles.confirmationCard, { backgroundColor: palette.card, borderColor: palette.border }]}> 
          <Ionicons name="checkmark-circle" size={58} color="#F0507B" />
          <Text style={[styles.confirmTitle, { color: palette.text }]}>Outfit Sent</Text>
          <Text style={[styles.confirmBody, { color: palette.subText }]}>Your outfit was sent to {displayName}.</Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => {
              setSubmitted(false);
              clearDraft();
            }}
          >
            <Text style={styles.primaryBtnText}>Create Another Outfit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.secondaryBtn, { borderColor: palette.border, backgroundColor: palette.card }]}
            onPress={() => router.back()}
          >
            <Text style={{ color: palette.text, fontWeight: "700" }}>Back to Profile</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: palette.screen }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />

      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backIconBtn}>
          <Ionicons name="chevron-back" size={20} color={palette.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: palette.text }]}>Create Outfit for {displayName}</Text>
          <Text style={[styles.subtitle, { color: palette.subText }]}>Dedicated submission flow</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View
          style={[styles.canvasCard, { backgroundColor: palette.card, borderColor: palette.border }]}
          onLayout={(event) => {
            const { width, height } = event.nativeEvent.layout;
            createOutfit.setCanvasSize((prev: { width: number; height: number }) => (
              prev.width === width && prev.height === height ? prev : { width, height }
            ));
          }}
        >
          {selectedItems.length === 0 ? (
            <View style={styles.canvasEmpty}>
              <Ionicons name="shirt-outline" size={48} color={palette.subText} />
              <Text style={{ color: palette.subText, marginTop: 8 }}>Select garments to start building</Text>
            </View>
          ) : (
            <CreateOutfitCanvas
              orderedSelectedItems={createOutfit.orderedSelectedItems}
              dragPositions={createOutfit.dragPositions}
              activeDragId={createOutfit.activeDragId}
              selectedCanvasItemId={createOutfit.selectedCanvasItemId}
              setSelectedCanvasItemId={createOutfit.setSelectedCanvasItemId}
              setActiveDragId={createOutfit.setActiveDragId}
              setDragPositions={createOutfit.setDragPositions}
              setSelected={createOutfit.setSelected}
              setItemScales={createOutfit.setItemScales}
              setItemOrder={createOutfit.setItemOrder}
              undoStack={createOutfit.undoStack}
              redoStack={createOutfit.redoStack}
              handleUndo={createOutfit.handleUndo}
              handleRedo={createOutfit.handleRedo}
              createCanvasSnapshot={createOutfit.createCanvasSnapshot}
              pushUndoSnapshot={createOutfit.pushUndoSnapshot}
              bringItemToFront={createOutfit.bringItemToFront}
              clampDragPosition={createOutfit.clampDragPosition}
              getItemScale={createOutfit.getItemScale}
              dragSnapshotRef={createOutfit.dragSnapshotRef}
              tapSlop={createOutfit.tapSlop}
              dragMargin={createOutfit.dragMargin}
              dragCardW={createOutfit.dragCardW}
              dragCardH={createOutfit.dragCardH}
              onCanvasTouchStart={createOutfit.onCanvasTouchStart}
              onCanvasTouchMove={createOutfit.onCanvasTouchMove}
              onCanvasTouchEnd={createOutfit.onCanvasTouchEnd}
            />
          )}
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.secondaryBtnPink} onPress={() => setPoolOpen(true)}>
            <Text style={styles.secondaryBtnPinkText}>Add Garments</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.secondaryBtn, { borderColor: palette.border, backgroundColor: palette.card }]}
            onPress={clearDraft}
          >
            <Text style={{ color: palette.text, fontWeight: "700" }}>Clear Draft</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.helperText, { color: palette.subText }]}>Selected garments: {selected.length}</Text>

        <View style={styles.formSection}>
          <Text style={[styles.inputLabel, { color: palette.subText }]}>Outfit Name</Text>
          <TextInput
            value={outfitName}
            onChangeText={setOutfitName}
            placeholder="Name this outfit"
            placeholderTextColor={palette.subText}
            style={[styles.input, { color: palette.text, borderColor: palette.border, backgroundColor: palette.card }]}
          />

          <Text style={[styles.inputLabel, { color: palette.subText }]}>Description / Note (optional)</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Add a personal styling note"
            placeholderTextColor={palette.subText}
            multiline
            numberOfLines={4}
            style={[
              styles.input,
              styles.noteInput,
              { color: palette.text, borderColor: palette.border, backgroundColor: palette.card },
            ]}
          />

          <TouchableOpacity
            style={[styles.primaryBtn, (submitting || selected.length < 2) && styles.primaryBtnDisabled]}
            onPress={submitOutfit}
            disabled={submitting || selected.length < 2}
          >
            <Text style={styles.primaryBtnText}>{submitting ? "Sending..." : `Send Outfit to ${displayName}`}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={poolOpen} animationType="slide" onRequestClose={() => setPoolOpen(false)}>
        <View style={[styles.modalRoot, { backgroundColor: palette.screen }]}> 
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: palette.text }]}>Select Garments</Text>
            <TouchableOpacity onPress={() => setPoolOpen(false)}>
              <Ionicons name="close" size={22} color={palette.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.poolGrid}>
            {poolItems.map((item) => {
              const isSelected = selected.includes(String(item.id));
              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => createOutfit.toggleItem(String(item.id))}
                  style={[
                    styles.poolCard,
                    {
                      borderColor: isSelected ? "#F0507B" : palette.border,
                      backgroundColor: palette.card,
                    },
                  ]}
                >
                  <View style={[styles.poolImageWrap, { backgroundColor: palette.muted }]}> 
                    {item.image ? (
                      <AuthenticatedImage source={{ uri: item.image }} style={styles.poolImage} resizeMode="cover" />
                    ) : (
                      <Ionicons name="shirt-outline" size={20} color={palette.subText} />
                    )}
                  </View>
                  <View style={styles.poolMeta}>
                    <Text style={{ color: palette.text, fontSize: 12, fontWeight: "700" }} numberOfLines={1}>
                      {item.label}
                    </Text>
                    <Text style={{ color: palette.subText, fontSize: 11 }} numberOfLines={1}>
                      {item.category[0] || "Garment"}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => setPoolOpen(false)}>
              <Text style={styles.primaryBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingTop: 10,
    paddingHorizontal: 14,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
  },
  backIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  canvasCard: {
    height: 400,
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  canvasEmpty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  actionsRow: {
    marginTop: 12,
    flexDirection: "row",
    gap: 8,
  },
  helperText: {
    marginTop: 8,
    fontSize: 12,
  },
  formSection: {
    marginTop: 14,
  },
  inputLabel: {
    fontSize: 12,
    marginBottom: 6,
    marginTop: 8,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  noteInput: {
    minHeight: 88,
    textAlignVertical: "top",
  },
  primaryBtn: {
    marginTop: 14,
    borderRadius: 12,
    backgroundColor: "#F0507B",
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnDisabled: {
    opacity: 0.5,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 13,
  },
  secondaryBtnPink: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#F0507B",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
  },
  secondaryBtnPinkText: {
    color: "#F0507B",
    fontWeight: "800",
    fontSize: 12,
  },
  secondaryBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
  },
  modalRoot: {
    flex: 1,
    paddingTop: 14,
    paddingHorizontal: 14,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  poolGrid: {
    paddingBottom: 20,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  poolCard: {
    width: "48%",
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  poolImageWrap: {
    height: 120,
    alignItems: "center",
    justifyContent: "center",
  },
  poolImage: {
    width: "100%",
    height: "100%",
  },
  poolMeta: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  modalFooter: {
    paddingBottom: 18,
  },
  confirmationCard: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    alignItems: "center",
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginTop: 10,
  },
  confirmBody: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
  },
  backBtnInline: {
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
});
