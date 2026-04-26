import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import * as SecureStore from "expo-secure-store";
import { buildImageUrl, fetchApiWithFallback } from "../constants/api";
import { fetchCurrentUserProfile } from "@/services/userProfileService";

const LOOKBOOK_IDS_KEY = "lookbookIds";
const GARMENTS_PAGE_SIZE = 100;

const toIdString = (value: any) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value._id) return String(value._id);
  return String(value);
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

const isOwnedOutfit = (entry: any, userId: string) => {
  if (!userId) return false;

  const ownerId = toIdString(entry?.owner ?? entry?.userId ?? entry?.createdBy ?? entry?.author);
  const audienceId = toIdString(entry?.styledForUserId ?? entry?.recipientUserId ?? entry?.targetUserId ?? entry?.forUserId);

  if (!ownerId || ownerId !== userId) {
    return false;
  }

  if (audienceId && audienceId !== userId) {
    return false;
  }

  return true;
};

export interface ClothingItem {
  id: string; // Changed from number to string to match MongoDB _id
  image?: string | null;
  label: string;
  bg: string;
  category?: string[];
  subcategory?: string;
  fabric?: string;
  colors?: string[];
  size?: string;
  brand?: string;
  tags?: string[];
  timesWorn?: number;
  totalCost?: number;
  dateAdded?: string;
  createdAt?: string;
  isFavorite?: boolean;
  isHidden?: boolean;
}

interface WardrobeContextType {
  items: ClothingItem[];
  counts: { items: number; outfits: number; lookbooks: number };
  addItem: (item: ClothingItem) => void;
  updateItem: (item: ClothingItem) => void;
  incrementOutfitCount: () => void;
  decrementOutfitCount: () => void;
  refreshItems: () => Promise<void>;
  loading: boolean;
}

const WardrobeContext = createContext<WardrobeContextType | null>(null);

export function WardrobeProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [counts, setCounts] = useState({ items: 0, outfits: 0, lookbooks: 0 });
  const [loading, setLoading] = useState(true);

  const fetchAllGarments = useCallback(async (token: string) => {
    const allGarments: any[] = [];
    let page = 1;

    while (true) {
      const response = await fetchApiWithFallback(`/api/garments?page=${page}&limit=${GARMENTS_PAGE_SIZE}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }, {
        timeoutMs: 12000,
        retries: 1,
      });

      if (!response.ok) {
        return { ok: false as const, response, garments: [] as any[] };
      }

      const batch = await response.json();
      if (!Array.isArray(batch) || batch.length === 0) {
        break;
      }

      allGarments.push(...batch);

      if (batch.length < GARMENTS_PAGE_SIZE) {
        break;
      }

      page += 1;
    }

    return { ok: true as const, garments: allGarments };
  }, []);

  const fetchItems = useCallback(async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) {
        console.warn('Wardrobe: No auth token available');
        setLoading(false);
        return;
      }

      const profile = await fetchCurrentUserProfile();
      const currentUserId = String(profile._id || '');

      const [garmentsResult, outfitsResponse] = await Promise.all([
        fetchAllGarments(token),
        fetchApiWithFallback('/api/outfits', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }, {
          timeoutMs: 12000,
          retries: 1,
        }),
      ]);

      console.log('Wardrobe: Fetched', {
        garmentsOk: garmentsResult.ok,
        garmentCount: garmentsResult.garments?.length || 0,
        outfitsResponseOk: outfitsResponse.ok,
        outfitsResponseStatus: outfitsResponse.status,
      });

      if (garmentsResult.ok) {
        const garments = garmentsResult.garments;
        
        // Ensure outfits response is handled correctly
        let outfits: any[] = [];
        if (outfitsResponse.ok) {
          try {
            outfits = await outfitsResponse.json();
            if (!Array.isArray(outfits)) {
              console.warn('Wardrobe: Outfits response is not an array:', outfits);
              outfits = [];
            }
          } catch (parseError) {
            console.error('Wardrobe: Failed to parse outfits JSON:', parseError);
            outfits = [];
          }
        } else {
          const errorPayload = await outfitsResponse.json().catch(() => ({}));
          console.warn('Wardrobe: Outfits fetch failed', {
            status: outfitsResponse.status,
            error: errorPayload,
          });
        }

        const storedLookbookIds = new Set(
          parseStoredLookbookIds(await SecureStore.getItemAsync(LOOKBOOK_IDS_KEY)),
        );
        const formattedItems: ClothingItem[] = garments.map((garment: any) => ({
          id: garment._id,
          image: garment.imageUrl ? buildImageUrl(garment.imageUrl) : null,
          label: garment.name,
          bg: getCategoryBg(garment.category),
          category: [garment.category],
          subcategory: garment.subcategory || undefined,
          fabric: garment.fabric || undefined,
          colors: garment.color ? [garment.color] : [],
          size: garment.size,
          brand: garment.brand,
          tags: garment.tags || [],
          timesWorn: Number(garment.wearCount) || 0,
          totalCost: Number(garment.purchasePrice) || 0,
          createdAt: garment.createdAt,
          isFavorite: Boolean(garment.isFavorite),
          isHidden: Boolean(garment.isHidden),
          dateAdded: garment.createdAt ? new Date(garment.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : undefined,
        }));

        const outfitList = Array.isArray(outfits) ? outfits : [];
        const ownedOutfits = outfitList.filter((entry: any) => isOwnedOutfit(entry, currentUserId));
        const lookbookCount = ownedOutfits.filter((entry: any) => {
          const rawFlag = entry?.isLookbook;
          const entryId = toIdString(entry?._id);
          return (
            rawFlag === true ||
            rawFlag === "true" ||
            rawFlag === 1 ||
            storedLookbookIds.has(entryId)
          );
        }).length;
        const outfitCount = ownedOutfits.length;

        console.log('Wardrobe: Setting items and counts', {
          itemCount: formattedItems.length,
          outfitCount,
          lookbookCount,
        });

        setItems(formattedItems);
        setCounts(prev => ({
          ...prev,
          items: formattedItems.length,
          outfits: outfitCount,
          lookbooks: lookbookCount,
        }));
      } else {
        const errorPayload = await garmentsResult.response.json().catch(() => ({}));
        console.error('Wardrobe: Failed to fetch garments', {
          status: garmentsResult.response.status,
          error: errorPayload,
        });
        setItems([]);
        setCounts(prev => ({ ...prev, items: 0, outfits: 0, lookbooks: 0 }));
      }
    } catch (error) {
      console.error('Wardrobe: Error fetching wardrobe data:', error);
      setItems([]);
      setCounts(prev => ({ ...prev, items: 0, outfits: 0, lookbooks: 0 }));
      setLoading(false);
    } finally {
      setLoading(false);
    }
  }, [fetchAllGarments]);

  const getCategoryBg = (category: string) => {
    const bgMap: Record<string, string> = {
      Tops: "#fce4ec",
      Bottoms: "#f3e5f5",
      Dresses: "#fce4ec",
      Outerwear: "#f5f5f5",
      Footwear: "#fff8e1",
      Shoes: "#fff8e1",
      Accessories: "#e8f5e9",
      Bags: "#faf6f0",
      Swimwear: "#e3f2fd",
    };
    return bgMap[category] || "#fce4ec";
  };

  const addItem = useCallback((item: ClothingItem) => {
    setItems((prev) => [item, ...prev]);
    setCounts((prev) => ({ ...prev, items: prev.items + 1 }));
  }, []);

  const updateItem = useCallback((updated: ClothingItem) => {
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
  }, []);

  const incrementOutfitCount = useCallback(() => {
    setCounts((prev) => ({ ...prev, outfits: prev.outfits + 1 }));
  }, []);

  const decrementOutfitCount = useCallback(() => {
    setCounts((prev) => ({
      ...prev,
      outfits: Math.max(0, prev.outfits - 1),
    }));
  }, []);

  const refreshItems = useCallback(async () => {
    setLoading(true);
    await fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return (
    <WardrobeContext.Provider value={{ items, counts, addItem, updateItem, incrementOutfitCount, decrementOutfitCount, refreshItems, loading }}>
      {children}
    </WardrobeContext.Provider>
  );
}

export function useWardrobe() {
  const ctx = useContext(WardrobeContext);
  if (!ctx) throw new Error("useWardrobe must be used within WardrobeProvider");
  return ctx;
}
