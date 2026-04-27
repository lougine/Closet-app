import React, { createContext, useContext, useState } from "react";
import { v4 as uuidv4 } from "uuid";

type Item = { id: string; image: string };
type Outfit = { id: string; items: Item[] };

type UserContextType = {
  username: string;
  setUsername: (v: string) => void;
  profileImage: string | null;
  setProfileImage: (v: string) => void;
  backgroundImage: string | null;
  setBackgroundImage: (v: string) => void;

  items: Item[];
  outfits: Outfit[];
  lookbooks: any[];

  addItem: (image: string) => void;
  addOutfit: (selectedItems: Item[]) => void;
};

const UserContext = createContext<UserContextType | null>(null);

export function UserProvider({ children }: any) {
  const [username, setUsername] = useState("wizliz");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);

  const [items, setItems] = useState<Item[]>([]);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [lookbooks] = useState<any[]>([]);

  const addItem = (image: string) => {
    setItems(prev => [...prev, { id: uuidv4(), image }]);
  };

  const addOutfit = (selectedItems: Item[]) => {
    setOutfits(prev => [...prev, { id: uuidv4(), items: selectedItems }]);
  };

  return (
    <UserContext.Provider
      value={{
        username,
        setUsername,
        profileImage,
        setProfileImage,
        backgroundImage,
        setBackgroundImage,
        items,
        outfits,
        lookbooks,
        addItem,
        addOutfit,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error("Wrap app in UserProvider");
  return context;
};