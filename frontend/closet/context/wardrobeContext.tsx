import React, { createContext, useContext, useState, useEffect } from "react";
import * as SecureStore from "expo-secure-store";
import { buildApiUrl, buildImageUrl } from "../constants/api";

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

export interface ClothingItem {
  id: string; // Changed from number to string to match MongoDB _id
  image?: string | null;
  label: string;
  bg: string;
  category?: string[];
  colors?: string[];
  size?: string;
  brand?: string;
  tags?: string[];
  timesWorn?: number;
  totalCost?: number;
  dateAdded?: string;
}

interface WardrobeContextType {
  items: ClothingItem[];
  counts: { items: number; outfits: number; lookbooks: number };
  addItem: (item: ClothingItem) => void;
  updateItem: (item: ClothingItem) => void;
  refreshItems: () => Promise<void>;
  loading: boolean;
}

const WardrobeContext = createContext<WardrobeContextType | null>(null);

export function WardrobeProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [counts, setCounts] = useState({ items: 0, outfits: 0, lookbooks: 0 });
  const [loading, setLoading] = useState(true);

  const fetchAllGarments = async (token: string) => {
    const allGarments: any[] = [];
    let page = 1;

    while (true) {
      const response = await fetch(buildApiUrl(`/api/garments?page=${page}&limit=${GARMENTS_PAGE_SIZE}`), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
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
  };

  const fetchItems = async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) {
        setLoading(false);
        return;
      }

      const [garmentsResult, outfitsResponse] = await Promise.all([
        fetchAllGarments(token),
        fetch(buildApiUrl('/api/outfits'), {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }),
      ]);

      if (garmentsResult.ok) {
        const garments = garmentsResult.garments;
        const outfits = outfitsResponse.ok ? await outfitsResponse.json() : [];
        const storedLookbookIds = new Set(
          parseStoredLookbookIds(await SecureStore.getItemAsync(LOOKBOOK_IDS_KEY)),
        );
        const formattedItems: ClothingItem[] = garments.map((garment: any) => ({
          id: garment._id,
          image: garment.imageUrl ? buildImageUrl(garment.imageUrl) : null,
          label: garment.name,
          bg: getCategoryBg(garment.category),
          category: [garment.category],
          colors: garment.color ? [garment.color] : [],
          size: garment.size,
          brand: garment.brand,
          tags: garment.tags || [],
          timesWorn: Number(garment.wearCount) || 0,
          totalCost: Number(garment.purchasePrice) || 0,
          dateAdded: garment.createdAt ? new Date(garment.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : undefined,
        }));

        const outfitList = Array.isArray(outfits) ? outfits : [];
        const lookbookCount = outfitList.filter((entry: any) => {
          const rawFlag = entry?.isLookbook;
          const entryId = toIdString(entry?._id);
          return (
            rawFlag === true ||
            rawFlag === "true" ||
            rawFlag === 1 ||
            storedLookbookIds.has(entryId)
          );
        }).length;
        const outfitCount = outfitList.length - lookbookCount;

        setItems(formattedItems);
        setCounts(prev => ({
          ...prev,
          items: formattedItems.length,
          outfits: outfitCount,
          lookbooks: lookbookCount,
        }));
      } else {
        const errorPayload = await garmentsResult.response.json().catch(() => ({}));
        console.error('Failed to fetch garments:', garmentsResult.response.status, errorPayload);
        setItems([]);
        setCounts(prev => ({ ...prev, items: 0, outfits: 0, lookbooks: 0 }));
      }
    } catch (error) {
      console.error('Error fetching garments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryBg = (category: string) => {
    const bgMap: Record<string, string> = {
      Tops: "#fce4ec",
      Bottoms: "#f3e5f5",
      Dresses: "#fce4ec",
      Outerwear: "#f5f5f5",
      Footwear: "#fff8e1",
      Accessories: "#e8f5e9",
      Bags: "#faf6f0",
      Swimwear: "#e3f2fd",
    };
    return bgMap[category] || "#fce4ec";
  };

  const addItem = (item: ClothingItem) => {
    setItems((prev) => [item, ...prev]);
    setCounts((prev) => ({ ...prev, items: prev.items + 1 }));
  };

  const updateItem = (updated: ClothingItem) => {
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
  };

  const refreshItems = async () => {
    setLoading(true);
    await fetchItems();
  };

  useEffect(() => {
    fetchItems();
  }, []);

  return (
    <WardrobeContext.Provider value={{ items, counts, addItem, updateItem, refreshItems, loading }}>
      {children}
    </WardrobeContext.Provider>
  );
}

export function useWardrobe() {
  const ctx = useContext(WardrobeContext);
  if (!ctx) throw new Error("useWardrobe must be used within WardrobeProvider");
  return ctx;
}
