import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  GarmentSearchError,
  type GarmentSearchImage,
  removeBackgroundFromImageUrl,
  searchGarmentImages,
} from '@/services/garmentSearchService';
import { getGarmentSearchTheme } from '@/constants/appTheme';
import { useAppTheme } from '@/context/themeContext';

const SEARCH_HINT = 'e.g. navy blue blazer';

const getFriendlySearchError = (error: unknown) => {
  if (
    error instanceof GarmentSearchError
    && error.status === 401
    && /token|session|authorization|log in/i.test(error.message)
  ) {
    return 'Please log in again to continue.';
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return 'Unable to search right now. Please try again.';
};

const getFriendlyRemoveBgError = (error: unknown) => {
  if (error instanceof GarmentSearchError && error.status === 402) {
    return 'Background cleanup credits are currently exhausted. Please try again later.';
  }
  if (error instanceof GarmentSearchError && error.status === 429) {
    const retrySeconds = error.retryAfterSeconds;
    if (typeof retrySeconds === 'number' && retrySeconds > 0) {
      return `Background cleanup is rate-limited. Please retry in about ${retrySeconds} seconds.`;
    }
    return 'Background cleanup is rate-limited. Please wait a moment and retry.';
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return 'Unable to remove image background.';
};

export default function SearchGarmentImageScreen() {
  const router = useRouter();
  const { mode, itemJson } = useLocalSearchParams<{ mode?: string; itemJson?: string }>();
  const { isDarkMode } = useAppTheme();
  const theme = getGarmentSearchTheme(isDarkMode);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GarmentSearchImage[]>([]);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [processingImageUrl, setProcessingImageUrl] = useState<string | null>(null);

  const canSearch = useMemo(() => query.trim().length > 0 && !searching, [query, searching]);

  const requireAuthToken = async () => {
    const token = await SecureStore.getItemAsync('userToken');
    if (!token) {
      Alert.alert('Authentication Error', 'Please log in again.');
      router.replace('/(auth)/login');
      return null;
    }
    return token;
  };

  const handleSearch = async () => {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) {
      Alert.alert('Missing search text', 'Enter a garment name to search for images.');
      return;
    }

    const token = await requireAuthToken();
    if (!token) return;

    try {
      setSearching(true);
      const found = await searchGarmentImages(normalizedQuery, token, 10);
      setResults(found.length >= 3 ? found : []);
      setSearched(true);
    } catch (error) {
      Alert.alert('Search failed', getFriendlySearchError(error));
    } finally {
      setSearching(false);
    }
  };

  const handleSelectImage = async (selectedImage: GarmentSearchImage) => {
    if (!selectedImage.imageUrl || processingImageUrl) {
      return;
    }

    const token = await requireAuthToken();
    if (!token) return;

    try {
      setProcessingImageUrl(selectedImage.imageUrl);
      const cleanedImageUri = await removeBackgroundFromImageUrl(selectedImage.imageUrl, token, 'preview');

      if (mode === 'existing' && itemJson) {
        router.replace({
          pathname: '/wardrobe/item-detail',
          params: {
            itemJson,
            searchedImageUri: cleanedImageUri,
            searchedImageAt: String(Date.now()),
          },
        });
        return;
      }

      router.push({
        pathname: '/wardrobe/add-items',
        params: {
          image: cleanedImageUri,
          source: 'search',
        },
      });
    } catch (error) {
      Alert.alert('Background removal failed', getFriendlyRemoveBgError(error));
    } finally {
      setProcessingImageUrl(null);
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.screen }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }] }>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: theme.card }]} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Search by Name</Text>
        <View style={styles.headerSpacer} />
      </View>

      <Text style={[styles.description, { color: theme.subText }] }>
        Search for a garment image, then we will clean the background automatically.
      </Text>

      <View style={styles.searchRow}>
        <TextInput
          style={[styles.searchInput, { borderColor: theme.border, color: theme.text, backgroundColor: theme.inputBg }]}
          value={query}
          onChangeText={setQuery}
          placeholder={SEARCH_HINT}
          placeholderTextColor={theme.subText}
          returnKeyType="search"
          onSubmitEditing={handleSearch}
        />
        <TouchableOpacity
          style={[styles.searchBtn, !canSearch && styles.searchBtnDisabled]}
          onPress={handleSearch}
          disabled={!canSearch}
        >
          {searching ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.searchBtnText}>Search</Text>}
        </TouchableOpacity>
      </View>

      {searched && results.length === 0 && !searching ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No good results found, try rephrasing</Text>
          <Text style={[styles.emptySubtitle, { color: theme.subText }]}>Try a clearer name like white linen shirt.</Text>
        </View>
      ) : null}

      <FlatList
        data={results}
        keyExtractor={(item, index) => `${item.imageUrl}-${index}`}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.gridContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const processing = processingImageUrl === item.imageUrl;

          return (
            <TouchableOpacity
              style={[styles.card, { borderColor: theme.border, backgroundColor: theme.itemCard }]}
              activeOpacity={0.92}
              onPress={() => handleSelectImage(item)}
              disabled={!!processingImageUrl}
            >
              <Image source={{ uri: item.imageUrl }} style={[styles.cardImage, { backgroundColor: theme.itemEmpty }]} resizeMode="cover" />
              <View style={styles.cardFooter}>
                <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={2}>
                  {item.title || 'Garment image'}
                </Text>
              </View>

              {processing ? (
                <View style={styles.processingOverlay}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.processingText}>Cleaning image...</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  headerSpacer: {
    width: 34,
    height: 34,
  },
  description: {
    paddingHorizontal: 16,
    fontSize: 13,
    color: '#6e6e6e',
    marginBottom: 12,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e8e8e8',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1a1a1a',
    backgroundColor: '#fafafa',
  },
  searchBtn: {
    backgroundColor: '#FF4F81',
    borderRadius: 14,
    minWidth: 84,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  searchBtnDisabled: {
    opacity: 0.55,
  },
  searchBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f1f1f',
  },
  emptySubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
  },
  gridContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  gridRow: {
    justifyContent: 'space-between',
  },
  card: {
    width: '48.6%',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#efefef',
    backgroundColor: '#fff',
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: 172,
    backgroundColor: '#f4f4f4',
  },
  cardFooter: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 52,
  },
  cardTitle: {
    fontSize: 12,
    color: '#363636',
    lineHeight: 16,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingText: {
    marginTop: 7,
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
