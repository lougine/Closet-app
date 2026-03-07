import { Feather, Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import { Dimensions, FlatList, Image, Modal, ScrollView, StatusBar, Text, TextInput, TouchableOpacity, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useWardrobe } from "../../context/wardrobeContext";
import { fc, s } from "../../Styles/index.styles";

const { width: W } = Dimensions.get("window");

function GridItem({ item, onPress }: { item: any; onPress: () => void }) {
  const [starred, setStarred] = useState(false);
  const [hidden, setHidden] = useState(false);
  return (
    <TouchableOpacity style={s.gridItem} onPress={onPress}>
      {item.image
        ? <Image source={{ uri: item.image }} style={s.gridImg} resizeMode="cover" />
        : <View style={s.gridEmpty} />
      }
      {hidden && <View style={s.gridHiddenOverlay} />}
      <TouchableOpacity style={s.gridEyeBtn} onPress={(e) => { e.stopPropagation(); setHidden(v => !v); }}>
        <Ionicons name={hidden ? "eye-off" : "eye-off-outline"} size={13} color={hidden ? "#333" : "#aaa"} />
      </TouchableOpacity>
      <TouchableOpacity style={s.gridStarBtn} onPress={(e) => { e.stopPropagation(); setStarred(v => !v); }}>
        <Ionicons name={starred ? "star" : "star-outline"} size={13} color={starred ? "#333" : "#aaa"} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const FILTER_TABS = ["All", "Outerwear", "Tops", "Bottoms", "Footwear", "Accessories"];

const CATEGORY_TREE: Record<string, string[]> = {
  Tops:        ["T-Shirt","Blouse","Crop Top","Tank Top","Shirt","Hoodie","Sweater","Cardigan"],
  Bottoms:     ["Jeans","Skirt","Shorts","Trousers","Leggings","Cargo Pants","Sweatpants"],
  Dresses:     ["Mini Dress","Bodycon"],
  Outerwear:   ["Jacket","Blazer","Coat","Trench Coat","Puffer","Leather Jacket","Denim Jacket","Vest"],
  Footwear:    ["Sneakers","Heels","Boots","Sandals","Platforms"],
  Accessories: ["Bag","Belt","Hat","Sunglasses","Jewellery","Scarf","Watch"],
  Bags:        ["Handbag","Tote","Clutch","Backpack","Mini Bag","Shoulder Bag"],
  Swimwear:    ["One-Piece","Coverup","Swim Shorts"],
};

const FILTER_COLORS  = ["Black","White","Grey","Brown","Beige","Red","Pink","Purple","Blue","Navy","Green","Yellow","Orange"];
const FILTER_SEASONS = ["Spring","Summer","Autumn","Winter"];
const FILTER_SIZES   = ["XXS","XS","S","M","L","XL","XXL"];

const COLOR_HEX: Record<string, string> = {
  Black:"#111", White:"#fff", Grey:"#9E9E9E", Brown:"#795548", Beige:"#D7C4A3",
  Red:"#E53935", Pink:"#F48FB1", Purple:"#9C27B0", Blue:"#1E88E5", Navy:"#1A237E",
  Green:"#43A047", Yellow:"#FDD835", Orange:"#FB8C00",
};

interface FilterState {
  category: string; subcategories: string[]; colors: string[]; seasons: string[]; sizes: string[];
}
const EMPTY_FILTERS: FilterState = { category:"", subcategories:[], colors:[], seasons:[], sizes:[] };

const Wave = () => (
  <Svg width={W} height={44} viewBox={`0 0 ${W} 44`} preserveAspectRatio="none"
    style={{ position:"absolute", width:"100%", height:"100%" }}>
    <Path d={`M0,44 L0,22 Q${W*0.25},50.6 ${W*0.5},16.72 Q${W*0.75},-8.8 ${W},22.88 L${W},44 Z`} fill="#f2f2f2" />
  </Svg>
);

const Chip = ({ label, active, onPress }: { label:string; active:boolean; onPress:()=>void }) => (
  <TouchableOpacity style={[fc.chip, active && fc.chipOn]} onPress={onPress}>
    <Text style={[fc.chipTxt, active && fc.chipTxtOn]}>{label}</Text>
  </TouchableOpacity>
);

export default function WardrobeScreen() {
  const router = useRouter();
  const { items, counts } = useWardrobe();

  const [profilePic, setProfilePic]     = useState<string | null>(null);
  const [bgImage, setBgImage]           = useState<string | null>(null);
  const [activeTopTab, setActiveTopTab] = useState(0);
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchQuery, setSearchQuery]   = useState("");
  const [imageMenuFor, setImageMenuFor] = useState<"profile"|"bg"|null>(null);
  const [showFilter, setShowFilter]     = useState(false);
  const [filters, setFilters]           = useState<FilterState>(EMPTY_FILTERS);

  const scrollRef = useRef<ScrollView>(null);

  const switchTab = (idx: number) => {
    setActiveTopTab(idx);
    scrollRef.current?.scrollTo({ x: idx * W, animated: true });
  };

  const setCategory = (cat: string) =>
    setFilters(prev => ({ ...prev, category: prev.category === cat ? "" : cat, subcategories: [] }));

  const toggleMulti = (key: "subcategories"|"colors"|"seasons"|"sizes", val: string) =>
    setFilters(prev => ({
      ...prev,
      [key]: prev[key].includes(val) ? prev[key].filter((v:string) => v !== val) : [...prev[key], val],
    }));

  const clearFilters = () => setFilters(EMPTY_FILTERS);

  const activeFilterCount =
    (filters.category ? 1 : 0) + filters.subcategories.length +
    filters.colors.length + filters.seasons.length + filters.sizes.length;

  const pickImage = async (source: "library"|"camera") => {
    const result = source === "library"
      ? await ImagePicker.launchImageLibraryAsync({ quality: 0.8 })
      : await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      if (imageMenuFor === "profile") setProfilePic(result.assets[0].uri);
      else setBgImage(result.assets[0].uri);
    }
    setImageMenuFor(null);
  };

  const filtered = items.filter(item => {
    if (searchQuery && !item.label.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (activeFilter !== "All" && !item.category?.includes(activeFilter)) return false;
    if (filters.category && !item.category?.includes(filters.category)) return false;
    if (filters.subcategories.length > 0 &&
        !filters.subcategories.some(sc => item.tags?.map(t=>t.toLowerCase()).includes(sc.toLowerCase()))) return false;
    if (filters.colors.length > 0 && !filters.colors.some(c => item.colors?.includes(c))) return false;
    if (filters.seasons.length > 0 &&
        !filters.seasons.some(se => item.tags?.map(t=>t.toLowerCase()).includes(se.toLowerCase()))) return false;
    if (filters.sizes.length > 0 && !filters.sizes.includes(item.size ?? "")) return false;
    return true;
  });

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── Header ── */}
      <View style={s.headerShell}>
        <TouchableOpacity style={s.headerImg} onPress={() => setImageMenuFor("bg")} activeOpacity={0.9}>
          {bgImage ? <Image source={{ uri: bgImage }} style={s.bgImage} /> : <View style={s.headerDefault} />}
          <View style={s.waveWrap}><Wave /></View>
        </TouchableOpacity>
        <TouchableOpacity style={s.settingsBtn} onPress={() => router.push("/features/settings" as any)}>
          <Feather name="settings" size={15} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={s.profileWrap} onPress={() => setImageMenuFor("profile")}>
          {profilePic
            ? <Image source={{ uri: profilePic }} style={s.profilePic} />
            : <View style={[s.profilePic, s.profilePlaceholder]}><Ionicons name="person" size={36} color="#fff" /></View>
          }
        </TouchableOpacity>
      </View>

      {/* ── Body ── */}
      <View style={s.body}>
        <View style={s.usernameRow}>
          <Text style={s.username}>@wizliz</Text>
          <TouchableOpacity onPress={() => router.push("/features/analytics" as any)}>
            <Text style={s.analyticsLink}>Style Analytics ›</Text>
          </TouchableOpacity>
        </View>

        <View style={s.statsCard}>
          <TouchableOpacity style={s.statItem} onPress={() => switchTab(0)}>
            <Text style={s.statNum}>{counts.items}</Text>
            <Text style={[s.statLabel, activeTopTab === 0 && s.statLabelPink]}>Items</Text>
          </TouchableOpacity>
          <View style={s.statDivider} />
          <TouchableOpacity style={s.statItem} onPress={() => switchTab(1)}>
            <Text style={s.statNum}>{counts.outfits}</Text>
            <Text style={[s.statLabel, activeTopTab === 1 && s.statLabelPink]}>Outfits</Text>
          </TouchableOpacity>
          <View style={s.statDivider} />
          <TouchableOpacity style={s.statItem} onPress={() => switchTab(2)}>
            <Text style={s.statNum}>{counts.lookbooks}</Text>
            <Text style={[s.statLabel, activeTopTab === 2 && s.statLabelPink]}>Lookbooks</Text>
          </TouchableOpacity>
        </View>

        <ScrollView ref={scrollRef} horizontal pagingEnabled scrollEnabled={false}
          showsHorizontalScrollIndicator={false} style={s.pagesScroll}>

          {/* ── ITEMS PAGE ── */}
          <View style={s.itemsPage}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.filterTabsContent}>
              {FILTER_TABS.map(tab => (
                <TouchableOpacity key={tab} style={[s.tab, activeFilter===tab && s.tabActive]} onPress={() => setActiveFilter(tab)}>
                  <Text style={[s.tabText, activeFilter===tab && s.tabTextActive]}>{tab}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={s.controlDivider} />
            <View style={s.searchSection}>
              <View style={s.searchRow}>
                <View style={s.searchBar}>
                  <Ionicons name="search" size={14} color="#aaa" />
                  <TextInput placeholder="Search" value={searchQuery} onChangeText={setSearchQuery}
                    style={s.searchInput} placeholderTextColor="#aaa" />
                </View>
              </View>
              <TouchableOpacity style={s.iconBtn}><Ionicons name="star" size={18} color="#333" /></TouchableOpacity>
              <TouchableOpacity style={s.iconBtn}><Ionicons name="eye-off-outline" size={19} color="#000" /></TouchableOpacity>
              <TouchableOpacity style={[s.iconBtn, activeFilterCount > 0 && s.iconBtnActive]} onPress={() => setShowFilter(true)}>
                <Feather name="sliders" size={18} color={activeFilterCount > 0 ? "#fff" : "#000"} />
                {activeFilterCount > 0 && <View style={s.badge}><Text style={s.badgeTxt}>{activeFilterCount}</Text></View>}
              </TouchableOpacity>
            </View>
            {activeFilterCount > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.activePillsContent}>
                {filters.category !== "" && (
                  <TouchableOpacity style={s.activePill} onPress={() => setCategory(filters.category)}>
                    <Text style={s.activePillTxt}>{filters.category} ×</Text>
                  </TouchableOpacity>
                )}
                {[...filters.subcategories,...filters.colors,...filters.seasons,...filters.sizes].map(v => (
                  <TouchableOpacity key={v} style={s.activePill} onPress={() => {
                    if (filters.subcategories.includes(v))      toggleMulti("subcategories", v);
                    else if (filters.colors.includes(v))        toggleMulti("colors", v);
                    else if (filters.seasons.includes(v))       toggleMulti("seasons", v);
                    else                                        toggleMulti("sizes", v);
                  }}>
                    <Text style={s.activePillTxt}>{v} ×</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity style={s.clearPill} onPress={clearFilters}>
                  <Text style={s.clearPillTxt}>Clear all</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
            {items.length === 0 ? (
              <View style={s.emptyState}>
                <Text style={s.emptyTitle}>Your wardrobe is empty</Text>
                <Text style={s.emptySubtitle}>Tap the pink button below to add your first item</Text>
              </View>
            ) : filtered.length === 0 ? (
              <View style={s.emptyState}>
                <Text style={s.emptyTitle}>No items match</Text>
                <TouchableOpacity style={s.clearBtn} onPress={clearFilters}>
                  <Text style={s.clearBtnTxt}>Clear Filters</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={filtered} numColumns={3} keyExtractor={item => String(item.id)} style={s.grid}
                renderItem={({ item }) => (
                  <GridItem item={item} onPress={() => router.push({ pathname: "/wardrobe/item-detail" as any, params: { itemJson: JSON.stringify(item) } })} />
                )}
              />
            )}
          </View>

          {/* ── OUTFITS PAGE ── */}
          <View style={s.tabPage}>
            <View style={s.emptyState}>
              <Text style={s.emptyTitle}>No outfits yet</Text>
              <Text style={s.emptySubtitle}>Use the + button to create your first outfit</Text>
              <TouchableOpacity style={s.clearBtn} onPress={() => router.push("/wardrobe/outfit" as any)}>
                <Text style={s.clearBtnTxt}>Create Outfit</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── LOOKBOOKS PAGE ── */}
          <View style={s.tabPage}>
            <View style={s.emptyState}>
              <Text style={s.emptyTitle}>No lookbooks yet</Text>
              <Text style={s.emptySubtitle}>Use the + button to create your first lookbook</Text>
              <TouchableOpacity style={s.clearBtn} onPress={() => router.push("/wardrobe/lookbook" as any)}>
                <Text style={s.clearBtnTxt}>Create Lookbook</Text>
              </TouchableOpacity>
            </View>
          </View>

        </ScrollView>
      </View>

      {/* ── Filter Modal ── */}
      <Modal transparent visible={showFilter} animationType="slide" onRequestClose={() => setShowFilter(false)}>
        <View style={s.filterOverlay}>
          <TouchableOpacity style={s.filterDismiss} activeOpacity={1} onPress={() => setShowFilter(false)} />
          <View style={s.filterSheet}>
            <View style={s.filterHeader}>
              <TouchableOpacity onPress={clearFilters}><Text style={s.filterClearTxt}>Clear all</Text></TouchableOpacity>
              <Text style={s.filterTitle}>Filter</Text>
              <TouchableOpacity onPress={() => setShowFilter(false)}><Ionicons name="close" size={22} color="#1a1a1a" /></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.filterScrollContent}>
              <Text style={s.filterSection}>CATEGORY</Text>
              <View style={fc.row}>
                {Object.keys(CATEGORY_TREE).map(cat => (
                  <Chip key={cat} label={cat} active={filters.category===cat} onPress={() => setCategory(cat)} />
                ))}
              </View>
              {filters.category !== "" && (
                <>
                  <Text style={s.filterSection}>{filters.category.toUpperCase()} TYPE</Text>
                  <View style={fc.row}>
                    {CATEGORY_TREE[filters.category].map(sub => (
                      <Chip key={sub} label={sub} active={filters.subcategories.includes(sub)}
                        onPress={() => toggleMulti("subcategories", sub)} />
                    ))}
                  </View>
                </>
              )}
              <Text style={s.filterSection}>COLOR</Text>
              <View style={fc.colorRow}>
                {FILTER_COLORS.map(c => {
                  const hex = COLOR_HEX[c];
                  const selected = filters.colors.includes(c);
                  const isLight = ["White","Cream","Yellow","Gold","Beige"].includes(c);
                  return (
                    <TouchableOpacity key={c} style={fc.colorOpt} onPress={() => toggleMulti("colors", c)}>
                      <View style={[fc.swatch, { backgroundColor: hex }, isLight && fc.swatchBorder, selected && fc.swatchSelected]}>
                        {selected && <Ionicons name="checkmark" size={13} color={isLight ? "#333" : "#fff"} />}
                      </View>
                      <Text style={fc.swatchLabel}>{c}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={s.filterSection}>SEASON</Text>
              <View style={fc.row}>
                {FILTER_SEASONS.map(season => (
                  <Chip key={season} label={season} active={filters.seasons.includes(season)}
                    onPress={() => toggleMulti("seasons", season)} />
                ))}
              </View>
              <Text style={s.filterSection}>SIZE</Text>
              <View style={fc.row}>
                {FILTER_SIZES.map(sz => (
                  <Chip key={sz} label={sz} active={filters.sizes.includes(sz)} onPress={() => toggleMulti("sizes", sz)} />
                ))}
              </View>
            </ScrollView>
            <TouchableOpacity style={s.applyBtn} onPress={() => setShowFilter(false)}>
              <Text style={s.applyBtnTxt}>
                {activeFilterCount === 0 ? "Show All Items" : `Show Results · ${activeFilterCount} active`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Image picker ── */}
      <Modal transparent visible={!!imageMenuFor} animationType="slide" onRequestClose={() => setImageMenuFor(null)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setImageMenuFor(null)}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>Change Image</Text>
            <TouchableOpacity style={s.sheetBtn} onPress={() => pickImage("library")}><Text>Choose from Library</Text></TouchableOpacity>
            <TouchableOpacity style={s.sheetBtn} onPress={() => pickImage("camera")}><Text>Take Photo</Text></TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}