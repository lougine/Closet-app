// app/(tabs)/analytics.tsx
// Closet Insights page — shows wardrobe analytics in a beautiful scrollable layout.
//
// Sections (top to bottom):
//   1. Pink wavy header — "Closet Insights ✨"
//   2. Wardrobe Usage — horizontal progress bar
//   3. Outfits Worn — donut ring stat
//   4. What's in my wardrobe — category breakdown (tops, bottoms, etc.)
//   5. Colours — pie chart of wardrobe colours
//   6. My Usage — most worn / least worn / never worn items
//
// All API calls are marked TODO — wire them up when backend is ready.

import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Image, Dimensions, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import Svg, {
  Circle, G, Path, Text as SvgText,
} from 'react-native-svg';

// ─── COLORS ───────────────────────────────────────────────────────────────────
const COLORS = {
  white: '#FFFFFF',
  offWhite: '#F6F6F6',
  lightGray: '#D9D9D9',
  lightPink: '#FB92BD',
  hotPink: '#F0507B',
  text: '#1A1A1A',
  subText: '#888888',
};

// Colors used for the category and colour charts
const CHART_COLORS = [
  '#F0507B', '#FB92BD', '#FF8FAB', '#FFB3C6',
  '#D9D9D9', '#A8DADC', '#7EC8E3', '#B8B8FF',
  '#C8E6C9', '#FFD180', '#FFAB91', '#CE93D8',
];

const { width: SW } = Dimensions.get('window');

// ─── TYPES ────────────────────────────────────────────────────────────────────

// Overall wardrobe stats returned by GET /analytics/overview
type OverviewStats = {
  totalItems: number;
  wardrobeUsagePercent: number;  // 0–100, % of items worn at least once
  outfitsWorn: number;           // how many outfits logged in calendar
  totalOutfits: number;          // total outfits saved
};

// One wardrobe category e.g. { name: 'Tops', count: 42 }
type CategoryStat = {
  name: string;
  count: number;
};

// One colour entry e.g. { colour: '#000000', label: 'Black', count: 30 }
type ColourStat = {
  colour: string;
  label: string;
  count: number;
};

// One clothing item for most/least worn lists
type WornItem = {
  _id: string;
  name: string;
  imageUrl: string;
  wearCount: number;      // separate wearCount field on the garment document
  category: string;
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────

// Builds SVG pie/donut chart data from an array of counts
function buildPieSlices(data: { count: number; colour: string }[], radius: number, cx: number, cy: number) {
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) return [];

  let startAngle = -Math.PI / 2; // start from top
  return data.map((d) => {
    const angle = (d.count / total) * 2 * Math.PI;
    const endAngle = startAngle + angle;
    const x1 = cx + radius * Math.cos(startAngle);
    const y1 = cy + radius * Math.sin(startAngle);
    const x2 = cx + radius * Math.cos(endAngle);
    const y2 = cy + radius * Math.sin(endAngle);
    const largeArc = angle > Math.PI ? 1 : 0;
    const path = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    startAngle = endAngle;
    return { path, colour: d.colour };
  });
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function AnalyticsScreen() {
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [categories, setCategories] = useState<CategoryStat[]>([]);
  const [colours, setColours] = useState<ColourStat[]>([]);
  const [mostWorn, setMostWorn] = useState<WornItem[]>([]);
  const [leastWorn, setLeastWorn] = useState<WornItem[]>([]);
  const [neverWorn, setNeverWorn] = useState<WornItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [wardrobeExpanded, setWardrobeExpanded] = useState(true);
  const [usageExpanded, setUsageExpanded] = useState(true);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      const headers = { Authorization: `Bearer ${token}` };

      // TODO: replace all URLs below with your real API base URL

      // Fetch all analytics in parallel for speed
      const [overviewRes, catRes, colourRes, mostRes, leastRes, neverRes] = await Promise.all([
        // GET /analytics/overview → { totalItems, wardrobeUsagePercent, outfitsWorn, totalOutfits }
        fetch('https://your-api.com/analytics/overview', { headers }),
        // GET /analytics/categories → [{ name, count }] for Tops/Bottoms/etc.
        fetch('https://your-api.com/analytics/categories', { headers }),
        // GET /analytics/colours → [{ colour (hex), label, count }]
        fetch('https://your-api.com/analytics/colours', { headers }),
        // GET /analytics/most-worn?limit=6 → top 6 items sorted by wearCount desc
        fetch('https://your-api.com/analytics/most-worn?limit=6', { headers }),
        // GET /analytics/least-worn?limit=6 → items with wearCount > 0, sorted asc
        fetch('https://your-api.com/analytics/least-worn?limit=6', { headers }),
        // GET /analytics/never-worn?limit=6 → items where wearCount === 0
        fetch('https://your-api.com/analytics/never-worn?limit=6', { headers }),
      ]);

      setOverview(await overviewRes.json());
      setCategories(await catRes.json());
      setColours(await colourRes.json());
      setMostWorn(await mostRes.json());
      setLeastWorn(await leastRes.json());
      setNeverWorn(await neverRes.json());
    } catch (e) {
      console.error('Failed to load analytics:', e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={COLORS.hotPink} />
      </View>
    );
  }

  // ── Derived values ─────────────────────────────────────────────────────────
  const usagePercent = overview?.wardrobeUsagePercent ?? 0;
  const outfitsWorn = overview?.outfitsWorn ?? 0;
  const totalOutfits = overview?.totalOutfits ?? 0;
  const outfitPercent = totalOutfits > 0 ? Math.round((outfitsWorn / totalOutfits) * 100) : 0;
  const totalItems = overview?.totalItems ?? 0;

  // Top 2 colours for the "favourite colours" label
  const topColours = [...colours].sort((a, b) => b.count - a.count).slice(0, 2);

  // Pie chart data for colours
  const colourPieData = colours.map((c, i) => ({
    count: c.count,
    colour: c.colour || CHART_COLORS[i % CHART_COLORS.length],
  }));
  const pieSlices = buildPieSlices(colourPieData, 80, 100, 100);

  // Donut ring for outfits worn (drawn as two arcs)
  const DONUT_R = 54;
  const DONUT_CX = 70;
  const DONUT_CY = 70;
  const circumference = 2 * Math.PI * DONUT_R;
  const filledDash = (outfitPercent / 100) * circumference;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}>

      {/* ══════════════════════════════════════════════════════
          HEADER — light pink with asymmetric rounded bottom
          ══════════════════════════════════════════════════════ */}
       {/* 1. TOP WAVE DESIGN */}
     <View style={styles.headerBg}>
  {/* Wave fills the entire header as background */}
  <View style={styles.topWaveContainer}>
    <Svg height="100%" width="100%" viewBox="0 0 1440 320" preserveAspectRatio="none">
      <Path
        fill="#FB92BD"
        d="M0,160 C400,0 600,400 1440,100 L1440,0 L0,0 Z"
      />
    </Svg>
  </View>
  {/* Title overlaid on top of the wave */}
  <View style={styles.headerTextWrap}>
    <Text style={styles.headerTitle}>Closet Insights ✨</Text>
    <Text style={styles.headerSub}>Everything your wardrobe is telling you</Text>
  </View>
</View>

      {/* ══════════════════════════════════════════════════════
          ROW 1 — Wardrobe Usage + Outfits Worn side by side
          ══════════════════════════════════════════════════════ */}
      <View style={styles.row}>

        {/* ── Wardrobe Usage card ── */}
        <View style={[styles.card, styles.halfCard]}>
          <Text style={styles.cardLabel}>Wardrobe Usage</Text>
          <Text style={styles.bigStat}>{usagePercent}%</Text>
          {/* Progress bar */}
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${usagePercent}%` }]} />
          </View>
          <Text style={styles.cardSub}>of items worn</Text>
        </View>

        {/* ── Outfits Worn donut card ── */}
        <View style={[styles.card, styles.halfCard, { alignItems: 'center' }]}>
          <Text style={styles.cardLabel}>Outfits Worn</Text>
          {/* SVG donut ring */}
          <Svg width={140} height={140} viewBox="0 0 140 140">
            {/* Background ring (grey) */}
            <Circle
              cx={70} cy={70} r={DONUT_R}
              stroke={COLORS.lightGray}
              strokeWidth={12}
              fill="none"
            />
            {/* Filled arc (hot pink) */}
            <Circle
              cx={70} cy={70} r={DONUT_R}
              stroke={COLORS.hotPink}
              strokeWidth={12}
              fill="none"
              strokeDasharray={`${filledDash} ${circumference}`}
              strokeLinecap="round"
              // rotate so it starts from the top
              transform="rotate(-90 70 70)"
            />
            {/* Center text */}
            <SvgText x={70} y={66} textAnchor="middle"
              fontSize={22} fontWeight="800" fill={COLORS.text}>
              {outfitPercent}%
            </SvgText>
            <SvgText x={70} y={84} textAnchor="middle"
              fontSize={10} fill={COLORS.subText}>
              {outfitsWorn}/{totalOutfits}
            </SvgText>
          </Svg>
        </View>
      </View>

      {/* ══════════════════════════════════════════════════════
          SECTION 2 — What's in my wardrobe
          ══════════════════════════════════════════════════════ */}
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={() => setWardrobeExpanded(!wardrobeExpanded)}
        activeOpacity={0.8}
      >
        <Text style={styles.sectionHeaderText}>What's in my wardrobe?</Text>
        <Ionicons
          name={wardrobeExpanded ? 'chevron-up' : 'chevron-down'}
          size={18} color={COLORS.white}
        />
      </TouchableOpacity>

      {wardrobeExpanded && (
        <View style={styles.card}>
          {/* Total item count pill */}
          <View style={styles.totalPill}>
            <Text style={styles.totalPillText}>{totalItems} total items</Text>
          </View>

          {/* Category rows */}
          {/* Categories come from backend but we define the expected ones here */}
          {/* TODO: backend should return these category names exactly:
              Tops, Bottoms, Dresses, Shoes, Bags, Accessories
              Add more if needed — they'll appear automatically */}
          {categories.length > 0 ? categories.map((cat, i) => {
            const pct = totalItems > 0 ? Math.round((cat.count / totalItems) * 100) : 0;
            const barColor = CHART_COLORS[i % CHART_COLORS.length];
            return (
              <View key={cat.name} style={styles.categoryRow}>
                {/* Category name + count */}
                <View style={styles.categoryLeft}>
                  <View style={[styles.categoryDot, { backgroundColor: barColor }]} />
                  <Text style={styles.categoryName}>{cat.name}</Text>
                </View>
                {/* Mini bar */}
                <View style={styles.categoryBarTrack}>
                  <View style={[styles.categoryBarFill, {
                    width: `${pct}%`, backgroundColor: barColor,
                  }]} />
                </View>
                <Text style={styles.categoryCount}>{cat.count}</Text>
              </View>
            );
          }) : (
            // Fallback if no data yet — shows the expected categories as empty
            ['Tops', 'Bottoms', 'Dresses', 'Shoes', 'Bags', 'Accessories'].map((name, i) => (
              <View key={name} style={styles.categoryRow}>
                <View style={styles.categoryLeft}>
                  <View style={[styles.categoryDot, { backgroundColor: CHART_COLORS[i] }]} />
                  <Text style={styles.categoryName}>{name}</Text>
                </View>
                <View style={styles.categoryBarTrack}>
                  <View style={[styles.categoryBarFill, { width: '0%', backgroundColor: CHART_COLORS[i] }]} />
                </View>
                <Text style={styles.categoryCount}>0</Text>
              </View>
            ))
          )}
        </View>
      )}

      {/* ══════════════════════════════════════════════════════
          SECTION 3 — Colours pie chart
          ══════════════════════════════════════════════════════ */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Colours 🎨</Text>

        {colours.length > 0 ? (
          <>
            <View style={styles.colourChartWrap}>
              {/* Pie chart */}
              <Svg width={200} height={200} viewBox="0 0 200 200">
                {pieSlices.map((slice, i) => (
                  <Path key={i} d={slice.path} fill={slice.colour} />
                ))}
                {/* White circle in middle to make it a donut */}
                <Circle cx={100} cy={100} r={50} fill={COLORS.white} />
              </Svg>

              {/* Colour legend on the right */}
              <View style={styles.colourLegend}>
                {colours.slice(0, 6).map((c, i) => (
                  <View key={i} style={styles.legendRow}>
                    <View style={[styles.legendDot, {
                      backgroundColor: c.colour || CHART_COLORS[i % CHART_COLORS.length]
                    }]} />
                    <Text style={styles.legendLabel}>{c.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Top 2 favourite colours callout */}
            {topColours.length >= 2 && (
              <Text style={styles.favouriteColoursText}>
                Your favourites are{' '}
                <Text style={[styles.colourBold, { color: topColours[0].colour || COLORS.hotPink }]}>
                  {topColours[0].label}
                </Text>
                {' '}and{' '}
                <Text style={[styles.colourBold, { color: topColours[1].colour || COLORS.lightPink }]}>
                  {topColours[1].label}
                </Text>
              </Text>
            )}
          </>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="color-palette-outline" size={36} color={COLORS.lightPink} />
            <Text style={styles.emptyText}>No colour data yet</Text>
          </View>
        )}
      </View>

      {/* ══════════════════════════════════════════════════════
          SECTION 4 — My Usage
          ══════════════════════════════════════════════════════ */}
      <TouchableOpacity
        style={[styles.sectionHeader, { backgroundColor: COLORS.hotPink }]}
        onPress={() => setUsageExpanded(!usageExpanded)}
        activeOpacity={0.8}
      >
        <Text style={styles.sectionHeaderText}>My Usage</Text>
        <Ionicons
          name={usageExpanded ? 'chevron-up' : 'chevron-down'}
          size={18} color={COLORS.white}
        />
      </TouchableOpacity>

      {usageExpanded && (
        <>
          {/* ── Most worn ── */}
          <UsageSection
            title="Most worn 🔥"
            subtitle="Your go-to pieces"
            items={mostWorn}
            accentColor={COLORS.hotPink}
          />

          {/* ── Least worn ── */}
          <UsageSection
            title="Least worn 👀"
            subtitle="Give these some love"
            items={leastWorn}
            accentColor={COLORS.lightPink}
          />

          {/* ── Never worn ── */}
          <UsageSection
            title="Never worn 🏷️"
            subtitle="Still has the tags on?"
            items={neverWorn}
            accentColor={COLORS.lightGray}
          />

          {/* ── Cost per wear insight ── */}
          {/* TODO: if your backend stores item price, you can calculate
              cost-per-wear = price / wearCount and show it per item */}
          <View style={styles.insightCard}>
            <Ionicons name="bulb-outline" size={22} color={COLORS.hotPink} />
            <View style={styles.insightText}>
              <Text style={styles.insightTitle}>Tip 💡</Text>
              <Text style={styles.insightBody}>
                Items you've never worn are costing you the most. Try styling them this week!
              </Text>
            </View>
          </View>
        </>
      )}

      <View style={{ height: 100 }} />{/* bottom padding for tab bar */}
    </ScrollView>
  );
}

// ─── Usage section component (most/least/never worn grid) ─────────────────────
function UsageSection({
  title, subtitle, items, accentColor,
}: {
  title: string; subtitle: string; items: WornItem[]; accentColor: string;
}) {
  return (
    <View style={styles.usageSection}>
      <View style={styles.usageTitleRow}>
        <View>
          <Text style={styles.usageTitle}>{title}</Text>
          <Text style={styles.usageSub}>{subtitle}</Text>
        </View>
        {/* Accent line */}
        <View style={[styles.accentLine, { backgroundColor: accentColor }]} />
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No items yet</Text>
        </View>
      ) : (
        // 3-column grid of item thumbnails
        <View style={styles.itemGrid}>
          {items.map((item) => (
            <View key={item._id} style={styles.itemCell}>
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={styles.itemThumb} resizeMode="cover" />
              ) : (
                <View style={[styles.itemThumb, styles.itemThumbEmpty]}>
                  <Ionicons name="shirt-outline" size={22} color={COLORS.lightGray} />
                </View>
              )}
              {/* Wear count badge */}
              <View style={[styles.wearBadge, { backgroundColor: accentColor }]}>
                <Text style={styles.wearBadgeText}>×{item.wearCount}</Text>
              </View>
              <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const ITEM_SIZE = (SW - 40 - 24) / 3; // 3 columns with padding

const styles = StyleSheet.create({
 scroll: { flex: 1, backgroundColor: COLORS.white },
container: { paddingBottom: 20 },
loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.white },

headerBg: {
  height: 160,
  marginBottom: 0,
  position: 'relative',
},
topWaveContainer: {
  position: 'absolute',
  top: 0, left: 0, right: 0, bottom: -100,
},
headerTextWrap: {
  position: 'absolute',
  bottom: 38,
  right: 90,
},
headerTitle: { fontSize: 26, fontWeight: '800', color: 'rgb(0, 0, 0)', marginBottom: 4 },
headerSub: { fontSize: 13, color: 'rgb(0, 0, 0)' },

  // ── Generic card ───────────────────────────────────────────────────────────
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 18,
    marginHorizontal: 20,
    marginBottom: 14,
    shadowColor: COLORS.hotPink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.offWhite,
  },
  cardLabel: { fontSize: 12, fontWeight: '600', color: COLORS.subText, textTransform: 'uppercase', letterSpacing: 0.8 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  cardSub: { fontSize: 12, color: COLORS.subText },

  // ── Side by side row ───────────────────────────────────────────────────────
  row: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 14,
  },
  halfCard: {
    flex: 1,
    marginHorizontal: 0,  // override card margin since row handles it
  },

  // ── Big stat number ────────────────────────────────────────────────────────
  bigStat: { fontSize: 36, fontWeight: '800', color: COLORS.hotPink },

  // ── Progress bar ───────────────────────────────────────────────────────────
  progressTrack: {
    height: 8, borderRadius: 4,
    backgroundColor: COLORS.lightGray,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%', borderRadius: 4,
    backgroundColor: COLORS.hotPink,
  },

  // ── Section collapsible header ─────────────────────────────────────────────
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.lightPink,
    marginHorizontal: 20,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginBottom: 10,
  },
  sectionHeaderText: { fontSize: 15, fontWeight: '700', color: COLORS.white },

  // ── Wardrobe categories ────────────────────────────────────────────────────
  totalPill: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.offWhite,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  totalPillText: { fontSize: 12, fontWeight: '600', color: COLORS.subText },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  categoryLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, width: 110 },
  categoryDot: { width: 10, height: 10, borderRadius: 5 },
  categoryName: { fontSize: 14, fontWeight: '500', color: COLORS.text },
  categoryBarTrack: {
    flex: 1, height: 8, borderRadius: 4,
    backgroundColor: COLORS.offWhite, overflow: 'hidden',
  },
  categoryBarFill: { height: '100%', borderRadius: 4, minWidth: 4 },
  categoryCount: { fontSize: 13, fontWeight: '600', color: COLORS.subText, width: 28, textAlign: 'right' },

  // ── Colour chart ───────────────────────────────────────────────────────────
  colourChartWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  colourLegend: { flex: 1, paddingLeft: 12, gap: 6 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: 12, color: COLORS.text, fontWeight: '500' },
  favouriteColoursText: {
    fontSize: 13, color: COLORS.subText,
    textAlign: 'center', lineHeight: 20,
  },
  colourBold: { fontWeight: '800' },

  // ── Usage sections ─────────────────────────────────────────────────────────
  usageSection: {
    marginHorizontal: 20,
    marginBottom: 14,
  },
  usageTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  usageTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  usageSub: { fontSize: 12, color: COLORS.subText, marginTop: 2 },
  accentLine: { width: 40, height: 3, borderRadius: 2 },

  // ── Item grid ──────────────────────────────────────────────────────────────
  itemGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  itemCell: {
    width: ITEM_SIZE,
    alignItems: 'center',
    gap: 4,
  },
  itemThumb: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    borderRadius: 14,
    backgroundColor: COLORS.offWhite,
  },
  itemThumbEmpty: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  wearBadge: {
    position: 'absolute',
    top: 6, right: 6,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  wearBadgeText: { fontSize: 10, fontWeight: '700', color: COLORS.white },
  itemName: { fontSize: 11, color: COLORS.subText, textAlign: 'center', width: ITEM_SIZE },

  // ── Insight tip card ───────────────────────────────────────────────────────
  insightCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF0F4',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 14,
    gap: 12,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.hotPink,
  },
  insightText: { flex: 1 },
  insightTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  insightBody: { fontSize: 13, color: COLORS.subText, marginTop: 2, lineHeight: 20 },

  // ── Empty state ────────────────────────────────────────────────────────────
  emptyState: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  emptyText: { fontSize: 13, color: COLORS.subText },
});