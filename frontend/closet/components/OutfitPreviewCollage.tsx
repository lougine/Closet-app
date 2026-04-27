import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { buildImageUrl } from '@/constants/api';
import AuthenticatedImage from './AuthenticatedImage';

type OutfitPreviewSource = {
  previewImage?: string | null;
  isLookbook?: boolean;
  garmentIds?: string[];
  garments?: Array<{ _id?: string; imageUrl?: string | null }>;
  styledLayout?: {
    dragPositions?: Record<string, { x: number; y: number }>;
    itemScales?: Record<string, number>;
    itemOrder?: string[];
    canvasSize?: { width?: number; height?: number };
  } | null;
};

type OutfitPreviewCollageProps = {
  outfit?: OutfitPreviewSource | null;
  style?: StyleProp<ViewStyle>;
  fallbackItems?: Array<{ id: string; image?: string | null }>;
  previewBackgroundColor?: string;
  emptyBackgroundColor?: string;
  maxTiles?: number;
};

type Tile = {
  key: string;
  uri?: string | null;
};

type StyledPreviewItem = {
  key: string;
  uri: string;
  leftPct: number;
  topPct: number;
  widthPct: number;
  heightPct: number;
};

const toIdString = (value: any) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value._id) return String(value._id);
  return String(value);
};

const buildTiles = (
  outfit?: OutfitPreviewSource | null,
  fallbackItems: Array<{ id: string; image?: string | null }> = [],
  maxTiles = 4,
) => {
  const tiles: Tile[] = [];

  const addTile = (uri?: string | null, key = '') => {
    if (tiles.length >= maxTiles) return;
    tiles.push({ key: key || uri || `tile-${tiles.length}`, uri });
  };

  if (outfit?.previewImage) {
    addTile(buildImageUrl(outfit.previewImage), 'preview');
    return tiles;
  }

  if (Array.isArray(outfit?.garments)) {
    outfit.garments.forEach((garment, index) => {
      addTile(garment?.imageUrl ? buildImageUrl(garment.imageUrl) : null, `garment-${index}`);
    });
  } else {
    const garmentIds = Array.isArray(outfit?.garmentIds) ? outfit.garmentIds : [];
    garmentIds.forEach((garmentId, index) => {
      const matched = fallbackItems.find((item) => String(item.id) === String(garmentId));
      addTile(matched?.image || null, `fallback-${garmentId}-${index}`);
    });
  }

  return tiles;
};

const buildStyledPreviewItems = (
  outfit?: OutfitPreviewSource | null,
  fallbackItems: Array<{ id: string; image?: string | null }> = [],
): StyledPreviewItem[] => {
  const layout = outfit?.styledLayout;
  if (!layout || !layout.dragPositions || !layout.itemScales) {
    return [];
  }

  const sourceWidth = Math.max(Number(layout.canvasSize?.width || 0), 1);
  const sourceHeight = Math.max(Number(layout.canvasSize?.height || 0), 1);
  const baseCardWidth = 118;
  const baseCardHeight = 148;

  const garmentImageMap = new Map<string, string>();
  if (Array.isArray(outfit?.garments)) {
    outfit.garments.forEach((garment) => {
      const id = toIdString(garment?._id);
      if (!id) return;
      const image = garment?.imageUrl ? buildImageUrl(garment.imageUrl) : null;
      if (image) garmentImageMap.set(id, image);
    });
  }

  const fallbackImageMap = new Map<string, string>();
  fallbackItems.forEach((item) => {
    const id = String(item.id);
    if (id && item.image) fallbackImageMap.set(id, item.image);
  });

  const fallbackIds = Array.isArray(outfit?.garmentIds) ? outfit.garmentIds.map(String) : [];
  const order = Array.isArray(layout.itemOrder) && layout.itemOrder.length > 0
    ? layout.itemOrder.map(String)
    : fallbackIds;

  const usedIds = new Set<string>();
  const orderedIds = [
    ...order,
    ...fallbackIds.filter((id) => !order.includes(id)),
  ].filter((id) => {
    if (usedIds.has(id)) return false;
    usedIds.add(id);
    return true;
  });

  const previewItems: StyledPreviewItem[] = [];
  orderedIds.forEach((id) => {
    const point = layout.dragPositions?.[id];
    const scale = Number(layout.itemScales?.[id] ?? 1);
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
      return;
    }

    const uri = garmentImageMap.get(id) || fallbackImageMap.get(id) || null;
    if (!uri) return;

    const normalizedScale = Math.max(0.1, Math.min(10, Number.isFinite(scale) ? scale : 1));
    const widthPct = (baseCardWidth * normalizedScale / sourceWidth) * 100;
    const heightPct = (baseCardHeight * normalizedScale / sourceHeight) * 100;
    const leftPct = (point.x / sourceWidth) * 100;
    const topPct = (point.y / sourceHeight) * 100;

    previewItems.push({
      key: id,
      uri,
      leftPct,
      topPct,
      widthPct,
      heightPct,
    });
  });

  return previewItems;
};

const TileContent = ({ tile, emptyBackgroundColor }: { tile: Tile; emptyBackgroundColor: string }) => {
  if (!tile.uri) {
    return <View style={{ width: '100%', height: '100%', backgroundColor: emptyBackgroundColor }} />;
  }

  return <AuthenticatedImage source={{ uri: tile.uri }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />;
};

export default function OutfitPreviewCollage({
  outfit,
  style,
  fallbackItems = [],
  previewBackgroundColor = '#f4f4f4',
  emptyBackgroundColor = '#ececec',
  maxTiles = 4,
}: OutfitPreviewCollageProps) {
  const tiles = buildTiles(outfit, fallbackItems, maxTiles);
  const styledItems = outfit?.previewImage ? [] : buildStyledPreviewItems(outfit, fallbackItems);

  if (styledItems.length > 0) {
    return (
      <View
        style={[
          style,
          {
            backgroundColor: previewBackgroundColor,
            overflow: 'hidden',
            position: 'relative',
          },
        ]}
      >
        {styledItems.map((item) => (
          <AuthenticatedImage
            key={item.key}
            source={{ uri: item.uri }}
            style={[
              { position: 'absolute' as const },
              {
                left: `${item.leftPct}%`,
                top: `${item.topPct}%`,
                width: `${item.widthPct}%`,
                height: `${item.heightPct}%`,
              },
            ]}
            resizeMode="contain"
          />
        ))}
      </View>
    );
  }

  if (tiles.length === 0) {
    return <View style={[style, { backgroundColor: emptyBackgroundColor }]} />;
  }

  if (tiles.length === 1) {
    if (!tiles[0].uri) {
      return <View style={[style, { backgroundColor: emptyBackgroundColor }]} />;
    }

    return (
      <AuthenticatedImage
        source={{ uri: tiles[0].uri }}
        style={[style as any, { backgroundColor: previewBackgroundColor }]}
        resizeMode="contain"
      />
    );
  }

  const visibleTiles = tiles.filter((tile) => Boolean(tile.uri)).slice(0, 6);
  if (visibleTiles.length === 0) {
    return <View style={[style, { backgroundColor: emptyBackgroundColor }]} />;
  }

  const useThreeColumns = visibleTiles.length > 4;

  return (
    <View
      style={[
        style,
        {
          backgroundColor: previewBackgroundColor,
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignContent: 'flex-start',
          justifyContent: 'space-between',
          padding: 6,
          rowGap: 4,
        },
      ]}
    >
      {visibleTiles.map((tile) => (
        <View
          key={tile.key}
          style={{
            width: useThreeColumns ? '32%' : '49%',
            height: '48%',
            borderRadius: 8,
            overflow: 'hidden',
            backgroundColor: emptyBackgroundColor,
            padding: 2,
          }}
        >
          <TileContent tile={tile} emptyBackgroundColor={emptyBackgroundColor} />
        </View>
      ))}
    </View>
  );
}
