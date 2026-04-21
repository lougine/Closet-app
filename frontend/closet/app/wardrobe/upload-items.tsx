import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Image, Text, TextInput,TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GarmentSearchError, type GarmentSearchImage, removeBackgroundFromImageUrl, searchGarmentImages } from "../../services/garmentSearchService";
import { styles } from "../../Styles/wardrobe/upload-items.styles";
import { useAppTheme } from "../../context/themeContext";

type Tab = "camera-roll" | "web";

interface CameraAsset {
  uri: string;
  width: number;
  height: number;
}

const COLUMNS = 3;
const SEARCH_HINT = "e.g. navy blue blazer";

const getFriendlySearchError = (error: unknown) => {
  if (
    error instanceof GarmentSearchError
    && error.status === 401
    && /token|session|authorization|log in/i.test(error.message)
  ) {
    return "Please log in again to continue.";
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return "Unable to search right now. Please try again.";
};

const getFriendlyRemoveBgError = (error: unknown) => {
  if (error instanceof GarmentSearchError && error.status === 402) {
    return "Background cleanup credits are currently exhausted. Please try again later.";
  }
  if (error instanceof GarmentSearchError && error.status === 429) {
    const retrySeconds = error.retryAfterSeconds;
    if (typeof retrySeconds === "number" && retrySeconds > 0) {
      return `Background cleanup is rate-limited. Please retry in about ${retrySeconds} seconds.`;
    }
    return "Background cleanup is rate-limited. Please wait a moment and retry.";
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return "Unable to remove image background.";
};

export default function UploadItemsScreen() {
  const router = useRouter();
  const { isDarkMode } = useAppTheme();
  const [activeTab, setActiveTab] = useState<Tab>("camera-roll");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GarmentSearchImage[]>([]);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [processingImageUrl, setProcessingImageUrl] = useState<string | null>(null);

  const canSearch = useMemo(() => query.trim().length > 0 && !searching, [query, searching]);

  const handlePickGalleryPhotos = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission denied", "Gallery permission is required.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsMultipleSelection: true,
        selectionLimit: 0,
        quality: 1,
      });

      if (result.canceled || !result.assets.length) return;

      const photos: CameraAsset[] = result.assets.map((asset) => ({
        uri: asset.uri,
        width: asset.width || 0,
        height: asset.height || 0,
      }));

      router.push({
        pathname: "/wardrobe/add-items" as any,
        params: {
          images: JSON.stringify(photos.map((photo) => photo.uri)),
          image: photos[0]?.uri,
          source: "gallery",
        },
      });
    } catch (error) {
      console.warn("Failed to open gallery:", error);
      Alert.alert("Error", "Failed to open gallery.");
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission denied", "Camera permission is required.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        handlePhotoSelect({
          uri: result.assets[0].uri,
          width: result.assets[0].width || 0,
          height: result.assets[0].height || 0,
        });
      }
    } catch (error) {
      console.warn("Failed to open camera:", error);
      Alert.alert("Error", "Failed to open camera.");
    }
  };

  const requireAuthToken = async () => {
    const token = await SecureStore.getItemAsync("userToken");
    if (!token) {
      Alert.alert("Authentication Error", "Please log in again.");
      router.replace("/(auth)/login" as any);
      return null;
    }
    return token;
  };

  const handleWebSearch = async () => {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) {
      Alert.alert("Missing search text", "Enter a garment name to search for images.");
      return;
    }

    const token = await requireAuthToken();
    if (!token) return;

    try {
      setSearching(true);
      const found = await searchGarmentImages(normalizedQuery, token, 10);
      setResults(found.length >= 1 ? found : []);
      setSearched(true);
    } catch (error) {
      Alert.alert("Search failed", getFriendlySearchError(error));
    } finally {
      setSearching(false);
    }
  };

  const handleSelectWebImage = async (selectedImage: GarmentSearchImage) => {
    if (!selectedImage.imageUrl || processingImageUrl) {
      return;
    }

    const token = await requireAuthToken();
    if (!token) return;

    try {
      setProcessingImageUrl(selectedImage.imageUrl);
      const cleanedImageUri = await removeBackgroundFromImageUrl(selectedImage.imageUrl, token, "preview");

      router.push({
        pathname: "/wardrobe/add-items" as any,
        params: {
          image: cleanedImageUri,
          source: "search",
        },
      });
    } catch (error) {
      Alert.alert("Background removal failed", getFriendlyRemoveBgError(error));
    } finally {
      setProcessingImageUrl(null);
    }
  };

  const handlePhotoSelect = (photo: CameraAsset) => {
    router.push({
      pathname: "/wardrobe/add-items" as any,
      params: {
        image: photo.uri,
      },
    });
  };

  const renderTabButton = (tab: Tab, label: string, iconName: string) => {
    const isActive = activeTab === tab;
    const inactiveColor = isDarkMode ? "#FFFFFF" : "#000000";
    const accentColor = "#F0507B";

    return (
      <TouchableOpacity
        style={[
          styles.tabButton,
          isActive && styles.tabButtonActive,
        ]}
        onPress={() => setActiveTab(tab)}
      >
        <Ionicons
          name={iconName as any}
          size={24}
          color={isActive ? accentColor : inactiveColor}
        />
        <Text
          style={[
            styles.tabLabel,
            isActive && styles.tabLabelActive,
            { color: isActive ? accentColor : inactiveColor },
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderPhotoGrid = () => {
    // Camera and gallery tiles only. Selected photos are handled in Add Items.
    const gridData = [
      { id: "camera", type: "camera" as const },
      { id: "gallery", type: "gallery" as const },
    ];

    return (
      <FlatList
        data={gridData}
        numColumns={COLUMNS}
        scrollEnabled={true}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.photoGridItem}
            onPress={() => {
              if (item.type === "camera") {
                handleTakePhoto();
              } else if (item.type === "gallery") {
                handlePickGalleryPhotos();
              }
            }}
          >
            {item.type === "camera" ? (
              <View style={[styles.cameraPlaceholder, { backgroundColor: "#FB92BD" }]}>
                <Ionicons name="camera" size={40} color="#FFF" />
              </View>
            ) : (
              <View style={[styles.cameraPlaceholder, { backgroundColor: "#FB92BD" }]}>
                <Ionicons name="images" size={40} color="#FFF" />
              </View>
            )}
          </TouchableOpacity>
        )}
      />
    );
  };

  const renderWebSearch = () => (
    <View style={styles.webWrap}>
      <View style={styles.webSearchRow}>
        <TextInput
          style={[
            styles.webSearchInput,
            {
              borderColor: isDarkMode ? "#2F2F2F" : "#E6E6E6",
              color: isDarkMode ? "#F1F1F1" : "#1A1A1A",
              backgroundColor: isDarkMode ? "#202020" : "#FAFAFA",
            },
          ]}
          value={query}
          onChangeText={setQuery}
          placeholder={SEARCH_HINT}
          placeholderTextColor={isDarkMode ? "#A5A5A5" : "#888"}
          returnKeyType="search"
          onSubmitEditing={handleWebSearch}
        />
        <TouchableOpacity
          style={[styles.webSearchBtn, !canSearch && styles.webSearchBtnDisabled]}
          onPress={handleWebSearch}
          disabled={!canSearch}
        >
          {searching ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.webSearchBtnText}>Search</Text>}
        </TouchableOpacity>
      </View>

      {searched && results.length === 0 && !searching ? (
        <View style={styles.webEmptyState}>
          <Text style={[styles.webEmptyTitle, { color: isDarkMode ? "#F1F1F1" : "#1f1f1f" }]}>No results found</Text>
          <Text style={[styles.webEmptySubtitle, { color: isDarkMode ? "#B5B5B5" : "#7A7A7A" }]}>Try clearer terms like white linen shirt.</Text>
        </View>
      ) : null}

      <FlatList
        data={results}
        keyExtractor={(item, index) => `${item.imageUrl}-${index}`}
        numColumns={2}
        columnWrapperStyle={styles.webGridRow}
        contentContainerStyle={styles.webGridContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const processing = processingImageUrl === item.imageUrl;

          return (
            <TouchableOpacity
              style={[styles.webCard, { borderColor: isDarkMode ? "#2B2B2B" : "#E7E7E7", backgroundColor: isDarkMode ? "#1F1F1F" : "#FFFFFF" }]}
              activeOpacity={0.92}
              onPress={() => handleSelectWebImage(item)}
              disabled={!!processingImageUrl}
            >
              <Image source={{ uri: item.imageUrl }} style={styles.webCardImage} resizeMode="cover" />
              <View style={styles.webCardFooter}>
                <Text style={[styles.webCardTitle, { color: isDarkMode ? "#F1F1F1" : "#222" }]} numberOfLines={2}>
                  {item.title || "Garment image"}
                </Text>
              </View>

              {processing ? (
                <View style={styles.webProcessingOverlay}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.webProcessingText}>Cleaning image...</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDarkMode ? "#1A1A1A" : "#FFF" }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
          <Text style={styles.closeIcon}>✕</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: isDarkMode ? "#F1F1F1" : "#000" }]}>
          Upload items
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {renderTabButton("camera-roll", "Camera roll", "image")}
        {renderTabButton("web", "Web", "document")}
      </View>

      {/* Content */}
      <View style={[styles.content, { backgroundColor: isDarkMode ? "#1A1A1A" : "#FFF" }]}>
        {activeTab === "camera-roll" ? (
          renderPhotoGrid()
        ) : (
          renderWebSearch()
        )}
      </View>
    </SafeAreaView>
  );
}
