import { Feather, Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, Dimensions, Modal, ScrollView, StatusBar, Text, TextInput, TouchableOpacity, View, ActivityIndicator } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useWardrobe } from "../../context/wardrobeContext";
import AuthenticatedImage from "../../components/AuthenticatedImage";
import {
  IMAGE_UPLOAD_ASPECT,
  IMAGE_UPLOAD_QUALITY,
  validateImageFileSize,
} from "../../constants/imageUpload";
import {
  fetchCurrentUserProfile,
  uploadBannerImage,
  uploadProfileImage,
} from "../../services/userProfileService";
import { getUploadErrorMessage } from "../../services/uploadRequest";
import { buildApiUrl, buildAuthHeaders, buildImageUrl } from "../../constants/api";
import { fc, s } from "../../Styles/index.styles";

const { width: W } = Dimensions.get("window");

function GridItem({ item, onPress }: { item: any; onPress: () => void }) {
  const [starred, setStarred] = useState(false);
  const [hidden, setHidden] = useState(false);
  return (
    <TouchableOpacity style={s.gridItem} onPress={onPress}>
      {item.image ? (
        <AuthenticatedImage
          source={{ uri: item.image }}
          style={s.gridImg}
          resizeMode="cover"
        />
      ) : (
        <View style={s.gridEmpty} />
      )}
      {hidden && <View style={s.gridHiddenOverlay} />}
      <TouchableOpacity
        style={s.gridEyeBtn}
        onPress={(e) => {
          e.stopPropagation();
          setHidden((v) => !v);
        }}
      >
        <Ionicons
          name={hidden ? "eye-off" : "eye-off-outline"}
          size={13}
          color={hidden ? "#333" : "#aaa"}
        />
      </TouchableOpacity>
      <TouchableOpacity
        style={s.gridStarBtn}
        onPress={(e) => {
          e.stopPropagation();
          setStarred((v) => !v);
        }}
      >
        <Ionicons
          name={starred ? "star" : "star-outline"}
          size={13}
          color={starred ? "#333" : "#aaa"}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const FILTER_TABS = [ "All", "Outerwear", "Tops", "Bottoms", "Footwear", "Accessories" ];

const CATEGORY_TREE: Record<string, string[]> = {
  Tops: [ "T-Shirt", "Blouse", "Crop Top", "Tank Top", "Shirt", "Hoodie", "Sweater", "Cardigan"],
  Bottoms: [ "Jeans", "Skirt", "Shorts", "Trousers", "Leggings", "Cargo Pants", "Sweatpants" ],
  Dresses: ["Mini Dress", "Bodycon"],
  Outerwear: [ "Jacket", "Blazer", "Coat", "Trench Coat",  "Puffer", "Leather Jacket",  "Denim Jacket",  "Vest"],
  Footwear: ["Sneakers", "Heels", "Boots", "Sandals", "Platforms"],
  Accessories: ["Bag", "Belt", "Hat", "Sunglasses", "Jewellery", "Scarf", "Watch"],
  Bags: ["Handbag", "Tote", "Clutch", "Backpack", "Mini Bag", "Shoulder Bag"],
  Swimwear: ["One-Piece", "Coverup", "Swim Shorts"],
};

const FILTER_COLORS = ["Black", "White", "Grey", "Brown", "Beige", "Red", "Pink", "Purple", "Blue", "Navy", "Green", "Yellow", "Orange",];
const FILTER_SEASONS = ["Spring", "Summer", "Autumn", "Winter"];
const FILTER_SIZES = ["XXS", "XS", "S", "M", "L", "XL", "XXL"];

const COLOR_HEX: Record<string, string> = { Black: "#111", White: "#fff", Grey: "#9E9E9E", Brown: "#795548", Beige: "#D7C4A3", Red: "#E53935", Pink: "#F48FB1",
  Purple: "#9C27B0", Blue: "#1E88E5", Navy: "#1A237E", Green: "#43A047", Yellow: "#FDD835", Orange: "#FB8C00",};

interface FilterState {
  category: string;
  subcategories: string[];
  colors: string[];
  seasons: string[];
  sizes: string[];
}

type OutfitSummary = {
  _id: string;
  name?: string;
  date?: string;
  isLookbook?: boolean;
  previewImage?: string;
  garmentIds?: string[];
  garments?: {
    _id?: string;
    imageUrl?: string | null;
  }[];
};

type PreviewTile = {
  key: string;
  uri: string;
};

function buildPreviewTiles(outfit: OutfitSummary, items: { id: string; image?: string | null }[]): PreviewTile[] {
  const tiles: PreviewTile[] = [];
  const seen = new Set<string>();

  const addTile = (uri: string | null | undefined, key: string) => {
    if (!uri || seen.has(uri) || tiles.length >= 4) return;
    seen.add(uri);
    tiles.push({ key, uri });
  };

  if (outfit.previewImage) {
    addTile(buildImageUrl(outfit.previewImage), 'cover');

    // For lookbooks, a selected/uploaded cover should be the sole preview image.
    if (outfit.isLookbook) {
      return tiles;
    }
  }

  if (Array.isArray(outfit.garments)) {
    outfit.garments.forEach((garment, index) => {
      addTile(garment?.imageUrl ? buildImageUrl(garment.imageUrl) : null, `garment-${index}`);
    });
  }

  const garmentIds = Array.isArray(outfit.garmentIds) ? outfit.garmentIds : [];
  if (garmentIds.length > 0) {
    items.forEach((item) => {
      if (garmentIds.includes(String(item.id))) {
        addTile(item.image || null, `item-${item.id}`);
      }
    });
  }

  return tiles.slice(0, 4);
}

function OutfitPreviewTile({ tiles }: { tiles: PreviewTile[] }) {
  if (tiles.length === 0) {
    return <View style={s.gridEmpty} />;
  }

  if (tiles.length === 1) {
    return (
      <AuthenticatedImage
        source={{ uri: tiles[0].uri }}
        style={s.gridImg}
        resizeMode="cover"
      />
    );
  }

  if (tiles.length === 2) {
    return (
      <View style={[s.gridImg, { flexDirection: 'row', overflow: 'hidden', backgroundColor: '#f3f3f3' }]}>
        {tiles.map((tile) => (
          <View key={tile.key} style={{ width: '50%', height: '100%', padding: 1 }}>
            <AuthenticatedImage
              source={{ uri: tile.uri }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          </View>
        ))}
      </View>
    );
  }

  if (tiles.length === 3) {
    return (
      <View style={[s.gridImg, { flexDirection: 'row', overflow: 'hidden', backgroundColor: '#f3f3f3' }]}>
        <View style={{ width: '50%', height: '100%', padding: 1 }}>
          <AuthenticatedImage
            source={{ uri: tiles[0].uri }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        </View>
        <View style={{ width: '50%', height: '100%' }}>
          <View style={{ height: '50%', padding: 1 }}>
            <AuthenticatedImage
              source={{ uri: tiles[1].uri }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          </View>
          <View style={{ height: '50%', padding: 1 }}>
            <AuthenticatedImage
              source={{ uri: tiles[2].uri }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[s.gridImg, { flexDirection: 'row', flexWrap: 'wrap', overflow: 'hidden', backgroundColor: '#f3f3f3' }]}>
      {tiles.slice(0, 4).map((tile) => (
        <View
          key={tile.key}
          style={{
            width: '50%',
            height: '50%',
            padding: 1,
          }}
        >
          <AuthenticatedImage
            source={{ uri: tile.uri }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        </View>
      ))}
    </View>
  );
}

const LOOKBOOK_IDS_KEY = "lookbookIds";

const toIdString = (value: any) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value._id) return String(value._id);
  return String(value);
};

const normalizeOutfit = (raw: any, localLookbookIds: Set<string>): OutfitSummary => {
  const garments = Array.isArray(raw?.garments) ? raw.garments : [];
  const lookbookFlag = raw?.isLookbook;
  const rawId = toIdString(raw?._id);
  const garmentIds = Array.isArray(raw?.garmentIds)
    ? raw.garmentIds.map(toIdString).filter(Boolean)
    : garments.map((garment: any) => toIdString(garment)).filter(Boolean);

  const derivedPreviewImage = garments.find((garment: any) => garment?.imageUrl)?.imageUrl;

  return {
    _id: rawId,
    name: raw?.name,
    date: raw?.date,
    isLookbook:
      lookbookFlag === true ||
      lookbookFlag === "true" ||
      lookbookFlag === 1 ||
      localLookbookIds.has(rawId),
    previewImage: raw?.previewImage || derivedPreviewImage || undefined,
    garmentIds,
    garments,
  };
};

const parseStoredLookbookIds = (rawValue: string | null) => {
  if (!rawValue) return [] as string[];
  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed.map((value) => String(value)) : [];
  } catch {
    return [] as string[];
  }
};

const EMPTY_FILTERS: FilterState = {
  category: "",
  subcategories: [],
  colors: [],
  seasons: [],
  sizes: [],
};

const Wave = () => (
  <Svg
    width={W}
    height={44}
    viewBox={`0 0 ${W} 44`}
    preserveAspectRatio="none"
    style={{ position: "absolute", width: "100%", height: "100%" }}
  >
    <Path
      d={`M0,44 L0,22 Q${W * 0.25},50.6 ${W * 0.5},16.72 Q${W * 0.75},-8.8 ${W},22.88 L${W},44 Z`}
      fill="#f2f2f2"
    />
  </Svg>
);

const Chip = ({ label, active, onPress, }: { label: string; active: boolean;onPress: () => void;}) => (
  <TouchableOpacity style={[fc.chip, active && fc.chipOn]} onPress={onPress}>
    <Text style={[fc.chipTxt, active && fc.chipTxtOn]}>{label}</Text>
  </TouchableOpacity>
);

export default function WardrobeScreen() {
  const router = useRouter();
  const { items, counts, loading } = useWardrobe();

  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [username, setUsername] = useState("wizliz");
  const [activeTopTab, setActiveTopTab] = useState(0);
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [imageMenuFor, setImageMenuFor] = useState<"profile" | "bg" | null>(
    null,
  );
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [uploadingHeaderImage, setUploadingHeaderImage] = useState(false);
  const [outfits, setOutfits] = useState<OutfitSummary[]>([]);
  const [loadingOutfits, setLoadingOutfits] = useState(false);

  const fetchUserHeaderImages = useCallback(async () => {
    try {
      const profile = await fetchCurrentUserProfile();
      setUsername(profile.username || profile.name || "wizliz");
      setProfilePic(profile.profilePicture ?? null);
      setBgImage(profile.bannerImage ?? null);
    } catch (error) {
      console.warn("Failed to load header images:", error);
    }
  }, []);

  const fetchOutfits = useCallback(async () => {
    try {
      setLoadingOutfits(true);
      const token = await SecureStore.getItemAsync("userToken");
      if (!token) {
        setOutfits([]);
        return;
      }

      const [response, storedIdsRaw] = await Promise.all([
        fetch(buildApiUrl("/api/outfits"), {
          headers: buildAuthHeaders(token),
        }),
        SecureStore.getItemAsync(LOOKBOOK_IDS_KEY),
      ]);

      const localLookbookIds = new Set(parseStoredLookbookIds(storedIdsRaw));

      if (!response.ok) {
        setOutfits([]);
        return;
      }

      const payload = await response.json();
      setOutfits(
        Array.isArray(payload)
          ? payload.map((entry) => normalizeOutfit(entry, localLookbookIds))
          : [],
      );
    } catch {
      setOutfits([]);
    } finally {
      setLoadingOutfits(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchUserHeaderImages();
      fetchOutfits();
    }, [fetchOutfits, fetchUserHeaderImages]),
  );

  useEffect(() => {
    if (activeTopTab === 1 || activeTopTab === 2) {
      fetchOutfits();
    }
  }, [activeTopTab, counts.outfits, counts.lookbooks, fetchOutfits]);

  const savedOutfits = outfits.filter((outfit) => !outfit.isLookbook);
  const savedLookbooks = outfits.filter((outfit) => outfit.isLookbook);

  const switchTab = (idx: number) => {
    setActiveTopTab(idx);
  };

  const setCategory = (cat: string) =>
    setFilters((prev) => ({
      ...prev,
      category: prev.category === cat ? "" : cat,
      subcategories: [],
    }));

  const toggleMulti = (
    key: "subcategories" | "colors" | "seasons" | "sizes",
    val: string,
  ) =>
    setFilters((prev) => ({
      ...prev,
      [key]: prev[key].includes(val)
        ? prev[key].filter((v: string) => v !== val)
        : [...prev[key], val],
    }));

  const clearFilters = () => setFilters(EMPTY_FILTERS);

  const activeFilterCount =
    (filters.category ? 1 : 0) +
    filters.subcategories.length +
    filters.colors.length +
    filters.seasons.length +
    filters.sizes.length;

  const pickImage = async (source: "library" | "camera") => {
    try {
      const isProfile = imageMenuFor === "profile";
      const pickerOptions: ImagePicker.ImagePickerOptions = {
        allowsEditing: true,
        aspect: isProfile ? IMAGE_UPLOAD_ASPECT.profile : IMAGE_UPLOAD_ASPECT.banner,
        quality: isProfile ? IMAGE_UPLOAD_QUALITY.profile : IMAGE_UPLOAD_QUALITY.banner,
      };

      const result =
        source === "library"
          ? await ImagePicker.launchImageLibraryAsync(pickerOptions)
          : await ImagePicker.launchCameraAsync(pickerOptions);

      if (!result.canceled && result.assets[0]) {
        const selectedUri = result.assets[0].uri;
        const sizeError = validateImageFileSize(
          result.assets[0].fileSize,
          isProfile ? "profile" : "banner",
        );

        if (sizeError) {
          Alert.alert(sizeError.title, sizeError.body);
          return;
        }

        if (isProfile) setProfilePic(selectedUri);
        else setBgImage(selectedUri);

        setUploadingHeaderImage(true);
        const updatedUser = isProfile
          ? await uploadProfileImage(selectedUri)
          : await uploadBannerImage(selectedUri);

        setProfilePic(updatedUser.profilePicture ?? null);
        setBgImage(updatedUser.bannerImage ?? null);
      }
    } catch (error: any) {
      Alert.alert("Upload failed", getUploadErrorMessage(error, "Unable to update image."));
    } finally {
      setUploadingHeaderImage(false);
      setImageMenuFor(null);
    }
  };

  const filtered = items.filter((item) => {
    if (
      searchQuery &&
      !item.label.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;
    if (activeFilter !== "All" && !item.category?.includes(activeFilter))
      return false;
    if (filters.category && !item.category?.includes(filters.category))
      return false;
    if (
      filters.subcategories.length > 0 &&
      !filters.subcategories.some((sc) =>
        item.tags?.map((t) => t.toLowerCase()).includes(sc.toLowerCase()),
      )
    )
      return false;
    if (
      filters.colors.length > 0 &&
      !filters.colors.some((c) => item.colors?.includes(c))
    )
      return false;
    if (
      filters.seasons.length > 0 &&
      !filters.seasons.some((se) =>
        item.tags?.map((t) => t.toLowerCase()).includes(se.toLowerCase()),
      )
    )
      return false;
    if (filters.sizes.length > 0 && !filters.sizes.includes(item.size ?? ""))
      return false;
    return true;
  });

  return (
    <View style={s.root}>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

      {/* ── Header — absolute so it never affects body layout ── */}
      <View style={s.headerShell} pointerEvents="box-none">
        <TouchableOpacity
          style={s.headerImg}
          onPress={() => setImageMenuFor("bg")}
          activeOpacity={0.9}
        >
          {bgImage ? (
            <AuthenticatedImage source={{ uri: bgImage }} style={s.bgImage} />
          ) : (
            <View style={s.headerDefault} />
          )}
          <View style={s.waveWrap}>
            <Wave />
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={s.settingsBtn}
          onPress={() => router.push("/features/settings" as any)}
        >
          <Feather name="settings" size={15} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={s.profileWrap}
          onPress={() => setImageMenuFor("profile")}
        >
          {profilePic ? (
            <AuthenticatedImage source={{ uri: profilePic }} style={s.profilePic} />
          ) : (
            <View style={[s.profilePic, s.profilePlaceholder]}>
              <Ionicons name="person" size={36} color="#fff" />
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Body — sits on top of header ── */}
      <View style={s.body}>
        <View style={s.usernameRow}>
          <Text style={s.username}>@{username}</Text>
          <TouchableOpacity
            onPress={() => router.push("/features/analytics" as any)}
          >
            <Text style={s.analyticsLink}>Style Analytics ›</Text>
          </TouchableOpacity>
        </View>
        {uploadingHeaderImage ? (
          <Text style={{ color: "#777", marginBottom: 8 }}>Uploading image...</Text>
        ) : null}

        <View style={s.statsCard}>
          <TouchableOpacity style={s.statItem} onPress={() => switchTab(0)}>
            <Text style={s.statNum}>{counts.items}</Text>
            <Text style={[s.statLabel, activeTopTab === 0 && s.statLabelPink]}>
              Items
            </Text>
          </TouchableOpacity>
          <View style={s.statDivider} />
          <TouchableOpacity style={s.statItem} onPress={() => switchTab(1)}>
            <Text style={s.statNum}>{counts.outfits}</Text>
            <Text style={[s.statLabel, activeTopTab === 1 && s.statLabelPink]}>
              Outfits
            </Text>
          </TouchableOpacity>
          <View style={s.statDivider} />
          <TouchableOpacity style={s.statItem} onPress={() => switchTab(2)}>
            <Text style={s.statNum}>{counts.lookbooks}</Text>
            <Text style={[s.statLabel, activeTopTab === 2 && s.statLabelPink]}>
              Lookbooks
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={s.pagesScroll} showsVerticalScrollIndicator={false}>
          {activeTopTab === 0 && (
            <>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.filterTabsContent}
              >
                {FILTER_TABS.map((tab) => (
                  <TouchableOpacity
                    key={tab}
                    style={[s.tab, activeFilter === tab && s.tabActive]}
                    onPress={() => setActiveFilter(tab)}
                  >
                    <Text
                      style={[
                        s.tabText,
                        activeFilter === tab && s.tabTextActive,
                      ]}
                    >
                      {tab}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <View style={s.controlDivider} />
              <View style={s.searchSection}>
                <View style={s.searchRow}>
                  <View style={s.searchBar}>
                    <Ionicons name="search" size={14} color="#aaa" />
                    <TextInput
                      placeholder="Search"
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      style={s.searchInput}
                      placeholderTextColor="#aaa"
                    />
                  </View>
                </View>
                <TouchableOpacity style={s.iconBtn}>
                  <Ionicons name="star" size={18} color="#333" />
                </TouchableOpacity>
                <TouchableOpacity style={s.iconBtn}>
                  <Ionicons name="eye-off-outline" size={19} color="#000" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.iconBtn, activeFilterCount > 0 && s.iconBtnActive]}
                  onPress={() => setShowFilter(true)}
                >
                  <Feather
                    name="sliders"
                    size={18}
                    color={activeFilterCount > 0 ? "#fff" : "#000"}
                  />
                  {activeFilterCount > 0 && (
                    <View style={s.badge}>
                      <Text style={s.badgeTxt}>{activeFilterCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
              {!loading && items.length > 0 && (
                <Text style={s.resultsCountTxt}>
                  {filtered.length} {filtered.length === 1 ? "result" : "results"}
                </Text>
              )}
              {activeFilterCount > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={s.activePillsContent}
                >
                  {filters.category !== "" && (
                    <TouchableOpacity
                      style={s.activePill}
                      onPress={() => setCategory(filters.category)}
                    >
                      <Text style={s.activePillTxt}>{filters.category} ×</Text>
                    </TouchableOpacity>
                  )}
                  {[
                    ...filters.subcategories,
                    ...filters.colors,
                    ...filters.seasons,
                    ...filters.sizes,
                  ].map((v) => (
                    <TouchableOpacity
                      key={v}
                      style={s.activePill}
                      onPress={() => {
                        if (filters.subcategories.includes(v))
                          toggleMulti("subcategories", v);
                        else if (filters.colors.includes(v))
                          toggleMulti("colors", v);
                        else if (filters.seasons.includes(v))
                          toggleMulti("seasons", v);
                        else toggleMulti("sizes", v);
                      }}
                    >
                      <Text style={s.activePillTxt}>{v} ×</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity style={s.clearPill} onPress={clearFilters}>
                    <Text style={s.clearPillTxt}>Clear all</Text>
                  </TouchableOpacity>
                </ScrollView>
              )}
              {loading ? (
                <View style={s.emptyState}>
                  <ActivityIndicator size="large" color="#E91E63" />
                  <Text style={s.emptyTitle}>Loading your wardrobe...</Text>
                </View>
              ) : items.length === 0 ? (
                <View style={s.emptyState}>
                  <Text style={s.emptyTitle}>Your wardrobe is empty</Text>
                  <Text style={s.emptySubtitle}>
                    Tap the pink button below to add your first item
                  </Text>
                </View>
              ) : filtered.length === 0 ? (
                <View style={s.emptyState}>
                  <Text style={s.emptyTitle}>No items match</Text>
                  <TouchableOpacity style={s.clearBtn} onPress={clearFilters}>
                    <Text style={s.clearBtnTxt}>Clear Filters</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={s.gridContent}>
                  {filtered.map((item) => (
                    <GridItem
                      key={item.id}
                      item={item}
                      onPress={() =>
                        router.push({
                          pathname: "/wardrobe/item-detail" as any,
                          params: { itemJson: JSON.stringify(item) },
                        })
                      }
                    />
                  ))}
                </View>
              )}
            </>
          )}

          {activeTopTab === 1 && (
            loadingOutfits ? (
              <View style={s.emptyState}>
                <ActivityIndicator size="large" color="#E91E63" />
                <Text style={s.emptyTitle}>Loading outfits...</Text>
              </View>
            ) : savedOutfits.length === 0 ? (
              <View style={s.emptyState}>
                <Text style={s.emptyTitle}>No outfits yet</Text>
                <Text style={s.emptySubtitle}>
                  Use the + button to create your first outfit
                </Text>
                <TouchableOpacity
                  style={s.clearBtn}
                  onPress={() => router.push("/wardrobe/outfit" as any)}
                >
                  <Text style={s.clearBtnTxt}>Create Outfit</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={s.gridContent}>
                {savedOutfits.map((outfit) => {
                  const garmentIds = Array.isArray(outfit.garmentIds) ? outfit.garmentIds : [];
                  const previewTiles = buildPreviewTiles(outfit, items);
                  const itemCount = garmentIds.length;
                  const dateLabel = outfit.date
                    ? new Date(outfit.date).toLocaleDateString()
                    : "No date";

                  return (
                    <TouchableOpacity
                      key={outfit._id}
                      style={s.gridItem}
                      onPress={() =>
                        router.push({
                          pathname: "/wardrobe/outfit-detail" as any,
                          params: { outfitJson: JSON.stringify(outfit) },
                        })
                      }
                    >
                      <OutfitPreviewTile tiles={previewTiles} />
                      <Text style={s.gridLabel} numberOfLines={1}>
                        {outfit.name || `Outfit • ${itemCount} items`}
                      </Text>
                      <Text style={{ position: "absolute", bottom: 18, left: 8, fontSize: 9, color: "#bbb" }}>
                        {dateLabel}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )
          )}

          {activeTopTab === 2 && (
            loadingOutfits ? (
              <View style={s.emptyState}>
                <ActivityIndicator size="large" color="#E91E63" />
                <Text style={s.emptyTitle}>Loading lookbooks...</Text>
              </View>
            ) : savedLookbooks.length === 0 ? (
              <View style={s.emptyState}>
                <Text style={s.emptyTitle}>No lookbooks yet</Text>
                <Text style={s.emptySubtitle}>
                  Use the + button to create your first lookbook
                </Text>
                <TouchableOpacity
                  style={s.clearBtn}
                  onPress={() => router.push("/wardrobe/lookbook" as any)}
                >
                  <Text style={s.clearBtnTxt}>Create Lookbook</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={s.gridContent}>
                {savedLookbooks.map((outfit) => {
                  const garmentIds = Array.isArray(outfit.garmentIds) ? outfit.garmentIds : [];
                  const previewTiles = buildPreviewTiles(outfit, items);
                  const itemCount = garmentIds.length;
                  const displayName = (outfit.name || "").trim() || "Untitled Lookbook";
                  const dateLabel = outfit.date
                    ? new Date(outfit.date).toLocaleDateString()
                    : "No date";

                  return (
                    <TouchableOpacity
                      key={outfit._id}
                      style={s.gridItem}
                      onPress={() =>
                        router.push({
                          pathname: "/wardrobe/lookbook-detail" as any,
                          params: { lookbookJson: JSON.stringify(outfit) },
                        })
                      }
                    >
                      <OutfitPreviewTile tiles={previewTiles} />
                      <Text
                        style={{
                          position: "absolute",
                          top: 8,
                          left: 8,
                          right: 8,
                          fontSize: 10,
                          fontWeight: "700",
                          color: "#1a1a1a",
                          backgroundColor: "rgba(255,255,255,0.92)",
                          borderRadius: 8,
                          paddingHorizontal: 6,
                          paddingVertical: 3,
                        }}
                        numberOfLines={1}
                      >
                        {displayName}
                      </Text>
                      <Text style={{ position: "absolute", bottom: 18, left: 8, fontSize: 9, color: "#888" }}>
                        {itemCount} item{itemCount === 1 ? "" : "s"}
                      </Text>
                      <Text style={{ position: "absolute", bottom: 4, left: 8, fontSize: 9, color: "#bbb" }}>
                        {dateLabel}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )
          )}
        </ScrollView>
      </View>

      {/* ── Filter Modal ── */}
      <Modal
        transparent
        visible={showFilter}
        animationType="slide"
        onRequestClose={() => setShowFilter(false)}
      >
        <View style={s.filterOverlay}>
          <TouchableOpacity
            style={s.filterDismiss}
            activeOpacity={1}
            onPress={() => setShowFilter(false)}
          />
          <View style={s.filterSheet}>
            <View style={s.filterHeader}>
              <TouchableOpacity onPress={clearFilters}>
                <Text style={s.filterClearTxt}>Clear all</Text>
              </TouchableOpacity>
              <Text style={s.filterTitle}>Filter</Text>
              <TouchableOpacity onPress={() => setShowFilter(false)}>
                <Ionicons name="close" size={22} color="#1a1a1a" />
              </TouchableOpacity>
            </View>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={s.filterScrollContent}
            >
              <Text style={s.filterSection}>CATEGORY</Text>
              <View style={fc.row}>
                {Object.keys(CATEGORY_TREE).map((cat) => (
                  <Chip
                    key={cat}
                    label={cat}
                    active={filters.category === cat}
                    onPress={() => setCategory(cat)}
                  />
                ))}
              </View>
              {filters.category !== "" && (
                <>
                  <Text style={s.filterSection}>
                    {filters.category.toUpperCase()} TYPE
                  </Text>
                  <View style={fc.row}>
                    {CATEGORY_TREE[filters.category].map((sub) => (
                      <Chip
                        key={sub}
                        label={sub}
                        active={filters.subcategories.includes(sub)}
                        onPress={() => toggleMulti("subcategories", sub)}
                      />
                    ))}
                  </View>
                </>
              )}
              <Text style={s.filterSection}>COLOR</Text>
              <View style={fc.colorRow}>
                {FILTER_COLORS.map((c) => {
                  const hex = COLOR_HEX[c];
                  const selected = filters.colors.includes(c);
                  const isLight = [
                    "White",
                    "Cream",
                    "Yellow",
                    "Gold",
                    "Beige",
                  ].includes(c);
                  return (
                    <TouchableOpacity
                      key={c}
                      style={fc.colorOpt}
                      onPress={() => toggleMulti("colors", c)}
                    >
                      <View
                        style={[
                          fc.swatch,
                          { backgroundColor: hex },
                          isLight && fc.swatchBorder,
                          selected && fc.swatchSelected,
                        ]}
                      >
                        {selected && (
                          <Ionicons
                            name="checkmark"
                            size={13}
                            color={isLight ? "#333" : "#fff"}
                          />
                        )}
                      </View>
                      <Text style={fc.swatchLabel}>{c}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={s.filterSection}>SEASON</Text>
              <View style={fc.row}>
                {FILTER_SEASONS.map((season) => (
                  <Chip
                    key={season}
                    label={season}
                    active={filters.seasons.includes(season)}
                    onPress={() => toggleMulti("seasons", season)}
                  />
                ))}
              </View>
              <Text style={s.filterSection}>SIZE</Text>
              <View style={fc.row}>
                {FILTER_SIZES.map((sz) => (
                  <Chip
                    key={sz}
                    label={sz}
                    active={filters.sizes.includes(sz)}
                    onPress={() => toggleMulti("sizes", sz)}
                  />
                ))}
              </View>
            </ScrollView>
            <TouchableOpacity
              style={s.applyBtn}
              onPress={() => setShowFilter(false)}
            >
              <Text style={s.applyBtnTxt}>
                {filtered.length === items.length
                  ? `Show All Items · ${items.length}`
                  : `Show Results · ${filtered.length}`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Image picker ── */}
      <Modal
        transparent
        visible={!!imageMenuFor}
        animationType="slide"
        onRequestClose={() => setImageMenuFor(null)}
      >
        <TouchableOpacity
          style={s.overlay}
          activeOpacity={1}
          onPress={() => setImageMenuFor(null)}
        >
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>Change Image</Text>
            <TouchableOpacity
              style={s.sheetBtn}
              onPress={() => pickImage("library")}
            >
              <Text>Choose from Library</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.sheetBtn}
              onPress={() => pickImage("camera")}
            >
              <Text>Take Photo</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}