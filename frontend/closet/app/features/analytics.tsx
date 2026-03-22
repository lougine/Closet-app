import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import AuthenticatedImage from '@/components/AuthenticatedImage';
import { buildApiUrl, buildAuthHeaders, buildImageUrl } from '@/constants/api';
import { COLORS } from '@/constants/theme';
import Svg, { Circle, G, Path, Text as SvgText,} from 'react-native-svg';
import { styles } from '../../Styles/features/analystics.styles';

const CHART_COLORS = [
  '#0051ff', '#ff62a4', '#00ff91', '#FFB3C6',
  '#D9D9D9', '#A8DADC', '#7EC8E3', '#B8B8FF',
  '#C8E6C9', '#FFD180', '#FFAB91', '#CE93D8',
];

const NAMED_COLOUR_TO_HEX: Record<string, string> = {
  black: '#000000', white: '#FFFFFF', blue: '#3B82F6', green: '#22C55E', 
  red: '#EF4444', beige: '#D6C6A9', navy: '#1E3A8A', gray: '#9CA3AF', 
  grey: '#9CA3AF', brown: '#8B5E3C', pink: '#EC4899', purple: '#8B5CF6',
  yellow: '#EAB308', orange: '#F97316',
};

const { width: SW } = Dimensions.get('window');
const TREND_RANGE_OPTIONS = [3, 6, 12] as const;
type TrendRangeMonths = (typeof TREND_RANGE_OPTIONS)[number];
const ANALYTICS_TREND_RANGE_KEY = 'analyticsTrendRangeMonths';

type OverviewStats = { totalItems: number; wardrobeUsagePercent: number;  
  outfitsWorn: number; totalOutfits: number; totalWearEvents?: number; averageWearPerItem?: number};

type CategoryStat = { name: string; count: number};
type ColourStat = { colour: string; label: string; count: number};
type WornItem = { _id: string; name: string; imageUrl: string; wearCount: number; category: string};
type CostPerWearItem = WornItem & { purchasePrice?: number | null; costPerWear?: number | null};
type CostPerWearSummary = { trackedItems: number; averageCostPerWear: number; minCostPerWear: number; maxCostPerWear: number};
type CostPerWearResponse = { items: CostPerWearItem[]; summary: CostPerWearSummary};
type MonthlyTrend = { month: string; wearCount: number };
type DayTrend = { day: string; dayNumber: number; wearCount: number};
type CategoryTrend = { category: string; wearCount: number};
type UsageTrendsResponse = { rangeMonths: number; rangeStart?: string; monthly: MonthlyTrend[]; dayOfWeek: DayTrend[]; byCategory: CategoryTrend[]; 
  summary?: {
    totalWearEventsInRange: number; mostActiveDay: {
      day: string; dayNumber: number; wearCount: number;
    } | null;
  };
};

function formatTrendMonth(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number);
  if (!year || !month) return monthKey;
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString(undefined, {
    month: 'short',
    year: '2-digit',
    timeZone: 'UTC',
  });
}

function isDrawableColour(value: string) {
  return (
    /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value)
    || /^rgba?\(/i.test(value)
    || /^hsla?\(/i.test(value)
    || /^transparent$/i.test(value)
  );
}

function toDrawableColour(rawValue: string | null | undefined, fallback: string) {
  const trimmed = rawValue?.trim();
  if (!trimmed) return fallback;
  if (isDrawableColour(trimmed)) return trimmed;

  const mapped = NAMED_COLOUR_TO_HEX[trimmed.toLowerCase()];
  return mapped || fallback;
}

function buildPieSlices(data: { count: number; colour: string }[], radius: number, cx: number, cy: number) {
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) return [];

  let startAngle = -Math.PI / 2;
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

export default function AnalyticsScreen() {
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [categories, setCategories] = useState<CategoryStat[]>([]);
  const [colours, setColours] = useState<ColourStat[]>([]);
  const [mostWorn, setMostWorn] = useState<WornItem[]>([]);
  const [leastWorn, setLeastWorn] = useState<WornItem[]>([]);
  const [neverWorn, setNeverWorn] = useState<WornItem[]>([]);
  const [costPerWear, setCostPerWear] = useState<CostPerWearResponse | null>(null);
  const [usageTrends, setUsageTrends] = useState<UsageTrendsResponse | null>(null);
  const [selectedTrendMonths, setSelectedTrendMonths] = useState<TrendRangeMonths>(6);
  const [trendLoading, setTrendLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [wardrobeExpanded, setWardrobeExpanded] = useState(true);
  const [usageExpanded, setUsageExpanded] = useState(true);

  useEffect(() => {
    async function initializeAnalytics() {
      let initialTrendMonths: TrendRangeMonths = 6;

      try {
        const savedRange = await SecureStore.getItemAsync(ANALYTICS_TREND_RANGE_KEY);
        const parsed = Number(savedRange);
        if (TREND_RANGE_OPTIONS.includes(parsed as TrendRangeMonths)) {
          initialTrendMonths = parsed as TrendRangeMonths;
          setSelectedTrendMonths(initialTrendMonths);
        }
      } catch (error) {
        console.warn('Failed to load saved trend range:', error);
      }

      await fetchAll(initialTrendMonths);
      setInitialLoadComplete(true);
    }

    initializeAnalytics();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      if (!initialLoadComplete) return;
      fetchAll(selectedTrendMonths);
    }, [initialLoadComplete, selectedTrendMonths])
  );

  const parseJsonOrThrow = async (res: Response, label: string) => {
    if (!res.ok) {
      throw new Error(`${label} request failed (${res.status})`);
    }
    return res.json();
  };

  async function fetchUsageTrends(
    months: TrendRangeMonths,
    options: { persistSelection?: boolean; showLoading?: boolean } = {}
  ) {
    const { persistSelection = true, showLoading = true } = options;

    try {
      if (showLoading) {
        setTrendLoading(true);
      }

      const token = await SecureStore.getItemAsync('userToken');
      const headers = buildAuthHeaders(token);
      const trendsRes = await fetch(buildApiUrl(`/api/analytics/usage-trends?months=${months}`), { headers });
      setUsageTrends(await parseJsonOrThrow(trendsRes, 'Usage trends'));
      setSelectedTrendMonths(months);

      if (persistSelection) {
        await SecureStore.setItemAsync(ANALYTICS_TREND_RANGE_KEY, String(months));
      }
    } catch (e) {
      console.error('Failed to load usage trends:', e);
    } finally {
      if (showLoading) {
        setTrendLoading(false);
      }
    }
  }

  async function fetchAll(initialTrendMonths: TrendRangeMonths = selectedTrendMonths) {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      const headers = buildAuthHeaders(token);

      const normalizeItems = (items: WornItem[]) => items.map((item) => ({
        ...item,
        imageUrl: item.imageUrl ? buildImageUrl(item.imageUrl) : item.imageUrl,
      }));

      const [overviewRes, catRes, colourRes, mostRes, leastRes, neverRes, costRes] = await Promise.all([
        fetch(buildApiUrl('/api/analytics/overview'), { headers }),
        fetch(buildApiUrl('/api/analytics/categories'), { headers }),
        fetch(buildApiUrl('/api/analytics/colours'), { headers }),
        fetch(buildApiUrl('/api/analytics/most-worn?limit=6'), { headers }),
        fetch(buildApiUrl('/api/analytics/least-worn?limit=6'), { headers }),
        fetch(buildApiUrl('/api/analytics/never-worn?limit=6'), { headers }),
        fetch(buildApiUrl('/api/analytics/cost-per-wear?limit=20'), { headers }),
      ]);

      setOverview(await parseJsonOrThrow(overviewRes, 'Overview'));
      setCategories(await parseJsonOrThrow(catRes, 'Categories'));
      setColours(await parseJsonOrThrow(colourRes, 'Colours'));
      setMostWorn(normalizeItems(await parseJsonOrThrow(mostRes, 'Most worn')));
      setLeastWorn(normalizeItems(await parseJsonOrThrow(leastRes, 'Least worn')));
      setNeverWorn(normalizeItems(await parseJsonOrThrow(neverRes, 'Never worn')));
      setCostPerWear(await parseJsonOrThrow(costRes, 'Cost per wear'));
      await fetchUsageTrends(initialTrendMonths, { persistSelection: false, showLoading: false });
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

  const usagePercent = overview?.wardrobeUsagePercent ?? 0;
  const outfitsWorn = overview?.outfitsWorn ?? 0;
  const totalOutfits = overview?.totalOutfits ?? 0;
  const outfitPercent = totalOutfits > 0 ? Math.round((outfitsWorn / totalOutfits) * 100) : 0;
  const totalItems = overview?.totalItems ?? 0;
  const totalWearEvents = overview?.totalWearEvents ?? 0;
  const averageWearPerItem = overview?.averageWearPerItem ?? 0;

  const monthlyTrends = usageTrends?.monthly ?? [];
  const dayOfWeekTrends = usageTrends?.dayOfWeek ?? [];
  const maxMonthlyWear = monthlyTrends.reduce((max, entry) => Math.max(max, entry.wearCount), 0);
  const trendSummary = usageTrends?.summary;
  const mostActiveDay = trendSummary?.mostActiveDay;

  const costSummary = costPerWear?.summary;
  const costItems = costPerWear?.items ?? [];
  const cheapestItem = costItems
    .filter((item) => item.costPerWear !== null && item.costPerWear !== undefined)
    .reduce<CostPerWearItem | null>((best, item) => {
      if (!best || (item.costPerWear || 0) < (best.costPerWear || 0)) return item;
      return best;
    }, null);

  const normalizedColours = colours.map((entry, i) => ({
    ...entry,
    chartColour: toDrawableColour(
      entry.colour || entry.label,
      CHART_COLORS[i % CHART_COLORS.length]
    ),
  }));

  const topColours = [...normalizedColours].sort((a, b) => b.count - a.count).slice(0, 2);
  const colourPieData = normalizedColours.map((c, i) => ({
    count: c.count,
    colour: c.chartColour || CHART_COLORS[i % CHART_COLORS.length],
  }));
  const pieSlices = buildPieSlices(colourPieData, 80, 100, 100);

  const DONUT_R = 54;
  const DONUT_CX = 70;
  const DONUT_CY = 70;
  const circumference = 2 * Math.PI * DONUT_R;
  const filledDash = (outfitPercent / 100) * circumference;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}>

      <View style={styles.headerBg}>
        <Text style={styles.headerTitle}>Analytics</Text>
        <Svg
          width={SW} height={80}
          viewBox="0 0 1440 320"
          style={styles.headerWaveSvg}
          preserveAspectRatio="none"
        >
          <Path
            fill={COLORS.white}
            d="M0,160 C400,320 1000,0 1440,220 L1440,320 L0,320 Z"
          />
        </Svg>
      </View>
      <View style={styles.row}>
        <View style={[styles.card, styles.halfCard]}>
          <Text style={styles.cardLabel}>Wardrobe Usage</Text>
          <Text style={styles.bigStat}>{usagePercent}%</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${usagePercent}%` }]} />
          </View>
          <Text style={styles.cardSub}>of items worn</Text>
          <Text style={styles.secondarySub}>Avg wears/item: {averageWearPerItem}</Text>
        </View>
        <View style={[styles.card, styles.halfCard, { alignItems: 'center' }]}>
          <Text style={styles.cardLabel}>Outfits Worn</Text>
          <Svg width={140} height={140} viewBox="0 0 140 140">
            <Circle
              cx={70} cy={70} r={DONUT_R}
              stroke={COLORS.lightGray}
              strokeWidth={12}
              fill="none"
            />

            <Circle
              cx={70} cy={70} r={DONUT_R}
              stroke={COLORS.hotPink}
              strokeWidth={12}
              fill="none"
              strokeDasharray={`${filledDash} ${circumference}`}
              strokeLinecap="round"
              transform="rotate(-90 70 70)"
            />
            <SvgText x={70} y={66} textAnchor="middle"
              fontSize={22} fontWeight="800" fill={COLORS.text}>
              {outfitPercent}%
            </SvgText>
            <SvgText x={70} y={84} textAnchor="middle"
              fontSize={10} fill={COLORS.subText}>
              {outfitsWorn}/{totalOutfits}
            </SvgText>
          </Svg>
          <Text style={styles.secondarySub}>Wear events: {totalWearEvents}</Text>
        </View>
      </View>

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
          <View style={styles.totalPill}>
            <Text style={styles.totalPillText}>{totalItems} total items</Text>
          </View>

          {categories.length > 0 ? categories.map((cat, i) => {
            const pct = totalItems > 0 ? Math.round((cat.count / totalItems) * 100) : 0;
            const barColor = CHART_COLORS[i % CHART_COLORS.length];
            return (
              <View key={cat.name} style={styles.categoryRow}>
                <View style={styles.categoryLeft}>
                  <View style={[styles.categoryDot, { backgroundColor: barColor }]} />
                  <Text style={styles.categoryName}>{cat.name}</Text>
                </View>
                <View style={styles.categoryBarTrack}>
                  <View style={[styles.categoryBarFill, {
                    width: `${pct}%`, backgroundColor: barColor,
                  }]} />
                </View>
                <Text style={styles.categoryCount}>{cat.count}</Text>
              </View>
            );
          }) : (
            ['Tops', 'Bottoms', 'Dresses', 'Footwear', 'Bags', 'Accessories'].map((name, i) => (
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

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Colours</Text>

        {colours.length > 0 ? (
          <>
            <View style={styles.colourChartWrap}>
              <Svg width={200} height={200} viewBox="0 0 200 200">
                {pieSlices.map((slice, i) => (
                  <Path key={i} d={slice.path} fill={slice.colour} />
                ))}
                <Circle cx={100} cy={100} r={50} fill={COLORS.white} />
              </Svg>
              <View style={styles.colourLegend}>
                {normalizedColours.slice(0, 6).map((c, i) => (
                  <View key={i} style={styles.legendRow}>
                    <View style={[styles.legendDot, {
                      backgroundColor: c.chartColour || CHART_COLORS[i % CHART_COLORS.length]
                    }]} />
                    <Text style={styles.legendLabel}>{c.label}</Text>
                  </View>
                ))}
              </View>
            </View>
            {topColours.length >= 2 && (
              <Text style={styles.favouriteColoursText}>
                Your favourites are{' '}
                <Text style={[styles.colourBold, { color: topColours[0].chartColour || COLORS.hotPink }]}>
                  {topColours[0].label}
                </Text>
                {' '}and{' '}
                <Text style={[styles.colourBold, { color: topColours[1].chartColour || COLORS.lightPink }]}>
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
          <UsageSection
            title="Most worn"
            subtitle="Your go-to pieces"
            items={mostWorn}
            accentColor={COLORS.hotPink}
          />
          <UsageSection
            title="Least worn"
            subtitle="Give these some love"
            items={leastWorn}
            accentColor={COLORS.lightPink}
          />
          <UsageSection
            title="Never worn"
            subtitle="Still has the tags on?"
            items={neverWorn}
            accentColor={COLORS.lightGray}
          />
          <View style={styles.insightCard}>
            <Ionicons name="bulb-outline" size={22} color={COLORS.hotPink} />
            <View style={styles.insightText}>
              <Text style={styles.insightTitle}>Cost Per Wear </Text>
              <Text style={styles.insightBody}>
                Tracked items: {costSummary?.trackedItems ?? 0} · Avg CPW: ${costSummary?.averageCostPerWear ?? 0}
              </Text>
              {cheapestItem && (
                <Text style={styles.insightBody}>
                  Best value right now: {cheapestItem.name} (${cheapestItem.costPerWear}/wear)
                </Text>
              )}
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.trendHeaderRow}>
              <Text style={styles.cardTitle}>Usage Trends </Text>
              <View style={styles.trendSelectorWrap}>
                {TREND_RANGE_OPTIONS.map((months) => {
                  const selected = months === selectedTrendMonths;
                  return (
                    <TouchableOpacity
                      key={months}
                      style={[styles.trendSelectorPill, selected && styles.trendSelectorPillActive]}
                      onPress={() => { fetchUsageTrends(months); }}
                      activeOpacity={0.8}
                      disabled={trendLoading}
                    >
                      <Text style={[styles.trendSelectorText, selected && styles.trendSelectorTextActive]}>{months}m</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
            {trendLoading && (
              <View style={styles.trendLoadingRow}>
                <ActivityIndicator size="small" color={COLORS.hotPink} />
                <Text style={styles.secondarySub}>Updating trends...</Text>
              </View>
            )}
            {monthlyTrends.length > 0 ? (
              <>
                {monthlyTrends.map((entry) => {
                  const widthPercent = maxMonthlyWear > 0 ? (entry.wearCount / maxMonthlyWear) * 100 : 0;
                  return (
                    <View key={entry.month} style={styles.trendRow}>
                      <Text style={styles.trendLabel}>{formatTrendMonth(entry.month)}</Text>
                      <View style={styles.trendTrack}>
                        <View style={[styles.trendFill, { width: `${widthPercent}%` as any }]} />
                      </View>
                      <Text style={styles.trendValue}>{entry.wearCount}</Text>
                    </View>
                  );
                })}

                <Text style={styles.insightBody}>
                  Last {usageTrends?.rangeMonths ?? 6} months: {trendSummary?.totalWearEventsInRange ?? 0} wear events
                </Text>
                {mostActiveDay && (
                  <Text style={styles.insightBody}>
                    Most active day: {mostActiveDay.day} ({mostActiveDay.wearCount} wears)
                  </Text>
                )}

                <Text style={styles.trendTitle}>Most active days</Text>
                <View style={styles.dayTrendWrap}>
                  {dayOfWeekTrends.map((entry) => (
                    <View key={entry.dayNumber} style={styles.dayChip}>
                      <Text style={styles.dayChipTitle}>{entry.day.slice(0, 3)}</Text>
                      <Text style={styles.dayChipValue}>{entry.wearCount}</Text>
                    </View>
                  ))}
                </View>
              </>
            ) : (
              <Text style={styles.insightBody}>
                No usage trend data yet. Log outfits or usage events to unlock this view.
              </Text>
            )}
          </View>
        </>
      )}

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

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
        <View style={[styles.accentLine, { backgroundColor: accentColor }]} />
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No items yet</Text>
        </View>
      ) : (
        <View style={styles.itemGrid}>
          {items.map((item) => (
            <View key={item._id} style={styles.itemCell}>
              {item.imageUrl ? (
                <AuthenticatedImage source={{ uri: item.imageUrl }} style={styles.itemThumb} resizeMode="cover" />
              ) : (
                <View style={[styles.itemThumb, styles.itemThumbEmpty]}>
                  <Ionicons name="shirt-outline" size={22} color={COLORS.lightGray} />
                </View>
              )}
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