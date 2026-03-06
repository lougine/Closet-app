import React, { createContext, useContext, useState } from "react";

export interface ClothingItem {
  id: number;
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
}

const WardrobeContext = createContext<WardrobeContextType | null>(null);

export function WardrobeProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [counts, setCounts] = useState({ items: 0, outfits: 0, lookbooks: 0 });

  const addItem = (item: ClothingItem) => {
    setItems((prev) => [item, ...prev]);
    setCounts((prev) => ({ ...prev, items: prev.items + 1 }));
  };

  const updateItem = (updated: ClothingItem) => {
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
  };

  return (
    <WardrobeContext.Provider value={{ items, counts, addItem, updateItem }}>
      {children}
    </WardrobeContext.Provider>
  );
}

export function useWardrobe() {
  const ctx = useContext(WardrobeContext);
  if (!ctx) throw new Error("useWardrobe must be used within WardrobeProvider");
  return ctx;
}
