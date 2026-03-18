import React, { createContext, useContext, useState, useEffect } from "react";
import * as SecureStore from "expo-secure-store";
import { buildApiUrl, buildImageUrl } from "../constants/api";

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

  const fetchItems = async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await fetch(buildApiUrl('/api/garments?limit=100'), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const garments = await response.json();
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
          timesWorn: 0, // Could be added to backend later
          totalCost: garment.cost || 0,
          dateAdded: garment.createdAt ? new Date(garment.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : undefined,
        }));

        setItems(formattedItems);
        setCounts(prev => ({ ...prev, items: formattedItems.length }));
      } else {
        const errorPayload = await response.json().catch(() => ({}));
        console.error('Failed to fetch garments:', response.status, errorPayload);
        setItems([]);
        setCounts(prev => ({ ...prev, items: 0 }));
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
