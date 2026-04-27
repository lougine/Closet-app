import { Feather, Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Dimensions, Modal, ScrollView, StatusBar, Text, TextInput, TouchableOpacity, View, ActivityIndicator, RefreshControl } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useWardrobe } from "../../context/wardrobeContext";
import AuthenticatedImage from "../../components/AuthenticatedImage";
import OutfitPreviewCollage from "../../components/OutfitPreviewCollage";
import { IMAGE_UPLOAD_ASPECT, IMAGE_UPLOAD_QUALITY, validateImageFileSize } from "../../constants/imageUpload";
import { fetchCurrentUserProfile, uploadBannerImage, uploadProfileImage } from "@/services/userProfileService";
import { getUploadErrorMessage } from "../../services/uploadRequest";
import { buildApiUrl, buildAuthHeaders, fetchApiWithFallback } from "../../constants/api";
import { getAppTheme } from "../../constants/appTheme";
import { fc, s } from "../../Styles/index.styles";
import { useCalendar } from "../../context/calendar-context";
import { useAppTheme } from "../../context/themeContext";

const { width: W } = Dimensions.get("window");

function GridItem({ item, onPress, starred, hidden, onToggleStar, onToggleHidden, isDarkMode, iconMutedColor, cardBackgroundColor, emptyBackgroundColor }: {
  item: any;  onPress: () => void; starred: boolean; hidden: boolean; onToggleStar: () => void; onToggleHidden: () => void;
  isDarkMode: boolean; iconMutedColor: string; cardBackgroundColor: string; emptyBackgroundColor: string;
}) {
  return (
    <TouchableOpacity style={[s.gridItem, { backgroundColor: cardBackgroundColor }]} onPress={onPress}>
      {item.image ? (
        <AuthenticatedImage
          source={{ uri: item.image }}
          style={s.gridImg}
          resizeMode="contain"
        />
      ) : (
        <View style={[s.gridEmpty, { backgroundColor: emptyBackgroundColor }]} />
      )}
      {hidden && <View style={[s.gridHiddenOverlay, { backgroundColor: isDarkMode ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.7)" }]} />}
      <TouchableOpacity
        style={s.gridEyeBtn}
        onPress={(e) => {
          e.stopPropagation();
          onToggleHidden();
        }}
      >
        <Ionicons
          name={hidden ? "eye-off" : "eye"}
          size={13}
          color={hidden ? iconMutedColor : iconMutedColor}
        />
      </TouchableOpacity>
      <TouchableOpacity
        style={s.gridStarBtn}
        onPress={(e) => {
          e.stopPropagation();
          onToggleStar();
        }}
      >
        <Ionicons
          name={starred ? "star" : "star-outline"}
          size={13}
          color={starred ? "#F0507B" : iconMutedColor}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const FILTER_TABS = [ "All", "Outerwear", "Tops", "Bottoms", "Footwear", "Accessories" ];

const normalizeCategory = (category?: string) => {
  if (!category) return "";
  return /^shoes$/i.test(category) ? "Footwear" : category;
};

const getObjectIdTimestamp = (value: unknown) => {
  if (typeof value !== "string" || value.length < 8) return 0;
  const seconds = Number.parseInt(value.slice(0, 8), 16);
  return Number.isFinite(seconds) ? seconds * 1000 : 0;
};

const getItemAddedTimestamp = (item: any) => {
  const createdAtMs = item?.createdAt ? new Date(item.createdAt).getTime() : 0;
  if (Number.isFinite(createdAtMs) && createdAtMs > 0) return createdAtMs;

  const dateAddedMs = item?.dateAdded ? new Date(item.dateAdded).getTime() : 0;
  if (Number.isFinite(dateAddedMs) && dateAddedMs > 0) return dateAddedMs;

  return getObjectIdTimestamp(item?.id);
};

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

interface OutfitFilterState {
  preview: "all" | "with" | "without";
  layout: "all" | "canvas" | "basic";
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
  styledLayout?: {
    dragPositions?: Record<string, { x: number; y: number }>;
    itemScales?: Record<string, number>;
    itemOrder?: string[];
    canvasSize?: { width?: number; height?: number };
  } | null;
};

const getOutfitItemCount = (outfit: OutfitSummary) => {
  if (Array.isArray(outfit.garments) && outfit.garments.length > 0) {
    return outfit.garments.length;
  }

  return Array.isArray(outfit.garmentIds) ? outfit.garmentIds.length : 0;
};

const LOOKBOOK_IDS_KEY = "lookbookIds";
const INDEX_REFRESH_AFTER_RANDOMIZE_SAVE_KEY = "indexRefreshAfterRandomizeSave";

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
    styledLayout: raw?.styledLayout || null,
  };
};

const isOwnedOutfit = (raw: any, userId: string) => {
  if (!userId) return false;

  const ownerId = toIdString(raw?.owner ?? raw?.userId ?? raw?.createdBy ?? raw?.author);
  const audienceId = toIdString(raw?.styledForUserId ?? raw?.recipientUserId ?? raw?.targetUserId ?? raw?.forUserId);

  if (!ownerId || ownerId !== userId) {
    return false;
  }

  if (audienceId && audienceId !== userId) {
    return false;
  }

  return true;
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

const EMPTY_OUTFIT_FILTERS: OutfitFilterState = {
  preview: "all",
  layout: "all",
};

const Wave = ({ fillColor }: { fillColor: string }) => (
  <Svg
    width={W}
    height={44}
    viewBox={`0 0 ${W} 44`}
    preserveAspectRatio="none"
    style={s.waveSvg}
  >
    <Path
      d={`M0,44 L0,22 Q${W * 0.25},50.6 ${W * 0.5},16.72 Q${W * 0.75},-8.8 ${W},22.88 L${W},44 Z`}
      fill={fillColor}
    />
  </Svg>
);

const Chip = ({
  label,
  active,
  onPress,
  chipBgColor,
  chipBorderColor,
  chipTextColor,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  chipBgColor: string;
  chipBorderColor: string;
  chipTextColor: string;
}) => (
  <TouchableOpacity
    style={[
      fc.chip,
      { backgroundColor: chipBgColor, borderColor: chipBorderColor },
      active && fc.chipOn,
    ]}
    onPress={onPress}
  >
    <Text style={[fc.chipTxt, { color: chipTextColor }, active && fc.chipTxtOn]}>{label}</Text>
  </TouchableOpacity>
);

export default function WardrobeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string; pickForCalendar?: string }>();
  const { items, counts, loading, refreshItems } = useWardrobe();
  const { selectedDate, assignOutfitToDate } = useCalendar();
  const { isDarkMode } = useAppTheme();

  const theme = getAppTheme(isDarkMode, {
    dark: {
      text: "#F3F3F3",
      subText: "#A9A9A9",
      border: "#303030",
    },
    light: {
      screen: "#F7F7F7",
      text: "#161616",
      subText: "#707070",
      border: "#E7E7E7",
    },
  });

  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [username, setUsername] = useState("wizliz");
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [activeTopTab, setActiveTopTab] = useState(0);
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [imageMenuFor, setImageMenuFor] = useState<"profile" | "bg" | null>(
    null,
  );
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [quickFilter, setQuickFilter] = useState<"all" | "favorites" | "hidden">("all");
  const [favoriteItemIds, setFavoriteItemIds] = useState<string[]>([]);
  const [hiddenItemIds, setHiddenItemIds] = useState<string[]>([]);
  const [updatingPreferenceIds, setUpdatingPreferenceIds] = useState<string[]>([]);
  const [uploadingHeaderImage, setUploadingHeaderImage] = useState(false);
  const [outfits, setOutfits] = useState<OutfitSummary[]>([]);
  const [loadingOutfits, setLoadingOutfits] = useState(false);
  const [savingCalendarOutfitId, setSavingCalendarOutfitId] = useState<string | null>(null);
  const [pullRefreshing, setPullRefreshing] = useState(false);
  const [outfitSearchQuery, setOutfitSearchQuery] = useState("");
  const [outfitQuickFilter, setOutfitQuickFilter] = useState<"all" | "favorites" | "hidden">("all");
  const [favoriteOutfitIds, setFavoriteOutfitIds] = useState<string[]>([]);
  const [hiddenOutfitIds, setHiddenOutfitIds] = useState<string[]>([]);
  const [showOutfitFilter, setShowOutfitFilter] = useState(false);
  const [outfitFilters, setOutfitFilters] = useState<OutfitFilterState>(EMPTY_OUTFIT_FILTERS);
  const outfitPreviewBackground = isDarkMode ? "#1c1c1c" : "#f4f4f4";
  const outfitPreviewEmptyBackground = isDarkMode ? "#2b2b2b" : "#ececec";

  const selectingForCalendar = params.pickForCalendar === "1";

  const getCalendarGarmentIds = useCallback((outfit: OutfitSummary) => {
    const fromGarmentIds = Array.isArray(outfit.garmentIds)
      ? outfit.garmentIds.map((id) => String(id)).filter(Boolean)
      : [];

    if (fromGarmentIds.length > 0) {
      return fromGarmentIds;
    }

    const fromGarments = Array.isArray(outfit.garments)
      ? outfit.garments
          .map((garment) => toIdString(garment?._id))
          .filter(Boolean)
      : [];

    return fromGarments;
  }, []);

  const handleSelectOutfitForCalendar = useCallback(async (outfit: OutfitSummary) => {
    if (savingCalendarOutfitId) return;

    const garmentIds = getCalendarGarmentIds(outfit);
    if (!garmentIds.length) {
      Alert.alert("Unavailable", "This outfit has no items to add to calendar.");
      return;
    }

    try {
      setSavingCalendarOutfitId(outfit._id);
      await assignOutfitToDate({
        outfitId: outfit._id,
        date: selectedDate,
      });
      Alert.alert("Added", "Selected outfit assigned to this day.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Could not add outfit to calendar.");
    } finally {
      setSavingCalendarOutfitId(null);
    }
  }, [assignOutfitToDate, getCalendarGarmentIds, router, savingCalendarOutfitId, selectedDate]);

  useEffect(() => {
    setFavoriteItemIds(
      items.filter((item) => item.isFavorite).map((item) => String(item.id)),
    );
    setHiddenItemIds(
      items.filter((item) => item.isHidden).map((item) => String(item.id)),
    );
  }, [items]);

  const fetchUserHeaderImages = useCallback(async () => {
    try {
      const profile = await fetchCurrentUserProfile();
      setCurrentUserId(String(profile._id || ""));
      setUsername(profile.username || profile.name || "wizliz");
      setProfilePic(profile.profilePicture ?? null);
      setBgImage(profile.bannerImage ?? null);
      setFollowerCount(profile.followerCount || 0);
      setFollowingCount(profile.followingCount || 0);
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

      if (!currentUserId) {
        setOutfits([]);
        return;
      }

      const [response, storedIdsRaw] = await Promise.all([
        fetchApiWithFallback("/api/outfits", {
          headers: buildAuthHeaders(token),
        }, { timeoutMs: 12000, retries: 1 }),
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
          ? payload
              .filter((entry) => isOwnedOutfit(entry, currentUserId))
              .map((entry) => normalizeOutfit(entry, localLookbookIds))
          : [],
      );
    } catch {
      setOutfits([]);
    } finally {
      setLoadingOutfits(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    refreshItems();
    fetchUserHeaderImages();
  }, [fetchUserHeaderImages, refreshItems]);

  useEffect(() => {
    if (!currentUserId) return;
    fetchOutfits();
  }, [currentUserId, fetchOutfits]);

  useEffect(() => {
    if (params.tab === "outfits") {
      setActiveTopTab(1);
    }
  }, [params.tab]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      const refreshAfterRandomizeSave = async () => {
        try {
          const shouldRefresh = await SecureStore.getItemAsync(INDEX_REFRESH_AFTER_RANDOMIZE_SAVE_KEY);
          if (cancelled || shouldRefresh !== "1") return;

          await SecureStore.deleteItemAsync(INDEX_REFRESH_AFTER_RANDOMIZE_SAVE_KEY);
          await Promise.all([Promise.resolve(refreshItems()), fetchOutfits()]);
        } catch (error) {
          console.warn("Failed to refresh after randomize save:", error);
        }
      };

      refreshAfterRandomizeSave();
      fetchUserHeaderImages();
      fetchOutfits();

      return () => {
        cancelled = true;
      };
    }, [fetchOutfits, fetchUserHeaderImages, refreshItems]),
  );

  const onPullRefresh = useCallback(async () => {
    if (pullRefreshing) return;

    try {
      setPullRefreshing(true);

      if (activeTopTab === 0) {
        await Promise.all([
          Promise.resolve(refreshItems()),
          fetchUserHeaderImages(),
        ]);
        return;
      }

      await fetchOutfits();
    } finally {
      setPullRefreshing(false);
    }
  }, [activeTopTab, fetchOutfits, fetchUserHeaderImages, pullRefreshing, refreshItems]);

  const savedOutfits = outfits.filter((outfit) => !outfit.isLookbook);
  const savedLookbooks = outfits.filter((outfit) => outfit.isLookbook);
  const displayedOutfitCount = savedOutfits.length;
  const displayedLookbookCount = savedLookbooks.length;
  const favoriteOutfitCount = favoriteOutfitIds.length;
  const activeOutfitFilterCount =
    (outfitFilters.preview !== "all" ? 1 : 0) +
    (outfitFilters.layout !== "all" ? 1 : 0);

  const toggleFavoriteOutfit = (outfitId: string) => {
    setFavoriteOutfitIds((prev) => (
      prev.includes(outfitId)
        ? prev.filter((id) => id !== outfitId)
        : [...prev, outfitId]
    ));
  };

  const toggleHiddenOutfit = (outfitId: string) => {
    setHiddenOutfitIds((prev) => (
      prev.includes(outfitId)
        ? prev.filter((id) => id !== outfitId)
        : [...prev, outfitId]
    ));
  };

  const clearOutfitFilters = () => {
    setOutfitQuickFilter("all");
    setOutfitSearchQuery("");
    setOutfitFilters(EMPTY_OUTFIT_FILTERS);
  };

  const filteredOutfits = useMemo(() => (
    savedOutfits.filter((outfit) => {
      const id = String(outfit._id);
      const outfitName = String(outfit.name || "").toLowerCase();
      const query = outfitSearchQuery.trim().toLowerCase();
      const hasPreview = Boolean(outfit.previewImage);
      const hasLayout = Boolean(outfit.styledLayout);
      const isFavorite = favoriteOutfitIds.includes(id);
      const isHidden = hiddenOutfitIds.includes(id);

      if (query && !outfitName.includes(query)) return false;
      if (outfitQuickFilter === "favorites" && !isFavorite) return false;
      if (outfitQuickFilter === "hidden" && !isHidden) return false;
      if (outfitFilters.preview === "with" && !hasPreview) return false;
      if (outfitFilters.preview === "without" && hasPreview) return false;
      if (outfitFilters.layout === "canvas" && !hasLayout) return false;
      if (outfitFilters.layout === "basic" && hasLayout) return false;

      return true;
    })
  ), [
    favoriteOutfitIds,
    hiddenOutfitIds,
    outfitFilters.layout,
    outfitFilters.preview,
    outfitQuickFilter,
    outfitSearchQuery,
    savedOutfits,
  ]);

  const switchTab = (idx: number) => {
    setActiveTopTab(idx);
  };

  const openConnectionsPage = (tab: "followers" | "following") => {
    router.push({ pathname: "/features/friends" as any, params: { tab } });
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
  const clearAllVisibleFilters = () => {
    clearFilters();
    setQuickFilter("all");
  };

  const persistGarmentPreference = useCallback(
    async (id: string, updates: { isFavorite?: boolean; isHidden?: boolean }) => {
      const token = await SecureStore.getItemAsync("userToken");
      if (!token) {
        throw new Error("Not authenticated");
      }

      const url = buildApiUrl(`/api/garments/${id}/preferences`);
      const headers = {
        ...buildAuthHeaders(token),
        "Content-Type": "application/json",
      };
      const body = JSON.stringify(updates);

      let response = await fetch(url, {
        method: "PATCH",
        headers,
        body,
      });

      // Fallback for environments/proxies that block PATCH.
      if (response.status === 404 || response.status === 405) {
        response = await fetch(url, {
          method: "PUT",
          headers,
          body,
        });
      }

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || "Failed to update garment preference");
      }
    },
    [],
  );

  const toggleFavoriteItem = useCallback(
    async (id: string) => {
      if (updatingPreferenceIds.includes(id)) return;

      const wasFavorite = favoriteItemIds.includes(id);
      const nextFavorite = !wasFavorite;

      setFavoriteItemIds((prev) =>
        nextFavorite ? [...prev, id] : prev.filter((itemId) => itemId !== id),
      );
      setUpdatingPreferenceIds((prev) => [...prev, id]);

      try {
        await persistGarmentPreference(id, { isFavorite: nextFavorite });
      } catch (error: any) {
        setFavoriteItemIds((prev) =>
          wasFavorite
            ? (prev.includes(id) ? prev : [...prev, id])
            : prev.filter((itemId) => itemId !== id),
        );
        Alert.alert("Update failed", error?.message || "Could not update favorite status.");
      } finally {
        setUpdatingPreferenceIds((prev) =>
          prev.filter((itemId) => itemId !== id),
        );
      }
    },
    [favoriteItemIds, persistGarmentPreference, updatingPreferenceIds],
  );

  const toggleHiddenItem = useCallback(
    async (id: string) => {
      if (updatingPreferenceIds.includes(id)) return;

      const wasHidden = hiddenItemIds.includes(id);
      const nextHidden = !wasHidden;

      setHiddenItemIds((prev) =>
        nextHidden ? [...prev, id] : prev.filter((itemId) => itemId !== id),
      );
      setUpdatingPreferenceIds((prev) => [...prev, id]);

      try {
        await persistGarmentPreference(id, { isHidden: nextHidden });
      } catch (error: any) {
        setHiddenItemIds((prev) =>
          wasHidden
            ? (prev.includes(id) ? prev : [...prev, id])
            : prev.filter((itemId) => itemId !== id),
        );
        Alert.alert("Update failed", error?.message || "Could not update hidden status.");
      } finally {
        setUpdatingPreferenceIds((prev) =>
          prev.filter((itemId) => itemId !== id),
        );
      }
    },
    [hiddenItemIds, persistGarmentPreference, updatingPreferenceIds],
  );

  const favoriteCount = favoriteItemIds.length;

  const activeFilterCount =
    (filters.category ? 1 : 0) +
    filters.subcategories.length +
    filters.colors.length +
    filters.seasons.length +
    filters.sizes.length;
  const filterChipBgColor = isDarkMode ? "#2A2A2A" : "#FAFAFA";
  const filterChipBorderColor = theme.border;
  const filterChipTextColor = theme.subText;

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

  const filtered = useMemo(() => {
    const matched = items.filter((item) => {
      const normalizedItemCategories = (item.category ?? []).map((category) => normalizeCategory(category));

      if (
        searchQuery &&
        !item.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
        return false;
      if (activeFilter !== "All" && !normalizedItemCategories.includes(activeFilter))
        return false;
      if (filters.category && !normalizedItemCategories.includes(normalizeCategory(filters.category)))
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

    const quickFiltered = matched.filter((item) => {
      const id = String(item.id);
      const isFavorite = favoriteItemIds.includes(id);
      const isHidden = hiddenItemIds.includes(id);

      if (quickFilter === "favorites") return isFavorite;
      if (quickFilter === "hidden") return isHidden;
      return true;
    });

    return quickFiltered.sort((a, b) => getItemAddedTimestamp(b) - getItemAddedTimestamp(a));
  }, [activeFilter, favoriteItemIds, filters, hiddenItemIds, items, quickFilter, searchQuery]);

  return (
    <View style={[s.root, { backgroundColor: theme.screen }]}>
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        translucent
        backgroundColor="transparent"
      />
      <ScrollView
        style={[s.pagesScroll, { backgroundColor: theme.screen }]}
        contentContainerStyle={s.pagesScrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={pullRefreshing}
            onRefresh={onPullRefresh}
            tintColor="#F0507B"
            colors={["#F0507B"]}
          />
        }
      >
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
              <Wave fillColor={theme.screen} />
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

        <View style={[s.body, { backgroundColor: theme.screen }] }>
          <View style={s.usernameRow}>
            <Text style={[s.username, { color: theme.text }]}>@{username}</Text>
            <TouchableOpacity
              onPress={() => router.push("/features/analytics" as any)}
            >
              <Text style={[s.analyticsLink, { color: "#FB92BD" }]}>Style Analytics ›</Text>
            </TouchableOpacity>
          </View>
          <View style={s.profileActionsRow}>
            <TouchableOpacity
              onPress={() => openConnectionsPage("followers")}
              style={[
                s.profileActionBtn,
                {
                  borderColor: theme.border,
                  backgroundColor: theme.card,
                },
              ]}
            >
              <Text style={[s.profileActionText, { color: theme.subText }]}>Followers</Text>
              <Text style={[s.profileActionCount, { color: theme.text }]}>{followerCount}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => openConnectionsPage("following")}
              style={[
                s.profileActionBtn,
                {
                  borderColor: theme.border,
                  backgroundColor: theme.card,
                },
              ]}
            >
              <Text style={[s.profileActionText, { color: theme.subText }]}>Following</Text>
              <Text style={[s.profileActionCount, { color: theme.text }]}>{followingCount}</Text>
            </TouchableOpacity>
          </View>
          {uploadingHeaderImage ? (
            <Text style={[s.uploadingHeaderTxt, { color: theme.subText }]}>Uploading image...</Text>
          ) : null}

          <View style={[s.statsCard, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}>
            <TouchableOpacity style={s.statItem} onPress={() => switchTab(0)}>
              <Text style={[s.statNum, { color: theme.text }]}>{counts.items}</Text>
              <Text style={[s.statLabel, { color: theme.subText }, activeTopTab === 0 && s.statLabelPink]}>
                Items
              </Text>
            </TouchableOpacity>
            <View style={[s.statDivider, { backgroundColor: theme.border }]} />
            <TouchableOpacity style={s.statItem} onPress={() => switchTab(1)}>
              <Text style={[s.statNum, { color: theme.text }]}>{displayedOutfitCount}</Text>
              <Text style={[s.statLabel, { color: theme.subText }, activeTopTab === 1 && s.statLabelPink]}>
                Outfits
              </Text>
            </TouchableOpacity>
            <View style={[s.statDivider, { backgroundColor: theme.border }]} />
            <TouchableOpacity style={s.statItem} onPress={() => switchTab(2)}>
              <Text style={[s.statNum, { color: theme.text }]}>{displayedLookbookCount}</Text>
              <Text style={[s.statLabel, { color: theme.subText }, activeTopTab === 2 && s.statLabelPink]}>
                Lookbooks
              </Text>
            </TouchableOpacity>
          </View>

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
                    style={[
                      s.tab,
                      { backgroundColor: isDarkMode ? "#242424" : theme.card },
                      activeFilter === tab && s.tabActive,
                    ]}
                    onPress={() => setActiveFilter(tab)}
                  >
                    <Text
                      style={[
                        s.tabText,
                        { color: isDarkMode ? "#C9C9C9" : theme.subText },
                        activeFilter === tab && s.tabTextActive,
                      ]}
                    >
                      {tab}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <View style={[s.controlDivider, { backgroundColor: theme.border }]} />
              <View style={s.searchSection}>
                <View style={s.searchRow}>
                  <View style={[s.searchBar, { backgroundColor: theme.inputBg, borderColor: theme.border, borderWidth: 1 }] }>
                    <Ionicons name="search" size={14} color={theme.subText} />
                    <TextInput
                      placeholder="Search"
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      style={[s.searchInput, { color: theme.text }]}
                      placeholderTextColor={theme.subText}
                    />
                  </View>
                </View>
                <TouchableOpacity
                  style={[
                    s.iconBtn,
                    { backgroundColor: isDarkMode ? "#242424" : "#fff", borderWidth: 1, borderColor: theme.border },
                    quickFilter === "hidden" && s.iconBtnActive,
                  ]}
                  onPress={() =>
                    setQuickFilter((prev) => (prev === "hidden" ? "all" : "hidden"))
                  }
                >
                  <Ionicons
                    name={quickFilter === "hidden" ? "eye-off" : "eye-off-outline"}
                    size={19}
                    color={quickFilter === "hidden" ? "#fff" : theme.iconInactive}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    s.iconBtn,
                    { backgroundColor: isDarkMode ? "#242424" : "#fff", borderWidth: 1, borderColor: theme.border },
                    quickFilter === "favorites" && s.iconBtnActive,
                  ]}
                  onPress={() =>
                    setQuickFilter((prev) =>
                      prev === "favorites" ? "all" : "favorites",
                    )
                  }
                >
                  <Ionicons
                    name={quickFilter === "favorites" ? "star" : "star-outline"}
                    size={18}
                    color={quickFilter === "favorites" ? "#fff" : theme.iconInactive}
                  />
                  {favoriteCount > 0 && (
                    <View style={s.badge}>
                      <Text style={s.badgeTxt}>{favoriteCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    s.iconBtn,
                    { backgroundColor: isDarkMode ? "#242424" : "#fff", borderWidth: 1, borderColor: theme.border },
                    activeFilterCount > 0 && s.iconBtnActive,
                  ]}
                  onPress={() => setShowFilter(true)}
                >
                  <Feather
                    name="sliders"
                    size={18}
                    color={activeFilterCount > 0 ? "#fff" : theme.iconInactive}
                  />
                  {activeFilterCount > 0 && (
                    <View style={s.badge}>
                      <Text style={s.badgeTxt}>{activeFilterCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
              {activeFilterCount > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={s.activePillsContent}
                >
                  {filters.category !== "" && (
                    <TouchableOpacity
                      style={[
                        s.activePill,
                        isDarkMode && {
                          backgroundColor: "#2B1F26",
                          borderColor: "#7A3A55",
                        },
                      ]}
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
                      style={[
                        s.activePill,
                        isDarkMode && {
                          backgroundColor: "#2B1F26",
                          borderColor: "#7A3A55",
                        },
                      ]}
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
                  <TouchableOpacity
                    style={[
                      s.clearPill,
                      isDarkMode && { backgroundColor: "#2A2A2A", borderWidth: 1, borderColor: theme.border },
                    ]}
                    onPress={clearFilters}
                  >
                    <Text style={[s.clearPillTxt, isDarkMode && { color: theme.subText }]}>Clear all</Text>
                  </TouchableOpacity>
                </ScrollView>
              )}
              {loading ? (
                <View style={s.emptyState}>
                  <ActivityIndicator size="large" color="#E91E63" />
                  <Text style={[s.emptyTitle, { color: theme.text }]}>Loading your wardrobe...</Text>
                </View>
              ) : items.length === 0 ? (
                <View style={s.emptyState}>
                  <Text style={[s.emptyTitle, { color: theme.text }]}>Your wardrobe is empty</Text>
                  <Text style={[s.emptySubtitle, { color: theme.subText }] }>
                    Tap the pink button below to add your first item
                  </Text>
                </View>
              ) : filtered.length === 0 ? (
                <View style={s.emptyState}>
                  <Text style={[s.emptyTitle, { color: theme.text }]}>No items match</Text>
                  <TouchableOpacity style={s.clearBtn} onPress={clearAllVisibleFilters}>
                    <Text style={s.clearBtnTxt}>Clear Filters</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={s.gridContent}>
                  {filtered.map((item) => (
                    <GridItem
                      key={item.id}
                      item={item}
                      starred={favoriteItemIds.includes(String(item.id))}
                      hidden={hiddenItemIds.includes(String(item.id))}
                      isDarkMode={isDarkMode}
                      iconMutedColor={theme.iconInactive}
                      cardBackgroundColor={theme.itemCard}
                      emptyBackgroundColor={theme.itemEmpty}
                      onToggleStar={() => toggleFavoriteItem(String(item.id))}
                      onToggleHidden={() => toggleHiddenItem(String(item.id))}
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
                <Text style={[s.emptyTitle, { color: theme.text }]}>Loading outfits...</Text>
              </View>
            ) : savedOutfits.length === 0 ? (
              <View style={s.emptyState}>
                <Text style={[s.emptyTitle, { color: theme.text }]}>No outfits yet</Text>
                <Text style={[s.emptySubtitle, { color: theme.subText }] }>
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
              <>
                <View style={[s.controlDivider, { backgroundColor: theme.border }]} />
                <View style={s.searchSection}>
                  <View style={s.searchRow}>
                    <View style={[s.searchBar, { backgroundColor: theme.inputBg, borderColor: theme.border, borderWidth: 1 }] }>
                      <Ionicons name="search" size={14} color={theme.subText} />
                      <TextInput
                        placeholder="Search outfits"
                        value={outfitSearchQuery}
                        onChangeText={setOutfitSearchQuery}
                        style={[s.searchInput, { color: theme.text }]}
                        placeholderTextColor={theme.subText}
                      />
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[
                      s.iconBtn,
                      { backgroundColor: isDarkMode ? "#242424" : "#fff", borderWidth: 1, borderColor: theme.border },
                      outfitQuickFilter === "hidden" && s.iconBtnActive,
                    ]}
                    onPress={() =>
                      setOutfitQuickFilter((prev) => (prev === "hidden" ? "all" : "hidden"))
                    }
                  >
                    <Ionicons
                      name={outfitQuickFilter === "hidden" ? "eye-off" : "eye-off-outline"}
                      size={19}
                      color={outfitQuickFilter === "hidden" ? "#fff" : theme.iconInactive}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      s.iconBtn,
                      { backgroundColor: isDarkMode ? "#242424" : "#fff", borderWidth: 1, borderColor: theme.border },
                      outfitQuickFilter === "favorites" && s.iconBtnActive,
                    ]}
                    onPress={() =>
                      setOutfitQuickFilter((prev) => (prev === "favorites" ? "all" : "favorites"))
                    }
                  >
                    <Ionicons
                      name={outfitQuickFilter === "favorites" ? "star" : "star-outline"}
                      size={18}
                      color={outfitQuickFilter === "favorites" ? "#fff" : theme.iconInactive}
                    />
                    {favoriteOutfitCount > 0 && (
                      <View style={s.badge}>
                        <Text style={s.badgeTxt}>{favoriteOutfitCount}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      s.iconBtn,
                      { backgroundColor: isDarkMode ? "#242424" : "#fff", borderWidth: 1, borderColor: theme.border },
                      activeOutfitFilterCount > 0 && s.iconBtnActive,
                    ]}
                    onPress={() => setShowOutfitFilter(true)}
                  >
                    <Feather
                      name="sliders"
                      size={18}
                      color={activeOutfitFilterCount > 0 ? "#fff" : theme.iconInactive}
                    />
                    {activeOutfitFilterCount > 0 && (
                      <View style={s.badge}>
                        <Text style={s.badgeTxt}>{activeOutfitFilterCount}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
                {filteredOutfits.length === 0 ? (
                  <View style={s.emptyState}>
                    <Text style={[s.emptyTitle, { color: theme.text }]}>No outfits match</Text>
                    <TouchableOpacity style={s.clearBtn} onPress={clearOutfitFilters}>
                      <Text style={s.clearBtnTxt}>Clear Filters</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                <View style={s.gridContent}>
                {filteredOutfits.map((outfit) => {
                  const itemCount = getOutfitItemCount(outfit);

                  return (
                    <TouchableOpacity
                      key={outfit._id}
                      style={[s.gridItem, s.outfitGridItem, { backgroundColor: theme.itemCard }]}
                      onPress={() => {
                        if (selectingForCalendar) {
                          handleSelectOutfitForCalendar(outfit);
                          return;
                        }

                        router.push({
                          pathname: "/wardrobe/outfit-detail" as any,
                          params: { outfitJson: JSON.stringify(outfit) },
                        });
                      }}
                      disabled={savingCalendarOutfitId === outfit._id}
                    >
                      <OutfitPreviewCollage
                        outfit={outfit}
                        fallbackItems={items.map((item) => ({ id: String(item.id), image: item.image || null }))}
                        maxTiles={itemCount > 0 ? Math.min(4, itemCount) : 4}
                        style={s.outfitPreviewImage}
                        previewBackgroundColor={outfitPreviewBackground}
                        emptyBackgroundColor={outfitPreviewEmptyBackground}
                      />
                      {hiddenOutfitIds.includes(String(outfit._id)) && (
                        <View style={[s.gridHiddenOverlay, { backgroundColor: isDarkMode ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.7)" }]} />
                      )}
                      <TouchableOpacity
                        style={s.gridEyeBtn}
                        onPress={(e) => {
                          e.stopPropagation();
                          toggleHiddenOutfit(String(outfit._id));
                        }}
                      >
                        <Ionicons
                          name={hiddenOutfitIds.includes(String(outfit._id)) ? "eye-off" : "eye"}
                          size={13}
                          color={theme.iconInactive}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={s.gridStarBtn}
                        onPress={(e) => {
                          e.stopPropagation();
                          toggleFavoriteOutfit(String(outfit._id));
                        }}
                      >
                        <Ionicons
                          name={favoriteOutfitIds.includes(String(outfit._id)) ? "star" : "star-outline"}
                          size={13}
                          color={favoriteOutfitIds.includes(String(outfit._id)) ? "#F0507B" : theme.iconInactive}
                        />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  );
                })}
              </View>
                )}
              </>
            )
          )}

          {activeTopTab === 2 && (
            loadingOutfits ? (
              <View style={s.emptyState}>
                <ActivityIndicator size="large" color="#E91E63" />
                <Text style={[s.emptyTitle, { color: theme.text }]}>Loading lookbooks...</Text>
              </View>
            ) : savedLookbooks.length === 0 ? (
              <View style={s.emptyState}>
                <Text style={[s.emptyTitle, { color: theme.text }]}>No lookbooks yet</Text>
                <Text style={[s.emptySubtitle, { color: theme.subText }]}>
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
                  const itemCount = getOutfitItemCount(outfit);
                  const displayName = (outfit.name || "").trim() || "Untitled Lookbook";
                  const dateLabel = outfit.date
                    ? new Date(outfit.date).toLocaleDateString()
                    : "No date";

                  return (
                    <TouchableOpacity
                      key={outfit._id}
                      style={[s.gridItem, { backgroundColor: theme.itemCard }]}
                      onPress={() =>
                        router.push({
                          pathname: "/wardrobe/lookbook-detail" as any,
                          params: { lookbookJson: JSON.stringify(outfit) },
                        })
                      }
                    >
                      <OutfitPreviewCollage
                        outfit={outfit}
                        fallbackItems={items.map((item) => ({ id: String(item.id), image: item.image || null }))}
                        maxTiles={itemCount > 0 ? Math.min(4, itemCount) : 4}
                        style={s.outfitPreviewImage}
                        previewBackgroundColor={outfitPreviewBackground}
                        emptyBackgroundColor={outfitPreviewEmptyBackground}
                      />
                      <Text
                        style={[s.lookbookName, { color: theme.text }]}
                        numberOfLines={1}
                      >
                        {displayName}
                      </Text>
                      <Text style={[s.lookbookCountText, { color: theme.subText }]}>
                        {itemCount} item{itemCount === 1 ? "" : "s"}
                      </Text>
                      <Text style={[s.lookbookDateText, { color: theme.subText }]}>
                        {dateLabel}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )
          )}

        </View>
      </ScrollView>

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
          <View style={[s.filterSheet, { backgroundColor: theme.card }] }>
            <View style={s.filterHeader}>
              <TouchableOpacity onPress={clearFilters}>
                <Text style={[s.filterClearTxt, { color: "#F0507B" }]}>Clear all</Text>
              </TouchableOpacity>
              <Text style={[s.filterTitle, { color: theme.text }]}>Filter</Text>
              <TouchableOpacity onPress={() => setShowFilter(false)}>
                <Ionicons name="close" size={22} color={theme.text} />
              </TouchableOpacity>
            </View>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={s.filterScrollContent}
            >
              <Text style={[s.filterSection, { color: theme.subText }]}>CATEGORY</Text>
              <View style={fc.row}>
                {Object.keys(CATEGORY_TREE).map((cat) => (
                  <Chip
                    key={cat}
                    label={cat}
                    active={filters.category === cat}
                    onPress={() => setCategory(cat)}
                    chipBgColor={filterChipBgColor}
                    chipBorderColor={filterChipBorderColor}
                    chipTextColor={filterChipTextColor}
                  />
                ))}
              </View>
              {filters.category !== "" && (
                <>
                  <Text style={[s.filterSection, { color: theme.subText }]}>
                    {filters.category.toUpperCase()} TYPE
                  </Text>
                  <View style={fc.row}>
                    {CATEGORY_TREE[filters.category].map((sub) => (
                      <Chip
                        key={sub}
                        label={sub}
                        active={filters.subcategories.includes(sub)}
                        onPress={() => toggleMulti("subcategories", sub)}
                        chipBgColor={filterChipBgColor}
                        chipBorderColor={filterChipBorderColor}
                        chipTextColor={filterChipTextColor}
                      />
                    ))}
                  </View>
                </>
              )}
              <Text style={[s.filterSection, { color: theme.subText }]}>COLOR</Text>
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
                      <Text style={[fc.swatchLabel, { color: theme.subText }]}>{c}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={[s.filterSection, { color: theme.subText }]}>SEASON</Text>
              <View style={fc.row}>
                {FILTER_SEASONS.map((season) => (
                  <Chip
                    key={season}
                    label={season}
                    active={filters.seasons.includes(season)}
                    onPress={() => toggleMulti("seasons", season)}
                    chipBgColor={filterChipBgColor}
                    chipBorderColor={filterChipBorderColor}
                    chipTextColor={filterChipTextColor}
                  />
                ))}
              </View>
              <Text style={[s.filterSection, { color: theme.subText }]}>SIZE</Text>
              <View style={fc.row}>
                {FILTER_SIZES.map((sz) => (
                  <Chip
                    key={sz}
                    label={sz}
                    active={filters.sizes.includes(sz)}
                    onPress={() => toggleMulti("sizes", sz)}
                    chipBgColor={filterChipBgColor}
                    chipBorderColor={filterChipBorderColor}
                    chipTextColor={filterChipTextColor}
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
        visible={showOutfitFilter}
        animationType="slide"
        onRequestClose={() => setShowOutfitFilter(false)}
      >
        <View style={s.filterOverlay}>
          <TouchableOpacity
            style={s.filterDismiss}
            activeOpacity={1}
            onPress={() => setShowOutfitFilter(false)}
          />
          <View style={[s.filterSheet, { backgroundColor: theme.card }] }>
            <View style={s.filterHeader}>
              <TouchableOpacity onPress={() => setOutfitFilters(EMPTY_OUTFIT_FILTERS)}>
                <Text style={[s.filterClearTxt, { color: "#F0507B" }]}>Clear all</Text>
              </TouchableOpacity>
              <Text style={[s.filterTitle, { color: theme.text }]}>Outfit Filter</Text>
              <TouchableOpacity onPress={() => setShowOutfitFilter(false)}>
                <Ionicons name="close" size={22} color={theme.text} />
              </TouchableOpacity>
            </View>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={s.filterScrollContent}
            >
              <Text style={[s.filterSection, { color: theme.subText }]}>PREVIEW</Text>
              <View style={fc.row}>
                <Chip
                  label="All"
                  active={outfitFilters.preview === "all"}
                  onPress={() => setOutfitFilters((prev) => ({ ...prev, preview: "all" }))}
                  chipBgColor={filterChipBgColor}
                  chipBorderColor={filterChipBorderColor}
                  chipTextColor={filterChipTextColor}
                />
                <Chip
                  label="With Image"
                  active={outfitFilters.preview === "with"}
                  onPress={() => setOutfitFilters((prev) => ({ ...prev, preview: "with" }))}
                  chipBgColor={filterChipBgColor}
                  chipBorderColor={filterChipBorderColor}
                  chipTextColor={filterChipTextColor}
                />
                <Chip
                  label="No Image"
                  active={outfitFilters.preview === "without"}
                  onPress={() => setOutfitFilters((prev) => ({ ...prev, preview: "without" }))}
                  chipBgColor={filterChipBgColor}
                  chipBorderColor={filterChipBorderColor}
                  chipTextColor={filterChipTextColor}
                />
              </View>
              <Text style={[s.filterSection, { color: theme.subText }]}>TYPE</Text>
              <View style={fc.row}>
                <Chip
                  label="All"
                  active={outfitFilters.layout === "all"}
                  onPress={() => setOutfitFilters((prev) => ({ ...prev, layout: "all" }))}
                  chipBgColor={filterChipBgColor}
                  chipBorderColor={filterChipBorderColor}
                  chipTextColor={filterChipTextColor}
                />
                <Chip
                  label="Canvas"
                  active={outfitFilters.layout === "canvas"}
                  onPress={() => setOutfitFilters((prev) => ({ ...prev, layout: "canvas" }))}
                  chipBgColor={filterChipBgColor}
                  chipBorderColor={filterChipBorderColor}
                  chipTextColor={filterChipTextColor}
                />
                <Chip
                  label="Basic"
                  active={outfitFilters.layout === "basic"}
                  onPress={() => setOutfitFilters((prev) => ({ ...prev, layout: "basic" }))}
                  chipBgColor={filterChipBgColor}
                  chipBorderColor={filterChipBorderColor}
                  chipTextColor={filterChipTextColor}
                />
              </View>
            </ScrollView>
            <TouchableOpacity
              style={s.applyBtn}
              onPress={() => setShowOutfitFilter(false)}
            >
              <Text style={s.applyBtnTxt}>
                {filteredOutfits.length === savedOutfits.length
                  ? `Show All Outfits · ${savedOutfits.length}`
                  : `Show Results · ${filteredOutfits.length}`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
          <View style={[s.sheet, { backgroundColor: theme.card }] }>
            <Text style={[s.sheetTitle, { color: theme.text }]}>Change Image</Text>
            <TouchableOpacity
              style={[s.sheetBtn, { backgroundColor: theme.inputBg, borderColor: theme.border, borderWidth: 1 }]}
              onPress={() => pickImage("library")}
            >
              <Text style={{ color: theme.text }}>Choose from Library</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.sheetBtn, { backgroundColor: theme.inputBg, borderColor: theme.border, borderWidth: 1 }]}
              onPress={() => pickImage("camera")}
            >
              <Text style={{ color: theme.text }}>Take Photo</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
